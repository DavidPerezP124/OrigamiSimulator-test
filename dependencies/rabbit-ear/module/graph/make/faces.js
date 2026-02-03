/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { getDimensionQuick } from '../../fold/spec.js';
import { makePolygonNonCollinear, centroid } from '../../math/polygon.js';
import { resize2, average2, resize3, average3 } from '../../math/vector.js';
import { filterWalkedBoundaryFace, walkPlanarFaces } from '../walk.js';
import { makeVerticesVertices } from './verticesVertices.js';
import { makeVerticesSectors } from './vertices.js';
import { makeVerticesToEdge } from './lookup.js';

const makePlanarFaces = ({
	vertices_coords, vertices_vertices, vertices_edges,
	vertices_sectors, edges_vertices, edges_vector,
}) => {
	if (!vertices_vertices) {
		vertices_vertices = makeVerticesVertices({
			vertices_coords, edges_vertices, vertices_edges,
		});
	}
	if (!vertices_sectors) {
		vertices_sectors = makeVerticesSectors({
			vertices_coords, vertices_vertices, edges_vertices, edges_vector,
		});
	}
	const vertices_edges_map = makeVerticesToEdge({ edges_vertices });
	const res = filterWalkedBoundaryFace(walkPlanarFaces({
		vertices_vertices, vertices_sectors,
	})).map(f => ({ ...f, edges: f.edges.map(e => vertices_edges_map[e]) }));
	return {
		faces_vertices: res.map(el => el.vertices),
		faces_edges: res.map(el => el.edges),
		faces_sectors: res.map(el => el.angles),
	};
};
const makeFacesPolygon = ({ vertices_coords, faces_vertices }, epsilon) => (
	faces_vertices
		.map(verts => verts.map(v => vertices_coords[v]))
		.map(polygon => makePolygonNonCollinear(polygon, epsilon))
);
const makeFacesPolygonQuick = ({ vertices_coords, faces_vertices }) => (
	faces_vertices.map(verts => verts.map(v => vertices_coords[v]))
);
const makeFacesCentroid2D = ({ vertices_coords, faces_vertices }) => (
	faces_vertices
		.map(fv => fv.map(v => vertices_coords[v]))
		.map(coords => coords.map(resize2))
		.map(coords => centroid(coords))
);
const makeFacesCenter2DQuick = ({ vertices_coords, faces_vertices }) => (
	makeFacesPolygonQuick({ vertices_coords, faces_vertices })
		.map(coords => coords.map(resize2))
		.map(coords => average2(...coords))
);
const makeFacesCenter3DQuick = ({ vertices_coords, faces_vertices }) => (
	makeFacesPolygonQuick({ vertices_coords, faces_vertices })
		.map(coords => coords.map(resize3))
		.map(coords => average3(...coords))
		.map(point => (Number.isNaN(point[2]) ? [point[0], point[1], 0] : point))
);
const makeFacesCenterQuick = ({ vertices_coords, faces_vertices }) => {
	const dimensions = getDimensionQuick({ vertices_coords });
	return dimensions === 2
		? makeFacesCenter2DQuick({ vertices_coords, faces_vertices })
		: makeFacesCenter3DQuick({ vertices_coords, faces_vertices });
};

export { makeFacesCenter2DQuick, makeFacesCenter3DQuick, makeFacesCenterQuick, makeFacesCentroid2D, makeFacesPolygon, makeFacesPolygonQuick, makePlanarFaces };
