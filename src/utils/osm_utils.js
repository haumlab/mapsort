export function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export function processOSMData(data) {
    const nodeCoords = {};
    const adjacencyList = {};
    const ways = data.elements.filter(e => e.type === 'way');
    const nodes = data.elements.filter(e => e.type === 'node');

    nodes.forEach(node => {
        nodeCoords[node.id] = [node.lat, node.lon];
    });

    ways.forEach(way => {
        const wayNodes = way.nodes;
        const streetName = (way.tags && way.tags.name) || 'Unnamed Street';

        for (let i = 0; i < wayNodes.length - 1; i++) {
            const u = String(wayNodes[i]);
            const v = String(wayNodes[i + 1]);

            if (!nodeCoords[u] || !nodeCoords[v]) continue;

            const dist = getDistance(
                nodeCoords[u][0], nodeCoords[u][1],
                nodeCoords[v][0], nodeCoords[v][1]
            );


            if (!adjacencyList[u]) adjacencyList[u] = [];
            adjacencyList[u].push({
                to: v,
                dist,
                name: streetName,
                coords: [nodeCoords[u], nodeCoords[v]]
            });


            const oneway = way.tags && way.tags.oneway === 'yes';
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

    return {
        nodeCoords,
        adjacencyList
    };
}


const OVERPASS_INSTANCES = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://kumi.systems/osm/api/interpreter'
];

export async function fetchOSMData(bbox) {
    const query = `
        [out:json][timeout:25];
        (
          way["highway"~"primary|secondary|tertiary|unclassified|residential|service|living_street|pedestrian|track"](${bbox});
        );
        out body;
        >;
        out skel qt;
    `;


    for (const baseUrl of OVERPASS_INSTANCES) {
        try {
            console.log(`Trying OSM provider: ${baseUrl}`);
            const response = await fetch(baseUrl, {
                method: 'POST',
                body: `data=${encodeURIComponent(query)}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });

            if (!response.ok) {

                if (response.status === 429 || response.status >= 500) {
                    throw new Error(`Status ${response.status}`);
                }
                const text = await response.text();
                throw new Error(text);
            }

            const data = await response.json();
            return data;

        } catch (err) {
            console.warn(`Provider ${baseUrl} failed:`, err);

        }
    }

    throw new Error('All OSM providers failed. Please check internet connection.');
}
