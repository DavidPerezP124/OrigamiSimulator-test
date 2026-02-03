/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeVerticesEdgesUnsorted } from './verticesEdges.js';
import { makeVerticesFacesUnsorted } from './verticesFaces.js';
import { sortVerticesCounterClockwise } from '../vertices/sort.js';

const makeVerticesVertices2D = ({ vertices_coords, vertices_edges, edges_vertices }) => {
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const vertices_vertices = vertices_edges
		.map((edges, v) => edges
			.map(edge => edges_vertices[edge]
				.filter(i => i !== v))
			.reduce((a, b) => a.concat(b), []));
	return vertices_coords === undefined
		? vertices_vertices
		: vertices_vertices
			.map((verts, i) => sortVerticesCounterClockwise({ vertices_coords }, verts, i));
};
const makeVerticesVerticesFromFaces = ({
	vertices_coords, vertices_faces, faces_vertices,
}) => {
	if (!vertices_faces) {
		vertices_faces = makeVerticesFacesUnsorted({ vertices_coords, faces_vertices });
	}
	const vertices_faces_vertices = vertices_faces
		.map(faces => faces.map(f => faces_vertices[f]));
	const vertices_faces_indexOf = vertices_faces_vertices
		.map((faces, vertex) => faces.map(verts => verts.indexOf(vertex)));
	const vertices_faces_threeIndices = vertices_faces_vertices
		.map((faces, vertex) => faces.map((verts, j) => [
			(vertices_faces_indexOf[vertex][j] + verts.length - 1) % verts.length,
			vertices_faces_indexOf[vertex][j],
			(vertices_faces_indexOf[vertex][j] + 1) % verts.length,
		]));
	const vertices_faces_threeVerts = vertices_faces_threeIndices
		.map((faces, vertex) => faces
			.map((indices, j) => indices
				.map(index => vertices_faces_vertices[vertex][j][index])));
	const vertices_verticesLookup = vertices_faces_threeVerts.map(faces => {
		const facesVerts = faces
			.map(verts => [[0, 1], [1, 2]]
				.map(p => p.map(x => verts[x]).join(" ")));
		const from = {};
		const to = {};
		facesVerts.forEach((keys, i) => {
			from[keys[0]] = i;
			to[keys[1]] = i;
		});
		return { facesVerts, to, from };
	});
	return vertices_verticesLookup.map(lookup => {
		const toKeys = Object.keys(lookup.to);
		const toKeysInverse = toKeys
			.map(key => key.split(" ").reverse().join(" "));
		const holeKeys = toKeys
			.filter((_, i) => !(toKeysInverse[i] in lookup.from));
		if (holeKeys.length > 2) {
			console.warn("vertices_vertices found an unsolvable vertex");
			return [];
		}
		const startKeys = holeKeys.length
			? holeKeys
			: [toKeys[0]];
		const vertex_vertices = [];
		const visited = {};
		for (let s = 0; s < startKeys.length; s += 1) {
			const startKey = startKeys[s];
			const walk = [startKey];
			visited[startKey] = true;
			let isDone = false;
			do {
				const prev = walk[walk.length - 1];
				const faceIndex = lookup.to[prev];
				if (!(faceIndex in lookup.facesVerts)) { break; }
				let nextKey;
				if (lookup.facesVerts[faceIndex][0] === prev) {
					nextKey = lookup.facesVerts[faceIndex][1];
				}
				if (lookup.facesVerts[faceIndex][1] === prev) {
					nextKey = lookup.facesVerts[faceIndex][0];
				}
				if (nextKey === undefined) { return []; }
				const nextKeyFlipped = nextKey.split(" ").reverse().join(" ");
				walk.push(nextKey);
				isDone = (nextKeyFlipped in visited);
				if (!isDone) { walk.push(nextKeyFlipped); }
				visited[nextKey] = true;
				visited[nextKeyFlipped] = true;
			} while (!isDone);
			const vertexKeys = walk
				.filter((_, i) => i % 2 === 0)
				.map(key => key.split(" ")[1])
				.map(str => parseInt(str, 10));
			vertex_vertices.push(...vertexKeys);
		}
		return vertex_vertices;
	});
};
const makeVerticesVertices = (graph) => {
	if (!graph.vertices_coords || !graph.vertices_coords.length) { return []; }
	const dimensions = graph.vertices_coords.filter(() => true).shift().length;
	switch (dimensions) {
	case 3:
		return makeVerticesVerticesFromFaces(graph);
	default:
		return makeVerticesVertices2D(graph);
	}
};
const makeVerticesVerticesUnsorted = ({ vertices_edges, edges_vertices }) => {
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	return vertices_edges
		.map((edges, v) => edges
			.flatMap(edge => edges_vertices[edge].filter(i => i !== v)));
};

export { makeVerticesVertices, makeVerticesVertices2D, makeVerticesVerticesFromFaces, makeVerticesVerticesUnsorted };
