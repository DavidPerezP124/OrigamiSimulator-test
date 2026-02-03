/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';
import { clampLine, clampSegment } from './line.js';
import { arrayMinimumIndex } from '../general/array.js';
import { distance2, distance, resize, magSquared, subtract, dot, add, scale, subtract2, add2, scale2, normalize2 } from './vector.js';

const nearestPoint2 = (points, point) => {
	const index = arrayMinimumIndex(points, el => distance2(el, point));
	return index === undefined ? undefined : points[index];
};
const nearestPoint = (points, point) => {
	const index = arrayMinimumIndex(points, el => distance(el, point));
	return index === undefined ? undefined : points[index];
};
const nearestPointOnLine = (
	{ vector, origin },
	point,
	clampFunc = clampLine,
	epsilon = EPSILON,
) => {
	const originN = resize(vector.length, origin);
	const pointN = resize(vector.length, point);
	const magSq = magSquared(vector);
	const vectorToPoint = subtract(pointN, originN);
	const dotProd = dot(vector, vectorToPoint);
	const dist = dotProd / magSq;
	const d = clampFunc(dist, epsilon);
	const [a, b, c] = add(originN, scale(vector, d));
	return vector.length === 2 ? [a, b] : [a, b, c];
};
const nearestPointOnPolygon = (polygon, point) => polygon
	.map((p, i, arr) => subtract2(arr[(i + 1) % arr.length], p))
	.map((vector, i) => ({ vector, origin: polygon[i] }))
	.map(line => nearestPointOnLine(line, point, clampSegment))
	.map((p, edge) => ({ point: p, edge, distance: distance2(p, point) }))
	.sort((a, b) => a.distance - b.distance)
	.shift();
const nearestPointOnCircle = ({ radius, origin }, point) => (
	add2(origin, scale2(normalize2(subtract2(point, origin)), radius))
);

export { nearestPoint, nearestPoint2, nearestPointOnCircle, nearestPointOnLine, nearestPointOnPolygon };
