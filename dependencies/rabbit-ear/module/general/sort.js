/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { basisVectors3, subtract, dot, normalize2 } from '../math/vector.js';
import { projectPointOnPlane } from '../math/plane.js';

const sortAgainstItem = (array, item, compareFn) => array
	.map((el, i) => ({ i, n: compareFn(el, item) }))
	.sort((a, b) => a.n - b.n)
	.map(a => a.i);
const sortPointsAlongVector = (points, vector) => (
	sortAgainstItem(points, vector, dot)
);
const radialSortUnitVectors2 = (vectors) => {
	const sidesVectors = [[], []];
	vectors.map(vec => (vec[1] >= 0 ? 0 : 1))
		.forEach((s, v) => sidesVectors[s].push(v));
	const sorts = [
		(a, b) => vectors[b][0] - vectors[a][0],
		(a, b) => vectors[a][0] - vectors[b][0],
	];
	return sidesVectors.flatMap((indices, i) => indices.sort(sorts[i]));
};
const radialSortVectors3 = (
	points,
	vector = [1, 0, 0],
	origin = [0, 0, 0],
) => {
	const threeVectors = basisVectors3(vector);
	const basis = [threeVectors[1], threeVectors[2], threeVectors[0]];
	const projectedPoints = points
		.map(point => projectPointOnPlane(point, vector, origin));
	const projectedVectors = projectedPoints
		.map(point => subtract(point, origin));
	const pointsUV = projectedVectors
		.map(vec => [dot(vec, basis[0]), dot(vec, basis[1])]);
	const vectorsUV = pointsUV.map(normalize2);
	return radialSortUnitVectors2(vectorsUV);
};

export { radialSortUnitVectors2, radialSortVectors3, sortPointsAlongVector };
