/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { average } from '../../math/vector.js';
import { getDimensionQuick } from '../../fold/spec.js';
import { getVerticesClusters } from './clusters.js';
import { replace } from '../replace.js';

const duplicateVertices = ({ vertices_coords }, epsilon) => (
	getVerticesClusters({ vertices_coords }, epsilon)
		.filter(arr => arr.length > 1)
);
const removeDuplicateVertices = (graph, epsilon = EPSILON, makeAverage = true) => {
	const replace_indices = [];
	const remove_indices = [];
	const clusters = getVerticesClusters(graph, epsilon)
		.filter(arr => arr.length > 1);
	clusters.forEach(cluster => {
		if (Math.min(...cluster) !== cluster[0]) {
			cluster.sort((a, b) => a - b);
		}
		for (let i = 1; i < cluster.length; i += 1) {
			replace_indices[cluster[i]] = cluster[0];
			remove_indices.push(cluster[i]);
		}
	});
	const dimensions = getDimensionQuick(graph);
	if (makeAverage) {
		clusters
			.map(arr => arr.map(i => graph.vertices_coords[i]))
			.map(arr => average(...arr))
			.forEach(([a, b, c], i) => {
				const point = (dimensions === 2 ? [a, b] : [a, b, c]);
				graph.vertices_coords[clusters[i][0]] = point;
			});
	}
	return {
		map: replace(graph, "vertices", replace_indices),
		remove: remove_indices,
	};
};

export { duplicateVertices, removeDuplicateVertices };
