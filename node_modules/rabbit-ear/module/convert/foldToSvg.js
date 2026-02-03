/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../environment/window.js';
import SVG from '../svg/index.js';
import { addClass, findElementTypeInParents } from '../svg/general/dom.js';
import { isFoldedForm } from '../fold/spec.js';
import { boundingBox } from '../graph/boundary.js';
import { boundingBoxToViewBox, getStrokeWidth } from './general/svg.js';
import { drawVertices } from './svg/drawVertices.js';
import { drawEdges } from './svg/drawEdges.js';
import { drawFaces } from './svg/drawFaces.js';
import { drawBoundaries } from './svg/drawBoundaries.js';

const draw = {
	vertices: drawVertices,
	edges: drawEdges,
	faces: drawFaces,
	boundaries: drawBoundaries,
};
const DEFAULT_CIRCLE_RADIUS = 1 / 50;
const unitBounds = { min: [0, 0], max: [1, 1], span: [1, 1] };
const groupNames = ["boundaries", "faces", "edges", "vertices"];
const setDefaultOptions = (graph, options) => {
	if (options.vertices === undefined) {
		options.vertices = false;
	}
	if (!isFoldedForm(graph)) {
		if (options.faces === undefined) {
			options.faces = false;
		}
	}
};
const applyTopLevelOptions = (element, groups, graph, options) => {
	const hasVertices = groups[3] && groups[3].childNodes.length;
	if (!hasVertices
		&& (options.strokeWidth === undefined || options.strokeWidth === false)
		&& (options.viewBox === undefined || options.viewBox === false)) { return; }
	const box = boundingBox(graph) || unitBounds;
	const vmax = Math.max(...box.span);
	const svgElement = findElementTypeInParents(element, "svg");
	if (svgElement && options.viewBox) {
		const viewBoxValue = boundingBoxToViewBox(box);
		svgElement.setAttributeNS(null, "viewBox", viewBoxValue);
	}
	if (svgElement && options.padding) {
		const viewBoxString = svgElement.getAttribute("viewBox");
		if (viewBoxString != null) {
			const pad = options.padding * vmax;
			const viewBox = viewBoxString.split(" ").map(n => parseFloat(n));
			const newViewBox = [-pad, -pad, pad * 2, pad * 2]
				.map((nudge, i) => viewBox[i] + nudge)
				.join(" ");
			svgElement.setAttributeNS(null, "viewBox", newViewBox);
		}
	}
	if (options.strokeWidth || options["stroke-width"]) {
		const strokeWidth = options.strokeWidth
			? options.strokeWidth
			: options["stroke-width"];
		const strokeWidthValue = typeof strokeWidth === "number"
			? vmax * strokeWidth
			: getStrokeWidth(graph);
		element.setAttributeNS(null, "stroke-width", strokeWidthValue);
	}
	if (hasVertices) {
		const userRadius = options.vertices && options.vertices.radius != null
			? options.vertices.radius
			: options.radius;
		const radius = typeof userRadius === "string"
			? parseFloat(userRadius)
			: userRadius;
		const r = typeof radius === "number" && !Number.isNaN(radius)
			? vmax * radius
			: vmax * DEFAULT_CIRCLE_RADIUS;
		for (let i = 0; i < groups[3].childNodes.length; i += 1) {
			groups[3].childNodes[i].setAttributeNS(null, "r", r);
		}
	}
};
const drawGroups = (graph, options = {}) => groupNames
	.map(key => (options[key] === false ? (SVG.g()) : draw[key](graph, options[key])))
	.map((group, i) => {
		addClass(group, groupNames[i]);
		return group;
	});
const renderSVG = (graph, element, options = {}) => {
	setDefaultOptions(graph, options);
	const groups = drawGroups(graph, options);
	groups.filter(group => group.childNodes.length > 0)
		.forEach(group => element.appendChild(group));
	applyTopLevelOptions(element, groups, graph, options);
	addClass(
		element,
		...[graph.file_classes || [], graph.frame_classes || []].flat(),
	);
	return element;
};
const foldToSvg = (file, options = {}) => {
	const element = renderSVG(
		typeof file === "string" ? JSON.parse(file) : file,
		SVG.svg(),
		{
			viewBox: true,
			strokeWidth: true,
			...options,
		},
	);
	return options && options.string
		? (new (RabbitEarWindow().XMLSerializer)()).serializeToString(element)
		: element;
};

export { foldToSvg, renderSVG };
