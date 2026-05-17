/**
 * ui.js — sidebar, sheet, search, info card, nav, toast, resize
 */

/* ════════════════════════════════════════════════════════
   SIDEBAR TOGGLE
════════════════════════════════════════════════════════ */
let sidebarOpen = true;

function toggleSidebar() {
  if (window.innerWidth < 768) {
    setSheet(sheetState === 'hidden' ? 'half' : 'hidden');
  } else {
    sidebarOpen = !sidebarOpen;
    document.getElementById('sidebar').classList.toggle('collapsed', !sidebarOpen);
  }
}

/* ════════════════════════════════════════════════════════
   TABS
════════════════════════════════════════════════════════ */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('pane-' + name).classList.add('active');
  if (window.innerWidth >= 768 && !sidebarOpen) toggleSidebar();
  if (window.innerWidth < 768 && sheetState === 'hidden') setSheet('half');
  // Reapply maxHeight so the newly active pane scrolls correctly
  if (window.innerWidth < 768 && sheetState !== 'hidden') {
    const offset = sheetState === 'full' ? 56 : sheetState === 'peek' ? window.innerHeight * PEEK_OFFSET_RATIO : window.innerHeight * HALF_OFFSET_RATIO;
    document.getElementById('pane-' + name).style.maxHeight = (window.innerHeight - offset - 92) + 'px';
  }
}

/* ════════════════════════════════════════════════════════
   SEARCH — filters list, highlights + flies to buildings
════════════════════════════════════════════════════════ */
function filterList(q) {
  renderList(q);
  highlightSearch(q);
  if (window.innerWidth < 768 && q.length > 0 && sheetState === 'hidden') setSheet('half');
}

function highlightSearch(q) {
  clearSearchHighlights();
  if (!q || q.trim().length < 2) return;

  const fl = q.toLowerCase();
  const matches = Object.entries(BUILDINGS).filter(([, b]) =>
    b.name.toLowerCase().includes(fl) ||
    b.depts.some(d => d.toLowerCase().includes(fl)) ||
    b.type.toLowerCase().includes(fl)
  ).map(([bid]) => bid);

  matches.forEach(bid => {
    const id = isNaN(bid) ? bid : Number(bid);
    try { map.setFeatureState({ source: 'buildings', id }, { searched: true }); } catch (_) {}
  });
  _searchHighlighted = matches;

  if (matches.length > 0 && map.loaded()) {
    flyToBuilding(matches[0]);
  }
}

function flyToBuilding(bid) {
  const features = map.querySourceFeatures('buildings', {
    filter: ['==', ['id'], isNaN(bid) ? bid : Number(bid)]
  });
  if (features.length > 0 && features[0].geometry) {
    const geom = features[0].geometry;
    let cx, cy;
    if (geom.type === 'Polygon') {
      const coords = geom.coordinates[0];
      cx = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      cy = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    } else if (geom.type === 'MultiPolygon') {
      const coords = geom.coordinates[0][0];
      cx = coords.reduce((s, c) => s + c[0], 0) / coords.length;
      cy = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    }
    if (cx !== undefined) {
      map.flyTo({ center: [cx, cy], zoom: Math.max(map.getZoom(), 17), duration: 600 });
    }
  }
}

let _searchHighlighted = [];
function clearSearchHighlights() {
  _searchHighlighted.forEach(bid => {
    const id = isNaN(bid) ? bid : Number(bid);
    try { map.setFeatureState({ source: 'buildings', id }, { searched: false }); } catch (_) {}
  });
  _searchHighlighted = [];
}

/* ════════════════════════════════════════════════════════
   BUILDING SELECTION
════════════════════════════════════════════════════════ */
let selectedBid = null;
let _justSelected = false;

function selectBuilding(bid) {
  bid = String(bid);
  selectedBid = bid;
  const b = BUILDINGS[bid];
  if (!b) return;

  document.querySelectorAll('.brow').forEach(r => r.classList.remove('active'));
  const row = document.querySelector(`.brow[data-id="${bid}"]`);
  if (row) row.classList.add('active');

  const isNum = !isNaN(bid);
  document.getElementById('cNum').textContent  = isNum ? 'Building ' + bid : b.name;
  document.getElementById('cName').textContent = b.name;
  document.getElementById('cType').textContent = b.type;
  document.getElementById('cDepts').innerHTML  = b.depts.map(d => `<div class="dept-item">${d}</div>`).join('');

  const imgEl = document.getElementById('cardImg');
  const imgPh = document.getElementById('imgPh');
  if (b.img) {
    imgEl.src = b.img; imgEl.classList.add('loaded'); imgPh.style.display = 'none';
  } else {
    imgEl.classList.remove('loaded'); imgEl.src = ''; imgPh.style.display = 'flex';
  }

  if (window.innerWidth < 768) {
    // Hide list, show card — map visible on top half, card on bottom
    document.getElementById('buildingList').style.display = 'none';
    document.getElementById('infoCard').classList.add('visible');
    switchTab('buildings');
    setSheet('half');
    // Clear the guard after this event cycle so empty-map taps can dismiss
    setTimeout(() => { _justSelected = false; }, 300);
    _justSelected = true;
  } else {
    document.getElementById('infoCard').classList.add('visible');
    switchTab('buildings');
  }

  setMapSelected(bid);
}

function closeCard() {
  document.getElementById('infoCard').classList.remove('visible');
  document.getElementById('buildingList').style.display = '';
  document.querySelectorAll('.brow').forEach(r => r.classList.remove('active'));
  clearMapSelected();
  selectedBid = null;
  if (window.innerWidth < 768) closePeekCard();
}

/* ════════════════════════════════════════════════════════
   NAV HELPERS
════════════════════════════════════════════════════════ */
function setFrom() {
  if (!selectedBid) return;
  document.getElementById('fromSel').value = selectedBid;
  switchTab('navigate');
  showToast('📍 Start: ' + BUILDINGS[selectedBid].name);
}

function setTo() {
  if (!selectedBid) return;
  document.getElementById('toSel').value = selectedBid;
  switchTab('navigate');
  showToast('🏁 Destination: ' + BUILDINGS[selectedBid].name);
}

function swapRoute() {
  const f = document.getElementById('fromSel');
  const t = document.getElementById('toSel');
  [f.value, t.value] = [t.value, f.value];
}

function resetRoute() {
  document.getElementById('fromSel').value = '';
  document.getElementById('toSel').value = '';
  document.getElementById('routeCard').classList.remove('visible');
  clearRouteStates();
  clearMapSelected();
  clearRoute();
  showToast('Route cleared');
}

/* ════════════════════════════════════════════════════════
   ROUTE GRADIENT
════════════════════════════════════════════════════════ */
function gradientColor(pos) {
  let r, g, b;
  if (pos <= 0.5) {
    const t = pos * 2;
    r = Math.round(22  + (14  - 22 ) * t);
    g = Math.round(163 + (165 - 163) * t);
    b = Math.round(74  + (233 - 74 ) * t);
  } else {
    const t = (pos - 0.5) * 2;
    r = Math.round(14  + (220 - 14 ) * t);
    g = Math.round(165 + (38  - 165) * t);
    b = Math.round(233 + (38  - 233) * t);
  }
  return `rgb(${r},${g},${b})`;
}
function waypointOpacity(pos) { return 1 - 0.55 * Math.sin(pos * Math.PI); }

/* ════════════════════════════════════════════════════════
   FIND ROUTE
════════════════════════════════════════════════════════ */
function findRoute() {
  const from = document.getElementById('fromSel').value;
  const to   = document.getElementById('toSel').value;
  if (!from || !to) { showToast('⚠ Select both buildings'); return; }
  if (from === to)  { showToast('⚠ Same start and destination'); return; }

  // Skip dijkstra for buildings not in GRAPH (e.g. gates) — go straight to Router
  const inGraph = GRAPH[from] && GRAPH[to];
  const { path, dist } = inGraph ? dijkstra(from, to) : { path: [from, to], dist: 0 };

  setRouteStates(from, to);

  if (!Router.isReady()) { showToast('Router still loading, try again shortly'); return; }
  if (BUILDINGS[from]?.unreachable) { showToast('⚠ ' + BUILDINGS[from].name + ' is not reachable on campus'); return; }
  if (BUILDINGS[to]?.unreachable)   { showToast('⚠ ' + BUILDINGS[to].name   + ' is not reachable on campus'); return; }

  const fromRough  = getBuildingCenter(from);
  const toRough    = getBuildingCenter(to);
  const fromCenter = getBuildingCenter(from, toRough);
  const toCenter   = getBuildingCenter(to, fromRough);

  if (!fromCenter || !toCenter) { showToast('Could not resolve buildings'); return; }

  const route = Router.find(fromCenter, toCenter);
  if (route && route.coords.length > 1) {
    drawRoute(route.coords);
    const lngs = route.coords.map(c => c[0]);
    const lats  = route.coords.map(c => c[1]);
    map.fitBounds(
      [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: { top: 80, bottom: window.innerWidth < 768 ? 400 : 80, left: 80, right: 80 }, duration: 700 }
    );
  } else {
    showToast('No path found between these buildings');
    clearRoute();
    return;
  }

  // Prefer real route distance, fall back to dijkstra estimate
  const realDist = route?.distanceM ?? dist;
  const mins = Math.max(1, Math.round(realDist / 80));
  document.getElementById('rDist').textContent  = Math.round(realDist);
  document.getElementById('rTime').textContent  = '~' + mins;
  document.getElementById('rStops').textContent = path.length;

  document.getElementById('rSteps').innerHTML = path.map((bid, i) => {
    const b   = BUILDINGS[bid] || { name: 'Building ' + bid, type: '' };
    const pos = path.length === 1 ? 0 : i / (path.length - 1);
    const col = gradientColor(pos);
    const isEdge  = i === 0 || i === path.length - 1;
    const opacity = isEdge ? 1 : Math.max(0.45, waypointOpacity(pos));
    return `<div class="step">
      <div class="sbubble" style="background:${col}18;border:1.5px solid ${col};color:${col}">${i+1}</div>
      <div class="sbody" style="opacity:${opacity}">
        <div class="sname">${b.name}</div>
        <div class="stype">${b.type}</div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('routeCard').classList.add('visible');

  // On mobile: snap to half so the route is visible on the map
  if (window.innerWidth < 768) {
    closePeekCard();
    setSheet('half');
  }
}

/* ════════════════════════════════════════════════════════
   BUILDING LIST
════════════════════════════════════════════════════════ */
const CAT_ORDER  = ['Academic', 'Amenities', 'Hostels', 'Gates', 'Parking'];
const CAT_COLORS = { Academic: '#0ea5e9', Amenities: '#8b5cf6', Hostels: '#dc2626', Gates: '#ca8a04', Parking: '#78716c' };

function renderList(filter = '') {
  const fl = filter.toLowerCase();
  const grouped = {};
  for (const [bid, b] of Object.entries(BUILDINGS)) {
    const match = !fl || b.name.toLowerCase().includes(fl)
      || b.type.toLowerCase().includes(fl)
      || b.depts.some(d => d.toLowerCase().includes(fl));
    if (!match) continue;
    if (!grouped[b.type]) grouped[b.type] = [];
    grouped[b.type].push({ bid, ...b });
  }

  if (!filter) {
    const fs = document.getElementById('fromSel');
    const ts = document.getElementById('toSel');
    // GPS option in From dropdown only
    fs.innerHTML = '<option value="">Choose building…</option>';
    ts.innerHTML = '<option value="">Choose building…</option>';
    for (const [bid, b] of Object.entries(BUILDINGS)) {
      const cleanName = b.name.replace(/\s*\(\d+\)\s*$/, '');
      fs.add(new Option(cleanName, bid));
      ts.add(new Option(cleanName, bid));
    }
  }

  let html = '';
  for (const cat of CAT_ORDER) {
    if (!grouped[cat]) continue;
    if (cat === 'Gates') continue;  // hidden from list, still in nav dropdowns
    html += `<div class="cat-label">${cat}</div>`;
    grouped[cat].sort((a, b) => (isNaN(a.bid) ? 9999 : +a.bid) - (isNaN(b.bid) ? 9999 : +b.bid));
    for (const b of grouped[cat]) {
      html += `<div class="brow" data-id="${b.bid}" onclick="selectBuilding('${b.bid}')">
        <div class="bpip" style="background:${CAT_COLORS[b.type]}"></div>
        <div class="btxt">
          <div class="bname">${b.name}</div>
          <div class="bsub">${b.depts.join(' · ')}</div>
        </div>
        <div class="bid-tag">#${b.bid}</div>
      </div>`;
    }
  }
  document.getElementById('buildingList').innerHTML = html
    || '<div style="padding:20px;color:var(--text-faint);font-size:13px;text-align:center">No results</div>';
}

/* ════════════════════════════════════════════════════════
   TOAST
════════════════════════════════════════════════════════ */
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

/* ════════════════════════════════════════════════════════
   PEEK CARD  —  GMaps-style building preview on mobile
════════════════════════════════════════════════════════ */
let _peekBid = null;

function showPeekCard(bid) {
  const b = BUILDINGS[String(bid)];
  if (!b) return;
  _peekBid = String(bid);

  // Hide sheet and FAB — full map visible behind card
  setSheet('hidden');
  let el = document.getElementById('peekCard');
  if (!el) {
    el = document.createElement('div');
    el.id = 'peekCard';
    el.className = 'peek-card';
    document.querySelector('.layout').appendChild(el);
  }

  const imgHTML = b.img
    ? `<img class="peek-img" src="${b.img}" alt="${b.name}" onload="this.classList.add('loaded')" />`
    : '';

  const deptsHTML = b.depts.map(d => `<div class="dept-item">${d}</div>`).join('');

  el.classList.remove('visible');
  el.innerHTML = `
    <div class="peek-drag-bar"></div>
    ${imgHTML}
    <div class="peek-body">
      <div class="peek-name">${b.name}</div>
      <div class="peek-type">${b.type}</div>
      <div class="dept-list" style="margin-bottom:14px">${deptsHTML}</div>
      <div class="peek-btns">
        <button class="btn-sm btn-from" onclick="setFrom()">↑ From here</button>
        <button class="btn-sm btn-to"   onclick="setTo()">↓ To here</button>
      </div>
    </div>
  `;
  requestAnimationFrame(() => el.classList.add('visible'));
}

function closePeekCard() {
  const el = document.getElementById('peekCard');
  if (el) el.classList.remove('visible');
  _peekBid = null;

}


/* ════════════════════════════════════════════════════════
   MOBILE SHEET  —  half | full | hidden  (with momentum)
════════════════════════════════════════════════════════ */
let sheetState = 'half';

// Snap thresholds
const SHEET_HEIGHT_RATIO = 1.05;   // sheet CSS height (105vh — extra bottom hides spring gap)
const HALF_OFFSET_RATIO  = 0.35;   // half = translateY(35%) → shows ~35% map
const PEEK_OFFSET_RATIO  = 0.72;   // peek = translateY(72%) → just a sliver at the bottom

function setSheet(state, animate = true) {
  if (window.innerWidth >= 768) return;
  const sidebar = document.getElementById('sidebar');
  const fab     = document.getElementById('mobileFab');
  if (!sidebar) return;

  sheetState = state;

  if (animate) {
    sidebar.classList.add('sheet-snapping');
    setTimeout(() => sidebar.classList.remove('sheet-snapping'), 350);
  } else {
    sidebar.classList.remove('sheet-snapping');
  }

  sidebar.classList.remove('sheet-hidden');
  sidebar.style.transition = '';

  const pane = document.querySelector('.pane.active');

  if (state === 'full') {
    sidebar.style.transform = 'translateY(56px)';
    if (pane) pane.style.maxHeight = (window.innerHeight - 56 - 92) + 'px';
    if (fab) fab.style.display = 'none';
  } else if (state === 'half') {
    const offset = window.innerHeight * HALF_OFFSET_RATIO;
    sidebar.style.transform = `translateY(${offset}px)`;
    if (pane) pane.style.maxHeight = (window.innerHeight - offset - 92) + 'px';
    if (fab) fab.style.display = 'none';
  } else if (state === 'peek') {
    const offset = window.innerHeight * PEEK_OFFSET_RATIO;
    sidebar.style.transform = `translateY(${offset}px)`;
    if (pane) pane.style.maxHeight = (window.innerHeight - offset - 92) + 'px';
    if (fab) fab.style.display = 'none';
  } else {
    sidebar.style.transform = `translateY(110%)`;
    setTimeout(() => sidebar.classList.add('sheet-hidden'), 340);
    if (pane) pane.style.maxHeight = '';
    if (fab) fab.style.display = 'flex';
  }
}

/* ════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderList();

  if (window.innerWidth < 768) {
    // Set sheet to hidden immediately with NO transition (no jank on load)
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.style.transition = 'none';
      sidebar.style.transform = 'translateY(110%)';
      sidebar.classList.add('sheet-hidden');
    }
    sheetState = 'hidden';

    // After a single frame, slide sheet up to half WITH animation
    // Use rAF x2 to ensure the no-transition state is painted first
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (sidebar) sidebar.style.transition = '';
      setSheet('half');
    }));

    const mobileSearch = document.getElementById('searchInputMobile');
    if (mobileSearch) mobileSearch.addEventListener('input', e => filterList(e.target.value));

    document.getElementById('map').addEventListener('click', e => {
      if (e.target.closest('.map-badge') || e.target.closest('#mobileFab')) return;

      // If a building was just selected this event cycle, don't dismiss
      if (_justSelected) return;

      // No building selected — tap on empty map always shows list at half
      if (document.getElementById('infoCard').classList.contains('visible')) {
        closeCard();
      } else {
        setSheet('half');
      }
    });
  }
});

window.addEventListener('resize', () => {
  const sidebar = document.getElementById('sidebar');
  const fab     = document.getElementById('mobileFab');
  if (window.innerWidth >= 768) {
    sidebar.style.transform = '';
    sidebar.style.height    = '';
    sidebar.style.transition = '';
    sidebar.classList.remove('sheet-hidden');
    if (fab) fab.style.display = 'none';
  }
});

/* ════════════════════════════════════════════════════════
   RESIZE / DRAG
   Desktop: drag right edge → change width
   Mobile:  drag top bar   → velocity-aware snap to half|full|hidden
════════════════════════════════════════════════════════ */
(function () {
  const MIN_W = 220, MAX_W = 560;

  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const handle  = document.getElementById('resizeHandle');
    if (!sidebar || !handle) return;

    let dragging = false, startY = 0, startX = 0, startTranslateY = 0, startW = 0;
    let velSamples = [], lastY = 0, lastT = 0, velocity = 0;
    function mob() { return window.innerWidth < 768; }

    function getTranslateY(el) {
      const t = new DOMMatrix(getComputedStyle(el).transform);
      return t.m42; // translateY in px
    }

    function onStart(clientX, clientY) {
      dragging  = true;
      startY    = clientY;
      startX    = clientX;
      lastY     = clientY;
      lastT     = Date.now();
      velocity  = 0;
      velSamples = [];
      if (mob()) {
        startTranslateY = getTranslateY(sidebar);
      } else {
        startW = sidebar.getBoundingClientRect().width;
      }
      // Kill transition during drag for instant response
      sidebar.style.transition = 'none';
      sidebar.classList.remove('sheet-snapping');
      document.body.style.userSelect = 'none';
    }

    function onMove(clientX, clientY) {
      if (!dragging) return;

      // Rolling velocity over last 80ms for smoothness
      const now = Date.now();
      velSamples.push({ y: clientY, t: now });
      velSamples = velSamples.filter(s => now - s.t < 80);
      if (velSamples.length >= 2) {
        const first = velSamples[0], last = velSamples[velSamples.length - 1];
        velocity = (last.y - first.y) / (last.t - first.t); // px/ms, + = downward
      }
      lastY = clientY;
      lastT = now;

      if (mob()) {
        // Drive purely via translateY — no height changes during drag
        const sheetTop   = window.innerHeight * (1 - SHEET_HEIGHT_RATIO); // ~15vh top
        const delta      = clientY - startY;
        const newTranslate = Math.max(sheetTop, Math.min(window.innerHeight, startTranslateY + delta));
        sidebar.style.transform = `translateY(${newTranslate}px)`;
        sidebar.classList.remove('sheet-hidden');
        const fab = document.getElementById('mobileFab');
        if (fab) fab.style.display = 'none';
      } else {
        const newW = Math.min(MAX_W, Math.max(MIN_W, startW + (clientX - startX)));
        sidebar.style.width = newW + 'px';
      }
    }

    function onEnd(clientY) {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';

      if (mob()) {
        const currentTranslate = getTranslateY(sidebar);
        const ratio = 1 - (currentTranslate / window.innerHeight);

        let snapTo;
        if (velocity > 0.5) {
          // fast flick down → go one level down
          if (sheetState === 'full')   snapTo = 'half';
          else if (sheetState === 'half') snapTo = 'peek';
          else snapTo = 'hidden';
        } else if (velocity < -0.5) {
          if (sheetState === 'peek')   snapTo = 'half';
          else snapTo = ratio > 0.5 ? 'full' : 'half';
        } else {
          if (ratio > 0.65)      snapTo = 'full';
          else if (ratio > 0.45) snapTo = 'half';
          else if (ratio > 0.12) snapTo = 'peek';
          else                   snapTo = 'hidden';
        }

        // No height reset needed — we never changed height
        setSheet(snapTo, true);
      }
    }

    // Touch events (passive:false on start so we can prevent scroll-fighting on handle)
    handle.addEventListener('touchstart', e => {
      if (!mob()) return;
      e.stopPropagation();
      onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (!dragging || !mob()) return;
      onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    document.addEventListener('touchend', e => {
      if (!mob()) return;
      onEnd(e.changedTouches[0]?.clientY ?? lastY);
    });

    // Desktop mouse events
    handle.addEventListener('mousedown', e => {
      if (mob()) return;
      onStart(e.clientX, e.clientY);
      e.preventDefault();
    });
    document.addEventListener('mousemove', e => {
      if (!mob()) onMove(e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', e => {
      if (!mob()) onEnd(e.clientY);
      dragging = false;
      document.body.style.userSelect = '';
    });

    // Tap on drag handle = toggle half ↔ full
    let _tapStartY = 0;
    handle.addEventListener('touchstart', e => {
      _tapStartY = e.touches[0].clientY;
    }, { passive: true });
    handle.addEventListener('touchend', e => {
      if (!mob()) return;
      const dy = Math.abs(e.changedTouches[0].clientY - _tapStartY);
      if (dy < 8) {
        setSheet(sheetState === 'full' ? 'half' : 'full');
      }
    });
    handle.addEventListener('click', () => {
      if (mob()) setSheet(sheetState === 'full' ? 'half' : 'full');
    });
  });
})();

/* ════════════════════════════════════════════════════════
   LEGEND TOGGLE
════════════════════════════════════════════════════════ */
let _legendOpen = true;
function toggleLegend() {
  _legendOpen = !_legendOpen;
  document.getElementById('legBody').style.display = _legendOpen ? '' : 'none';
  document.getElementById('legArrow').textContent  = _legendOpen ? '▾' : '▸';
}
