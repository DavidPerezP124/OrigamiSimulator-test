/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';
import { includeL, exclude } from './compare.js';
import { subtract2, magSquared, cross2, dot2, rotate90 } from './vector.js';

const overlapLinePoint = (
	{ vector, origin },
	point,
	lineDomain = includeL,
	epsilon = EPSILON,
) => {
	const p2p = subtract2(point, origin);
	const lineMagSq = magSquared(vector);
	const lineMag = Math.sqrt(lineMagSq);
	if (lineMag < epsilon) { return false; }
	const vecScaled = [vector[0] / lineMag, vector[1] / lineMag];
	const cross = cross2(p2p, vecScaled);
	const proj = dot2(p2p, vector) / lineMagSq;
	return Math.abs(cross) < epsilon && lineDomain(proj, epsilon / lineMag);
};
const overlapConvexPolygonPoint = (
	polygon,
	point,
	polyDomain = exclude,
	epsilon = EPSILON,
) => {
	const t = polygon
		.map((p, i, arr) => [p, arr[(i + 1) % arr.length]])
		.map(([a, b]) => [subtract2(b, a), subtract2(point, a)])
		.map(([a, b]) => cross2(a, b));
	const sign = Math.sign(t.reduce((a, b) => a + b, 0));
	const overlap = t
		.map(n => n * sign)
		.map(side => polyDomain(side, epsilon))
		.map((s, _, arr) => s === arr[0])
		.reduce((prev, curr) => prev && curr, true);
	return { overlap, t };
};
const overlapConvexPolygons = (poly1, poly2, epsilon = EPSILON) => {
	for (let p = 0; p < 2; p += 1) {
		const polyA = p === 0 ? poly1 : poly2;
		const polyB = p === 0 ? poly2 : poly1;
		for (let i = 0; i < polyA.length; i += 1) {
			const origin = polyA[i];
			const vector = rotate90(subtract2(polyA[(i + 1) % polyA.length], polyA[i]));
			const projected = polyB
				.map(point => subtract2(point, origin))
				.map(v => dot2(vector, v));
			const other_test_point = polyA[(i + 2) % polyA.length];
			const side_a = dot2(vector, subtract2(other_test_point, origin));
			const side = side_a > 0;
			const one_sided = projected
				.map(dotProd => (side ? dotProd < epsilon : dotProd > -epsilon))
				.reduce((a, b) => a && b, true);
			if (one_sided) { return false; }
		}
	}
	return true;
};
const overlapBoundingBoxes = (box1, box2, epsilon = EPSILON) => {
	const dimensions = Math.min(box1.min.length, box2.min.length);
	for (let d = 0; d < dimensions; d += 1) {
		if (box1.min[d] > box2.max[d] + epsilon
			|| box1.max[d] < box2.min[d] - epsilon) {
			return false;
		}
	}
	return true;
};

export { overlapBoundingBoxes, overlapConvexPolygonPoint, overlapConvexPolygons, overlapLinePoint };
