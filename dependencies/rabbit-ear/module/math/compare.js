/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';

const epsilonEqual = (a, b, epsilon = EPSILON) => Math.abs(a - b) < epsilon;
const epsilonCompare = (a, b, epsilon = EPSILON) => (
	epsilonEqual(a, b, epsilon) ? 0 : Math.sign(a - b)
);
const epsilonEqualVectors = (a, b, epsilon = EPSILON) => {
	for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
		if (!epsilonEqual(a[i] || 0, b[i] || 0, epsilon)) { return false; }
	}
	return true;
};
const include = (n, epsilon = EPSILON) => n > -epsilon;
const exclude = (n, epsilon = EPSILON) => n > epsilon;
const includeL = (_, __) => true;
const excludeL = (_, __) => true;
const includeR = include;
const excludeR = exclude;
const includeS = (n, e = EPSILON) => n > -e && n < 1 + e;
const excludeS = (n, e = EPSILON) => n > e && n < 1 - e;

export { epsilonCompare, epsilonEqual, epsilonEqualVectors, exclude, excludeL, excludeR, excludeS, include, includeL, includeR, includeS };
