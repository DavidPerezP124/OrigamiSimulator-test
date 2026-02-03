/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';
import { epsilonCompare } from './compare.js';
import { threePointTurnDirection } from './radial.js';
import { subtract2, normalize2, dot2, distance2 } from './vector.js';
import { clusterScalars } from '../general/cluster.js';

const mirrorArray = (arr) => arr.concat(arr.slice(0, -1).reverse());
const minimumCluster = (elements, comparison) => {
	let smallSet = [0];
	for (let i = 1; i < elements.length; i += 1) {
		switch (comparison(elements[smallSet[0]], elements[i])) {
		case 0: smallSet.push(i); break;
		case 1: smallSet = [i]; break;
		}
	}
	return smallSet;
};
const smallestVector2 = (points, epsilon = EPSILON) => {
	if (!points || !points.length) { return undefined; }
	const comparison = (a, b) => epsilonCompare(a[0], b[0], epsilon);
	const smallSet = minimumCluster(points, comparison);
	let sm = 0;
	for (let i = 1; i < smallSet.length; i += 1) {
		if (points[smallSet[i]][1] < points[smallSet[sm]][1]) { sm = i; }
	}
	return smallSet[sm];
};
const convexHullRadialSortPoints = (points, epsilon = EPSILON) => {
	const first = smallestVector2(points, epsilon);
	if (first === undefined) { return []; }
	const angles = points
		.map(p => subtract2(p, points[first]))
		.map(v => normalize2(v))
		.map(vec => dot2([0, 1], vec));
	const rawOrder = angles
		.map((a, i) => ({ a, i }))
		.sort((a, b) => a.a - b.a)
		.map(el => el.i)
		.filter(i => i !== first);
	return [[first]]
		.concat(clusterScalars(rawOrder.map(i => angles[i]), epsilon)
			.map(arr => arr.map(i => rawOrder[i]))
			.map(cluster => (cluster.length === 1 ? cluster : cluster
				.map(i => ({ i, len: distance2(points[i], points[first]) }))
				.sort((a, b) => a.len - b.len)
				.map(el => el.i))));
};
const convexHull = (points = [], includeCollinear = false, epsilon = EPSILON) => {
	if (points.length < 2) { return []; }
	const order = convexHullRadialSortPoints(points, epsilon)
		.map(arr => (arr.length === 1 ? arr : mirrorArray(arr)))
		.flat();
	order.push(order[0]);
	const stack = [order[0]];
	let i = 1;
	const funcs = {
		"-1": () => stack.pop(),
		1: (next) => { stack.push(next); i += 1; },
		undefined: () => { i += 1; },
	};
	funcs[0] = includeCollinear ? funcs["1"] : funcs["-1"];
	while (i < order.length) {
		if (stack.length < 2) {
			stack.push(order[i]);
			i += 1;
			continue;
		}
		const prev = stack[stack.length - 2];
		const curr = stack[stack.length - 1];
		const next = order[i];
		const pts = [prev, curr, next].map(j => points[j]);
		const turn = threePointTurnDirection(pts[0], pts[1], pts[2], epsilon);
		funcs[turn](next);
	}
	stack.pop();
	return stack;
};

export { convexHull, convexHullRadialSortPoints };
