/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { planarize } from '../../graph/planarize.js';
import { makeVerticesVertices } from '../../graph/make/verticesVertices.js';
import { makePlanarFaces } from '../../graph/make/faces.js';

const planarizeGraph = (graph, epsilon) => {
	const planar = planarize(graph, epsilon);
	planar.vertices_vertices = makeVerticesVertices(planar);
	const faces = makePlanarFaces(planar);
	planar.faces_vertices = faces.faces_vertices;
	planar.faces_edges = faces.faces_edges;
	delete planar.vertices_edges;
	return planar;
};

export { planarizeGraph };
