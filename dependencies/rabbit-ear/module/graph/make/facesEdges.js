/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { makeVerticesToEdge } from './lookup.js';

const makeFacesEdgesFromVertices = ({ edges_vertices, faces_vertices }) => {
	const map = makeVerticesToEdge({ edges_vertices });
	return faces_vertices
		.map(face => face
			.map((v, i, arr) => [v, arr[(i + 1) % arr.length]].join(" ")))
		.map(face => face.map(pair => map[pair]));
};

export { makeFacesEdgesFromVertices };
