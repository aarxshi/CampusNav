/**
 * map.js
 * MapLibre GL setup, layer definitions, hover/click/route interactions.
 * Depends on: buildings.js (BUILDINGS, GRAPH)
 */

/* ── MAP INIT ───────────────────────────────────────── */
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  center: [77.5667, 12.9075],
  zoom: window.innerWidth < 768 ? 16.2 : 16.5,
  bearing: 90,
  attributionControl: false,
});

map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');

map.on('load', () => {

  /* Raster overlay ─────────────────────────────────── */
  map.addSource('overlay', {
    type: 'image',
    url: 'georef_small.png',
    coordinates: [
      [77.56443976346985, 12.910353408746811],
      [77.56899995730454, 12.910353408746811],
      [77.56899995730454, 12.905528106751351],
      [77.56443976346985, 12.905528106751351],
    ],
  });
  map.addLayer({
    id: 'overlay-layer', source: 'overlay', type: 'raster',
    paint: {
      'raster-opacity': 0.88,
      'raster-saturation': -0.15,
      'raster-brightness-min': 0.04,
      'raster-contrast': -0.04,
    },
  });

  /* Building polygons ──────────────────────────────── */
  map.addSource('buildings', { type: 'geojson', data: 'build.geojson' });

  // Soft glow behind active buildings
  map.addLayer({
    id: 'building-glow', type: 'fill', source: 'buildings',
    paint: {
      'fill-color': ['case',
        ['boolean', ['feature-state', 'routeEnd'],   false], '#dc2626',
        ['boolean', ['feature-state', 'routeStart'], false], '#16a34a',
        '#0ea5e9',
      ],
      'fill-opacity': ['case',
        ['any',
          ['boolean', ['feature-state', 'hover'],      false],
          ['boolean', ['feature-state', 'selected'],   false],
          ['boolean', ['feature-state', 'routeStart'], false],
          ['boolean', ['feature-state', 'routeEnd'],   false],
        ], 0.14, 0,
      ],
    },
  });

  // Main fill
  map.addLayer({
    id: 'building-fill', type: 'fill', source: 'buildings',
    paint: {
      'fill-color': ['case',
        ['boolean', ['feature-state', 'routeEnd'],   false], '#dc2626',
        ['boolean', ['feature-state', 'routeStart'], false], '#16a34a',
        ['boolean', ['feature-state', 'searched'],   false], '#f59e0b',
        '#0ea5e9',
      ],
      'fill-opacity': ['case',
        ['boolean', ['feature-state', 'routeEnd'],   false], 0.55,
        ['boolean', ['feature-state', 'routeStart'], false], 0.55,
        ['boolean', ['feature-state', 'searched'],   false], 0.50,
        ['boolean', ['feature-state', 'selected'],   false], 0.45,
        ['boolean', ['feature-state', 'hover'],      false], 0.38,
        0,
      ],
    },
  });

  // Outline ring
  map.addLayer({
    id: 'building-outline', type: 'line', source: 'buildings',
    paint: {
      'line-color': ['case',
        ['boolean', ['feature-state', 'routeEnd'],   false], '#dc2626',
        ['boolean', ['feature-state', 'routeStart'], false], '#16a34a',
        ['boolean', ['feature-state', 'searched'],   false], '#d97706',
        ['boolean', ['feature-state', 'selected'],   false], '#0284c7',
        ['boolean', ['feature-state', 'hover'],      false], '#0284c7',
        'rgba(0,0,0,0)',
      ],
      'line-width': ['case',
        ['boolean', ['feature-state', 'routeEnd'],   false], 2.5,
        ['boolean', ['feature-state', 'routeStart'], false], 2.5,
        ['boolean', ['feature-state', 'searched'],   false], 2,
        ['boolean', ['feature-state', 'selected'],   false], 2,
        2,
      ],
    },
  });

  /* Campus paths ───────────────────────────────────── */
  map.addSource('paths', { type: 'geojson', data: 'paths.geojson' });
  map.addLayer({
    id: 'campus-paths', type: 'line', source: 'paths',
    paint: { 'line-color': '#c8bfb0', 'line-width': 1.5, 'line-dasharray': [3, 2] },
  });

  /* Route line ─────────────────────────────────────── */
  map.addSource('route-line', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }
  });

  map.addLayer({
    id: 'route-line-glow', type: 'line', source: 'route-line',
    paint: { 'line-color': '#4285F4', 'line-width': 12, 'line-opacity': 0.15, 'line-blur': 5 }
  });

  map.addLayer({
    id: 'route-line-border', type: 'line', source: 'route-line',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-opacity': 0.5 }
  });

  map.addLayer({
    id: 'route-line-main', type: 'line', source: 'route-line',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#4285F4', 'line-width': 4, 'line-opacity': 1 }
  });

  // Initialise router after map loads
  Router.init().then(() => {
    console.log('Router ready');
  });

  // Force route layers to render on top of everything including raster overlay
  ['route-line-glow','route-line-border','route-line-main'].forEach(id => map.moveLayer(id));

  /* Hover pulse ────────────────────────────────────── */
  let hoveredId = null, pulseDir = 1, pulseVal = 0.38;

  setInterval(() => {
    if (hoveredId !== null) {
      pulseVal += 0.013 * pulseDir;
      if (pulseVal >= 0.56 || pulseVal <= 0.24) pulseDir *= -1;
      map.setPaintProperty('building-fill', 'fill-opacity', ['case',
        ['boolean', ['feature-state', 'routeEnd'],   false], 0.55,
        ['boolean', ['feature-state', 'routeStart'], false], 0.55,
        ['boolean', ['feature-state', 'searched'],   false], 0.50,
        ['boolean', ['feature-state', 'selected'],   false], 0.45,
        ['boolean', ['feature-state', 'hover'],      false], pulseVal,
        0,
      ]);
    }
  }, 40);

  map.on('mousemove', 'building-fill', e => {
    if (e.features.length > 0) {
      if (hoveredId !== null)
        map.setFeatureState({ source: 'buildings', id: hoveredId }, { hover: false });
      hoveredId = e.features[0].id;
      map.setFeatureState({ source: 'buildings', id: hoveredId }, { hover: true });
    }
  });

  map.on('mouseleave', 'building-fill', () => {
    if (hoveredId !== null)
      map.setFeatureState({ source: 'buildings', id: hoveredId }, { hover: false });
    hoveredId = null;
    pulseVal = 0.38;
  });

  map.on('click', 'building-fill', e => {
    const bid = String(e.features[0].properties?.id ?? e.features[0].id);
    if (BUILDINGS[bid]) selectBuilding(bid);
  });

  map.on('mouseenter', 'building-fill', () => map.getCanvas().style.cursor = 'pointer');
  map.on('mouseleave', 'building-fill', () => map.getCanvas().style.cursor = '');
});

/* ── SELECTED STATE HELPERS ─────────────────────────── */
let _selectedMapId = null;

function setMapSelected(bid) {
  clearMapSelected();
  const id = isNaN(bid) ? bid : Number(bid);
  try { map.setFeatureState({ source: 'buildings', id }, { selected: true }); } catch (_) {}
  _selectedMapId = id;
}

function clearMapSelected() {
  if (_selectedMapId !== null) {
    try { map.setFeatureState({ source: 'buildings', id: _selectedMapId }, { selected: false }); } catch (_) {}
    _selectedMapId = null;
  }
}

/* ── ROUTE STATE HELPERS ────────────────────────────── */
function setRouteStates(fromBid, toBid) {
  clearRouteStates();
  const startId = isNaN(fromBid) ? fromBid : Number(fromBid);
  const endId   = isNaN(toBid)   ? toBid   : Number(toBid);
  try { map.setFeatureState({ source: 'buildings', id: startId }, { routeStart: true }); } catch (_) {}
  try { map.setFeatureState({ source: 'buildings', id: endId },   { routeEnd:   true }); } catch (_) {}
}

function clearRouteStates() {
  Object.keys(BUILDINGS).forEach(bid => {
    const id = isNaN(bid) ? bid : Number(bid);
    try { map.setFeatureState({ source: 'buildings', id }, { routeStart: false, routeEnd: false }); } catch (_) {}
  });
}

/* ── DIJKSTRA ───────────────────────────────────────── */
function dijkstra(from, to) {
  const dist = {}, prev = {}, visited = new Set();
  Object.keys(GRAPH).forEach(k => dist[k] = Infinity);
  dist[from] = 0;
  const pq = Object.keys(GRAPH).slice();
  while (pq.length) {
    pq.sort((a, b) => dist[a] - dist[b]);
    const u = pq.shift();
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === to) break;
    for (const [v, w] of Object.entries(GRAPH[u] || {})) {
      const d = dist[u] + w;
      if (d < (dist[v] ?? Infinity)) { dist[v] = d; prev[v] = u; }
    }
  }
  const path = []; let c = to;
  while (c) { path.unshift(c); c = prev[c]; }
  return { path, dist: dist[to] };
}

/* ── ROUTE LINE HELPERS ─────────────────────────────── */

function drawRoute(coords) {
  if (!map.getSource('route-line')) return;
  map.getSource('route-line').setData({
    type: 'Feature',
    geometry: { type: 'LineString', coordinates: coords }
  });
}

function clearRoute() {
  if (map.getSource('route-line')) {
    map.getSource('route-line').setData({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: [] }
    });
  }
  if (map.getSource('route-endpoints')) {
    map.getSource('route-endpoints').setData({
      type: 'FeatureCollection', features: []
    });
  }
}
/**
 * Get the routing anchor point for a building.
 *
 * - unreachable:true → returns null
 * - entrances:[...]  → picks door whose nearest path-node is closest to origin
 * - entrance:[...]   → single door, used directly
 * - fallback         → polygon centroid
 */
function getBuildingCenter(bid, origin) {
  const b = BUILDINGS[String(bid)];
  if (!b) return null;
  if (b.unreachable) return null;

  if (b.entrances && b.entrances.length) {
    if (!origin || !Router.isReady()) return b.entrances[0];
    let best = b.entrances[0], bestDist = Infinity;
    for (const e of b.entrances) {
      const snap = Router.nearestPoint(e);
      if (!snap) continue;
      const d = Math.hypot(snap[0] - origin[0], snap[1] - origin[1]);
      if (d < bestDist) { bestDist = d; best = e; }
    }
    return best;
  }

  if (b.entrance) return b.entrance;

  // Polygon centroid fallback
  const numId = isNaN(bid) ? bid : Number(bid);
  let features = map.queryRenderedFeatures({ layers: ['building-fill'] })
    .filter(f => (f.id === numId) || (f.properties?.id == bid));
  if (!features.length) {
    features = map.querySourceFeatures('buildings')
      .filter(f => (f.id === numId) || (f.properties?.id == bid));
  }
  if (!features.length) return null;
  const geom = features[0].geometry;
  let ring;
  if (geom.type === 'Polygon')           ring = geom.coordinates[0];
  else if (geom.type === 'MultiPolygon') ring = geom.coordinates[0][0];
  else return null;
  return [
    ring.reduce((s, c) => s + c[0], 0) / ring.length,
    ring.reduce((s, c) => s + c[1], 0) / ring.length,
  ];
}

/* ── GPS / LOCATION ─────────────────────────────────── */
let _gpsWatchId   = null;
let _gpsMarker    = null;
let _gpsAccuracy  = null;
let _gpsCentre    = true;   // fly to position on first fix
let _gpsStale     = false;

function toggleGPS() {
  if (_gpsWatchId !== null) {
    stopGPS();
  } else {
    startGPS();
  }
}

function startGPS() {
  if (!navigator.geolocation) {
    showToast('GPS not supported on this device');
    return;
  }
  const btn = document.getElementById('gpsBtn');
  btn.classList.add('gps-active');
  const fab = document.getElementById('gpsFabBtn');
  if (fab) fab.style.color = 'var(--accent)';
  _gpsCentre = true;

  _gpsWatchId = navigator.geolocation.watchPosition(
    onGPSUpdate,
    onGPSError,
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

function stopGPS() {
  if (_gpsWatchId !== null) {
    navigator.geolocation.clearWatch(_gpsWatchId);
    _gpsWatchId = null;
  }
  if (_gpsMarker)   { _gpsMarker.remove();   _gpsMarker   = null; }
  if (_gpsAccuracy) { _gpsAccuracy.remove(); _gpsAccuracy = null; }
  document.getElementById('gpsBtn').classList.remove('gps-active');
  const fab2 = document.getElementById('gpsFabBtn');
  if (fab2) fab2.style.color = '';
}

function onGPSUpdate(pos) {
  const { longitude: lng, latitude: lat, accuracy } = pos.coords;
  _gpsStale = false;



  // Blue dot
  if (!_gpsMarker) {
    const dotWrap = document.createElement('div');
    dotWrap.className = 'gps-dot-wrap';
    const dot = document.createElement('div');
    dot.className = 'gps-dot';
    dot.id = 'gpsDot';
    dotWrap.appendChild(dot);
    _gpsMarker = new maplibregl.Marker({ element: dotWrap, anchor: 'center' })
      .setLngLat([lng, lat]).addTo(map);
  } else {
    _gpsMarker.setLngLat([lng, lat]);
  }

  // Fly to on first fix, then just re-centre if button tapped again
  if (_gpsCentre) {
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 18), duration: 800 });
    _gpsCentre = false;
  }

  // Stop spinning, keep pin blue
  const btn = document.getElementById('gpsBtn');
  btn.classList.remove('gps-active');
  btn.style.color = '#2563eb';
  const fab3 = document.getElementById('gpsFabBtn');
  if (fab3) { fab3.style.color = '#2563eb'; }

  // Update live distance in nav pane if routing from GPS
  updateGPSRouteDistance(lng, lat);
}

function updateGPSRouteDistance(lng, lat) {
  const fromSel = document.getElementById('fromSel');
  const toSel   = document.getElementById('toSel');
  if (!fromSel || fromSel.value !== 'GPS') return;
  const to = toSel?.value;
  if (!to || !Router.isReady()) return;

  const toCenter = getBuildingCenter(to);
  if (!toCenter) return;
  const route = Router.find([lng, lat], toCenter);
  if (!route) return;

  const metres = Math.round(route.distanceM);
  const mins   = Math.max(1, Math.round(metres / 80));
  const dEl = document.getElementById('rDist');
  const tEl = document.getElementById('rTime');
  if (dEl) dEl.textContent = metres;
  if (tEl) tEl.textContent = '~' + mins;

  // Redraw route line
  drawRoute(route.coords);
}

function onGPSError(err) {
  stopGPS();
  const msgs = {
    1: 'Location access denied — please allow in browser settings',
    2: 'GPS signal lost',
    3: 'GPS timed out',
  };
  showToast('📍 ' + (msgs[err.code] || 'GPS error'));
}
