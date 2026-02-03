/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { resize3, subtract3, normalize3, dot3, scale3 } from './vector.js';

const projectPointOnPlane = (point, vector = [1, 0, 0], origin = [0, 0, 0]) => {
	const point3 = resize3(point);
	const originToPoint = subtract3(point3, resize3(origin));
	const normalized = normalize3(resize3(vector));
	const magnitude = dot3(normalized, originToPoint);
	const planeToPoint = scale3(normalized, magnitude);
	return subtract3(point3, planeToPoint);
};

export { projectPointOnPlane };
