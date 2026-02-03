/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON, TWO_PI } from './constant.js';
import { subtract, parallel, subtract3, cross2, scale2, add2 } from './vector.js';

const angleArray = count => Array
	.from(Array(Math.floor(count)))
	.map((_, i) => TWO_PI * (i / count));
const anglesToVecs = (angles, radius) => angles
	.map(a => [radius * Math.cos(a), radius * Math.sin(a)]);
const makePolygonCircumradius = (sides = 3, circumradius = 1) => (
	anglesToVecs(angleArray(sides), circumradius)
);
const makePolygonCircumradiusSide = (sides = 3, circumradius = 1) => {
	const halfwedge = Math.PI / sides;
	const angles = angleArray(sides).map(a => a + halfwedge);
	return anglesToVecs(angles, circumradius);
};
const makePolygonInradius = (sides = 3, inradius = 1) => (
	makePolygonCircumradius(sides, inradius / Math.cos(Math.PI / sides)));
const makePolygonInradiusSide = (sides = 3, inradius = 1) => (
	makePolygonCircumradiusSide(sides, inradius / Math.cos(Math.PI / sides)));
const makePolygonSideLength = (sides = 3, length = 1) => (
	makePolygonCircumradius(sides, (length / 2) / Math.sin(Math.PI / sides)));
const makePolygonSideLengthSide = (sides = 3, length = 1) => (
	makePolygonCircumradiusSide(sides, (length / 2) / Math.sin(Math.PI / sides)));
const makePolygonNonCollinear = (polygon, epsilon = EPSILON) => {
	const edges_vector = polygon
		.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
		.map(pair => subtract(pair[1], pair[0]));
	const vertex_collinear = edges_vector
		.map((vector, i, arr) => [vector, arr[(i + arr.length - 1) % arr.length]])
		.map(pair => !parallel(pair[1], pair[0], epsilon));
	return polygon.filter((_, v) => vertex_collinear[v]);
};
const makePolygonNonCollinear3 = (polygon, epsilon = EPSILON) => {
	const edges_vector = polygon
		.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
		.map(pair => subtract3(pair[1], pair[0]));
	const vertex_collinear = edges_vector
		.map((vector, i, arr) => [vector, arr[(i + arr.length - 1) % arr.length]])
		.map(pair => !parallel(pair[1], pair[0], epsilon));
	return polygon.filter((_, v) => vertex_collinear[v]);
};
const signedArea = points => 0.5 * points
	.map((el, i, arr) => [el, arr[(i + 1) % arr.length]])
	.map(([a, b]) => cross2(a, b))
	.reduce((a, b) => a + b, 0);
const centroid = (points) => {
	const sixthArea = 1 / (6 * signedArea(points));
	const sum = points
		.map((el, i, arr) => [el, arr[(i + 1) % arr.length]])
		.map(([a, b]) => scale2(add2(a, b), cross2(a, b)))
		.reduce((a, b) => add2(a, b), [0, 0]);
	return [sum[0] * sixthArea, sum[1] * sixthArea];
};
const getDimension = (points) => {
	for (let i = 0; i < points.length; i += 1) {
		if (points[i] && points[i].length) { return points[i].length; }
	}
	return 0;
};
const boundingBox = (points, padding = 0) => {
	if (!points || !points.length) { return undefined; }
	const dimension = getDimension(points);
	const min = Array(dimension).fill(Infinity);
	const max = Array(dimension).fill(-Infinity);
	points
		.filter(p => p !== undefined)
		.forEach(point => point
			.forEach((c, i) => {
				if (c < min[i]) { min[i] = c - padding; }
				if (c > max[i]) { max[i] = c + padding; }
			}));
	const span = max.map((m, i) => m - min[i]);
	return { min, max, span };
};

export { boundingBox, centroid, makePolygonCircumradius, makePolygonCircumradiusSide, makePolygonInradius, makePolygonInradiusSide, makePolygonNonCollinear, makePolygonNonCollinear3, makePolygonSideLength, makePolygonSideLengthSide, signedArea };
