/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { uniqueElements } from '../../general/array.js';

const makeVerticesFacesForVertex = (
	{ vertices_vertices, vertices_edges, edges_vertices },
	vertex,
	verticesToFace,
) => {
	if (vertices_vertices) {
		return vertices_vertices[vertex]
			.map(v => [vertex, v].join(" "))
			.map(key => verticesToFace[key]);
	}
	if (vertices_edges && edges_vertices) {
		return vertices_edges[vertex]
			.map(edge => edges_vertices[edge])
			.map(([a, b]) => (vertex === a ? [vertex, b] : [vertex, a]))
			.map(pair => pair.join(" "))
			.map(key => verticesToFace[key]);
	}
	return undefined;
};
const makeFacesEdgesForVertex = (
	{ faces_vertices },
	faces,
	verticesToEdge,
) => (faces
	.map(f => faces_vertices[f]
		.map((vertex, i, arr) => [vertex, arr[(i + 1) % arr.length]])
		.map(pair => pair.join(" "))
		.map(key => verticesToEdge[key])));
const filterFacesWithTwoMatches = ({ faces_vertices }, faces, verticesHash) => (faces
	.filter(face => new Set(faces_vertices[face].filter(v => verticesHash[v])).size === 2));
const makeEdgesFacesForEdge = (
	{ vertices_faces, edges_vertices, edges_faces, faces_vertices, faces_edges },
	edge,
) => {
	if (edges_faces && edges_faces[edge]) { return edges_faces[edge]; }
	if (!edges_vertices) { return []; }
	if (faces_vertices) {
		const vertexHash = {
			[edges_vertices[edge][0]]: true,
			[edges_vertices[edge][1]]: true,
		};
		const faces = (vertices_faces
			? uniqueElements(edges_vertices[edge].flatMap(v => vertices_faces[v]))
			: faces_vertices.map((_, f) => f));
		return filterFacesWithTwoMatches({ faces_vertices }, faces, vertexHash);
	}
	if (faces_edges) {
		return faces_edges
			.map((_, f) => f)
			.filter(face => faces_edges[face].includes(edge));
	}
	return [];
};

export { makeEdgesFacesForEdge, makeFacesEdgesForVertex, makeVerticesFacesForVertex };
