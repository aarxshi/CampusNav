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
}

/* ════════════════════════════════════════════════════════
   SEARCH — filters list AND highlights matching buildings on map
════════════════════════════════════════════════════════ */
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

  // Fly to first match if map is loaded
  if (matches.length > 0 && map.loaded()) {
    flyToBuilding(matches[0]);
  }
}

function flyToBuilding(bid) {
  // Query the feature geometry to get its center
  const features = map.querySourceFeatures('buildings', {
    filter: ['==', ['id'], isNaN(bid) ? bid : Number(bid)]
  });
  if (features.length > 0 && features[0].geometry) {
    const geom = features[0].geometry;
    let cx, cy;
    if (geom.type === 'Polygon') {
      // Centroid of first ring
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

function selectBuilding(bid) {
  bid = String(bid);
  selectedBid = bid;
  const b = BUILDINGS[bid];
  if (!b) return;

  // Highlight in list
  document.querySelectorAll('.brow').forEach(r => r.classList.remove('active'));
  const row = document.querySelector(`.brow[data-id="${bid}"]`);
  if (row) { row.classList.add('active'); row.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

  // Fill info card
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

  document.getElementById('infoCard').classList.add('visible');

  // Switch to buildings tab properly
  switchTab('buildings');

  // Map highlight
  setMapSelected(bid);
}

function closeCard() {
  document.getElementById('infoCard').classList.remove('visible');
  document.querySelectorAll('.brow').forEach(r => r.classList.remove('active'));
  clearMapSelected();
  selectedBid = null;
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
  if (!from || !to)  { showToast('⚠ Select both buildings'); return; }
  if (from === to)   { showToast('⚠ Same start and destination'); return; }

  const { path, dist } = dijkstra(from, to);
  if (!path.length || !isFinite(dist)) { showToast('No route found'); return; }

  // Highlight start + end on map
  setRouteStates(from, to);

  // ── Real path routing ──────────────────────────────
  if (Router.isReady()) {
    const fromCenter = getBuildingCenter(from);
    const toCenter   = getBuildingCenter(to);

    if (fromCenter && toCenter) {
      const route = Router.find(fromCenter, toCenter);
        if (route && route.coords.length > 2) {
          drawRoute(route.coords);
          const lngs = route.coords.map(c => c[0]);
          const lats = route.coords.map(c => c[1]);
          map.fitBounds(
            [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
            { padding: { top: 80, bottom: window.innerWidth < 768 ? 400 : 80, left: 80, right: 80 }, duration: 700 }
          );
        } else {
          showToast('No path found between these buildings');
          clearRoute();
        }
    }
  } else {
    showToast('Router still loading, try again shortly');
  }

  // Stats — use real distance if router found a path, else estimated
  const mins = Math.max(1, Math.round(dist / 80));
  document.getElementById('rDist').textContent  = Math.round(dist);
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
}

/* ════════════════════════════════════════════════════════
   BUILDING LIST
════════════════════════════════════════════════════════ */
const CAT_ORDER  = ['Academic', 'Amenities', 'Hostels', 'Parking'];
const CAT_COLORS = { Academic: '#0ea5e9', Amenities: '#8b5cf6', Hostels: '#dc2626', Parking: '#78716c' };

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
    fs.innerHTML = '<option value="">Choose building…</option>';
    ts.innerHTML = '<option value="">Choose building…</option>';
    for (const [bid, b] of Object.entries(BUILDINGS)) {
      fs.add(new Option(b.name, bid));
      ts.add(new Option(b.name, bid));
    }
  }
  let html = '';
  for (const cat of CAT_ORDER) {
    if (!grouped[cat]) continue;
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
   MOBILE SHEET  —  half | full | hidden
════════════════════════════════════════════════════════ */
let sheetState = 'half';

// Fixed sheet height in CSS is 70vh. Half = translate down 50% of that = 35vh
const SHEET_HEIGHT_VH = 0.70;
const HALF_OFFSET_VH  = 0.35; // translateY this much to show top half

function setSheet(state) {
  if (window.innerWidth >= 768) return;
  const sidebar = document.getElementById('sidebar');
  const fab     = document.getElementById('mobileFab');
  if (!sidebar) return;

  sheetState = state;
  sidebar.style.transition = 'transform .28s cubic-bezier(.4,0,.2,1)';
  sidebar.classList.remove('sheet-hidden');

  if (state === 'full') {
    sidebar.style.transform = 'translateY(0)';
    if (fab) fab.style.display = 'none';

  } else if (state === 'half') {
    // Use vh-based offset so it works even when sheet was hidden
    const offset = window.innerHeight * HALF_OFFSET_VH;
    sidebar.style.transform = `translateY(${offset}px)`;
    if (fab) fab.style.display = 'none';

  } else { // hidden
    sidebar.style.transform = `translateY(110%)`;
    // Delay adding class so transition plays first
    setTimeout(() => sidebar.classList.add('sheet-hidden'), 300);
    if (fab) fab.style.display = 'flex';
  }
}

/* ════════════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  renderList();

  if (window.innerWidth < 768) {
    // Start at half after layout settles
    requestAnimationFrame(() => requestAnimationFrame(() => setSheet('half')));

    // Sync mobile search input with desktop one
    const mobileSearch = document.getElementById('searchInputMobile');
    if (mobileSearch) mobileSearch.addEventListener('input', e => filterList(e.target.value));

    // Tap map = collapse to half (not hidden)
    document.getElementById('map').addEventListener('click', e => {
      if (e.target.closest('.map-badge') || e.target.closest('#mobileFab')) return;
      if (sheetState === 'full') setSheet('half');
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
   RESIZE
   Desktop: drag right edge → change width
   Mobile:  drag top bar   → change height + snap
════════════════════════════════════════════════════════ */
(function () {
  const MIN_W = 220, MAX_W = 560;
  const MIN_H_PX = 120;

  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const handle  = document.getElementById('resizeHandle');
    if (!sidebar || !handle) return;

    let dragging = false, startPos = 0, startSize = 0;
    function mob() { return window.innerWidth < 768; }

    function onStart(pos) {
      dragging  = true;
      startPos  = pos;
      startSize = mob()
        ? sidebar.getBoundingClientRect().height
        : sidebar.getBoundingClientRect().width;
      sidebar.style.transition = 'none';
      document.body.style.userSelect = 'none';
      document.body.style.cursor = mob() ? 'ns-resize' : 'ew-resize';
    }

    function onMove(pos) {
      if (!dragging) return;
      if (mob()) {
        const delta = startPos - pos; // up = positive = bigger
        const maxH  = window.innerHeight * 0.90;
        const newH  = Math.min(maxH, Math.max(MIN_H_PX, startSize + delta));
        sidebar.style.height    = newH + 'px';
        sidebar.style.transform = 'translateY(0)';
        sheetState = 'full';
        const fab = document.getElementById('mobileFab');
        if (fab) fab.style.display = 'none';
        sidebar.classList.remove('sheet-hidden');
      } else {
        const newW = Math.min(MAX_W, Math.max(MIN_W, startSize + (pos - startPos)));
        sidebar.style.width = newW + 'px';
      }
    }

    function onEnd() {
      if (!dragging) return;
      dragging = false;
      document.body.style.userSelect = '';
      document.body.style.cursor     = '';
      sidebar.style.transition = '';
      // After resize on mobile, stay at full (user dragged = they want it open)
    }

    // Touch
    handle.addEventListener('touchstart', e => {
      onStart(mob() ? e.touches[0].clientY : e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      if (dragging) onMove(mob() ? e.touches[0].clientY : e.touches[0].clientX);
    }, { passive: true });
    document.addEventListener('touchend', onEnd);

    // Mouse
    handle.addEventListener('mousedown', e => { onStart(mob() ? e.clientY : e.clientX); e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (dragging) onMove(mob() ? e.clientY : e.clientX); });
    document.addEventListener('mouseup', onEnd);

    // Tap handle (no drag) = toggle half ↔ full
    let tapY = 0, tapping = false;
    handle.addEventListener('touchstart', e => { tapY = e.touches[0].clientY; tapping = true; }, { passive: true });
    handle.addEventListener('touchend', e => {
      if (!mob() || !tapping) return;
      tapping = false;
      if (Math.abs(e.changedTouches[0].clientY - tapY) < 10) {
        setSheet(sheetState === 'full' ? 'half' : 'full');
      }
    });
    handle.addEventListener('click', () => {
      if (!mob()) return;
      setSheet(sheetState === 'full' ? 'half' : 'full');
    });
  });
})();
