/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeEdgesFacesUnsorted } from '../graph/make/edgesFaces.js';
import { makeEdgesAssignmentSimple } from '../graph/make/edgesAssignment.js';
import { makeEdgesFoldAngle } from '../graph/make/edgesFoldAngle.js';
import { makeFacesEdgesFromVertices } from '../graph/make/facesEdges.js';
import { makeFacesFaces } from '../graph/make/facesFaces.js';
import { makeEpsilon } from '../graph/epsilon.js';
import { makeSolverConstraintsFlat } from './constraintsFlat.js';
import { makeSolverConstraints3D } from './constraints3D.js';
import { solver } from './solver.js';
import { solver as solver$1 } from './solverOneDepth.js';
import { solverSolutionToFaceOrders } from './general.js';

const layerSolutionToFaceOrdersTree = ({ orders, branches }, faces_winding) => (
	branches === undefined
		? ({ orders: solverSolutionToFaceOrders(orders, faces_winding) })
		: ({
			orders: solverSolutionToFaceOrders(orders, faces_winding),
			branches: branches
				.map(inner => inner
					.map(b => layerSolutionToFaceOrdersTree(b, faces_winding))),
		}));
const solveLayerOrders = ({
	vertices_coords, edges_vertices, edges_faces, edges_assignment,
	edges_foldAngle, faces_vertices, faces_edges, faces_faces, edges_vector,
}, epsilon) => {
	if (!vertices_coords || !edges_vertices || !faces_vertices) {
		return { orders: {}, faces_winding: [] };
	}
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	if (!edges_faces) {
		edges_faces = makeEdgesFacesUnsorted({ edges_vertices, faces_vertices, faces_edges });
	}
	if (!faces_faces) {
		faces_faces = makeFacesFaces({ faces_vertices });
	}
	if (!edges_foldAngle && edges_assignment) {
		edges_foldAngle = makeEdgesFoldAngle({ edges_assignment });
	}
	if (!edges_assignment) {
		edges_assignment = makeEdgesAssignmentSimple({ edges_foldAngle });
	}
	if (epsilon === undefined) {
		epsilon = makeEpsilon({ vertices_coords, edges_vertices });
	}
	const {
		constraints,
		lookup,
		facePairs,
		faces_winding,
		orders,
	} = makeSolverConstraintsFlat({
		vertices_coords,
		edges_vertices,
		edges_faces,
		edges_assignment,
		edges_foldAngle,
		faces_vertices,
		faces_edges,
		faces_faces,
		edges_vector,
	}, epsilon);
	return {
		...solver({ constraints, lookup, facePairs, orders }),
		faces_winding,
	};
};
const solveLayerOrdersSingleBranches = ({
	vertices_coords, edges_vertices, edges_faces, edges_assignment,
	faces_vertices, faces_edges, edges_vector,
}, epsilon) => {
	if (!vertices_coords || !edges_vertices || !faces_vertices) {
		return { orders: {}, faces_winding: [] };
	}
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	if (!edges_faces) {
		edges_faces = makeEdgesFacesUnsorted({ edges_vertices, faces_vertices, faces_edges });
	}
	if (epsilon === undefined) {
		epsilon = makeEpsilon({ vertices_coords, edges_vertices });
	}
	const {
		constraints,
		lookup,
		facePairs,
		faces_winding,
		orders,
	} = makeSolverConstraintsFlat({
		vertices_coords,
		edges_vertices,
		edges_faces,
		edges_assignment,
		faces_vertices,
		faces_edges,
		edges_vector,
	}, epsilon);
	return {
		...solver$1({ constraints, lookup, facePairs, orders }),
		faces_winding,
	};
};
const solveLayerOrders3D = ({
	vertices_coords, edges_vertices, edges_faces, edges_assignment,
	edges_foldAngle, faces_vertices, faces_edges, faces_faces,
}, epsilon) => {
	if (!vertices_coords || !edges_vertices || !faces_vertices) {
		return { orders: {}, faces_winding: [] };
	}
	if (!faces_edges) {
		faces_edges = makeFacesEdgesFromVertices({ edges_vertices, faces_vertices });
	}
	if (!edges_faces) {
		edges_faces = makeEdgesFacesUnsorted({ edges_vertices, faces_vertices, faces_edges });
	}
	if (!faces_faces) {
		faces_faces = makeFacesFaces({ faces_vertices });
	}
	if (!edges_foldAngle && edges_assignment) {
		edges_foldAngle = makeEdgesFoldAngle({ edges_assignment });
	}
	if (!edges_assignment) {
		edges_assignment = makeEdgesAssignmentSimple({ edges_foldAngle });
	}
	if (epsilon === undefined) {
		epsilon = makeEpsilon({ vertices_coords, edges_vertices });
	}
	const {
		constraints,
		lookup,
		facePairs,
		faces_winding,
		orders,
	} = makeSolverConstraints3D({
		vertices_coords,
		edges_vertices,
		edges_faces,
		edges_assignment,
		edges_foldAngle,
		faces_vertices,
		faces_edges,
		faces_faces,
	}, epsilon);
	return {
		...solver({ constraints, lookup, facePairs, orders }),
		faces_winding,
	};
};
const solveFaceOrders = (graph, epsilon) => {
	const {
		faces_winding,
		...result
	} = solveLayerOrders(graph, epsilon);
	return layerSolutionToFaceOrdersTree(result, faces_winding);
};
const solveFaceOrders3D = (graph, epsilon) => {
	const {
		faces_winding,
		...result
	} = solveLayerOrders3D(graph, epsilon);
	return layerSolutionToFaceOrdersTree(result, faces_winding);
};

export { solveFaceOrders, solveFaceOrders3D, solveLayerOrders, solveLayerOrders3D, solveLayerOrdersSingleBranches };
