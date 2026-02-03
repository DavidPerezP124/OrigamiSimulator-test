/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { file_spec, file_creator } from '../fold/rabbitear.js';
import { makeVerticesVerticesFromFaces } from '../graph/make/verticesVertices.js';
import { makeEdgesFacesUnsorted } from '../graph/make/edgesFaces.js';
import { makeEdgesFoldAngleFromFaces } from '../graph/make/edgesFoldAngle.js';
import { makeEdgesAssignment } from '../graph/make/edgesAssignment.js';
import { makeFacesEdgesFromVertices } from '../graph/make/facesEdges.js';

const newFoldFile = () => ({
	file_spec: file_spec,
	file_creator: file_creator,
	file_classes: ["singleModel"],
	frame_classes: [],
	frame_attributes: [],
	vertices_coords: [],
	faces_vertices: [],
});
const updateMetadata = (graph) => {
	if (!graph.edges_foldAngle || !graph.edges_foldAngle.length) { return; }
	let is2D = true;
	for (let i = 0; i < graph.edges_foldAngle.length; i += 1) {
		if (graph.edges_foldAngle[i] !== 0
			&& graph.edges_foldAngle[i] !== -180
			&& graph.edges_foldAngle[i] !== 180) {
			is2D = false;
			break;
		}
	}
	graph.frame_classes.push(is2D ? "creasePattern" : "foldedForm");
	graph.frame_attributes.push(is2D ? "2D" : "3D");
};
const pairify = (list) => list
	.map((val, i, arr) => [val, arr[(i + 1) % arr.length]]);
const makeEdgesVertices = ({ faces_vertices }) => {
	const edgeExists = {};
	const edges_vertices = [];
	faces_vertices
		.flatMap(pairify)
		.forEach(edge => {
			const keys = [edge.join(" "), `${edge[1]} ${edge[0]}`];
			if (keys[0] in edgeExists || keys[1] in edgeExists) { return; }
			edges_vertices.push(edge);
			edgeExists[keys[0]] = true;
		});
	return edges_vertices;
};
const parseFace = (face) => face
	.slice(1)
	.map(str => parseInt(str, 10) - 1);
const parseVertex = (vertex) => {
	const [a, b, c] = vertex.slice(1).map(str => parseFloat(str));
	return [a || 0, b || 0, c || 0];
};
const objToFold = (file) => {
	const lines = file.split("\n").map(line => line.trim().split(/\s+/));
	const graph = newFoldFile();
	const linesCharKey = lines
		.map(line => line[0].toLowerCase());
	graph.vertices_coords = lines
		.filter((_, i) => linesCharKey[i] === "v")
		.map(parseVertex);
	graph.faces_vertices = lines
		.filter((_, i) => linesCharKey[i] === "f")
		.map(parseFace);
	graph.edges_vertices = makeEdgesVertices(graph);
	graph.faces_edges = makeFacesEdgesFromVertices(graph);
	graph.edges_faces = makeEdgesFacesUnsorted(graph);
	graph.edges_foldAngle = makeEdgesFoldAngleFromFaces(graph);
	graph.edges_assignment = makeEdgesAssignment(graph);
	graph.vertices_vertices = makeVerticesVerticesFromFaces(graph);
	delete graph.edges_faces;
	updateMetadata(graph);
	return graph;
};

export { objToFold };
