import { getDistance } from '../utils/osm_utils';

export function dfs(graph, startNode, endNode) {
    const visitedInOrder = [];
    const stack = [startNode];
    const visited = new Set();
    const parent = {};

    while (stack.length > 0) {
        const u = stack.pop();

        if (visited.has(u)) continue;
        visited.add(u);

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
                parent[edge.to] = u;
                visitedInOrder.push({
                    u,
                    v: edge.to,
                    coords: [graph.nodeCoords[u], graph.nodeCoords[edge.to]]
                });
                stack.push(edge.to);
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
