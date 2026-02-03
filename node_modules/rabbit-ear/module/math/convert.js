/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { subtract2, resize2, subtract3, resize3, magnitude, rotate90, dot, scale2, rotate270 } from './vector.js';

const vectorToAngle = (v) => Math.atan2(v[1], v[0]);
const angleToVector = (a) => [Math.cos(a), Math.sin(a)];
const pointsToLine2 = (a, b) => ({
	vector: subtract2(b, a),
	origin: resize2(a),
});
const pointsToLine3 = (a, b) => ({
	vector: subtract3(b, a),
	origin: resize3(a),
});
const pointsToLine = (a, b) => (a.length === 3 && b.length === 3
	? pointsToLine3(a, b)
	: pointsToLine2(a, b)
);
const vecLineToUniqueLine = ({ vector, origin }) => {
	const mag = magnitude(vector);
	const normal = rotate90([vector[0], vector[1]]);
	const distance = dot(origin, normal) / mag;
	return { normal: scale2(normal, 1 / mag), distance };
};
const uniqueLineToVecLine = ({ normal, distance }) => ({
	vector: rotate270(normal),
	origin: scale2(normal, distance),
});

export { angleToVector, pointsToLine, pointsToLine2, pointsToLine3, uniqueLineToVecLine, vecLineToUniqueLine, vectorToAngle };
