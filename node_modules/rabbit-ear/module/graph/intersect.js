/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { includeL, includeS, exclude } from '../math/compare.js';
import { magSquared, subtract2, dot2, cross2, resize2 } from '../math/vector.js';
import { pointsToLine2 } from '../math/convert.js';
import { intersectLineLine } from '../math/intersect.js';
import { overlapConvexPolygonPoint } from '../math/overlap.js';
import { clusterSortedGeneric } from '../general/cluster.js';
import { makeFacesEdgesFromVertices } from './make/facesEdges.js';

const intersectLineVertices = (
	{ vertices_coords },
	{ vector, origin },
	lineDomain = includeL,
	epsilon = EPSILON,
) => {
	const lineMagSq = magSquared(vector);
	const lineMag = Math.sqrt(lineMagSq);
	if (lineMag < epsilon) {
		return Array(vertices_coords.length).fill(undefined);
	}
	return vertices_coords
		.map(coord => subtract2(coord, origin))
		.map(vec => {
			const parameter = dot2(vec, vector) / lineMagSq;
			return Math.abs(cross2(vec, vector)) < epsilon
				&& lineDomain(parameter, epsilon / lineMag)
				? parameter
				: undefined;
		});
};
const intersectLineVerticesEdges = (
	{ vertices_coords, edges_vertices },
	{ vector, origin },
	lineDomain = includeL,
	epsilon = EPSILON,
) => {
	if (!vertices_coords) { return { vertices: [], edges: [] }; }
	const vertices = intersectLineVertices(
		{ vertices_coords },
		{ vector, origin },
		lineDomain,
		epsilon,
	);
	if (!edges_vertices) { return { vertices, edges: [] }; }
	const edgesVerticesOverlap = edges_vertices
		.map(ev => ev
			.map(v => (vertices[v] !== undefined ? v : undefined))
			.filter(a => a !== undefined));
	const edges = edges_vertices
		.map(ev => ev.map(v => vertices_coords[v]))
		.map(([s0, s1], e) => (edgesVerticesOverlap[e].length === 0
			? intersectLineLine(
				{ vector, origin },
				pointsToLine2(s0, s1),
				lineDomain,
				includeS,
			)
			: undefined))
		.map(res => (res === undefined || !res.point ? undefined : res));
	return { vertices, edges };
};
const intersectLine = (
	{ vertices_coords, edges_vertices, faces_vertices, faces_edges },
	{ vector, origin },
	lineDomain = includeL,
	epsilon = EPSILON,
) => {
	const { vertices, edges } = intersectLineVerticesEdges(
		{ vertices_coords, edges_vertices },
		{ vector, origin },
		lineDomain,
		epsilon,
	);
	if (!faces_vertices) { return { vertices, edges, faces: [] }; }
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	const facesEdgeIntersections = faces_edges
		.map(fe => fe
			.map(edge => (edges[edge]
				? { ...edges[edge], edge }
				: undefined))
			.filter(a => a !== undefined));
	const facesVertexIntersections = faces_vertices
		.map(fv => fv
			.map(vertex => (vertices[vertex] !== undefined
				? { a: vertices[vertex], vertex }
				: undefined))
			.filter(a => a !== undefined));
	const facesIntersections = faces_vertices.map((_, v) => [
		...facesVertexIntersections[v],
		...facesEdgeIntersections[v],
	]);
	const epsilonEqual = (p, q) => Math.abs(p.a - q.a) < epsilon * 2;
	const faces = facesIntersections
		.map(intersections => intersections.sort((p, q) => p.a - q.a))
		.map(intersections => clusterSortedGeneric(intersections, epsilonEqual)
			.map(cluster => cluster.map(index => intersections[index])))
		.map(clusters => clusters
			.map(cluster => cluster[0]));
	return { vertices, edges, faces };
};
const intersectLineAndPoints = (
	{ vertices_coords, edges_vertices, faces_vertices, faces_edges },
	{ vector, origin },
	lineDomain = includeL,
	interiorPoints = [],
	epsilon = EPSILON,
) => {
	const { vertices, edges, faces } = intersectLine(
		{ vertices_coords, edges_vertices, faces_vertices, faces_edges },
		{ vector, origin },
		lineDomain,
		epsilon,
	);
	if (!vertices_coords || !faces_vertices) {
		return { vertices, edges, faces: [] };
	}
	const vertices_coords2 = vertices_coords.map(resize2);
	const facesInteriorPoints = !interiorPoints.length
		? faces.map(() => [])
		: faces.map((_, face) => {
			const polygon = faces_vertices[face].map(v => vertices_coords2[v]);
			const pointsOverlap = interiorPoints.map(point => ({
				...overlapConvexPolygonPoint(polygon, point, exclude, epsilon),
				point,
			}));
			return pointsOverlap.filter(el => el.overlap);
		});
	const newFacesData = faces.map((intersections, f) => ({
		edges: intersections
			.map(el => ("edge" in el && "a" in el && "b" in el && "point" in el ? el : undefined))
			.filter(a => a !== undefined),
		vertices: intersections
			.map(el => ("vertex" in el && "a" in el ? el : undefined))
			.filter(a => a !== undefined),
		points: facesInteriorPoints[f],
	}));
	return { vertices, edges, faces: newFacesData };
};
const filterCollinearFacesData = ({ edges_vertices }, { vertices, faces }) => {
	const collinearVertices = [];
	edges_vertices
		.map(verts => (vertices[verts[0]] !== undefined
			&& vertices[verts[1]] !== undefined))
		.map((collinear, edge) => (collinear ? edge : undefined))
		.filter(a => a !== undefined)
		.map(edge => edges_vertices[edge])
		.forEach(verts => collinearVertices.push(verts));
	const facesVertices = faces.map(face => face.vertices.map(({ vertex }) => vertex));
	const facesVerticesHash = [];
	facesVertices.forEach((_, f) => { facesVerticesHash[f] = {}; });
	facesVertices
		.forEach((verts, f) => verts
			.forEach(v => { facesVerticesHash[f][v] = true; }));
	faces.forEach((face, f) => {
		const removeVertices = {};
		collinearVertices
			.filter(pair => facesVerticesHash[f][pair[0]] && facesVerticesHash[f][pair[1]])
			.forEach(pair => {
				removeVertices[pair[0]] = true;
				removeVertices[pair[1]] = true;
			});
		faces[f].vertices = face.vertices.filter(el => !removeVertices[el.vertex]);
	});
};

export { filterCollinearFacesData, intersectLine, intersectLineAndPoints, intersectLineVertices, intersectLineVerticesEdges };
