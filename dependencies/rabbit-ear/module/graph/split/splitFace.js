/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { uniqueElements, splitCircularArray } from '../../general/array.js';
import { makeEdgesFacesUnsorted } from '../make/edgesFaces.js';
import { makeVerticesToFace, makeVerticesToEdge } from '../make/lookup.js';
import { addEdge, addIsolatedEdge } from '../add/edge.js';
import { remove } from '../remove.js';
import { makeVerticesFacesForVertex } from './general.js';

const arrayValuesAreUnique = (array) => (
	Array.from(new Set(array)).length === array.length
);
const splitArrayWithLeaf = (array, spliceIndex, newElement) => {
	const arrayCopy = [...array];
	const duplicateElement = array[spliceIndex];
	arrayCopy.splice(spliceIndex, 0, duplicateElement, newElement);
	return arrayCopy;
};
const edgeExistsInFace = ({ faces_vertices }, face, vertices) => (
	faces_vertices[face]
		.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
		.map(([v0, v1]) => (v0 === vertices[0] && v1 === vertices[1])
			|| (v0 === vertices[1] && v1 === vertices[0]))
		.reduce((a, b) => a || b, false));
const getAdjacencySpliceIndex = (cycle, adjacent, vertex) => {
	const indexInCycle = cycle.indexOf(vertex);
	if (indexInCycle === -1) { return -1; }
	const prevVertex = cycle[(indexInCycle + cycle.length - 1) % cycle.length];
	const nextVertex = cycle[(indexInCycle + 1) % cycle.length];
	const prevIndex = adjacent.indexOf(prevVertex);
	if (prevIndex === -1) { return -1; }
	const nextTest = adjacent[(prevIndex + adjacent.length - 1) % adjacent.length];
	return (nextTest !== nextVertex ? -1 : prevIndex);
};
const updateVerticesVertices = (
	{ vertices_vertices, faces_vertices },
	face,
	vertices,
) => {
	if (!vertices_vertices) { return; }
	const verticesSpliceIndex = vertices
		.map(v => getAdjacencySpliceIndex(faces_vertices[face], vertices_vertices[v], v));
	verticesSpliceIndex.forEach((index, i) => {
		const otherVertex = vertices[(i + 1) % vertices.length];
		if (index !== -1) {
			vertices_vertices[vertices[i]].splice(index, 0, otherVertex);
		} else {
			vertices_vertices[vertices[i]].push(otherVertex);
		}
	});
};
const updateVerticesEdges = (
	{ vertices_edges, vertices_vertices },
	vertices,
	edge,
) => {
	if (!vertices_edges) { return; }
	if (!vertices_vertices) {
		vertices.forEach((v) => vertices_edges[v].push(edge));
		return;
	}
	const spliceIndices = vertices
		.map((v, i, arr) => vertices_vertices[v].indexOf(arr[(i + 1) % arr.length]));
	if (spliceIndices.some(i => i === -1)) {
		throw new Error(`splitFace() vertices_edges ${vertices.join(", ")}`);
	}
	spliceIndices.forEach((index, i) => {
		vertices_edges[vertices[i]].splice(index, 0, edge);
	});
};
const updateVerticesFaces = (
	{ vertices_vertices, vertices_edges, vertices_faces, edges_vertices, faces_vertices },
	face,
	faces,
) => {
	if (!vertices_faces || !faces_vertices) { return; }
	const allVertices = uniqueElements(faces.flatMap(f => faces_vertices[f]));
	const allFaces = uniqueElements([
		...faces,
		...allVertices.flatMap(v => vertices_faces[v])
	]).filter(f => f !== face)
		.filter(a => a !== undefined && a !== null);
	const verticesToFace = makeVerticesToFace({ faces_vertices }, allFaces);
	allVertices.map(vertex => makeVerticesFacesForVertex(
		{ vertices_vertices, vertices_edges, edges_vertices },
		vertex,
		verticesToFace,
	)).forEach((v_f, i) => { vertices_faces[allVertices[i]] = v_f || []; });
};
const updateEdgesFaces = (
	{ edges_vertices, faces_vertices, edges_faces, faces_edges },
	face,
	faces,
	edge,
) => {
	if (!edges_faces) { return; }
	if (!faces_edges) {
		edges_faces.forEach((_, i) => delete edges_faces[i]);
		Object.assign(
			edges_faces,
			makeEdgesFacesUnsorted({ edges_vertices, faces_vertices, faces_edges }),
		);
		return;
	}
	const facesHash = {};
	[...faces, face].forEach(f => { facesHash[f] = true; });
	const edges = Array.from(new Set(faces.flatMap(f => faces_edges[f])));
	const edgesOtherFaces = [];
	edges.forEach(e => {
		edgesOtherFaces[e] = edges_faces[e].filter(f => !facesHash[f]);
	});
	const edgesTheseFaces = [];
	edges.forEach(e => { edgesTheseFaces[e] = []; });
	faces.forEach(f => faces_edges[f]
		.forEach(e => edgesTheseFaces[e].push(f)));
	edges.forEach(e => {
		edges_faces[e] = Array
			.from(new Set([...edgesTheseFaces[e], ...edgesOtherFaces[e]]));
	});
	edges_faces[edge] = [...faces];
};
const updateFacesVerticesSplit = ({ faces_vertices }, face, vertices) => {
	const [i0, i1] = vertices
		.map(vertex => faces_vertices[face].indexOf(vertex));
	return splitCircularArray(faces_vertices[face], [i0, i1])
		.map((face_vertices) => faces_vertices.push(face_vertices));
};
const updateFacesVerticesLeaf = (
	{ faces_vertices },
	face,
	vertexFace,
	vertexLeaf,
) => {
	if (!faces_vertices) { return; }
	faces_vertices[face] = splitArrayWithLeaf(
		faces_vertices[face],
		faces_vertices[face].indexOf(vertexFace),
		vertexLeaf,
	);
};
const updateFacesEdges = (
	{ edges_vertices, faces_vertices, faces_edges },
	face,
	faces,
	edge,
) => {
	if (!faces_edges) { return; }
	const allEdges = [...faces_edges[face], edge];
	const verticesToEdge = makeVerticesToEdge({ edges_vertices }, allEdges);
	const newFacesEdges = faces
		.map(f => faces_vertices[f]
			.map((fv, i, arr) => [fv, arr[(i + 1) % arr.length]])
			.map(pair => pair.join(" "))
			.map(key => verticesToEdge[key]));
	if (newFacesEdges.flat().some(e => e === undefined)) {
		throw new Error(`splitFace() faces_edges ${face}`);
	}
	faces.forEach((f, i) => { faces_edges[f] = newFacesEdges[i]; });
};
const updateFacesFaces = (
	{ edges_vertices, edges_faces, faces_vertices, faces_edges, faces_faces },
	oldFace,
	faces,
) => {
	if (!faces_faces) { return; }
	const allFaces = uniqueElements([...faces_faces[oldFace], ...faces])
		.filter(a => a !== undefined && a !== null);
	if (edges_faces && faces_edges) {
		allFaces.forEach(face => {
			faces_faces[face] = faces_edges[face]
				.map(edge => edges_faces[edge].find(f => f !== face));
		});
		return;
	}
	if (edges_vertices && faces_vertices) {
		const verticesToFace = makeVerticesToFace({ faces_vertices }, allFaces);
		allFaces.forEach(face => {
			faces_faces[face] = faces_vertices[face]
				.map((v, i, arr) => [arr[(i + 1) % arr.length], v])
				.map(pair => pair.join(" "))
				.map(key => verticesToFace[key]);
		});
	}
};
const updateFaceOrders = ({ faceOrders }, oldFace, newFaces) => {
	if (!faceOrders) { return; }
	const newFace = newFaces[0];
	const faces = newFaces.slice(1);
	const newFaceOrders = [];
	faceOrders.forEach(([f0, f1, order], i) => {
		if (f0 === oldFace) {
			faceOrders[i] = [newFace, f1, order];
			const newOrders = faces.map(f => [f, f1, order]);
			newFaceOrders.push(...newOrders);
		}
		if (f1 === oldFace) {
			faceOrders[i] = [f0, newFace, order];
			const newOrders = faces.map(f => [f0, f, order]);
			newFaceOrders.push(...newOrders);
		}
	});
	faceOrders.push(...newFaceOrders);
};
const splitFaceWithLeafEdge = (
	graph,
	face,
	vertexFace,
	vertexLeaf,
	assignment = "U",
	foldAngle = 0,
) => {
	const vertices = [vertexFace, vertexLeaf];
	const edge = addEdge(graph, vertices, [face, face], assignment, foldAngle);
	if (graph.vertices_faces) {
		graph.vertices_faces[vertexLeaf] = Array
			.from(new Set([...graph.vertices_faces[vertexLeaf], face]));
	}
	updateFacesVerticesLeaf(graph, face, vertexFace, vertexLeaf);
	updateFacesEdges(graph, face, [face], edge);
	updateVerticesVertices(graph, face, vertices);
	updateVerticesEdges(graph, vertices, edge);
	return {
		edge,
		faces: {},
	};
};
const splitFaceWithEdge = (
	graph,
	face,
	vertices,
	assignment = "U",
	foldAngle = 0,
) => {
	if (!graph.vertices_coords
		|| !graph.edges_vertices
		|| !graph.faces_vertices) { return {}; }
	if (vertices.length !== 2) { return {}; }
	if (!arrayValuesAreUnique(graph.faces_vertices[face])) { return {}; }
	if (edgeExistsInFace(graph, face, vertices)) { return {}; }
	const edge = addEdge(graph, vertices, [face, face], assignment, foldAngle);
	const faces = [0, 1].map(i => graph.faces_vertices.length + i);
	updateFacesVerticesSplit(graph, face, vertices);
	updateFacesEdges(graph, face, faces, edge);
	updateVerticesVertices(graph, face, vertices);
	updateVerticesEdges(graph, vertices, edge);
	updateVerticesFaces(graph, face, faces);
	updateEdgesFaces(graph, face, faces, edge);
	updateFacesFaces(graph, face, faces);
	updateFaceOrders(graph, face, faces);
	const faceMap = remove(graph, "faces", [face]);
	faces.forEach((_, i) => { faces[i] = faceMap[faces[i]]; });
	const facesMap = faceMap.slice();
	facesMap.splice(-2);
	facesMap[face] = faces;
	return {
		edge,
		faces: {
			map: facesMap,
			new: faces,
			remove: face,
		},
	};
};
const splitFace = (
	graph,
	face,
	vertices,
	assignment = "U",
	foldAngle = 0,
) => {
	if (!graph.vertices_coords
		|| !graph.edges_vertices
		|| !graph.faces_vertices) { return {}; }
	if (vertices.length !== 2) { return {}; }
	const verticesIndexOf = vertices.map(vertex => ({
		vertex,
		index: graph.faces_vertices[face].indexOf(vertex),
	}));
	const matchCount = verticesIndexOf.filter(({ index }) => index !== -1).length;
	switch (matchCount) {
	case 2:
		return splitFaceWithEdge(graph, face, vertices, assignment, foldAngle);
	case 1:
		return splitFaceWithLeafEdge(
			graph,
			face,
			verticesIndexOf.filter(({ index }) => index !== -1).shift().vertex,
			verticesIndexOf.filter(({ index }) => index === -1).shift().vertex,
			assignment,
			foldAngle,
		);
	default:
		return {
			edge: addIsolatedEdge(graph, vertices, assignment, foldAngle),
			faces: {},
		}
	}
};

export { splitFace, splitFaceWithEdge, splitFaceWithLeafEdge };
