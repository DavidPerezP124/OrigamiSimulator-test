/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { removeDuplicateVertices } from './vertices/duplicate.js';
import { removeIsolatedVertices } from './vertices/isolated.js';
import { removeDuplicateEdges } from './edges/duplicate.js';
import { removeCircularEdges } from './edges/circular.js';
import { invertFlatMap, mergeFlatNextmaps } from './maps.js';

const clean = (graph, epsilon) => {
	const change_v1 = removeDuplicateVertices(graph, epsilon);
	const change_e1 = removeCircularEdges(graph);
	const change_e2 = removeDuplicateEdges(graph);
	const change_v2 = removeIsolatedVertices(graph);
	const change_v1_backmap = invertFlatMap(change_v1.map);
	const change_v2_remove = change_v2.remove.map(e => change_v1_backmap[e]);
	const change_e1_backmap = invertFlatMap(change_e1.map);
	const change_e2_remove = change_e2.remove.map(e => change_e1_backmap[e]);
	return {
		vertices: {
			map: mergeFlatNextmaps(change_v1.map, change_v2.map),
			remove: change_v1.remove.concat(change_v2_remove),
		},
		edges: {
			map: mergeFlatNextmaps(change_e1.map, change_e2.map),
			remove: change_e1.remove.concat(change_e2_remove),
		},
	};
};

export { clean };
