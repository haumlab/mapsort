import { getDistance } from '../utils/osm_utils';

export function bfs(graph, startNode, endNode) {
    const visitedInOrder = [];
    const queue = [startNode];
    let head = 0;
    const visited = new Set([startNode]);
    const parent = {};

    while (head < queue.length) {
        const u = queue[head++];

        if (u === endNode) {
            return {
                visitedInOrder,
                path: reconstructPath(parent, startNode, endNode, graph),
                pathDistance: calculatePathDistance(reconstructPath(parent, startNode, endNode, graph))
            };
        }

        const neighbors = graph.adjacencyList[u] || [];
        for (const edge of neighbors) {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                parent[edge.to] = u;
                visitedInOrder.push({
                    u,
                    v: edge.to,
                    coords: [graph.nodeCoords[u], graph.nodeCoords[edge.to]]
                });
                queue.push(edge.to);
            }
        }
    }

    return { visitedInOrder, path: null };
}

function reconstructPath(parent, startNode, endNode, graph) {
    const path = [];
    let curr = endNode;
    while (curr !== startNode) {
        path.push(graph.nodeCoords[curr]);
        curr = parent[curr];
    }
    path.push(graph.nodeCoords[startNode]);
    return path.reverse();
}

function calculatePathDistance(path) {
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
        distance += getDistance(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
    }
    return distance;
}
