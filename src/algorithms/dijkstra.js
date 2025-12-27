import { PriorityQueue } from './utils';

export function dijkstra(graph, startNode, endNode) {
    const distances = {};
    const previous = {};
    const pq = new PriorityQueue();
    const visitedInOrder = [];
    const nodes = Object.keys(graph.nodeCoords);

    nodes.forEach(node => {
        distances[node] = Infinity;
        previous[node] = null;
    });

    distances[startNode] = 0;
    pq.enqueue(startNode, 0);

    while (!pq.isEmpty()) {
        const { val: currentNode } = pq.dequeue();

        if (currentNode === endNode) break;

        if (distances[currentNode] === Infinity) continue;

        const neighbors = graph.adjacencyList[currentNode] || [];
        for (const neighbor of neighbors) {
            const nextNode = neighbor.to;
            const newDist = distances[currentNode] + neighbor.dist;

            if (newDist < distances[nextNode]) {
                distances[nextNode] = newDist;
                previous[nextNode] = currentNode;
                pq.enqueue(nextNode, newDist);


                visitedInOrder.push({
                    from: currentNode,
                    to: nextNode,
                    coords: [graph.nodeCoords[currentNode], graph.nodeCoords[nextNode]]
                });
            }
        }
    }

    const path = [];
    let temp = endNode;
    while (temp) {
        path.unshift(graph.nodeCoords[temp]);
        temp = previous[temp];
    }

    return {
        path: path.length > 1 ? path : null,
        visitedInOrder,
        pathDistance: path.length > 1 ? distances[endNode] : 0
    };
}
