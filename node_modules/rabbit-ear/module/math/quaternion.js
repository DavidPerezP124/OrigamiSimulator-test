/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { cross3, dot, magnitude, normalize } from './vector.js';
import { multiplyMatrices4 } from './matrix4.js';

const quaternionFromTwoVectors = (u, v) => {
	const w = cross3(u, v);
	const q = [w[0], w[1], w[2], dot(u, v)];
	q[3] += magnitude(q);
	const [a, b, c, d] = normalize(q);
	return [a, b, c, d];
};
const matrix4FromQuaternion = (q) => multiplyMatrices4([
	+q[3], +q[2], -q[1], +q[0],
	-q[2], +q[3], +q[0], +q[1],
	+q[1], -q[0], +q[3], +q[2],
	-q[0], -q[1], -q[2], +q[3],
], [
	+q[3], +q[2], -q[1], -q[0],
	-q[2], +q[3], +q[0], -q[1],
	+q[1], -q[0], +q[3], -q[2],
	+q[0], +q[1], +q[2], +q[3],
]);

export { matrix4FromQuaternion, quaternionFromTwoVectors };
