/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { dot, resize3 } from '../math/vector.js';
import { uniqueSortedNumbers } from '../general/array.js';
import { makeFacesNormal } from './normals.js';
import { topologicalSort } from './directedGraph.js';
import { makeVerticesVerticesUnsorted } from './make/verticesVertices.js';
import { connectedComponents } from './connectedComponents.js';
import { invertFlatToArrayMap, invertFlatMap, invertArrayToFlatMap } from './maps.js';

const faceOrdersSubset = (faceOrders, faces) => {
	const facesHash = {};
	faces.forEach(f => { facesHash[f] = true; });
	return faceOrders
		.filter(order => facesHash[order[0]] && facesHash[order[1]]);
};
const overlappingFaceOrdersClusters = ({ faceOrders }) => {
	const faces_cluster = connectedComponents(makeVerticesVerticesUnsorted({
		edges_vertices: faceOrders.map(([a, b]) => [a, b]),
	}));
	const clusters_faces = invertFlatToArrayMap(faces_cluster);
	const clusters_faceOrders = clusters_faces
		.map(faces => faceOrdersSubset(faceOrders, faces));
	return {
		clusters_faces,
		clusters_faceOrders,
	};
};
const faceOrdersToDirectedEdges = (
	{ vertices_coords, faces_vertices, faceOrders, faces_normal },
	rootFace,
) => {
	if (!faceOrders || !faceOrders.length) { return []; }
	if (!faces_normal) {
		faces_normal = makeFacesNormal({ vertices_coords, faces_vertices });
	}
	const faces = uniqueSortedNumbers(faceOrders.flatMap(([a, b]) => [a, b]));
	const normal = rootFace !== undefined && faces.includes(rootFace)
		? faces_normal[rootFace]
		: faces_normal[faces[0]];
	const facesNormalMatch = {};
	faces.forEach(f => {
		facesNormalMatch[f] = dot(faces_normal[f], normal) > 0;
	});
	return faceOrders
		.map(order => ((order[2] === -1) !== (!facesNormalMatch[order[1]])
			? [order[0], order[1]]
			: [order[1], order[0]]));
};
const linearizeFaceOrders = (
	{ vertices_coords, faces_vertices, faceOrders, faces_normal },
	rootFace,
) => (topologicalSort(faceOrdersToDirectedEdges({
	vertices_coords, faces_vertices, faceOrders, faces_normal,
}, rootFace)));
const fillInMissingFaces = ({ faces_vertices }, faces_layer) => {
	if (!faces_vertices) { return faces_layer; }
	const missingFaces = faces_vertices
		.map((_, i) => i)
		.filter(i => faces_layer[i] == null);
	return missingFaces.concat(invertFlatMap(faces_layer));
};
const linearize2DFaces = ({
	vertices_coords, faces_vertices, faceOrders, faces_layer, faces_normal,
}, rootFace) => {
	if (!faces_normal) {
		faces_normal = makeFacesNormal({ vertices_coords, faces_vertices });
	}
	if (faceOrders) {
		const linearization = linearizeFaceOrders(
			{ faceOrders, faces_normal },
			rootFace,
		);
		return !linearization
			? []
			: fillInMissingFaces({ faces_vertices }, invertFlatMap(linearization));
	}
	if (faces_layer) {
		return fillInMissingFaces({ faces_vertices }, faces_layer);
	}
	return faces_vertices.map((_, i) => i).filter(() => true);
};
const nudgeFacesWithFaceOrders = ({
	vertices_coords, faces_vertices, faceOrders, faces_normal: facesNormal,
}) => {
	const faces_normal = facesNormal
		? facesNormal.map(resize3)
		: makeFacesNormal({ vertices_coords, faces_vertices });
	const {
		clusters_faces,
		clusters_faceOrders,
	} = overlappingFaceOrdersClusters({ faceOrders });
	const clusters_layers_face = clusters_faceOrders
		.map(orders => linearizeFaceOrders({ faceOrders: orders, faces_normal }));
	if (clusters_layers_face.includes(undefined)) { return undefined; }
	const clusters_normals = clusters_faces.map(faces => faces_normal[faces[0]]);
	const faces_nudge = [];
	clusters_layers_face.forEach((set, i) => set.forEach((face, index) => {
		faces_nudge[face] = {
			vector: clusters_normals[i],
			layer: index,
		};
	}));
	return faces_nudge;
};
const nudgeFacesWithFacesLayer = ({ faces_layer }) => {
	const faces_nudge = [];
	const layers_face = invertFlatMap(faces_layer);
	layers_face.forEach((face, layer) => {
		faces_nudge[face] = {
			vector: [0, 0, 1],
			layer,
		};
	});
	return faces_nudge;
};
const makeFacesLayer = ({ vertices_coords, faces_vertices, faceOrders, faces_normal }) => {
	if (!faces_normal) {
		faces_normal = makeFacesNormal({ vertices_coords, faces_vertices });
	}
	const linearization = linearizeFaceOrders({ faceOrders, faces_normal });
	return !linearization ? [] : invertFlatMap(linearization);
};
const flipFacesLayer = (faces_layer) => invertArrayToFlatMap(
	invertFlatToArrayMap(faces_layer).reverse(),
);

export { faceOrdersSubset, faceOrdersToDirectedEdges, flipFacesLayer, linearize2DFaces, linearizeFaceOrders, makeFacesLayer, nudgeFacesWithFaceOrders, nudgeFacesWithFacesLayer, overlappingFaceOrdersClusters };
