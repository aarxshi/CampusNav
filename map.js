/**
 * map.js
 * MapLibre GL setup, layer definitions, hover/click/route interactions.
 * Depends on: buildings.js (BUILDINGS, GRAPH)
 */

/* ── MAP INIT ───────────────────────────────────────── */
const map = new maplibregl.Map({
  container: 'map',
  style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  center: [77.5667, 12.908],
  zoom: window.innerWidth < 768 ? 15.5 : 16.5,
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
 * Get the centroid of a building polygon by querying rendered features.
 * Falls back to querying source features if not rendered.
 * Returns [lng, lat] or null.
 */
function getBuildingCenter(bid) {
  const b = BUILDINGS[String(bid)];
  if (b?.entrance) return b.entrance;

  const numId = isNaN(bid) ? bid : Number(bid);
  let features = map.queryRenderedFeatures({ layers: ['building-fill'] })
    .filter(f => (f.id === numId) || (f.properties?.id == bid));
  if (!features.length) {
    features = map.querySourceFeatures('buildings')
      .filter(f => (f.id === numId) || (f.properties?.id == bid));
  }
  if (!features.length) return null;
  const geom = features[0].geometry;
  let coords;
  if (geom.type === 'Polygon')           coords = geom.coordinates[0];
  else if (geom.type === 'MultiPolygon') coords = geom.coordinates[0][0];
  else return null;
  return [
    coords.reduce((s, c) => s + c[0], 0) / coords.length,
    coords.reduce((s, c) => s + c[1], 0) / coords.length
  ];
}
