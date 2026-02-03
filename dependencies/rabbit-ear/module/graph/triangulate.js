/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import Messages from '../environment/messages.js';
import { countImpliedEdges } from './count.js';
import { makeFacesWinding } from './faces/winding.js';
import { makeVerticesToEdge, makeVerticesToFace } from './make/lookup.js';

const makeTriangleFan = (indices) => Array
	.from(Array(indices.length - 2))
	.map((_, i) => [indices[0], indices[i + 1], indices[i + 2]]);
const triangulateConvexFacesVertices = ({ faces_vertices }) => (
	faces_vertices.flatMap(vertices => (vertices.length < 4
		? [vertices]
		: makeTriangleFan(vertices)))
);
const groupByThree = (array) => (array.length === 3 ? [array] : Array
	.from(Array(Math.floor(array.length / 3)))
	.map((_, i) => [i * 3 + 0, i * 3 + 1, i * 3 + 2]
		.map(j => array[j])));
const triangulateNonConvexFacesVertices = (
	{ vertices_coords, faces_vertices },
	earcut,
) => {
	if (!vertices_coords || !vertices_coords.length) {
		throw new Error(Messages.nonConvexTriangulation);
	}
	const dimensions = vertices_coords.filter(() => true).shift().length;
	if (dimensions === 3 || !earcut) {
		return triangulateConvexFacesVertices({ faces_vertices });
	}
	const faces_winding = makeFacesWinding({ vertices_coords, faces_vertices });
	return faces_vertices
		.map(fv => fv.flatMap(v => vertices_coords[v]))
		.map(polygon => earcut(polygon, null, dimensions))
		.map((vertices, i) => vertices
			.map(j => faces_vertices[i][j]))
		.flatMap((res, face) => (faces_winding[face]
			? groupByThree(res)
			: groupByThree(res).map(arr => arr.reverse())));
};
const makeNewEdgesAssignment = (
	{ edges_vertices, faces_vertices },
	{ faces_vertices: faces_verticesNew, faces_edges: faces_edgesNew },
) => {
	const edges_assignment = edges_vertices
		? edges_vertices.map(() => "U")
		: Array.from(Array(countImpliedEdges({ faces_edges: faces_edgesNew })))
			.map(() => "U");
	const lookup = makeVerticesToFace({ faces_vertices });
	faces_verticesNew.map((verts, i) => verts
		.map((v, j, arr) => [v, arr[(j + 1) % arr.length]])
		.forEach(([v0, v1], j) => {
			const keys = [`${v0} ${v1}`, `${v1} ${v0}`];
			if (lookup[keys[0]] === undefined && lookup[keys[1]] === undefined) {
				const edge = faces_edgesNew[i][j];
				edges_assignment[edge] = "J";
			}
		}));
	Array.from(Array(edges_assignment.length))
		.map((_, i) => i)
		.filter(i => edges_assignment[i] === undefined)
		.forEach(i => { edges_assignment[i] = "U"; });
	return edges_assignment;
};
const rebuildTriangleEdges = (
	{ edges_vertices, edges_assignment, edges_foldAngle, faces_vertices },
	{ faces_vertices: faces_verticesNew },
) => {
	const edgeLookup = edges_vertices ? makeVerticesToEdge({ edges_vertices }) : {};
	let e = edges_vertices ? edges_vertices.length : 0;
	const edges_verticesAppended = [];
	const faces_edgesNew = faces_verticesNew
		.map(vertices => vertices
			.map((v, i, arr) => {
				const edge_vertices = [v, arr[(i + 1) % arr.length]];
				const vertexPair = edge_vertices.join(" ");
				if (vertexPair in edgeLookup) { return edgeLookup[vertexPair]; }
				edges_verticesAppended.push(edge_vertices);
				edgeLookup[vertexPair] = e;
				edgeLookup[edge_vertices.slice().reverse().join(" ")] = e;
				return e++;
			}));
	const edges_assignmentNew = edges_assignment
		? edges_assignment.concat(edges_verticesAppended.map(() => "J"))
		: makeNewEdgesAssignment(
			{ edges_vertices, faces_vertices },
			{ faces_vertices: faces_verticesNew, faces_edges: faces_edgesNew },
		);
	const result = {
		edges_vertices: edges_vertices
			? edges_vertices.concat(edges_verticesAppended)
			: edges_verticesAppended,
		faces_edges: faces_edgesNew,
		edges_assignment: edges_assignmentNew,
	};
	if (edges_foldAngle) {
		const edges_foldAngleAppended = edges_verticesAppended.map(() => 0);
		result.edges_foldAngle = edges_foldAngle.concat(edges_foldAngleAppended);
	}
	return result;
};
const makeTriangulatedFacesNextMap = ({ faces_vertices }) => {
	let count = 0;
	return faces_vertices
		.map(verts => Math.max(3, verts.length))
		.map(length => Array.from(Array(length - 2)).map(() => count++));
};
const triangulate = ({
	vertices_coords, edges_vertices, edges_assignment, edges_foldAngle,
	faces_vertices, faceOrders,
}, earcut) => {
	if (!faces_vertices) {
		const result = {
			vertices_coords, edges_vertices, edges_assignment, edges_foldAngle,
		};
		Object.keys(result)
			.filter(key => !result[key])
			.forEach(key => delete result[key]);
		return { result, changes: {} };
	}
	const nextMap = makeTriangulatedFacesNextMap({ faces_vertices });
	const faces_verticesNew = earcut
		? triangulateNonConvexFacesVertices({ vertices_coords, faces_vertices }, earcut)
		: triangulateConvexFacesVertices({ faces_vertices });
	const edgeGraph = rebuildTriangleEdges({
		edges_vertices, edges_assignment, edges_foldAngle, faces_vertices,
	}, { faces_vertices: faces_verticesNew });
	const result = {
		...edgeGraph,
		vertices_coords,
		faces_vertices: faces_verticesNew,
	};
	const startingEdgeCount = edges_vertices ? edges_vertices.length : 0;
	const newEdges = Array
		.from(Array(edgeGraph.edges_vertices.length - startingEdgeCount))
		.map((_, i) => startingEdgeCount + i);
	const changes = {
		faces: { map: nextMap },
		edges: { new: newEdges },
	};
	return { result, changes };
};

export { triangulate, triangulateConvexFacesVertices, triangulateNonConvexFacesVertices };
