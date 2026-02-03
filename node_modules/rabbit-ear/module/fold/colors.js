/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { scale3, magnitude3, distance3 } from '../math/vector.js';

const assignmentColor = {
	B: "black",
	M: "crimson",
	V: "royalblue",
	F: "lightgray",
	J: "gold",
	C: "limegreen",
	U: "orchid",
};
Object.keys(assignmentColor).forEach(key => {
	assignmentColor[key.toLowerCase()] = assignmentColor[key];
});
const DESATURATION_RATIO = 4;
const colorMatchNormalized = {
	M: [1, 0, 0],
	V: [0, 0, 1],
	J: [1, 1, 0],
	U: [1, 0, 1],
	C: [0, 1, 0],
};
const rgbToAssignment = (red = 0, green = 0, blue = 0) => {
	const color = scale3([red, green, blue], 1 / 255);
	const blackDistance = magnitude3(color);
	if (blackDistance < 0.05) { return "B"; }
	const grayscale = color.reduce((a, b) => a + b, 0) / 3;
	const grayDistance = distance3(color, [grayscale, grayscale, grayscale]);
	const nearestColor = Object.keys(colorMatchNormalized)
		.map(key => ({ key, dist: distance3(color, colorMatchNormalized[key]) }))
		.sort((a, b) => a.dist - b.dist)
		.shift();
	if (nearestColor.dist < grayDistance * DESATURATION_RATIO) {
		return nearestColor.key;
	}
	return blackDistance < 0.1 ? "B" : "F";
};

export { assignmentColor, rgbToAssignment };
