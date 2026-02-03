/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';
import { includeL, include } from './compare.js';
import { magnitude2, add2, scale2, subtract2, cross2 } from './vector.js';
import { intersectPolygonLine } from './intersect.js';
import { overlapConvexPolygonPoint } from './overlap.js';

const getMinMax = (numbers, func, scaled_epsilon) => {
	if (numbers.length < 2) { return undefined; }
	let a = 0;
	let b = numbers.length - 1;
	while (a < b) {
		if (func(numbers[a + 1] - numbers[a], scaled_epsilon)) { break; }
		a += 1;
	}
	while (b > a) {
		if (func(numbers[b] - numbers[b - 1], scaled_epsilon)) { break; }
		b -= 1;
	}
	if (a >= b) { return undefined; }
	return [numbers[a], numbers[b]];
};
const clipLineConvexPolygon = (
	poly,
	{ vector, origin },
	fnPoly = include,
	fnLine = includeL,
	epsilon = EPSILON,
) => {
	const numbers = intersectPolygonLine(poly, { vector, origin }, includeL, epsilon)
		.map(({ a }) => a);
	if (numbers.length < 2) { return undefined; }
	const scaled_epsilon = (epsilon * 2) / magnitude2(vector);
	const ends = getMinMax(numbers, fnPoly, scaled_epsilon);
	if (ends === undefined) { return undefined; }
	const clip_fn = (t) => {
		if (fnLine(t)) { return t; }
		return t < 0.5 ? 0 : 1;
	};
	const ends_clip = ends.map(clip_fn);
	if (Math.abs(ends_clip[0] - ends_clip[1]) < (epsilon * 2) / magnitude2(vector)) {
		return undefined;
	}
	const mid = add2(origin, scale2(vector, (ends_clip[0] + ends_clip[1]) / 2));
	return overlapConvexPolygonPoint(poly, mid, fnPoly, epsilon).overlap
		? ends_clip.map(t => add2(origin, scale2(vector, t)))
		: undefined;
};
const clipPolygonPolygon = (polygon1, polygon2, epsilon = EPSILON) => {
	const inside = (p, cp1, cp2) => (
		(cp2[0] - cp1[0]) * (p[1] - cp1[1])) > ((cp2[1] - cp1[1]) * (p[0] - cp1[0]) + epsilon
	);
	const intersection = (cp1, cp2, e, s) => {
		const dc = subtract2(cp1, cp2);
		const dp = subtract2(s, e);
		const n1 = cross2(cp1, cp2);
		const n2 = cross2(s, e);
		const n3 = 1.0 / cross2(dc, dp);
		return scale2(subtract2(scale2(dp, n1), scale2(dc, n2)), n3);
	};
	let outputList = polygon1;
	let cp1 = polygon2[polygon2.length - 1];
	for (let j = 0; j < polygon2.length; j += 1) {
		const cp2 = polygon2[j];
		const inputList = outputList;
		outputList = [];
		let s = inputList[inputList.length - 1];
		for (let i = 0; i < inputList.length; i += 1) {
			const e = inputList[i];
			if (inside(e, cp1, cp2)) {
				if (!inside(s, cp1, cp2)) {
					outputList.push(intersection(cp1, cp2, e, s));
				}
				outputList.push(e);
			} else if (inside(s, cp1, cp2)) {
				outputList.push(intersection(cp1, cp2, e, s));
			}
			s = e;
		}
		cp1 = cp2;
	}
	return outputList.length === 0 ? undefined : outputList;
};

export { clipLineConvexPolygon, clipPolygonPolygon };
