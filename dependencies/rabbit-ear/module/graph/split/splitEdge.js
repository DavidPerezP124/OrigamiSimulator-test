/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { midpoint } from '../../math/vector.js';
import { makeVerticesToFace, makeVerticesToEdge } from '../make/lookup.js';
import { remove } from '../remove.js';
import { makeEdgesFacesForEdge, makeVerticesFacesForVertex, makeFacesEdgesForVertex } from './general.js';

const makeNewEdges = (graph, edgeIndex, newVertex) => {
	const edge_vertices = graph.edges_vertices[edgeIndex];
	const new_edges = [
		{ edges_vertices: [edge_vertices[0], newVertex] },
		{ edges_vertices: [newVertex, edge_vertices[1]] },
	];
	new_edges.forEach(edgeDef => ["edges_assignment", "edges_foldAngle"]
		.filter(key => graph[key] && graph[key][edgeIndex] !== undefined)
		.forEach(key => { edgeDef[key] = graph[key][edgeIndex]; }));
	return new_edges;
};
const updateVerticesVertices = (
	{ vertices_vertices },
	vertex,
	vertices,
) => {
	if (!vertices_vertices) { return; }
	vertices_vertices[vertex] = [...vertices];
	const verticesSpliceIndex = vertices
		.map((v, i, arr) => vertices_vertices[v].indexOf(arr[(i + 1) % arr.length]));
	vertices.forEach((v, i) => (verticesSpliceIndex[i] === -1
		? vertices_vertices[v].push(vertex)
		: vertices_vertices[v].splice(verticesSpliceIndex[i], 1, vertex)));
};
const updateVerticesEdges = (
	{ vertices_edges },
	oldEdge,
	newVertex,
	vertices,
	newEdges,
) => {
	if (!vertices_edges) { return; }
	vertices_edges[newVertex] = [...newEdges];
	vertices
		.map(vertex => vertices_edges[vertex].indexOf(oldEdge))
		.map((index, i) => ({ index, vertex: vertices[i], edge: newEdges[i] }))
		.filter(el => el.index !== -1)
		.forEach(({ index, vertex, edge }) => {
			vertices_edges[vertex][index] = edge;
		});
};
const updateVerticesFaces = (
	{ vertices_vertices, vertices_edges, vertices_faces, edges_vertices, faces_vertices },
	vertex,
	faces,
) => {
	if (!vertices_faces) { return; }
	if (!faces_vertices) {
		vertices_faces[vertex] = [...faces];
		return;
	}
	const verticesToFace = makeVerticesToFace({ faces_vertices }, faces);
	const vertex_faces = makeVerticesFacesForVertex(
		{ vertices_vertices, vertices_edges, edges_vertices },
		vertex,
		verticesToFace,
	);
	vertices_faces[vertex] = vertex_faces === undefined
		? [...faces]
		: vertex_faces;
};
const updateEdgesFaces = ({ edges_faces }, newEdges, faces) => {
	if (!edges_faces) { return; }
	newEdges.forEach(edge => { edges_faces[edge] = [...faces]; });
};
const updateFacesVertices = ({ faces_vertices }, newVertex, incidentVertices, faces) => {
	if (!faces_vertices) { return; }
	const matchFound = (a, b) => (
		(a === incidentVertices[0] && b === incidentVertices[1])
		|| (a === incidentVertices[1] && b === incidentVertices[0]));
	faces
		.map(i => faces_vertices[i])
		.forEach(face_vertices => face_vertices
			.map((vertex, i, arr) => (matchFound(vertex, arr[(i + 1) % arr.length])
				? (i + 1) % arr.length
				: undefined))
			.filter(a => a !== undefined)
			.sort((a, b) => b - a)
			.forEach(i => face_vertices.splice(i, 0, newVertex)));
};
const updateFacesEdges = (
	{ edges_vertices, faces_vertices, faces_edges },
	faces,
	newEdges,
) => {
	if (!faces_edges || !faces_vertices) { return; }
	const allEdges = faces
		.flatMap(f => faces_edges[f])
		.concat(newEdges)
		.filter(a => a !== undefined);
	const verticesToEdge = makeVerticesToEdge({ edges_vertices }, allEdges);
	makeFacesEdgesForVertex({ faces_vertices }, faces, verticesToEdge)
		.forEach((edges, i) => { faces_edges[faces[i]] = edges; });
};
const updateFacesFaces = ({ faces_vertices, faces_faces }, vertex, faces) => {
	if (!faces_vertices || !faces_faces) { return; }
	const facesSpliceIndex = faces
		.map(f => faces_vertices[f].indexOf(vertex));
	const facesGrabIndex = facesSpliceIndex
		.map((index, i) => (index + faces_faces[faces[i]].length - 1)
			% faces_faces[faces[i]].length);
	const facesCopyItem = facesGrabIndex
		.map((index, i) => faces_faces[faces[i]][index]);
	faces.forEach((f, i) => (facesSpliceIndex[i] === -1
		? undefined
		: faces_faces[f].splice(facesSpliceIndex[i], 0, facesCopyItem[i])));
};
const splitEdge = (
	graph,
	oldEdge,
	coords = undefined,
) => {
	const incidentVertices = graph.edges_vertices[oldEdge];
	if (!coords) {
		const [a, b] = incidentVertices.map(v => graph.vertices_coords[v]);
		coords = midpoint(a, b);
	}
	const vertex = graph.vertices_coords.length;
	graph.vertices_coords[vertex] = coords.length === 3
		? [coords[0], coords[1], coords[2]]
		: [coords[0], coords[1]];
	const [e0, e1] = [0, 1].map(i => i + graph.edges_vertices.length);
	const newEdges = [e0, e1];
	makeNewEdges(graph, oldEdge, vertex)
		.forEach((edge, i) => Object.keys(edge)
			.forEach((key) => { graph[key][newEdges[i]] = edge[key]; }));
	updateVerticesVertices(graph, vertex, incidentVertices);
	updateVerticesEdges(graph, oldEdge, vertex, incidentVertices, newEdges);
	const incidentFaces = makeEdgesFacesForEdge(graph, oldEdge)
		.filter(a => a !== undefined);
	updateFacesVertices(graph, vertex, incidentVertices, incidentFaces);
	updateFacesEdges(graph, incidentFaces, newEdges);
	updateVerticesFaces(graph, vertex, incidentFaces);
	updateEdgesFaces(graph, newEdges, incidentFaces);
	updateFacesFaces(graph, vertex, incidentFaces);
	const edgeMap = remove(graph, "edges", [oldEdge]);
	newEdges.forEach((_, i) => { newEdges[i] = edgeMap[newEdges[i]]; });
	const edgesMap = edgeMap.slice();
	edgesMap.splice(-2);
	edgesMap[oldEdge] = newEdges;
	return {
		vertex,
		edges: {
			map: edgesMap,
			add: newEdges,
			remove: oldEdge,
		},
	};
};

export { splitEdge };
