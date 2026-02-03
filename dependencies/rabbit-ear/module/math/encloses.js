/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from './constant.js';

const pointInBoundingBox = (point, box, epsilon = EPSILON) => {
	for (let d = 0; d < point.length; d += 1) {
		if (point[d] < box.min[d] - epsilon
			|| point[d] > box.max[d] + epsilon) {
			return false;
		}
	}
	return true;
};
const enclosingBoundingBoxes = (outer, inner, epsilon = EPSILON) => {
	const dimensions = Math.min(outer.min.length, inner.min.length);
	for (let d = 0; d < dimensions; d += 1) {
		if (inner.min[d] < outer.min[d] - epsilon
			|| inner.max[d] > outer.max[d] + epsilon) {
			return false;
		}
	}
	return true;
};

export { enclosingBoundingBoxes, pointInBoundingBox };
