/**
 * router.js
 * Builds a routable graph from paths.geojson and finds shortest paths.
 * Depends on: nothing (standalone, called after map loads)
 *
 * Usage:
 *   await RouterInit();               // call once after map loads
 *   const route = RouterFind(startCoord, endCoord);
 *   // route = { coords: [[lng,lat],...], distanceM: 123 } or null
 */

const Router = (() => {

  // Snap tolerance — coordinates within this distance (degrees) are
  // treated as the same node. ~5m at this latitude.
  const SNAP = 0.00005;

  let nodes   = [];   // [ [lng, lat], ... ]
  let edges   = [];   // [ { a: nodeIdx, b: nodeIdx, dist: metres, segCoords: [[lng,lat],...] } ]
  let adjList = {};   // nodeIdx → [ { to: nodeIdx, dist, segCoords } ]
  let ready   = false;

  /* ── Haversine distance (metres) ─────────────────────── */
  function haversine([lng1, lat1], [lng2, lat2]) {
    const R  = 6371000;
    const dL = (lat2 - lat1) * Math.PI / 180;
    const dl = (lng2 - lng1) * Math.PI / 180;
    const a  = Math.sin(dL/2)**2 +
               Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dl/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /* ── Find or create a node index for a coordinate ────── */
  function nodeFor([lng, lat]) {
    for (let i = 0; i < nodes.length; i++) {
      const [nlng, nlat] = nodes[i];
      if (Math.abs(nlng - lng) < SNAP && Math.abs(nlat - lat) < SNAP) return i;
    }
    nodes.push([lng, lat]);
    return nodes.length - 1;
  }

  /* ── Build graph from GeoJSON FeatureCollection ──────── */
  function build(geojson) {
    nodes   = [];
    edges   = [];
    adjList = {};

    for (const feat of geojson.features) {
      if (feat.geometry.type !== 'LineString') continue;
      const coords = feat.geometry.coordinates.map(c => [c[0], c[1]]);
      if (coords.length < 2) continue;

      const a = nodeFor(coords[0]);
      const b = nodeFor(coords[coords.length - 1]);
      if (a === b) continue;

      let dist = 0;
      for (let i = 0; i < coords.length - 1; i++) {
        dist += haversine(coords[i], coords[i+1]);
      }

      if (!adjList[a]) adjList[a] = [];
      if (!adjList[b]) adjList[b] = [];
      adjList[a].push({ to: b, dist, segCoords: coords });
      adjList[b].push({ to: a, dist, segCoords: [...coords].reverse() });
    }

    ready = true;

    // Log smallest gaps between nodes that aren't connected
    // This tells us if SNAP needs to be larger
    const danglingNodes = Object.keys(adjList)
      .filter(i => adjList[i].length === 1)
      .map(Number);

    if (danglingNodes.length > 0) {
      let minGap = Infinity;
      for (let i = 0; i < danglingNodes.length; i++) {
        for (let j = i + 1; j < danglingNodes.length; j++) {
          const d = haversine(nodes[danglingNodes[i]], nodes[danglingNodes[j]]);
          if (d < minGap && d > 0.01) minGap = d; // ignore self
        }
      }
      console.log(`Router: ${danglingNodes.length} dangling endpoints, smallest gap between them: ${minGap.toFixed(2)}m`);
    }

    console.log(`Router: built graph — ${nodes.length} nodes, ${Object.values(adjList).flat().length / 2} edges`);
  }

  /* ── Nearest node to a [lng, lat] point ──────────────── */
  function nearestNode([lng, lat]) {
    let best = -1, bestD = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      const d = haversine([lng, lat], nodes[i]);
      if (d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  /* ── Dijkstra on node graph ───────────────────────────── */
  function dijkstra(startIdx, endIdx) {
    const dist  = new Array(nodes.length).fill(Infinity);
    const prev  = new Array(nodes.length).fill(-1);
    const prevEdge = new Array(nodes.length).fill(null);
    const visited = new Set();

    dist[startIdx] = 0;
    // Simple priority queue using array (fine for 107 segments → ~200 nodes)
    const pq = [startIdx];

    while (pq.length) {
      pq.sort((a, b) => dist[a] - dist[b]);
      const u = pq.shift();
      if (visited.has(u)) continue;
      visited.add(u);
      if (u === endIdx) break;

      for (const { to, dist: w, segCoords } of (adjList[u] || [])) {
        const d = dist[u] + w;
        if (d < dist[to]) {
          dist[to]     = d;
          prev[to]     = u;
          prevEdge[to] = segCoords;
          pq.push(to);
        }
      }
    }

    if (dist[endIdx] === Infinity) return null;

    // Reconstruct path coords
    const allCoords = [];
    let cur = endIdx;
    while (cur !== startIdx) {
      const seg = prevEdge[cur];
      if (!seg) break;
      // prepend segment (reversed so it reads start→end)
      allCoords.unshift(...seg.slice(0, -1)); // avoid duplicate junction points
      cur = prev[cur];
    }
    allCoords.push(nodes[endIdx]); // final node

    return { coords: allCoords, distanceM: dist[endIdx] };
  }

  /* ── Find all connected components ───────────────────── */
  function getComponents() {
    const visited = new Set();
    const components = [];
    for (let start = 0; start < nodes.length; start++) {
      if (visited.has(start)) continue;
      const queue = [start], comp = [];
      while (queue.length) {
        const u = queue.shift();
        if (visited.has(u)) continue;
        visited.add(u); comp.push(u);
        for (const { to } of (adjList[u] || [])) if (!visited.has(to)) queue.push(to);
      }
      components.push(comp);
    }
    return components.sort((a, b) => b.length - a.length); // largest first
  }

  /* ── Bridge isolated components to the main network ──── */
  function bridgeComponents() {
    const components = getComponents();
    if (components.length <= 1) return;

    const mainComp = new Set(components[0]);
    let bridgeCount = 0;

    // For each isolated component, find its closest node in the main component
    // and add a virtual edge connecting them
    for (let ci = 1; ci < components.length; ci++) {
      const isoComp = components[ci];
      let bestDist = Infinity, bestIso = -1, bestMain = -1;

      for (const isoIdx of isoComp) {
        for (const mainIdx of mainComp) {
          const d = haversine(nodes[isoIdx], nodes[mainIdx]);
          if (d < bestDist) {
            bestDist = d; bestIso = isoIdx; bestMain = mainIdx;
          }
        }
      }

      if (bestIso !== -1 && bestMain !== -1) {
        // Add bridge edge both ways
        const bridgeCoords = [nodes[bestIso], nodes[bestMain]];
        if (!adjList[bestIso]) adjList[bestIso] = [];
        if (!adjList[bestMain]) adjList[bestMain] = [];
        adjList[bestIso].push({ to: bestMain, dist: bestDist, segCoords: bridgeCoords });
        adjList[bestMain].push({ to: bestIso, dist: bestDist, segCoords: [...bridgeCoords].reverse() });

        // Merge this component into main so subsequent components can bridge through it
        isoComp.forEach(n => mainComp.add(n));
        bridgeCount++;
        console.log(`Router: bridged component ${ci+1} (${isoComp.length} nodes) → main via ${bestDist.toFixed(1)}m gap`);
      }
    }

    console.log(`Router: added ${bridgeCount} bridges, graph now fully connected`);
  }
  return {
    async init() {
      try {
        const res  = await fetch('paths.geojson');
        const json = await res.json();
        build(json);
        bridgeComponents();
        this.checkConnectivity();
      } catch (e) {
        console.error('Router: failed to load paths.geojson', e);
      }
    },

    isReady() { return ready; },

    find(startCoord, endCoord) {
      if (!ready) { console.warn('Router not ready'); return null; }
      const s = nearestNode(startCoord);
      const e = nearestNode(endCoord);
      if (s === -1 || e === -1) return null;
      console.log(`Router.find: node ${s} → node ${e}, dist to start: ${haversine(startCoord, nodes[s]).toFixed(1)}m, dist to end: ${haversine(endCoord, nodes[e]).toFixed(1)}m`);
      return dijkstra(s, e);
    },

    nearestPoint(coord) {
      const idx = nearestNode(coord);
      return idx === -1 ? null : nodes[idx];
    },

    // Expose internals for debugging
    _nodes() { return nodes; },
    _adjList() { return adjList; },

    // Check how many disconnected components exist
    checkConnectivity() {
      if (!ready || nodes.length === 0) return;
      const visited = new Set();
      const components = [];

      for (let start = 0; start < nodes.length; start++) {
        if (visited.has(start)) continue;
        // BFS from this node
        const queue = [start];
        const comp  = [];
        while (queue.length) {
          const u = queue.shift();
          if (visited.has(u)) continue;
          visited.add(u);
          comp.push(u);
          for (const { to } of (adjList[u] || [])) {
            if (!visited.has(to)) queue.push(to);
          }
        }
        components.push(comp);
      }

      console.log(`Router connectivity: ${components.length} component(s)`);
      components.forEach((c, i) =>
        console.log(`  Component ${i+1}: ${c.length} nodes — e.g. ${JSON.stringify(nodes[c[0]])}`)
      );

      if (components.length > 1) {
        console.warn('Router: disconnected graph! Routes between components will fail.');
      }
    },
  };
})();
