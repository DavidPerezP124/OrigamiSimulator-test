/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';

const rangeUnion = (a, b) => {
	const bSorted = b[0] <= b[1];
	return a[0] <= a[1]
		? [
			Math.min(a[0], bSorted ? b[0] : b[1]),
			Math.max(a[1], bSorted ? b[1] : b[0]),
		]
		: [
			Math.min(a[1], bSorted ? b[0] : b[1]),
			Math.max(a[0], bSorted ? b[1] : b[0]),
		];
};
const doRangesOverlap = (a, b, epsilon = EPSILON) => {
	const r1 = a[0] < a[1] ? a : [a[1], a[0]];
	const r2 = b[0] < b[1] ? b : [b[1], b[0]];
	const overlap = Math.min(r1[1], r2[1]) - Math.max(r1[0], r2[0]);
	return overlap > epsilon;
};

export { doRangesOverlap, rangeUnion };
