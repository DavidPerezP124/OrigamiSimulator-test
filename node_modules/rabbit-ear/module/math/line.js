/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';
import { epsilonEqual, epsilonEqualVectors } from './compare.js';
import { subtract, normalize, dot, parallel2, subtract2, parallel3, subtract3, cross2, normalize2, flip2, add2, scale2, flip, lerp } from './vector.js';
import { counterClockwiseSubsect2 } from './radial.js';

const clampLine = dist => dist;
const clampRay = dist => (dist < -EPSILON ? 0 : dist);
const clampSegment = (dist) => {
	if (dist < -EPSILON) { return 0; }
	if (dist > 1 + EPSILON) { return 1; }
	return dist;
};
const collinearPoints = (p0, p1, p2, epsilon = EPSILON) => {
	const vectors = [[p0, p1], [p1, p2]]
		.map(pts => subtract(pts[1], pts[0]))
		.map(vector => normalize(vector));
	return epsilonEqual(1.0, Math.abs(dot(vectors[0], vectors[1])), epsilon);
};
const collinearBetween = (p0, p1, p2, inclusive = false, epsilon = EPSILON) => {
	const similar = [p0, p2]
		.map(p => epsilonEqualVectors(p1, p, epsilon))
		.reduce((a, b) => a || b, false);
	if (similar) { return inclusive; }
	const vectors = [[p0, p1], [p1, p2]]
		.map(segment => subtract(segment[1], segment[0]))
		.map(vector => normalize(vector));
	return epsilonEqual(1.0, dot(vectors[0], vectors[1]), EPSILON);
};
const collinearLines2 = (a, b, epsilon = EPSILON) => (
	parallel2(a.vector, b.vector, epsilon)
	&& parallel2(a.vector, subtract2(b.origin, a.origin), epsilon)
);
const collinearLines3 = (a, b, epsilon = EPSILON) => (
	parallel3(a.vector, b.vector, epsilon)
	&& parallel3(a.vector, subtract3(b.origin, a.origin), epsilon)
);
const parallelPleat = (a, b, count) => {
	const isOpposite = dot(a.vector, b.vector) < 0;
	const aVector = a.vector;
	const bVector = isOpposite ? flip(b.vector) : b.vector;
	const origins = Array
		.from(Array(count - 1))
		.map((_, i) => lerp(a.origin, b.origin, (i + 1) / count));
	const vectors = Array
		.from(Array(count - 1))
		.map((_, i) => lerp(aVector, bVector, (i + 1) / count));
	const lines = vectors.map((vector, i) => ({
		vector: [vector[0], vector[1]],
		origin: [origins[i][0], origins[i][1]],
	}));
	const solution = [lines, lines];
	solution[(isOpposite ? 0 : 1)] = [];
	return solution;
};
const pleat = (a, b, count, epsilon = EPSILON) => {
	const determinant = cross2(a.vector, b.vector);
	const numerator = cross2(subtract2(b.origin, a.origin), b.vector);
	const t = numerator / determinant;
	const [aNormalized, bNormalized] = [a.vector, b.vector].map(normalize2);
	const isParallel = Math.abs(cross2(aNormalized, bNormalized)) < epsilon;
	if (isParallel) {
		return parallelPleat(a, b, count);
	}
	const sides = determinant > -epsilon
		? [[a.vector, b.vector], [flip2(b.vector), a.vector]]
		: [[b.vector, a.vector], [flip2(a.vector), b.vector]];
	const pleatVectors = [
		counterClockwiseSubsect2(sides[0][0], sides[0][1], count),
		counterClockwiseSubsect2(sides[1][0], sides[1][1], count),
	];
	const intersection = add2(a.origin, scale2(a.vector, t));
	const origins = Array.from(Array(count - 1)).map(() => intersection);
	const [sideA, sideB] = pleatVectors
		.map(side => side
			.map((vector, i) => ({ vector, origin: origins[i] })));
	return [sideA, sideB];
};
const bisectLines2 = (a, b, epsilon = EPSILON) => {
	const [biA, biB] = pleat(a, b, 2, epsilon).map(arr => arr[0]);
	const solution = [biA, biB];
	solution.forEach((val, i) => {
		if (val === undefined) { delete solution[i]; }
	});
	return solution;
};

export { bisectLines2, clampLine, clampRay, clampSegment, collinearBetween, collinearLines2, collinearLines3, collinearPoints, pleat };
