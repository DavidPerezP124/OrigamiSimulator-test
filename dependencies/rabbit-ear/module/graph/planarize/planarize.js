/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../../math/constant.js';
import { mergeNextmaps, invertArrayMap } from '../maps.js';
import { makePlanarFaces } from '../make/faces.js';
import { makeEdgesVerticesFromFaces } from '../make/edgesVertices.js';
import { planarizeCollinearEdges } from './planarizeCollinearEdges.js';
import { planarizeOverlaps } from './planarizeOverlaps.js';
import { planarizeCollinearVertices } from './planarizeCollinearVertices.js';
import { makeFacesMap } from './makeFacesMap.js';

const makeSureEdgesExist = (graph) => {
	if (graph.edges_vertices) { return graph; }
	if (!graph.faces_vertices) { return {}; }
	return {
		...graph,
		edges_vertices: makeEdgesVerticesFromFaces(graph),
	};
};
const removeHoles = (graph, facesNextmap) => {
	const backmap = invertArrayMap(facesNextmap);
	graph.faces_vertices
		.map((_, i) => i)
		.filter(i => backmap[i] === undefined)
		.forEach(f => {
			delete graph.faces_vertices[f];
			delete graph.faces_edges[f];
		});
};
const planarizeEdgesVerbose = (graph, epsilon = EPSILON) => {
	const {
		result: graphNonCollinear,
		changes: {
			vertices: { map: verticesMap1 },
			edges: { map: edgesMap1 },
		},
	} = planarizeCollinearEdges(graph, epsilon);
	const {
		result: graphNoOverlaps,
		changes: {
			vertices: { map: verticesMap2 },
			edges: { map: edgesMap2 },
		}
	} = planarizeOverlaps(graphNonCollinear, epsilon);
	const {
		result: planarGraph,
		changes: {
			vertices: { map: verticesMap3 },
			edges: { map: edgesMap3 }
		}
	} = planarizeCollinearVertices(graphNoOverlaps, epsilon);
	const vertexNextMap = mergeNextmaps(verticesMap1, verticesMap2, verticesMap3);
	const edgeNextMap = mergeNextmaps(edgesMap1, edgesMap2, edgesMap3);
	return {
		result: planarGraph,
		changes: {
			vertices: { map: vertexNextMap },
			edges: { map: edgeNextMap },
		}
	};
};
const planarizeEdges = ({
	vertices_coords,
	edges_vertices,
	edges_assignment,
	edges_foldAngle,
}, epsilon = EPSILON) => {
	const { result: result1 } = planarizeCollinearEdges({
		vertices_coords,
		edges_vertices,
		edges_assignment,
		edges_foldAngle,
	}, epsilon);
	const { result: result2 } = planarizeOverlaps(result1, epsilon);
	const { result: result3 } = planarizeCollinearVertices(result2, epsilon);
	return result3;
};
const planarizeVerbose = (graph, epsilon = EPSILON) => {
	const graphWithEdges = makeSureEdgesExist(graph);
	const {
		result,
		changes: {
			vertices: { map: vertexNextMap },
			edges: { map: edgeNextMap },
		}
	} = planarizeEdgesVerbose(graphWithEdges, epsilon);
	const {
		faces_vertices,
		faces_edges,
	} = makePlanarFaces(result);
	result.faces_vertices = faces_vertices;
	result.faces_edges = faces_edges;
	const faceMap = makeFacesMap(graphWithEdges, result, {
		vertices: { map: vertexNextMap },
		edges: { map: edgeNextMap },
	});
	removeHoles(result, faceMap);
	return {
		result,
		changes: {
			vertices: { map: vertexNextMap },
			edges: { map: edgeNextMap },
			faces: { map: faceMap },
		}
	};
};
const planarize = (graph, epsilon = EPSILON) => {
	const { result } = planarizeVerbose(graph, epsilon);
	return result;
};

export { planarize, planarizeEdges, planarizeEdgesVerbose, planarizeVerbose };
