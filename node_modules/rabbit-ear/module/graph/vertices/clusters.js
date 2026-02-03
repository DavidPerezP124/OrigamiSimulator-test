/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { getDimensionQuick } from '../../fold/spec.js';

const getVerticesClusters = ({ vertices_coords }, epsilon = EPSILON) => {
	if (!vertices_coords) { return []; }
	const dimensions = getDimensionQuick({ vertices_coords });
	const dimensionArray = Array.from(Array(dimensions));
	const clusters = [];
	let visited = 0;
	const vertices = vertices_coords
		.map((point, i) => ({ i, d: point[0] }))
		.sort((a, b) => a.d - b.d)
		.map(a => a.i)
		.filter(() => true);
	const ranges = dimensionArray.map(() => [0, 0]);
	const isInsideCluster = (index) => dimensionArray
		.map((_, d) => vertices_coords[index][d] > ranges[d][0]
			&& vertices_coords[index][d] < ranges[d][1])
		.reduce((a, b) => a && b, true);
	let rangeStart = 0;
	const updateRange = (cluster) => {
		const newVertex = cluster[cluster.length - 1];
		while (vertices_coords[newVertex][0]
			- vertices_coords[cluster[rangeStart]][0] > epsilon) {
			rangeStart += 1;
		}
		const points = cluster.slice(rangeStart, cluster.length)
			.map(v => vertices_coords[v]);
		ranges[0] = [
			points[0][0] - epsilon,
			points[points.length - 1][0] + epsilon,
		];
		for (let d = 1; d < dimensions; d += 1) {
			const scalars = points.map(p => p[d]);
			ranges[d] = [
				Math.min(...scalars) - epsilon,
				Math.max(...scalars) + epsilon,
			];
		}
	};
	while (visited < vertices_coords.length && vertices.length) {
		const cluster = [];
		const startVertex = vertices.shift();
		cluster.push(startVertex);
		visited += 1;
		rangeStart = 0;
		updateRange(cluster);
		let walk = 0;
		while (walk < vertices.length
			&& vertices_coords[vertices[walk]][0] < ranges[0][1]) {
			if (isInsideCluster(vertices[walk])) {
				const newVertex = vertices.splice(walk, 1).shift();
				cluster.push(newVertex);
				visited += 1;
				updateRange(cluster);
			} else {
				walk += 1;
			}
		}
		clusters.push(cluster);
	}
	return clusters;
};

export { getVerticesClusters };
