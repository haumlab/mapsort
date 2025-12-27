import { PriorityQueue } from './utils';
import { getDistance } from '../utils/osm_utils';

export function greedy(graph, startNode, endNode) {
    const visitedInOrder = [];
    const pq = new PriorityQueue();
    const endCoords = graph.nodeCoords[endNode];

    pq.enqueue(startNode, 0);
    const visited = new Set([startNode]);
    const parent = {};

    while (!pq.isEmpty()) {
        const { val: u } = pq.dequeue();

        if (u === endNode) {
            const path = reconstructPath(parent, startNode, endNode, graph);
            return {
                visitedInOrder,
                path,
                pathDistance: calculatePathDistance(path)
            };
        }

        const neighbors = graph.adjacencyList[u] || [];
        for (const edge of neighbors) {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                parent[edge.to] = u;

                const h = getDistance(graph.nodeCoords[edge.to], endCoords);
                pq.enqueue(edge.to, h);

                visitedInOrder.push({
                    u,
                    v: edge.to,
                    coords: [graph.nodeCoords[u], graph.nodeCoords[edge.to]]
                });
            }
        }
    }

    return { visitedInOrder, path: null };
}

function reconstructPath(parent, startNode, endNode, graph) {
    const path = [];
    let curr = endNode;
    while (curr && curr !== startNode) {
        path.push(graph.nodeCoords[curr]);
        curr = parent[curr];
    }
    if (curr === startNode) {
        path.push(graph.nodeCoords[startNode]);
        return path.reverse();
    }
    return null;
}

function calculatePathDistance(path) {
    if (!path) return 0;
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
        distance += getDistance(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
    }
    return distance;
}
