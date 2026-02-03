/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../environment/window.js';
import Messages from '../environment/messages.js';
import { isBackend } from '../environment/detect.js';
import { file_spec, file_creator } from '../fold/rabbitear.js';
import { resize2 } from '../math/vector.js';
import { multiplyMatrix2Vector2 } from '../math/matrix2.js';
import { cleanNumber } from '../general/number.js';
import { planarBoundary } from '../graph/boundary.js';
import { parseColorToHex } from '../svg/colors/parseColor.js';
import { xmlStringToElement, getRootParent, flattenDomTreeWithStyle, flattenDomTree } from '../svg/general/dom.js';
import { transformStringToMatrix } from '../svg/general/transforms.js';
import { findEpsilonInObject, invertVertical } from './general/options.js';
import { planarizeGraph } from './general/planarize.js';
import { invisibleParent } from './general/dom.js';
import { getEdgeStroke, getEdgeOpacity, colorToAssignment, opacityToFoldAngle } from './svg/color.js';
import { lineToSegments, rectToSegments, polygonToSegments, polylineToSegments, pathToSegments } from './svg/parse.js';

const parsers = {
	line: lineToSegments,
	rect: rectToSegments,
	polygon: polygonToSegments,
	polyline: polylineToSegments,
	path: pathToSegments,
};
const transformSegment = (segment, transform) => {
	const seg = [[segment[0], segment[1]], [segment[2], segment[3]]];
	if (!transform) { return seg; }
	const matrix = transformStringToMatrix(transform);
	return matrix
		? seg.map(p => multiplyMatrix2Vector2(matrix, p))
		: seg;
};
const flatSegments = (svgElement) => flattenDomTreeWithStyle(svgElement)
	.filter(el => parsers[el.element.nodeName])
	.flatMap(el => parsers[el.element.nodeName](el.element)
		.map(segment => transformSegment(segment, el.attributes.transform))
		.map(segment => ({ ...el, segment })));
const containsStylesheet = (svgElement) => flattenDomTree(svgElement)
	.map(el => el.nodeName === "style")
	.reduce((a, b) => a || b, false);
const svgSegments = (svg) => {
	const svgElement = typeof svg === "string"
		? xmlStringToElement(svg, "image/svg+xml")
		: svg;
	if (containsStylesheet(svgElement) && isBackend) {
		console.warn(Messages.backendStylesheet);
	}
	const parent = getRootParent(svgElement) === RabbitEarWindow().document
		? undefined
		: invisibleParent(svgElement);
	const segments = flatSegments(svgElement);
	const segmentsWithAttrs = segments.map(el => ({
		data: {
			assignment: el.attributes["data-assignment"],
			foldAngle: el.attributes["data-foldAngle"],
		},
		stroke: getEdgeStroke(el.element, el.attributes),
		opacity: getEdgeOpacity(el.element, el.attributes),
	})).map((addition, i) => ({
		...segments[i],
		...addition,
	}));
	if (parent && parent.parentNode) {
		parent.parentNode.removeChild(parent);
	}
	return segmentsWithAttrs;
};
const getUserAssignmentOptions = (options) => {
	if (!options || !options.assignments) { return undefined; }
	const assignments = {};
	Object.keys(options.assignments).forEach(key => {
		const hex = parseColorToHex(key).toUpperCase();
		assignments[hex] = options.assignments[key];
	});
	return assignments;
};
const getEdgeAssignment = (dataAssignment, stroke = "#f0f", customAssignments = undefined) => {
	if (dataAssignment) { return dataAssignment; }
	return colorToAssignment(stroke, customAssignments);
};
const getEdgeFoldAngle = (dataFoldAngle, opacity = 1, assignment = undefined) => {
	if (dataFoldAngle) { return parseFloat(dataFoldAngle); }
	return opacityToFoldAngle(opacity, assignment);
};
const makeAssignmentFoldAngle = (segments, options) => {
	const customAssignments = getUserAssignmentOptions(options);
	if (customAssignments) {
		segments.forEach(seg => {
			delete seg.data.assignment;
			delete seg.data.foldAngle;
		});
	}
	const edges_assignment = segments.map(segment => getEdgeAssignment(
		segment.data.assignment,
		segment.stroke,
		customAssignments,
	));
	const edges_foldAngle = segments.map((segment, i) => getEdgeFoldAngle(
		segment.data.foldAngle,
		segment.opacity,
		edges_assignment[i],
	));
	return {
		edges_assignment,
		edges_foldAngle,
	};
};
const passthrough = (n) => n;
const svgEdgeGraph = (svg, options) => {
	const segments = svgSegments(svg);
	const {
		edges_assignment,
		edges_foldAngle,
	} = makeAssignmentFoldAngle(segments, options);
	const fixNumber = options && options.fast ? passthrough : cleanNumber;
	const vertices_coords = segments
		.flatMap(el => el.segment)
		.map(([a, b]) => [fixNumber(a, 12), fixNumber(b, 12)]);
	const edges_vertices = segments.map((_, i) => [i * 2, i * 2 + 1]);
	return {
		vertices_coords,
		edges_vertices,
		edges_assignment,
		edges_foldAngle,
	};
};
const svgToFold = (file, options) => {
	const graph = svgEdgeGraph(file, options);
	const epsilon = findEpsilonInObject(graph, options);
	if (options && options.invertVertical && graph.vertices_coords) {
		invertVertical(graph.vertices_coords);
	}
	const planarGraph = planarizeGraph(graph, epsilon);
	const fixNumber = options && options.fast ? passthrough : cleanNumber;
	planarGraph.vertices_coords = planarGraph.vertices_coords
		.map(coord => coord.map(n => fixNumber(n, 12)))
		.map(resize2);
	if (typeof options !== "object" || options.boundary !== false) {
		planarGraph.edges_assignment
			.map((_, i) => i)
			.filter(i => planarGraph.edges_assignment[i] === "B"
				|| planarGraph.edges_assignment[i] === "b")
			.forEach(i => { planarGraph.edges_assignment[i] = "F"; });
		const { edges } = planarBoundary(planarGraph);
		edges.forEach(e => { planarGraph.edges_assignment[e] = "B"; });
	}
	return {
		file_spec,
		file_creator,
		frame_classes: ["creasePattern"],
		...planarGraph,
	};
};

export { svgEdgeGraph, svgSegments, svgToFold };
