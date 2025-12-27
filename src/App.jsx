import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Play, RotateCcw, MapPin, Navigation, Info, Swords, Zap, Activity } from 'lucide-react';
import { dijkstra } from './algorithms/dijkstra';
import { astar } from './algorithms/astar';
import { bfs } from './algorithms/bfs';
import { dfs } from './algorithms/dfs';
import { greedy } from './algorithms/greedy';
import { fetchOSMData, processOSMData, getDistance } from './utils/osm_utils';
import { playStepSound, playTraceSound } from './utils/audio';


import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;


const StartIcon = L.divIcon({
  html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(16,185,129,0.5);"></div>`,
  className: 'custom-marker',
  iconSize: [12, 12]
});

const EndIcon = L.divIcon({
  html: `<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(239,68,68,0.5);"></div>`,
  className: 'custom-marker',
  iconSize: [12, 12]
});

const ALGORITHMS = [
  { id: 'astar', name: 'A* Search', fn: astar },
  { id: 'dijkstra', name: 'Dijkstra', fn: dijkstra },
  { id: 'bfs', name: 'Breadth-First', fn: bfs },
  { id: 'greedy', name: 'Greedy Best-First', fn: greedy },
  { id: 'dfs', name: 'Depth-First', fn: dfs }
];


function PathZoom({ path }) {
  const map = useMap();
  useEffect(() => {
    if (path && path.length > 0) {
      map.fitBounds(L.polyline(path).getBounds(), { padding: [50, 50] });
    }
  }, [path, map]);
  return null;
}


function MapEvents({ onNodeSelect }) {
  useMapEvents({
    click: (e) => onNodeSelect(e.latlng)
  });
  return null;
}

export default function App() {
  const [graph, setGraph] = useState(null);
  const [startNode, setStartNode] = useState(null);
  const [endNode, setEndNode] = useState(null);
  const [status, setStatus] = useState('Select start point on the map');

  const [visited1, setVisited1] = useState([]);
  const [path1, setPath1] = useState(null);
  const [fullPath1, setFullPath1] = useState(null);
  const [metrics1, setMetrics1] = useState(null);

  const [visited2, setVisited2] = useState([]);
  const [path2, setPath2] = useState(null);
  const [fullPath2, setFullPath2] = useState(null);
  const [metrics2, setMetrics2] = useState(null);

  const [vsMode, setVsMode] = useState(false);
  const [algo1, setAlgo1] = useState('astar');
  const [algo2, setAlgo2] = useState('dijkstra');

  const [volume, setVolume] = useState(0.5);
  const [simSpeed, setSimSpeed] = useState(5);

  const [isVisualizing, setIsVisualizing] = useState(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);


  const [sharedPath, setSharedPath] = useState([]);

  useEffect(() => {
    if (path1 && path2) {

      const p1Edges = new Set();
      for (let i = 0; i < path1.length - 1; i++) {
        const u = path1[i].join(',');
        const v = path1[i + 1].join(',');
        p1Edges.add(u < v ? `${u}|${v}` : `${v}|${u}`);
      }

      const p2Edges = new Set();
      for (let i = 0; i < path2.length - 1; i++) {
        const u = path2[i].join(',');
        const v = path2[i + 1].join(',');
        p2Edges.add(u < v ? `${u}|${v}` : `${v}|${u}`);
      }

      const shared = [];


      for (let i = 0; i < path1.length - 1; i++) {
        const u = path1[i].join(',');
        const v = path1[i + 1].join(',');
        const key = u < v ? `${u}|${v}` : `${v}|${u}`;
        if (p2Edges.has(key)) shared.push([path1[i], path1[i + 1]]);
      }

      setSharedPath(shared);
    } else {
      setSharedPath([]);
    }
  }, [path1, path2]);

  const findNearestNode = (latlng, currentGraph) => {
    if (!currentGraph || !currentGraph.nodeCoords) return null;
    let minDest = Infinity;
    let nearestId = null;

    Object.entries(currentGraph.nodeCoords).forEach(([id, coords]) => {
      const d = getDistance(coords[0], coords[1], latlng.lat, latlng.lng);
      if (d < minDest) {
        minDest = d;
        nearestId = id;
      }
    });


    if (minDest > 1000) return null;
    return nearestId;
  };

  const mergeGraphs = (oldGraph, newGraph) => {
    if (!oldGraph) return newGraph;


    const mergedCoords = { ...oldGraph.nodeCoords, ...newGraph.nodeCoords };


    const mergedAdj = { ...oldGraph.adjacencyList };
    Object.entries(newGraph.adjacencyList).forEach(([u, edges]) => {
      if (!mergedAdj[u]) {
        mergedAdj[u] = edges;
      } else {

        const existingToNodes = new Set(mergedAdj[u].map(e => e.to));
        edges.forEach(edge => {
          if (!existingToNodes.has(edge.to)) {
            mergedAdj[u].push(edge);
          }
        });
      }
    });

    return { nodeCoords: mergedCoords, adjacencyList: mergedAdj };
  };

  const handleNodeSelect = async (latlng) => {
    if (isVisualizing || isLoadingMap) return;

    if (!startNode) {

      const clickPoint = { lat: latlng.lat, lng: latlng.lng };
      setStartNode(clickPoint);
      setStatus('Finding nearest street...');

      try {
        setIsLoadingMap(true);
        const bbox = `${clickPoint.lat - 0.003},${clickPoint.lng - 0.003},${clickPoint.lat + 0.003},${clickPoint.lng + 0.003}`;
        const data = await fetchOSMData(bbox);
        const processedGraph = processOSMData(data);

        setGraph(prev => mergeGraphs(prev, processedGraph));


        const sId = findNearestNode(clickPoint, processedGraph);
        if (sId) {
          setStartNode(sId);
          setStatus('Start point ready. Select destination.');
        } else {
          setStatus('No street found nearby. Map area expanded.');
        }
      } catch (err) {
        setStatus('Map service connection issues.');
      } finally {
        setIsLoadingMap(false);
      }
    } else if (typeof startNode === 'string' && !endNode) {

      const clickPoint = { lat: latlng.lat, lng: latlng.lng };
      setEndNode(clickPoint);
      setStatus('Expanding map network...');

      try {
        setIsLoadingMap(true);
        const startCoords = graph.nodeCoords[startNode];

        const pad = 0.008;
        const minLat = Math.min(startCoords[0], clickPoint.lat) - pad;
        const maxLat = Math.max(startCoords[0], clickPoint.lat) + pad;
        const minLng = Math.min(startCoords[1], clickPoint.lng) - pad;
        const maxLng = Math.max(startCoords[1], clickPoint.lng) + pad;
        const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

        const data = await fetchOSMData(bbox);
        const processedGraph = processOSMData(data);
        setGraph(prev => mergeGraphs(prev, processedGraph));

        const eId = findNearestNode(clickPoint, processedGraph);

        if (!eId) {
          setStatus('Destination is a bit isolated. Try clicking a main road.');
          setEndNode(null);
        } else {
          setEndNode(eId);
          setStatus('Ready! If search fails, click intermediate roads to load more map.');
        }
      } catch (err) {
        setStatus('Error fetching route data.');
        setEndNode(null);
      } finally {
        setIsLoadingMap(false);
      }
    } else {

      setStartNode(null);
      setEndNode(null);
      setVisited1([]);
      setPath1(null);
      setFullPath1(null);
      setMetrics1(null);
      setVisited2([]);
      setPath2(null);
      setFullPath2(null);
      setMetrics2(null);
      handleNodeSelect(latlng);
    }
  };

  const visualize = async () => {
    if (!startNode || !endNode || !graph) return;

    setIsVisualizing(true);

    setVisited1([]); setPath1(null); setFullPath1(null); setMetrics1(null);
    setVisited2([]); setPath2(null); setFullPath2(null); setMetrics2(null);

    setStatus('Searching...');

    const runAlgo = async (algoId, setVisited, setPath, setMetrics, setFullPath) => {
      try {
        const algo = ALGORITHMS.find(a => a.id === algoId);
        const algoFn = algo.fn;
        const startTime = performance.now();
        const result = algoFn(graph, startNode, endNode);


        if (!result || !result.visitedInOrder) {
          throw new Error("Algorithm failed to return a valid result.");
        }


        const totalSteps = result.visitedInOrder.length;
        const baseBatchSize = Math.max(2, Math.floor(totalSteps / 100));
        const currentBatchSize = baseBatchSize * simSpeed;

        const allVisitedCoords = result.visitedInOrder.map(e => e.coords);
        const delay = Math.max(0, 30 - simSpeed);

        for (let i = 0; i < totalSteps; i += currentBatchSize) {
          const batch = allVisitedCoords.slice(i, i + currentBatchSize);
          setVisited(prev => [...prev, ...batch]);
          if (volume > 0) playStepSound(volume * 0.05, 100 + (i / totalSteps) * 400);
          await new Promise(r => setTimeout(r, delay));
        }


        if (result.path) {
          setStatus('Tracing path...');
          const fullPath = result.path;


          setFullPath(fullPath);

          const targetFrames = 45;
          const traceBatchSize = Math.ceil(fullPath.length / targetFrames);

          let i = 0;
          while (i < fullPath.length) {
            i = Math.min(i + traceBatchSize, fullPath.length);
            setPath(fullPath.slice(0, i));

            if (volume > 0 && i % (traceBatchSize * 3) === 0) {
              playTraceSound(volume * 0.1, 400 + (i / fullPath.length) * 800);
            }

            await new Promise(r => setTimeout(r, 10));
          }

          const endTime = performance.now();
          setMetrics({
            time: (endTime - startTime).toFixed(2),
            visited: result.visitedInOrder.length,
            distance: result.pathDistance ? (result.pathDistance / 1000).toFixed(2) : '0'
          });
        }
        return !!result.path;
      } catch (err) {
        console.error(`Algorithm ${algoId} failed:`, err);
        setStatus(`Error: ${algoId} failed. Check console.`);
        return false;
      }
    };

    if (vsMode) {
      const [r1, r2] = await Promise.all([
        runAlgo(algo1, setVisited1, setPath1, setMetrics1, setFullPath1),
        runAlgo(algo2, setVisited2, setPath2, setMetrics2, setFullPath2)
      ]);
      if (r1 || r2) setStatus('Comparison complete!');
      else setStatus('No path found. Try loading more map segments between points.');
    } else {
      const found = await runAlgo(algo1, setVisited1, setPath1, setMetrics1, setFullPath1);
      if (found) setStatus(`Path found!`);
      else setStatus('No path found. Click roads between the points to expand the map.');
    }

    setIsVisualizing(false);
  };

  const reset = () => {
    setStartNode(null);
    setEndNode(null);
    setVisited1([]);
    setPath1(null);
    setFullPath1(null);
    setMetrics1(null);
    setVisited2([]);
    setPath2(null);
    setFullPath2(null);
    setMetrics2(null);
    setGraph(null);
    setStatus('Select start point on the map');
  };

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100vw' }}>
      <div className="control-sidebar glass-panel">
        <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Navigation size={24} color="#3b82f6" /> MapSort
        </h1>

        <div className="mode-toggle" onClick={() => !isVisualizing && setVsMode(!vsMode)}>
          <div className={`toggle-track ${vsMode ? 'active' : ''}`}>
            <span className="toggle-label">{vsMode ? 'VS MODE ACTIVE' : 'SINGLE MODE'}</span>
            <div className="toggle-thumb">
              <Swords size={12} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

          <div className="algo-config">
            <div className="label-wrapper">
              <label className="label-sm">
                ALGORITHM {vsMode ? '1' : ''}
              </label>
              <div className="color-indicator">
                <div className="color-dot" style={{ backgroundColor: '#3b82f6' }} title="Exploration Color"></div>
                <div className="color-dot" style={{ backgroundColor: '#fbbf24' }} title="Path Color"></div>
              </div>
            </div>
            <select
              className="select-box"
              value={algo1}
              onChange={(e) => setAlgo1(e.target.value)}
              disabled={isVisualizing}
            >
              {ALGORITHMS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            {metrics1 && (
              <div className="metrics-card algo1">
                <div className="metric"><Zap size={14} /> {metrics1.time}ms</div>
                <div className="metric"><Activity size={14} /> {metrics1.visited} nodes</div>
                <div className="metric"><MapPin size={14} /> {metrics1.distance}km</div>
              </div>
            )}
          </div>


          {vsMode && (
            <div className="algo-config">
              <div className="label-wrapper">
                <label className="label-sm">ALGORITHM 2</label>
                <div className="color-indicator">
                  <div className="color-dot" style={{ backgroundColor: '#ec4899' }} title="Exploration Color"></div>
                  <div className="color-dot" style={{ backgroundColor: '#10b981' }} title="Path Color"></div>
                </div>
              </div>
              <select
                className="select-box"
                value={algo2}
                onChange={(e) => setAlgo2(e.target.value)}
                disabled={isVisualizing}
              >
                {ALGORITHMS.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {metrics2 && (
                <div className="metrics-card algo2">
                  <div className="metric"><Zap size={14} /> {metrics2.time}ms</div>
                  <div className="metric"><Activity size={14} /> {metrics2.visited} nodes</div>
                  <div className="metric"><MapPin size={14} /> {metrics2.distance}km</div>
                </div>
              )}
            </div>
          )}
        </div>


        <div className="settings-group">
          <div className="setting-item">
            <div className="setting-header">
              <label className="label-sm">SIMULATION SPEED</label>
              <span style={{ fontSize: '10px', color: 'var(--accent-color)' }}>{simSpeed}x</span>
            </div>
            <input
              type="range" min="1" max="25" step="1"
              value={simSpeed}
              onChange={(e) => setSimSpeed(parseInt(e.target.value))}
            />
          </div>
          <div className="setting-item">
            <div className="setting-header">
              <label className="label-sm">SOUND VOLUME</label>
              <span style={{ fontSize: '10px', color: 'var(--accent-color)' }}>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
            />
          </div>
        </div>

        <div className="status-badge">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={16} /> <span style={{ fontSize: '11px' }}>{status}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            className="btn btn-primary"
            onClick={visualize}
            disabled={!startNode || !endNode || isVisualizing || isLoadingMap}
          >
            <Play size={18} fill="currentColor" /> {isVisualizing ? 'Running...' : 'Visualize'}
          </button>
          <button className="btn btn-secondary" onClick={reset}>
            <RotateCcw size={18} /> Reset
          </button>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div className="color-dot" style={{ backgroundColor: '#94a3b8' }}></div> Exploration
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div className="color-dot" style={{ backgroundColor: '#fff', border: '1px solid var(--accent-color)' }}></div> Shared Path
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div className="color-dot" style={{ backgroundColor: '#fbbf24' }}></div> Unique Path
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Dynamic Overpass OSM Data • Global Mode
          </div>
        </div>
      </div>

      <MapContainer
        center={[51.505, -0.09]}
        zoom={13}
        zoomControl={false}
        preferCanvas={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        <MapEvents onNodeSelect={handleNodeSelect} />


        {visited1.length > 0 && (
          <Polyline
            positions={visited1}
            pathOptions={{ color: '#3b82f6', weight: 1.5, opacity: 0.5 }}
          />
        )}


        {vsMode && visited2.length > 0 && (
          <Polyline
            positions={visited2}
            pathOptions={{ color: '#ec4899', weight: 1.5, opacity: 0.5 }}
          />
        )}


        {path1 && (
          <Polyline
            positions={path1}
            pathOptions={{ color: '#fbbf24', weight: 6, opacity: 1, lineJoin: 'round', pane: 'overlayPane' }}
          />
        )}


        {vsMode && path2 && (
          <Polyline
            positions={path2}
            pathOptions={{ color: '#10b981', weight: 6, opacity: 1, lineJoin: 'round', pane: 'overlayPane' }}
          />
        )}


        {vsMode && sharedPath.length > 0 && (
          <Polyline
            positions={sharedPath}
            pathOptions={{ color: '#fff', weight: 8, opacity: 1, lineJoin: 'round', pane: 'overlayPane' }}
          />
        )}


        {(fullPath1 || fullPath2) && <PathZoom path={[...(fullPath1 || []), ...(fullPath2 || []).reverse()]} />}


        {startNode && (
          <Marker position={typeof startNode === 'string' ? graph.nodeCoords[startNode] : startNode} icon={StartIcon}>
            <Popup>Start Point</Popup>
          </Marker>
        )}
        {endNode && (
          <Marker position={typeof endNode === 'string' ? graph.nodeCoords[endNode] : endNode} icon={EndIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
