/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import makeViewBox from '../arguments/makeViewBox.js';
import { str_string, str_viewBox } from '../environment/strings.js';

const setViewBox = (element, ...args) => {
	const viewBox = args.length === 1 && typeof args[0] === str_string
		? args[0]
		: makeViewBox(...args);
	if (viewBox) {
		element.setAttribute(str_viewBox, viewBox);
	}
	return element;
};
const getViewBox = function (element) {
	const vb = element.getAttribute(str_viewBox);
	return (vb == null
		? undefined
		: vb.split(" ").map(n => parseFloat(n)));
};
const convertToViewBox = function (svg, x, y) {
	const pt = svg.createSVGPoint();
	pt.x = x;
	pt.y = y;
	const svgPoint = pt.matrixTransform(svg.getScreenCTM().inverse());
	return [svgPoint.x, svgPoint.y];
};
const foldToViewBox = ({ vertices_coords }) => {
	if (!vertices_coords) { return undefined; }
	const min = [Infinity, Infinity];
	const max = [-Infinity, -Infinity];
	vertices_coords.forEach(coord => [0, 1].forEach(i => {
		min[i] = Math.min(coord[i], min[i]);
		max[i] = Math.max(coord[i], max[i]);
	}));
	return [min[0], min[1], max[0] - min[0], max[1] - min[1]].join(" ");
};

export { convertToViewBox, foldToViewBox, getViewBox, setViewBox };
