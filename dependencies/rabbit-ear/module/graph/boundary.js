/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { boundingBox as boundingBox$1 } from '../math/polygon.js';
import { assignmentIsBoundary } from '../fold/spec.js';
import { uniqueElements } from '../general/array.js';
import { disjointGraphs } from './disjoint.js';
import { invertFlatToArrayMap } from './maps.js';
import { makeVerticesEdgesUnsorted } from './make/verticesEdges.js';
import { makeVerticesVerticesUnsorted, makeVerticesVertices2D } from './make/verticesVertices.js';
import { makeVerticesToEdge } from './make/lookup.js';
import { connectedComponents } from './connectedComponents.js';

const boundingBox = ({ vertices_coords }, padding) => (
	boundingBox$1(vertices_coords, padding)
);
const boundaryVertices = ({ edges_vertices, edges_assignment = [] }) => (
	uniqueElements(edges_vertices
		.filter((_, i) => assignmentIsBoundary[edges_assignment[i]])
		.flat()));
const emptyBoundaryObject = () => ({ vertices: [], edges: [] });
const boundary = ({ vertices_edges, edges_vertices, edges_assignment }) => {
	if (!edges_assignment || !edges_vertices) { return emptyBoundaryObject(); }
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const edgesBoundary = edges_assignment.map(a => a === "B" || a === "b");
	const usedVertices = {};
	const vertices = [];
	const edges = [];
	let edgeIndex = edgesBoundary
		.map((isBoundary, e) => (isBoundary ? e : undefined))
		.filter(a => a !== undefined)
		.shift();
	if (edgeIndex === undefined) { return emptyBoundaryObject(); }
	edgesBoundary[edgeIndex] = false;
	edges.push(edgeIndex);
	vertices.push(edges_vertices[edgeIndex][0]);
	usedVertices[edges_vertices[edgeIndex][0]] = true;
	let nextVertex = edges_vertices[edgeIndex][1];
	while (!usedVertices[nextVertex]) {
		vertices.push(nextVertex);
		usedVertices[nextVertex] = true;
		edgeIndex = vertices_edges[nextVertex]
			.filter(v => edgesBoundary[v])
			.shift();
		if (edgeIndex === undefined) { return emptyBoundaryObject(); }
		if (edges_vertices[edgeIndex][0] === nextVertex) {
			[, nextVertex] = edges_vertices[edgeIndex];
		} else {
			[nextVertex] = edges_vertices[edgeIndex];
		}
		edges.push(edgeIndex);
		edgesBoundary[edgeIndex] = false;
	}
	return { vertices, edges };
};
const boundaries = ({ vertices_edges, edges_vertices, edges_assignment }) => {
	if (!edges_assignment || !edges_vertices) {
		return [emptyBoundaryObject()];
	}
	if (!vertices_edges) {
		vertices_edges = makeVerticesEdgesUnsorted({ edges_vertices });
	}
	const edges_verticesBoundary = [...edges_vertices];
	edges_assignment.map(a => a === "B" || a === "b")
		.map((isBoundary, e) => (!isBoundary ? e : undefined))
		.filter(e => e !== undefined)
		.forEach(e => delete edges_verticesBoundary[e]);
	const vertices_edgesBoundary = makeVerticesEdgesUnsorted({
		edges_vertices: edges_verticesBoundary,
	});
	const verticesVertices = makeVerticesVerticesUnsorted({
		vertices_edges: vertices_edgesBoundary,
		edges_vertices: edges_verticesBoundary,
	});
	const connectedVertices = connectedComponents(verticesVertices);
	const groupsVertex = invertFlatToArrayMap(connectedVertices)
		.map(vertices => vertices[0]);
	const walkVerticesVertices = (startVertex) => {
		let prevVertex;
		let currVertex = startVertex;
		let nextVertex;
		const result = [];
		const filterFunc = (v) => v !== prevVertex;
		while (true) {
			verticesVertices[currVertex] = verticesVertices[currVertex]
				.filter(filterFunc);
			nextVertex = verticesVertices[currVertex].shift();
			if (nextVertex === undefined) { return result; }
			result.push(currVertex);
			prevVertex = currVertex;
			currVertex = nextVertex;
		}
	};
	const boundariesVertices = groupsVertex
		.map(vertex => walkVerticesVertices(vertex));
	const edgeMap = makeVerticesToEdge({
		edges_vertices: edges_verticesBoundary,
	});
	const boundariesEdges = boundariesVertices
		.map(vertices => vertices
			.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
			.map(pair => edgeMap[pair.join(" ")]));
	return boundariesVertices.map((vertices, i) => ({
		vertices,
		edges: boundariesEdges[i],
	}));
};
const boundaryPolygons = ({
	vertices_coords, vertices_edges, edges_vertices, edges_assignment,
}) => (
	boundaries({ vertices_edges, edges_vertices, edges_assignment })
		.map(({ vertices }) => vertices.map(v => vertices_coords[v]))
);
const boundaryPolygon = ({
	vertices_coords, vertices_edges, edges_vertices, edges_assignment,
}) => (
	boundary({ vertices_edges, edges_vertices, edges_assignment })
		.vertices
		.map(v => vertices_coords[v])
);
const planarBoundary = ({
	vertices_coords, vertices_edges, vertices_vertices, edges_vertices,
}) => {
	if (!vertices_vertices) {
		vertices_vertices = makeVerticesVertices2D({
			vertices_coords, vertices_edges, edges_vertices,
		});
	}
	const edge_map = makeVerticesToEdge({ edges_vertices });
	const edge_walk = [];
	const vertex_walk = [];
	const walk = {
		vertices: vertex_walk,
		edges: edge_walk,
	};
	let largestX = -Infinity;
	let first_vertex_i = -1;
	vertices_coords.forEach((v, i) => {
		if (v[0] > largestX) {
			largestX = v[0];
			first_vertex_i = i;
		}
	});
	if (first_vertex_i === -1) { return walk; }
	vertex_walk.push(first_vertex_i);
	const first_vc = vertices_coords[first_vertex_i];
	const first_neighbors = vertices_vertices[first_vertex_i];
	if (!first_neighbors) { return walk; }
	const counter_clock_first_i = first_neighbors
		.map(i => vertices_coords[i])
		.map(vc => [vc[0] - first_vc[0], vc[1] - first_vc[1]])
		.map(vec => Math.atan2(vec[1], vec[0]))
		.map(angle => (angle < 0 ? angle + Math.PI * 2 : angle))
		.map((a, i) => ({ a, i }))
		.sort((a, b) => a.a - b.a)
		.shift()
		.i;
	const second_vertex_i = first_neighbors[counter_clock_first_i];
	const first_edge_lookup = first_vertex_i < second_vertex_i
		? `${first_vertex_i} ${second_vertex_i}`
		: `${second_vertex_i} ${first_vertex_i}`;
	const first_edge = edge_map[first_edge_lookup];
	edge_walk.push(first_edge);
	let prev_vertex_i = first_vertex_i;
	let this_vertex_i = second_vertex_i;
	const visitedVertexPairs = { [`${prev_vertex_i} ${this_vertex_i}`]: true };
	while (true) {
		const next_neighbors = vertices_vertices[this_vertex_i];
		const from_neighbor_i = next_neighbors.indexOf(prev_vertex_i);
		const next_neighbor_i = (from_neighbor_i + 1) % next_neighbors.length;
		const next_vertex_i = next_neighbors[next_neighbor_i];
		const next_edge_lookup = this_vertex_i < next_vertex_i
			? `${this_vertex_i} ${next_vertex_i}`
			: `${next_vertex_i} ${this_vertex_i}`;
		const next_edge_i = edge_map[next_edge_lookup];
		if (visitedVertexPairs[`${this_vertex_i} ${next_vertex_i}`]) {
			if (next_edge_i !== edge_walk[0]) { console.warn("bad boundary"); }
			return walk;
		}
		visitedVertexPairs[`${this_vertex_i} ${next_vertex_i}`] = true;
		vertex_walk.push(this_vertex_i);
		edge_walk.push(next_edge_i);
		prev_vertex_i = this_vertex_i;
		this_vertex_i = next_vertex_i;
	}
};
const planarBoundaries = ({
	vertices_coords, vertices_edges, vertices_vertices, edges_vertices,
}) => {
	if (!vertices_vertices) {
		vertices_vertices = makeVerticesVertices2D({
			vertices_coords, vertices_edges, edges_vertices,
		});
	}
	return disjointGraphs({
		vertices_coords, vertices_vertices, edges_vertices,
	}).map(planarBoundary);
};

export { boundaries, boundary, boundaryPolygon, boundaryPolygons, boundaryVertices, boundingBox, planarBoundaries, planarBoundary };
