import { PriorityQueue, getDistance } from './utils';

export function astar(graph, startNode, endNode) {
    const [endLat, endLon] = graph.nodeCoords[endNode];
    const distances = {};
    const fScores = {};
    const previous = {};
    const pq = new PriorityQueue();
    const visitedInOrder = [];
    const nodes = Object.keys(graph.nodeCoords);

    nodes.forEach(node => {
        distances[node] = Infinity;
        fScores[node] = Infinity;
        previous[node] = null;
    });

    distances[startNode] = 0;
    fScores[startNode] = getDistance(
        graph.nodeCoords[startNode][0], graph.nodeCoords[startNode][1],
        endLat, endLon
    );
    pq.enqueue(startNode, fScores[startNode]);

    while (!pq.isEmpty()) {
        const { val: currentNode } = pq.dequeue();

        if (currentNode === endNode) break;

        const neighbors = graph.adjacencyList[currentNode] || [];
        for (const neighbor of neighbors) {
            const nextNode = neighbor.to;
            const tentativeGScore = distances[currentNode] + neighbor.dist;

            if (tentativeGScore < distances[nextNode]) {
                distances[nextNode] = tentativeGScore;
                previous[nextNode] = currentNode;

                const h = getDistance(
                    graph.nodeCoords[nextNode][0], graph.nodeCoords[nextNode][1],
                    endLat, endLon
                );
                fScores[nextNode] = tentativeGScore + h;

                pq.enqueue(nextNode, fScores[nextNode]);

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
