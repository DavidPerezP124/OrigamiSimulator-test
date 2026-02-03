/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { uniqueSortedNumbers } from '../general/array.js';
import { invertFlatMap } from './maps.js';

const topologicalSortQuick = (directedEdges) => {
	const vertices = uniqueSortedNumbers(directedEdges.flat());
	const verticesParents = [];
	vertices.forEach(v => { verticesParents[v] = []; });
	directedEdges.forEach(edge => { verticesParents[edge[1]].push(edge[0]); });
	const ordering = [];
	const visited = {};
	const recurse = (vertex) => {
		if (visited[vertex]) { return; }
		visited[vertex] = true;
		verticesParents[vertex].forEach(recurse);
		ordering.push(vertex);
	};
	vertices.forEach(recurse);
	return ordering;
};
const topologicalSort = (directedEdges) => {
	const ordering = topologicalSortQuick(directedEdges);
	const orderMap = invertFlatMap(ordering);
	const violations = directedEdges
		.filter(([a, b]) => orderMap[a] > orderMap[b]);
	return violations.length ? undefined : ordering;
};

export { topologicalSort, topologicalSortQuick };
