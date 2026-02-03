/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { epsilonEqualVectors } from '../../math/compare.js';
import { parsePathCommandsWithEndpoints } from '../../svg/general/path.js';

const straightPathLines = {
	L: true, V: true, H: true, Z: true,
};
const getAttributesFloatValue = (element, attributes) => attributes
	.map(attr => element.getAttribute(attr))
	.map(str => (str == null ? 0 : str))
	.map(parseFloat);
const lineToSegments = (line) => {
	const [a, b, c, d] = getAttributesFloatValue(line, ["x1", "y1", "x2", "y2"]);
	return [[a, b, c, d]];
};
const pathToSegments = (path) => (
	parsePathCommandsWithEndpoints(path.getAttribute("d") || "")
		.filter(command => straightPathLines[command.command.toUpperCase()])
		.map(el => [el.start, el.end])
		.filter(([a, b]) => !epsilonEqualVectors(a, b))
		.map(([a, b]) => [a[0], a[1], b[0], b[1]])
);
const pointsStringToArray = str => {
	const list = str.split(/[\s,]+/).map(parseFloat);
	return Array
		.from(Array(Math.floor(list.length / 2)))
		.map((_, i) => [list[i * 2 + 0], list[i * 2 + 1]]);
};
const polygonToSegments = (polygon) => (
	pointsStringToArray(polygon.getAttribute("points") || "")
		.map((_, i, arr) => [
			arr[i][0],
			arr[i][1],
			arr[(i + 1) % arr.length][0],
			arr[(i + 1) % arr.length][1],
		])
);
const polylineToSegments = function (polyline) {
	const circularPath = polygonToSegments(polyline);
	circularPath.pop();
	return circularPath;
};
const rectToSegments = function (rect) {
	const [x, y, w, h] = getAttributesFloatValue(
		rect,
		["x", "y", "width", "height"],
	);
	return [
		[x, y, x + w, y],
		[x + w, y, x + w, y + h],
		[x + w, y + h, x, y + h],
		[x, y + h, x, y],
	];
};

export { lineToSegments, pathToSegments, polygonToSegments, polylineToSegments, rectToSegments };
