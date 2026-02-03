/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';

const safeAdd = (a, b) => a + (b || 0);
const magnitude = v => Math.sqrt(v
	.map(n => n * n)
	.reduce(safeAdd, 0));
const magnitude2 = v => Math.sqrt(v[0] * v[0] + v[1] * v[1]);
const magnitude3 = v => Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
const magSquared2 = v => v[0] * v[0] + v[1] * v[1];
const magSquared = v => v
	.map(n => n * n)
	.reduce(safeAdd, 0);
const normalize = (v) => {
	const m = magnitude(v);
	return m === 0 ? v : v.map(c => c / m);
};
const normalize2 = (v) => {
	const m = magnitude2(v);
	return m === 0 ? [v[0], v[1]] : [v[0] / m, v[1] / m];
};
const normalize3 = (v) => {
	const m = magnitude3(v);
	return m === 0 ? v : [v[0] / m, v[1] / m, v[2] / m];
};
const scale = (v, s) => v.map(n => n * s);
const scale2 = (v, s) => [v[0] * s, v[1] * s];
const scale3 = (v, s) => [v[0] * s, v[1] * s, v[2] * s];
const scaleNonUniform = (v, s) => v.map((n, i) => n * s[i]);
const scaleNonUniform2 = (v, s) => [v[0] * s[0], v[1] * s[1]];
const scaleNonUniform3 = (v, s) => [v[0] * s[0], v[1] * s[1], v[2] * s[2]];
const add = (v, u) => v.map((n, i) => n + (u[i] || 0));
const add2 = (v, u) => [v[0] + u[0], v[1] + u[1]];
const add3 = (v, u) => [v[0] + u[0], v[1] + u[1], v[2] + u[2]];
const subtract = (v, u) => v.map((n, i) => n - (u[i] || 0));
const subtract2 = (v, u) => [v[0] - u[0], v[1] - u[1]];
const subtract3 = (v, u) => [v[0] - u[0], v[1] - u[1], v[2] - u[2]];
const dot = (v, u) => v
	.map((_, i) => v[i] * u[i])
	.reduce(safeAdd, 0);
const dot2 = (v, u) => v[0] * u[0] + v[1] * u[1];
const dot3 = (v, u) => v[0] * u[0] + v[1] * u[1] + v[2] * u[2];
const midpoint = (v, u) => v.map((n, i) => (n + u[i]) / 2);
const midpoint2 = (v, u) => scale2(add2(v, u), 0.5);
const midpoint3 = (v, u) => scale3(add3(v, u), 0.5);
const average = (...args) => {
	if (args.length === 0) { return undefined; }
	const dimension = (args[0].length > 0) ? args[0].length : 0;
	const sum = Array(dimension).fill(0);
	Array.from(args)
		.forEach(vec => sum
			.forEach((_, i) => { sum[i] += vec[i] || 0; }));
	return sum.map(n => n / args.length);
};
const average2 = (...vectors) => {
	if (!vectors || !vectors.length) { return undefined; }
	const sum = vectors.reduce((a, b) => add2(a, b), [0, 0]);
	return [sum[0] / vectors.length, sum[1] / vectors.length];
};
const average3 = (...vectors) => {
	if (!vectors || !vectors.length) { return undefined; }
	const sum = vectors.reduce((a, b) => add3(a, b), [0, 0, 0]);
	return [
		sum[0] / vectors.length,
		sum[1] / vectors.length,
		sum[2] / vectors.length,
	];
};
const lerp = (v, u, t = 0) => {
	const inv = 1.0 - t;
	return v.map((n, i) => n * inv + (u[i] || 0) * t);
};
const cross2 = (v, u) => v[0] * u[1] - v[1] * u[0];
const cross3 = (v, u) => [
	v[1] * u[2] - v[2] * u[1],
	v[2] * u[0] - v[0] * u[2],
	v[0] * u[1] - v[1] * u[0],
];
const distance = (v, u) => Math.sqrt(v
	.map((_, i) => (v[i] - u[i]) ** 2)
	.reduce(safeAdd, 0));
const distance2 = (v, u) => {
	const p = v[0] - u[0];
	const q = v[1] - u[1];
	return Math.sqrt((p * p) + (q * q));
};
const distance3 = (v, u) => {
	const a = v[0] - u[0];
	const b = v[1] - u[1];
	const c = v[2] - u[2];
	return Math.sqrt((a * a) + (b * b) + (c * c));
};
const flip = v => v.map(n => -n);
const flip2 = v => [-v[0], -v[1]];
const flip3 = v => [-v[0], -v[1], -v[2]];
const rotate90 = v => [-v[1], v[0]];
const rotate270 = v => [v[1], -v[0]];
const degenerate = (v, epsilon = EPSILON) => v
	.map(n => Math.abs(n))
	.reduce(safeAdd, 0) < epsilon;
const parallelNormalized = (v, u, epsilon = EPSILON) => 1 - Math
	.abs(dot(v, u)) < epsilon;
const parallel = (v, u, epsilon = EPSILON) => parallelNormalized(
	normalize(v),
	normalize(u),
	epsilon,
);
const parallel2 = (v, u, epsilon = EPSILON) => Math
	.abs(cross2(v, u)) < epsilon;
const parallel3 = (v, u, epsilon = EPSILON) => (
	(magnitude3(cross3(v, u))) < epsilon
);
const resize = (dimension, vector) => (vector.length === dimension
	? vector
	: Array(dimension).fill(0).map((z, i) => (vector[i] ? vector[i] : z)));
const resize2 = (vector) => [vector[0] || 0, vector[1] || 0];
const resize3 = (vector) => [vector[0] || 0, vector[1] || 0, vector[2] || 0];
const resizeUp = (a, b) => [a, b]
	.map(v => resize(Math.max(a.length, b.length), v));
const basisVectors2 = (vector = [1, 0]) => {
	const normalized = normalize2(vector);
	return [normalized, rotate90(normalized)];
};
const basisVectors3 = (vector = [1, 0, 0]) => {
	const normalized = normalize3(vector);
	const candidates = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	const crosses = candidates.map(v => cross3(v, normalized));
	const index = crosses
		.map(magnitude3)
		.map((n, i) => ({ n, i }))
		.sort((a, b) => b.n - a.n)
		.map(el => el.i)
		.shift();
	const perpendicular = normalize3(crosses[index]);
	return [normalized, perpendicular, cross3(normalized, perpendicular)];
};
const basisVectors = (vector) => (vector.length === 2
	? basisVectors2([vector[0], vector[1]])
	: basisVectors3([vector[0], vector[1], vector[2]])
);

export { add, add2, add3, average, average2, average3, basisVectors, basisVectors2, basisVectors3, cross2, cross3, degenerate, distance, distance2, distance3, dot, dot2, dot3, flip, flip2, flip3, lerp, magSquared, magSquared2, magnitude, magnitude2, magnitude3, midpoint, midpoint2, midpoint3, normalize, normalize2, normalize3, parallel, parallel2, parallel3, parallelNormalized, resize, resize2, resize3, resizeUp, rotate270, rotate90, scale, scale2, scale3, scaleNonUniform, scaleNonUniform2, scaleNonUniform3, subtract, subtract2, subtract3 };
