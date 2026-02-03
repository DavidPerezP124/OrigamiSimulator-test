/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { excludeS, exclude } from '../math/compare.js';
import { resize2, dot } from '../math/vector.js';
import { boundingBox } from '../math/polygon.js';
import { intersectLineLine } from '../math/intersect.js';
import { overlapBoundingBoxes, overlapConvexPolygons, overlapLinePoint, overlapConvexPolygonPoint } from '../math/overlap.js';
import { doRangesOverlap } from '../math/range.js';
import { chooseTwoPairs, arrayArrayToLookupArray, clustersToReflexiveArrays } from '../general/array.js';
import { getEdgesLine, edgesToLines2 } from './edges/lines.js';
import { makeFacesPolygon } from './make/faces.js';
import { makeEdgesCoords } from './make/edges.js';
import { sweepFaces } from './sweep.js';
import { invertFlatToArrayMap } from './maps.js';
import { getVerticesClusters } from './vertices/clusters.js';

const getFacesFacesOverlap = ({
	vertices_coords, faces_vertices,
}, epsilon = EPSILON) => {
	const facesPolygon = makeFacesPolygon({ vertices_coords, faces_vertices })
		.map(poly => poly.map(resize2));
	const facesBounds = facesPolygon.map(polygon => boundingBox(polygon));
	const facesFacesOverlap = faces_vertices.map(() => []);
	const history = {};
	const setOfFaces = [];
	sweepFaces({ vertices_coords, faces_vertices }, 0, epsilon)
		.forEach(({ start, end }) => {
			start.forEach(e => { setOfFaces[e] = true; });
			setOfFaces.forEach((_, f1) => start
				.filter(f2 => f2 !== f1)
				.forEach(f2 => {
					const key = f1 < f2 ? `${f1} ${f2}` : `${f2} ${f1}`;
					if (history[key]) { return; }
					history[key] = true;
					if (!overlapBoundingBoxes(facesBounds[f1], facesBounds[f2], epsilon)
						|| !overlapConvexPolygons(facesPolygon[f1], facesPolygon[f2], epsilon)) {
						return;
					}
					facesFacesOverlap[f1].push(f2);
					facesFacesOverlap[f2].push(f1);
				}));
			end.forEach(e => delete setOfFaces[e]);
		});
	return facesFacesOverlap;
};
const getEdgesEdgesCollinearOverlap = ({
	vertices_coords, edges_vertices,
}, epsilon = EPSILON) => {
	const {
		lines,
		edges_line,
	} = getEdgesLine({ vertices_coords, edges_vertices }, epsilon);
	const edges_range = makeEdgesCoords({ vertices_coords, edges_vertices })
		.map((points, e) => points
			.map(point => dot(lines[edges_line[e]].vector, point)));
	const edgesEdgesOverlap = edges_vertices.map(() => []);
	invertFlatToArrayMap(edges_line)
		.flatMap(edges => chooseTwoPairs(edges))
		.filter(pair => {
			const [a, b] = pair.map(edge => edges_range[edge]);
			return doRangesOverlap(a, b, epsilon);
		})
		.forEach(([a, b]) => {
			edgesEdgesOverlap[a].push(b);
			edgesEdgesOverlap[b].push(a);
		});
	return edgesEdgesOverlap;
};
const getOverlappingComponents = ({
	vertices_coords, edges_vertices, faces_vertices,
}, epsilon = EPSILON) => {
	const vertices_coords2 = vertices_coords.map(resize2);
	const edgesLine = edgesToLines2({ vertices_coords, edges_vertices });
	const facesPolygon = faces_vertices
		.map(vertices => vertices
			.map(v => vertices_coords2[v]));
	const similarVertices = getVerticesClusters({ vertices_coords }, epsilon);
	const verticesVertices = arrayArrayToLookupArray(
		clustersToReflexiveArrays(similarVertices),
	);
	vertices_coords.forEach((_, v) => { verticesVertices[v][v] = true; });
	const verticesEdges = vertices_coords.map(() => []);
	vertices_coords
		.map((coord, v) => edgesLine
			.map((_, e) => e)
			.filter(e => overlapLinePoint(edgesLine[e], coord, excludeS, epsilon))
			.forEach(e => { verticesEdges[v][e] = true; }));
	const edgesEdges = edges_vertices.map(() => []);
	edgesLine
		.map((line1, e1) => edgesLine
			.map((_, e2) => e2)
			.filter(e2 => e1 !== e2
				&& intersectLineLine(line1, edgesLine[e2], excludeS, excludeS, epsilon).point !== undefined)
			.forEach(e2 => {
				edgesEdges[e1][e2] = true;
				edgesEdges[e2][e1] = true;
			}));
	const facesVertices = faces_vertices.map(() => []);
	facesPolygon
		.map((polygon, f) => vertices_coords
			.map((_, v) => v)
			.filter(v => overlapConvexPolygonPoint(
				polygon,
				vertices_coords2[v],
				exclude,
				epsilon,
			).overlap)
			.forEach(v => { facesVertices[f][v] = true; }));
	return {
		verticesVertices,
		verticesEdges,
		edgesEdges,
		facesVertices,
	};
};
const getFacesEdgesOverlap = ({
	vertices_coords, edges_vertices, faces_vertices, faces_edges,
}, epsilon = EPSILON) => {
	const {
		verticesVertices,
		verticesEdges,
		edgesEdges,
		facesVertices,
	} = getOverlappingComponents({
		vertices_coords, edges_vertices, faces_vertices,
	}, epsilon);
	const filterFaceVerticesNeighbors = (face_vertices, indices) => {
		const lookup = {};
		indices.forEach(i => { lookup[i] = true; });
		face_vertices
			.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
			.filter(([a, b]) => lookup[a] && lookup[b])
			.forEach(([a, b]) => {
				lookup[a] = false;
				lookup[b] = false;
			});
		return indices.filter(i => lookup[i]);
	};
	const getVerticesOverlap = (edge, face) => {
		const verticesInterior = faces_vertices[face]
			.filter(v => verticesEdges[v][edge]);
		const [v0, v1] = edges_vertices[edge];
		const verticesEndpoints = faces_vertices[face]
			.filter(v => verticesVertices[v][v0] || verticesVertices[v][v1]);
		return filterFaceVerticesNeighbors(
			faces_vertices[face],
			Array.from(new Set([...verticesEndpoints, ...verticesInterior])),
		);
	};
	const getEdgesOverlap = (edge, face) => {
		const [v0, v1] = edges_vertices[edge];
		const edgesEndpoints = faces_edges[face]
			.filter(e => verticesEdges[v0][e]
				|| verticesEdges[v1][e]);
		const edgesMiddle = faces_edges[face]
			.filter(e => edgesEdges[edge][e]);
		return Array.from(new Set([...edgesEndpoints, ...edgesMiddle]));
	};
	const getPointsOverlap = (edge, face) => edges_vertices[edge]
		.filter(v => facesVertices[face][v]);
	const facesEdgesOverlap = faces_vertices.map(() => []);
	faces_vertices.forEach((_, face) => edges_vertices.forEach((__, edge) => {
		const vertices = getVerticesOverlap(edge, face);
		const edges = getEdgesOverlap(edge, face);
		const points = getPointsOverlap(edge, face);
		if (vertices.length + edges.length + points.length !== 2) { return; }
		if (vertices.length === 1 && edges.length === 1) {
			if (edges_vertices[edges[0]].includes(vertices[0])) { return; }
		}
		facesEdgesOverlap[face].push(edge);
	}));
	return facesEdgesOverlap;
};
const getEdgesFacesOverlap = ({
	vertices_coords, edges_vertices, faces_vertices, faces_edges,
}, epsilon = EPSILON) => {
	const edgesFaces = edges_vertices.map(() => []);
	const facesEdges = getFacesEdgesOverlap({
		vertices_coords, edges_vertices, faces_vertices, faces_edges,
	}, epsilon);
	facesEdges
		.forEach((edges, face) => edges
			.forEach(edge => {
				edgesFaces[edge].push(face);
			}));
	return edgesFaces;
};

export { getEdgesEdgesCollinearOverlap, getEdgesFacesOverlap, getFacesEdgesOverlap, getFacesFacesOverlap, getOverlappingComponents };
