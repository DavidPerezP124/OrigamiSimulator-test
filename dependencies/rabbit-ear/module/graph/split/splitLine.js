/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { includeL } from '../../math/compare.js';
import { remapKey } from '../maps.js';
import { intersectLineAndPoints } from '../intersect.js';

const splitLineToSegments = (
	{ vertices_coords, edges_vertices, faces_vertices, faces_edges },
	{ vector, origin },
	lineDomain = includeL,
	interiorPoints = [],
	epsilon = EPSILON,
) => {
	const { vertices, edges, faces } = intersectLineAndPoints(
		{ vertices_coords, edges_vertices, faces_vertices, faces_edges },
		{ vector, origin },
		lineDomain,
		interiorPoints,
		epsilon,
	);
	faces
		.map(face => ["vertices", "edges", "points"]
			.map(key => face[key].length)
			.reduce((a, b) => a + b, 0))
		.map((count, f) => (count !== 2 ? f : undefined))
		.filter(a => a !== undefined)
		.forEach(f => delete faces[f]);
	const segments = {
		vertices: [],
		edges_face: faces
			.map((_, face) => face)
			.filter(a => a !== undefined)
	};
	const vertexVertex = {};
	const edgeVertex = {};
	segments.edges_vertices = faces.map((el, face) => {
		const vertsVerts = el.vertices.map(({ a, vertex }) => {
			const index = segments.vertices.length;
			if (vertexVertex[vertex] !== undefined) { return vertexVertex[vertex]; }
			segments.vertices.push({ a, vertex, point: [...vertices_coords[vertex]] });
			vertexVertex[vertex] = index;
			return index;
		});
		const edgesVerts = el.edges.map(({ a, b, point, edge }) => {
			const index = segments.vertices.length;
			if (edgeVertex[edge] !== undefined) { return edgeVertex[edge]; }
			segments.vertices.push({ a, b, point, edge });
			edgeVertex[edge] = index;
			return index;
		});
		const pointsVerts = el.points.map(({ point, t }) => {
			const index = segments.vertices.length;
			segments.vertices.push({ point, t, face });
			return index;
		});
		return vertsVerts.concat(edgesVerts).concat(pointsVerts);
	}).filter(a => a !== undefined);
	return {
		vertices, edges, faces, segments,
	};
};
const splitLineIntoEdges = (
	{ vertices_coords, edges_vertices, faces_vertices, faces_edges },
	line,
	lineDomain = includeL,
	interiorPoints = [],
	epsilon = EPSILON,
) => {
	if (!vertices_coords || !edges_vertices || !faces_vertices) {
		return undefined;
	}
	const { vertices, segments } = splitLineToSegments(
		{ vertices_coords, edges_vertices, faces_vertices, faces_edges },
		line,
		lineDomain,
		interiorPoints,
		epsilon,
	);
	const segmentsAsFOLD = {
		...segments,
		vertices_info: segments.vertices,
	};
	delete segmentsAsFOLD.vertices;
	let count = 0;
	const vertexMap = segmentsAsFOLD.vertices_info
		.map(el => (el.vertex === undefined
			? vertices_coords.length + (count++)
			: el.vertex));
	const edgeMap = segmentsAsFOLD.edges_vertices
		.map((_, i) => edges_vertices.length + i);
	remapKey(segmentsAsFOLD, "vertices", vertexMap);
	remapKey(segmentsAsFOLD, "edges", edgeMap);
	segmentsAsFOLD.vertices = segmentsAsFOLD.vertices_info;
	delete segmentsAsFOLD.vertices_info;
	segmentsAsFOLD.vertices
		.map((_, v) => v)
		.filter(v => vertices_coords[v] !== undefined)
		.forEach(v => delete segmentsAsFOLD.vertices[v]);
	const verticesCollinear = vertices.map(v => v !== undefined);
	const edges_collinear = edges_vertices
		.map(verts => verticesCollinear[verts[0]] && verticesCollinear[verts[1]]);
	return {
		...segmentsAsFOLD,
		edges_collinear,
	};
};

export { splitLineIntoEdges, splitLineToSegments };
