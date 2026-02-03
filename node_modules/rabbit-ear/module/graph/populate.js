/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeVerticesVertices } from './make/verticesVertices.js';
import { makeVerticesEdges, makeVerticesEdgesUnsorted } from './make/verticesEdges.js';
import { makeVerticesFaces } from './make/verticesFaces.js';
import { makeEdgesFacesUnsorted } from './make/edgesFaces.js';
import { makeFacesFaces } from './make/facesFaces.js';
import { makeFacesEdgesFromVertices } from './make/facesEdges.js';
import { makeFacesVerticesFromEdges } from './make/facesVertices.js';
import { makePlanarFaces } from './make/faces.js';
import { edgeAssignmentToFoldAngle, edgeFoldAngleToAssignment } from '../fold/spec.js';

const buildAssignmentsIfNeeded = (graph) => {
	if (!graph.edges_vertices) { return; }
	if (!graph.edges_assignment) { graph.edges_assignment = []; }
	if (!graph.edges_foldAngle) { graph.edges_foldAngle = []; }
	if (graph.edges_assignment.length > graph.edges_foldAngle.length) {
		for (let i = graph.edges_foldAngle.length; i < graph.edges_assignment.length; i += 1) {
			graph.edges_foldAngle[i] = edgeAssignmentToFoldAngle(graph.edges_assignment[i]);
		}
	}
	if (graph.edges_foldAngle.length > graph.edges_assignment.length) {
		for (let i = graph.edges_assignment.length; i < graph.edges_foldAngle.length; i += 1) {
			graph.edges_assignment[i] = edgeFoldAngleToAssignment(graph.edges_foldAngle[i]);
		}
	}
	for (let i = graph.edges_assignment.length; i < graph.edges_vertices.length; i += 1) {
		graph.edges_assignment[i] = "U";
		graph.edges_foldAngle[i] = 0;
	}
};
const rebuildFaces = (graph) => {
	const { faces_vertices, faces_edges } = makePlanarFaces(graph);
	graph.faces_vertices = faces_vertices;
	graph.faces_edges = faces_edges;
};
const buildFacesIfNeeded = (graph, reface) => {
	const didRebuild = {
		faces_vertices: false,
		faces_edges: false,
	};
	const facesExist = (graph.faces_vertices && graph.faces_vertices.length)
		|| (graph.faces_edges && graph.faces_edges.length);
	if (!facesExist && reface && graph.vertices_coords) {
		rebuildFaces(graph);
		didRebuild.faces_vertices = true;
		didRebuild.faces_edges = true;
		return didRebuild;
	}
	if (!graph.faces_vertices && !graph.faces_edges) {
		graph.faces_vertices = [];
		graph.faces_edges = [];
	} else if (graph.faces_vertices && !graph.faces_edges) {
		graph.faces_edges = makeFacesEdgesFromVertices(graph);
		didRebuild.faces_edges = true;
	} else if (graph.faces_edges && !graph.faces_vertices) {
		graph.faces_vertices = makeFacesVerticesFromEdges(graph);
		didRebuild.faces_vertices = true;
	}
	return didRebuild;
};
const populate = (graph, options = {}) => {
	if (typeof graph !== "object") { return graph; }
	if (!graph.edges_vertices) { return graph; }
	const didRebuild = {
		vertices_vertices: false,
		faces_vertices: false,
		faces_edges: false,
	};
	if (graph.vertices_vertices && !graph.vertices_edges) {
		graph.vertices_edges = makeVerticesEdges(graph);
	} else if (!graph.vertices_edges || !graph.vertices_vertices) {
		graph.vertices_edges = makeVerticesEdgesUnsorted(graph);
		graph.vertices_vertices = makeVerticesVertices(graph);
		graph.vertices_edges = makeVerticesEdges(graph);
		didRebuild.vertices_vertices = true;
	}
	buildAssignmentsIfNeeded(graph);
	const reface = typeof options === "object" ? options.faces : false;
	Object.assign(didRebuild, buildFacesIfNeeded(graph, reface));
	if (!graph.vertices_faces
		|| didRebuild.vertices_vertices
		|| didRebuild.faces_vertices) {
		graph.vertices_faces = makeVerticesFaces(graph);
	}
	if (!graph.edges_faces || didRebuild.faces_edges) {
		graph.edges_faces = makeEdgesFacesUnsorted(graph);
	}
	if (!graph.faces_faces || didRebuild.faces_vertices) {
		graph.faces_faces = makeFacesFaces(graph);
	}
	return graph;
};

export { populate };
