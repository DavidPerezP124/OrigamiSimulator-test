/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { filterKeysWithSuffix } from '../../fold/spec.js';
import { remove } from '../remove.js';

const circularEdges = ({ edges_vertices = [] }) => edges_vertices
	.map((vertices, i) => (vertices[0] === vertices[1] ? i : undefined))
	.filter(a => a !== undefined);
const spliceRemoveValuesFromSuffixes = (graph, suffix, remove_indices) => {
	const remove_map = {};
	remove_indices.forEach(n => { remove_map[n] = true; });
	filterKeysWithSuffix(graph, suffix)
		.forEach(sKey => graph[sKey]
			.forEach((elem, i) => {
				for (let j = elem.length - 1; j >= 0; j -= 1) {
					if (remove_map[elem[j]] === true) {
						graph[sKey][i].splice(j, 1);
					}
				}
			}));
};
const removeCircularEdges = (graph, remove_indices) => {
	if (!remove_indices) {
		remove_indices = circularEdges(graph);
	}
	if (remove_indices.length) {
		spliceRemoveValuesFromSuffixes(graph, "edges", remove_indices);
	}
	return {
		map: remove(graph, "edges", remove_indices),
		remove: remove_indices,
	};
};

export { circularEdges, removeCircularEdges };
