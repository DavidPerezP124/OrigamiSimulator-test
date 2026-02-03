/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { EPSILON } from '../math/constant.js';
import { resize2 } from '../math/vector.js';
import { counterClockwiseSectors2 } from '../math/radial.js';
import { assignmentFlatFoldAngle, assignmentCanBeFolded } from '../fold/spec.js';
import { makeVerticesVertices } from '../graph/make/verticesVertices.js';
import { makeVerticesEdgesUnsorted } from '../graph/make/verticesEdges.js';
import { makeVerticesVerticesVector } from '../graph/make/vertices.js';
import { boundaryVertices } from '../graph/boundary.js';
import { alternatingSum } from './kawasaki.js';

const getVerticesWithNoFolds = ({ vertices_edges, edges_assignment }) => (
	vertices_edges
		.map(edges => edges
			.map(e => !assignmentCanBeFolded[edges_assignment[e]])
			.reduce((a, b) => a && b, true))
		.map((valid, i) => (valid ? i : undefined))
		.filter(a => a !== undefined)
);
const verticesFlatFoldabilityMaekawa = ({
	edges_vertices, vertices_edges, edges_assignment,
}) => {
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const verticesValidCount = vertices_edges
		.map(edges => edges
			.map(e => assignmentFlatFoldAngle[edges_assignment[e]])
			.filter(a => a !== 0 && a !== undefined)
			.map(Math.sign)
			.reduce((a, b) => a + b, 0))
		.map(sum => Math.abs(sum) - 2);
	boundaryVertices({ edges_vertices, edges_assignment })
		.forEach(v => { verticesValidCount[v] = 0; });
	getVerticesWithNoFolds({ vertices_edges, edges_assignment })
		.forEach(v => { verticesValidCount[v] = 0; });
	return verticesValidCount;
};
const verticesFlatFoldabilityKawasaki = ({
	vertices_coords,
	vertices_vertices,
	vertices_edges,
	edges_vertices,
	edges_assignment,
}) => {
	if (!vertices_vertices) {
		vertices_vertices = makeVerticesVertices({
			vertices_coords, vertices_edges, edges_vertices,
		});
	}
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const verticesValidAmount = makeVerticesVerticesVector({
		vertices_coords, vertices_vertices, edges_vertices,
	})
		.map((vectors, v) => vectors.filter((_, i) => (
			assignmentCanBeFolded[edges_assignment[vertices_edges[v][i]]]
		)))
		.map(vectors => vectors.map(resize2))
		.map(vectors => (vectors.length > 1
			? counterClockwiseSectors2(vectors)
			: [0, 0]))
		.map(sectors => alternatingSum(sectors))
		.map(([a, b]) => a - b);
	boundaryVertices({ edges_vertices, edges_assignment })
		.forEach(v => { verticesValidAmount[v] = 0; });
	getVerticesWithNoFolds({ vertices_edges, edges_assignment })
		.forEach(v => { verticesValidAmount[v] = 0; });
	return verticesValidAmount;
};
const verticesFlatFoldableMaekawa = (graph) => (
	verticesFlatFoldabilityMaekawa(graph).map(deviation => deviation === 0)
);
const verticesFlatFoldableKawasaki = (graph, epsilon = EPSILON) => (
	verticesFlatFoldabilityKawasaki(graph)
		.map(Math.abs)
		.map(deviation => deviation < epsilon)
);
const verticesFlatFoldability = (graph, epsilon) => {
	const maekawa = verticesFlatFoldableMaekawa(graph)
		.map(m => (m ? 0 : 1));
	const kawasaki = verticesFlatFoldableKawasaki(graph, epsilon)
		.map(k => (k ? 0 : 1));
	return maekawa.map((mae, v) => mae | (kawasaki[v] << 1));
};
const verticesFlatFoldable = (graph, epsilon) => (
	verticesFlatFoldability(graph, epsilon).map(n => n === 0)
);

export { verticesFlatFoldability, verticesFlatFoldabilityKawasaki, verticesFlatFoldabilityMaekawa, verticesFlatFoldable, verticesFlatFoldableKawasaki, verticesFlatFoldableMaekawa };
