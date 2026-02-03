/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { edgesAssignmentNames, assignmentFlatFoldAngle, edgesAssignmentValues, edgesFoldAngleAreAllFlat, sortEdgesByAssignment, isFoldedForm } from '../../fold/spec.js';
import { assignmentColor } from '../../fold/colors.js';
import { makeEdgesCoords } from '../../graph/make/edges.js';
import { addClass } from '../../svg/general/dom.js';
import SVG from '../../svg/index.js';
import { clone } from '../../general/clone.js';
import { setKeysAndValues } from '../general/svg.js';

const GROUP_STYLE = {
	foldedForm: {},
	creasePattern: { stroke: "black" },
};
const EDGE_STYLE = {
	foldedForm: {},
	creasePattern: {},
};
Object.keys(assignmentColor).forEach(key => {
	EDGE_STYLE.creasePattern[key] = { stroke: assignmentColor[key] };
});
const setDataValue = (el, key, value) => el.setAttribute(`data-${key}`, value);
const segmentToPath = s => `M${s[0][0]} ${s[0][1]}L${s[1][0]} ${s[1][1]}`;
const edgesPathData = (graph) => (
	graph.vertices_coords && graph.edges_vertices
		? makeEdgesCoords(graph).map(segment => segmentToPath(segment)).join("")
		: ""
);
const edgesPathsByAssignment = ({
	vertices_coords, edges_vertices, edges_assignment,
}) => {
	if (!vertices_coords || !edges_vertices) { return {}; }
	if (!edges_assignment) {
		return { U: edgesPathData({ vertices_coords, edges_vertices }) };
	}
	const assignmentEdges = sortEdgesByAssignment({
		vertices_coords, edges_vertices, edges_assignment,
	});
	Object.keys(assignmentEdges).forEach(key => {
		if (!assignmentEdges[key].length) { delete assignmentEdges[key]; }
	});
	const assignmentPaths = {};
	Object.keys(assignmentEdges).forEach(assignment => {
		const pathString = edgesPathData({
			vertices_coords,
			edges_vertices: assignmentEdges[assignment].map(i => edges_vertices[i]),
		});
		assignmentPaths[assignment] = SVG.path(pathString);
	});
	return assignmentPaths;
};
const nonAssignmentObject = (object) => {
	const copy = clone(object);
	Object.keys(copy)
		.filter(key => edgesAssignmentNames[key] !== undefined)
		.forEach(key => delete copy[key]);
	return copy;
};
const objectWithPrimitiveValues = (object) => {
	const valid = { boolean: true, number: true, string: true };
	const copy = clone(object);
	Object.keys(copy)
		.filter(key => !valid[typeof copy[key]])
		.forEach(key => delete copy[key]);
	return copy;
};
const getStyles = (graph, options) => {
	const foldedClass = isFoldedForm(graph) ? "foldedForm" : "creasePattern";
	const groupStyle = clone(GROUP_STYLE[foldedClass]);
	const edgeStyle = clone(EDGE_STYLE[foldedClass]);
	const override = objectWithPrimitiveValues(nonAssignmentObject(options));
	Object.assign(groupStyle, override);
	edgesAssignmentValues.forEach(key => {
		edgeStyle[key] = { ...edgeStyle[key], ...override };
	});
	return {
		groupStyle,
		edgeStyle,
	};
};
const edgesPaths = (graph, options = {}) => {
	const group = SVG.g();
	if (!graph) { return group; }
	const {
		groupStyle,
		edgeStyle,
	} = getStyles(graph, options);
	const paths = edgesPathsByAssignment(graph);
	Object.keys(paths).forEach(key => {
		addClass(paths[key], edgesAssignmentNames[key]);
		setKeysAndValues(paths[key], edgeStyle[key]);
		setKeysAndValues(paths[key], options[key]);
		setKeysAndValues(paths[key], options[edgesAssignmentNames[key]]);
	});
	setKeysAndValues(group, groupStyle);
	Object.keys(paths).forEach(key => group.appendChild(paths[key]));
	Object.keys(paths)
		.forEach(assign => setDataValue(paths[assign], "assignment", assign));
	Object.keys(paths)
		.forEach(assign => setDataValue(paths[assign], "foldAngle", assignmentFlatFoldAngle[assign]));
	return group;
};
const angleToOpacity = (foldAngle) => String(Math.abs(foldAngle) / 180);
const edgesLines = (graph, options = {}) => {
	const group = SVG.g();
	if (!graph) { return group; }
	const {
		groupStyle,
		edgeStyle,
	} = getStyles(graph, options);
	const groupsByAssignment = {};
	Array.from(new Set(edgesAssignmentValues.map(s => s.toUpperCase())))
		.forEach(assign => {
			const assignmentGroup = SVG.g();
			addClass(assignmentGroup, edgesAssignmentNames[assign]);
			setKeysAndValues(assignmentGroup, edgeStyle[assign]);
			setKeysAndValues(assignmentGroup, options[assign]);
			setKeysAndValues(assignmentGroup, options[edgesAssignmentNames[assign]]);
			groupsByAssignment[assign] = assignmentGroup;
		});
	const lines = makeEdgesCoords(graph)
		.map(s => SVG.line(s[0][0], s[0][1], s[1][0], s[1][1]));
	if (graph.edges_foldAngle) {
		graph.edges_foldAngle
			.forEach((angle, i) => setDataValue(lines[i], "foldAngle", angle));
	}
	if (graph.edges_assignment) {
		graph.edges_assignment
			.forEach((assign, i) => setDataValue(lines[i], "assignment", assign));
	}
	if (graph.edges_foldAngle) {
		lines.forEach((line, i) => {
			const angle = graph.edges_foldAngle[i];
			if (angle === undefined
				|| angle === null
				|| angle === 0
				|| angle === 180
				|| angle === -180) { return; }
			line.setAttributeNS(null, "opacity", angleToOpacity(angle));
		});
	}
	if (graph.edges_assignment) {
		lines.forEach((line, i) => {
			const assignment = graph.edges_assignment[i] || "U";
			groupsByAssignment[assignment].appendChild(line);
		});
	} else {
		lines.forEach(line => groupsByAssignment.U.appendChild(line));
	}
	Object.keys(groupsByAssignment)
		.filter(key => groupsByAssignment[key].childNodes.length)
		.forEach(key => group.appendChild(groupsByAssignment[key]));
	setKeysAndValues(group, groupStyle);
	return group;
};
const drawEdges = (graph, options) => (
	edgesFoldAngleAreAllFlat(graph)
		? edgesPaths(graph, options)
		: edgesLines(graph, options)
);

export { drawEdges, edgesLines, edgesPaths };
