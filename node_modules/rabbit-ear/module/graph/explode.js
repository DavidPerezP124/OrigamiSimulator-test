/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { getDimensionQuick } from '../fold/spec.js';
import { resize3, resize2 } from '../math/vector.js';
import { clone } from '../general/clone.js';
import { makeFacesEdgesFromVertices } from './make/facesEdges.js';

const explodeFaces = ({
	vertices_coords, edges_vertices, edges_assignment, edges_foldAngle,
	faces_vertices, faces_edges,
}) => {
	if (!faces_vertices) {
		if (edges_vertices) {
			return clone({
				vertices_coords, edges_vertices, edges_assignment, edges_foldAngle,
			});
		}
		return vertices_coords ? clone({ vertices_coords }) : {};
	}
	let f = 0;
	const faces_verticesNew = faces_vertices.map(face => face.map(() => f++));
	if (!vertices_coords) {
		return { faces_vertices: faces_verticesNew };
	}
	const dimensions = getDimensionQuick({ vertices_coords });
	const vertices_coordsFlat = clone(faces_vertices
		.flatMap(face => face.map(v => vertices_coords[v])));
	const vertices_coordsNew = dimensions === 3
		? vertices_coordsFlat.map(resize3)
		: vertices_coordsFlat.map(resize2);
	if (!edges_vertices) {
		return {
			vertices_coords: vertices_coordsNew,
			faces_vertices: faces_verticesNew,
		};
	}
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	let e = 0;
	const edges_verticesNew = faces_edges
		.flatMap(face => face
			.map((_, i, arr) => (i === arr.length - 1
				? [e, (++e - arr.length)]
				: [e, (++e)])))
		.map(([a, b]) => [a, b]);
	const result = {
		vertices_coords: vertices_coordsNew,
		faces_vertices: faces_verticesNew,
		edges_vertices: edges_verticesNew,
	};
	const edgesMap = faces_edges.flatMap(edges => edges);
	if (edges_assignment) {
		result.edges_assignment = edgesMap.map(i => edges_assignment[i]);
	}
	if (edges_foldAngle) {
		result.edges_foldAngle = edgesMap.map(i => edges_foldAngle[i]);
	}
	return result;
};
const explodeEdges = ({
	vertices_coords, edges_vertices, edges_assignment, edges_foldAngle,
}) => {
	if (!edges_vertices) {
		return vertices_coords ? { vertices_coords } : {};
	}
	let e = 0;
	const result = {
		edges_vertices: edges_vertices.map(() => [e++, e++]),
	};
	if (edges_assignment) { result.edges_assignment = edges_assignment; }
	if (edges_foldAngle) { result.edges_foldAngle = edges_foldAngle; }
	if (vertices_coords) {
		result.vertices_coords = structuredClone(edges_vertices
			.flatMap(edge => edge.map(v => vertices_coords[v])));
	}
	return result;
};

export { explodeEdges, explodeFaces };
