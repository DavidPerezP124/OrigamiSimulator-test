/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { isFoldedForm } from '../../fold/spec.js';
import { makeFacesWinding } from '../../graph/faces/winding.js';
import { linearize2DFaces } from '../../graph/orders.js';
import { addClass } from '../../svg/general/dom.js';
import SVG from '../../svg/index.js';
import { setKeysAndValues } from '../general/svg.js';

const facesSideNames = ["front", "back"];
const FACE_STYLE = {
	foldedForm: {
		ordered: {
			back: { fill: "white" },
			front: { fill: "#ddd" },
		},
		unordered: {
			back: { opacity: 0.1 },
			front: { opacity: 0.1 },
		},
	},
	creasePattern: {},
};
const GROUP_STYLE = {
	foldedForm: {
		ordered: {
			stroke: "black",
			"stroke-linejoin": "bevel",
		},
		unordered: {
			stroke: "none",
			fill: "black",
			"stroke-linejoin": "bevel",
		},
	},
	creasePattern: {
		fill: "none",
	},
};
const finalize_faces = (graph, svg_faces, group, options = {}) => {
	const isFolded = isFoldedForm(graph);
	const orderIsCertain = !!(graph.faceOrders || graph.faces_layer);
	const faces_winding = makeFacesWinding(graph);
	faces_winding
		.map(w => (w ? facesSideNames[0] : facesSideNames[1]))
		.forEach((className, i) => {
			addClass(svg_faces[i], className);
			svg_faces[i].setAttribute("data-side", className);
			const foldedFaceStyle = orderIsCertain
				? FACE_STYLE.foldedForm.ordered[className]
				: FACE_STYLE.foldedForm.unordered[className];
			const faceStyle = isFolded
				? foldedFaceStyle
				: FACE_STYLE.creasePattern[className];
			setKeysAndValues(svg_faces[i], faceStyle);
			setKeysAndValues(svg_faces[i], options[className]);
		});
	linearize2DFaces(graph).forEach(f => group.appendChild(svg_faces[f]));
	const groupStyleFolded = orderIsCertain
		? GROUP_STYLE.foldedForm.ordered
		: GROUP_STYLE.foldedForm.unordered;
	setKeysAndValues(group, isFolded ? groupStyleFolded : GROUP_STYLE.creasePattern);
	return group;
};
const facesVerticesPolygon = (graph, options) => {
	const svg_faces = graph.faces_vertices
		.map(fv => fv.map(v => [0, 1].map(i => graph.vertices_coords[v][i])))
		.map(face => SVG.polygon(face));
	svg_faces.forEach((face, i) => face.setAttributeNS(null, "index", i));
	return finalize_faces(graph, svg_faces, SVG.g(), options);
};
const facesEdgesPolygon = function (graph, options) {
	const svg_faces = graph.faces_edges
		.map(face_edges => face_edges
			.map(edge => graph.edges_vertices[edge])
			.map((vi, i, arr) => {
				const next = arr[(i + 1) % arr.length];
				return (vi[1] === next[0] || vi[1] === next[1] ? vi[0] : vi[1]);
			}).map(v => [0, 1].map(i => graph.vertices_coords[v][i])))
		.map(face => SVG.polygon(face));
	svg_faces.forEach((face, i) => face.setAttributeNS(null, "index", i));
	return finalize_faces(graph, svg_faces, SVG.g(), options);
};
const drawFaces = (graph, options) => {
	if (graph && graph.vertices_coords && graph.faces_vertices) {
		return facesVerticesPolygon(graph, options);
	}
	if (graph && graph.vertices_coords && graph.edges_vertices && graph.faces_edges) {
		return facesEdgesPolygon(graph, options);
	}
	return SVG.g();
};

export { drawFaces, facesEdgesPolygon, facesVerticesPolygon };
