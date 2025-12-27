const fs = require('fs');
const path = require('path');

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

function processData() {
    const inputPath = path.join(__dirname, '../public/data/manhattan.json');
    const outputPath = path.join(__dirname, '../public/data/graph.json');

    if (!fs.existsSync(inputPath)) {
        console.error('Input file not found');
        return;
    }

    const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

    const nodeCoords = {};
    const adjacencyList = {};
    const ways = data.elements.filter(e => e.type === 'way');
    const nodes = data.elements.filter(e => e.type === 'node');

    nodes.forEach(node => {
        nodeCoords[node.id] = [node.lat, node.lon];
    });

    ways.forEach(way => {
        const wayNodes = way.nodes;
        const streetName = way.tags.name || 'Unnamed Street';

        for (let i = 0; i < wayNodes.length - 1; i++) {
            const u = wayNodes[i];
            const v = wayNodes[i + 1];

            if (!nodeCoords[u] || !nodeCoords[v]) continue;

            const dist = getDistance(
                nodeCoords[u][0], nodeCoords[u][1],
                nodeCoords[v][0], nodeCoords[v][1]
            );

            // Forward edge
            if (!adjacencyList[u]) adjacencyList[u] = [];
            adjacencyList[u].push({
                to: v,
                dist,
                name: streetName,
                coords: [nodeCoords[u], nodeCoords[v]]
            });

            // Backward edge (most streets are two-way in OSM unless tagged otherwise, 
            // for simplicity we'll treat all as two-way for now unless oneway=yes)
            const oneway = way.tags.oneway === 'yes';
            if (!oneway) {
                if (!adjacencyList[v]) adjacencyList[v] = [];
                adjacencyList[v].push({
                    to: u,
                    dist,
                    name: streetName,
                    coords: [nodeCoords[v], nodeCoords[u]]
                });
            }
        }
    });

    const graph = {
        nodeCoords,
        adjacencyList
    };

    fs.writeFileSync(outputPath, JSON.stringify(graph, null, 2));
    console.log(`Graph processed with ${Object.keys(nodeCoords).length} nodes and ${Object.keys(adjacencyList).length} edges in adjacency list.`);
}

processData();
