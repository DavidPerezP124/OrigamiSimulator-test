/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { epsilonEqual } from '../math/compare.js';
import { doEdgesOverlap } from '../graph/edges/overlap.js';

const foldKeys = {
	file: [
		"file_spec",
		"file_creator",
		"file_author",
		"file_title",
		"file_description",
		"file_classes",
		"file_frames",
	],
	frame: [
		"frame_author",
		"frame_title",
		"frame_description",
		"frame_attributes",
		"frame_classes",
		"frame_unit",
		"frame_parent",
		"frame_inherit",
	],
	graph: [
		"vertices_coords",
		"vertices_vertices",
		"vertices_edges",
		"vertices_faces",
		"edges_vertices",
		"edges_faces",
		"edges_assignment",
		"edges_foldAngle",
		"edges_length",
		"faces_vertices",
		"faces_edges",
		"faces_faces",
	],
	orders: [
		"edgeOrders",
		"faceOrders",
	],
};
const foldFileClasses = [
	"singleModel",
	"multiModel",
	"animation",
	"diagrams",
];
const foldFrameClasses = [
	"creasePattern",
	"foldedForm",
	"graph",
	"linkage",
];
const foldFrameAttributes = [
	"2D",
	"3D",
	"abstract",
	"manifold",
	"nonManifold",
	"orientable",
	"nonOrientable",
	"selfTouching",
	"nonSelfTouching",
	"selfIntersecting",
	"nonSelfIntersecting",
];
const VEF = ["vertices", "edges", "faces"];
const edgesAssignmentValues = Array.from("BbMmVvFfJjCcUu");
const edgesAssignmentNames = {
	B: "boundary",
	M: "mountain",
	V: "valley",
	F: "flat",
	J: "join",
	C: "cut",
	U: "unassigned",
};
Object.keys(edgesAssignmentNames).forEach(key => {
	edgesAssignmentNames[key.toLowerCase()] = edgesAssignmentNames[key];
});
const assignmentFlatFoldAngle = {
	B: 0,
	b: 0,
	M: -180,
	m: -180,
	V: 180,
	v: 180,
	F: 0,
	f: 0,
	J: 0,
	j: 0,
	C: 0,
	c: 0,
	U: 0,
	u: 0,
};
const assignmentCanBeFolded = {
	B: false,
	b: false,
	M: true,
	m: true,
	V: true,
	v: true,
	F: false,
	f: false,
	J: false,
	j: false,
	C: false,
	c: false,
	U: true,
	u: true,
};
const assignmentIsBoundary = {
	B: true,
	b: true,
	M: false,
	m: false,
	V: false,
	v: false,
	F: false,
	f: false,
	J: false,
	j: false,
	C: true,
	c: true,
	U: false,
	u: false,
};
const edgeAssignmentToFoldAngle = (assignment) => (
	assignmentFlatFoldAngle[assignment] || 0
);
const edgeFoldAngleToAssignment = (angle) => {
	if (angle > EPSILON) { return "V"; }
	if (angle < -EPSILON) { return "M"; }
	return "U";
};
const edgeFoldAngleIsFlatFolded = (angle) => (
	epsilonEqual(-180, angle) || epsilonEqual(180, angle)
);
const edgeFoldAngleIsFlat = (angle) => (
	epsilonEqual(0, angle) || edgeFoldAngleIsFlatFolded(angle)
);
const edgesFoldAngleAreAllFlat = ({ edges_foldAngle }) => {
	if (!edges_foldAngle) { return true; }
	for (let i = 0; i < edges_foldAngle.length; i += 1) {
		if (!edgeFoldAngleIsFlat(edges_foldAngle[i])) { return false; }
	}
	return true;
};
const filterKeys = (obj, matchFunction) => Object
	.keys(obj)
	.filter(key => matchFunction(key));
const filterKeysWithPrefix = (obj, prefix) => filterKeys(
	obj,
	s => s.substring(0, prefix.length + 1) === `${prefix}_`,
);
const filterKeysWithSuffix = (obj, suffix) => filterKeys(
	obj,
	s => s.substring(s.length - suffix.length - 1, s.length) === `_${suffix}`,
);
const getAllPrefixes = (obj) => {
	const hash = {};
	Object.keys(obj)
		.filter(s => s.includes("_"))
		.map(k => k.substring(0, k.indexOf("_")))
		.forEach(k => { hash[k] = true; });
	return Object.keys(hash);
};
const getAllSuffixes = (obj) => {
	const hash = {};
	Object.keys(obj)
		.filter(s => s.includes("_"))
		.map(k => k.substring(k.lastIndexOf("_") + 1, k.length))
		.forEach(k => { hash[k] = true; });
	return Object.keys(hash);
};
const transposeGraphArrays = (graph, geometry_key) => {
	const matching_keys = filterKeysWithPrefix(graph, geometry_key);
	if (matching_keys.length === 0) { return []; }
	const len = Math.max(...matching_keys.map(arr => graph[arr].length));
	const geometry = Array.from(Array(len))
		.map(() => ({}));
	matching_keys
		.forEach(key => geometry
			.forEach((_, i) => { geometry[i][key] = graph[key][i]; }));
	return geometry;
};
const transposeGraphArrayAtIndex = (
	graph,
	geometry_key,
	index,
) => {
	const matching_keys = filterKeysWithPrefix(graph, geometry_key);
	if (matching_keys.length === 0) { return undefined; }
	const geometry = {};
	matching_keys.forEach((key) => { geometry[key] = graph[key][index]; });
	return geometry;
};
const allFOLDKeys = Object.freeze([]
	.concat(foldKeys.file)
	.concat(foldKeys.frame)
	.concat(foldKeys.graph)
	.concat(foldKeys.orders));
const isFoldObject = (object = {}) => (
	Object.keys(object).length === 0
		? 0
		: allFOLDKeys
			.filter(key => object[key]).length / Object.keys(object).length);
const getDimension = ({ vertices_coords }, epsilon = EPSILON) => {
	for (let i = 0; i < vertices_coords.length; i += 1) {
		if (vertices_coords[i] && vertices_coords[i].length === 3
			&& !epsilonEqual(0, vertices_coords[i][2], epsilon)) {
			return 3;
		}
	}
	return 2;
};
const getDimensionQuick = ({ vertices_coords }) => {
	if (!vertices_coords || !vertices_coords.length) { return undefined; }
	if (vertices_coords[0] !== undefined) {
		return vertices_coords[0].length;
	}
	const vertex = vertices_coords.filter(() => true).shift();
	if (!vertex) { return undefined; }
	return vertex.length;
};
const isFoldedForm = ({
	vertices_coords, edges_vertices, faces_vertices, faces_edges,
	frame_classes, file_classes,
}, epsilon = EPSILON) => {
	if ((frame_classes && frame_classes.includes("foldedForm"))
		|| (file_classes && file_classes.includes("foldedForm"))) {
		return true;
	}
	if ((frame_classes && frame_classes.includes("creasePattern"))
		|| (file_classes && file_classes.includes("creasePattern"))) {
		return false;
	}
	if (!vertices_coords) { return false; }
	const dimensions = getDimensionQuick({ vertices_coords });
	if (!faces_vertices && !faces_edges) {
		return dimensions === 3;
	}
	if (edges_vertices && dimensions === 2) {
		return doEdgesOverlap({ vertices_coords, edges_vertices });
	}
	for (let i = 0; i < vertices_coords.length; i += 1) {
		if (!vertices_coords[i]) { continue; }
		if (typeof vertices_coords[i][2] !== "number") { continue; }
		if (!epsilonEqual(vertices_coords[i][2], 0, epsilon)) { return true; }
	}
	return dimensions === 3;
};
const makeEdgesIsFolded = ({ edges_vertices, edges_foldAngle, edges_assignment }) => {
	if (edges_assignment === undefined) {
		return edges_foldAngle === undefined
			? edges_vertices.map(() => true)
			: edges_foldAngle.map(angle => angle < -EPSILON || angle > EPSILON);
	}
	return edges_assignment.map(a => assignmentCanBeFolded[a]);
};
const flipAssignmentLookup = { M: "V", m: "v", V: "M", v: "m" };
const invertAssignment = (assign) => (
	flipAssignmentLookup[assign] || assign
);
const invertAssignments = (graph) => {
	if (graph.edges_assignment) {
		graph.edges_assignment = graph.edges_assignment
			.map(a => (flipAssignmentLookup[a] ? flipAssignmentLookup[a] : a));
	}
	if (graph.edges_foldAngle) {
		graph.edges_foldAngle = graph.edges_foldAngle.map(n => -n);
	}
	return graph;
};
const sortEdgesByAssignment = ({ edges_vertices, edges_assignment = [] }) => {
	const allAssignments = Array
		.from(new Set(edgesAssignmentValues.map(s => s.toUpperCase())));
	const edges_upperAssignment = edges_vertices
		.map((_, i) => edges_assignment[i] || "U")
		.map(a => a.toUpperCase());
	const assignmentIndices = {};
	allAssignments.forEach(a => { assignmentIndices[a] = []; });
	edges_upperAssignment.forEach((a, i) => assignmentIndices[a].push(i));
	return assignmentIndices;
};
const getFileMetadata = (FOLD = {}) => {
	const metadata = {};
	foldKeys.file
		.filter(key => key !== "file_frames")
		.filter(key => FOLD[key] !== undefined)
		.forEach(key => { metadata[key] = FOLD[key]; });
	return metadata;
};

export { VEF, assignmentCanBeFolded, assignmentFlatFoldAngle, assignmentIsBoundary, edgeAssignmentToFoldAngle, edgeFoldAngleIsFlat, edgeFoldAngleIsFlatFolded, edgeFoldAngleToAssignment, edgesAssignmentNames, edgesAssignmentValues, edgesFoldAngleAreAllFlat, filterKeysWithPrefix, filterKeysWithSuffix, foldFileClasses, foldFrameAttributes, foldFrameClasses, foldKeys, getAllPrefixes, getAllSuffixes, getDimension, getDimensionQuick, getFileMetadata, invertAssignment, invertAssignments, isFoldObject, isFoldedForm, makeEdgesIsFolded, sortEdgesByAssignment, transposeGraphArrayAtIndex, transposeGraphArrays };
