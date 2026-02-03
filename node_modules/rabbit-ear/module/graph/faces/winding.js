/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const makeFacesWinding = ({ vertices_coords, faces_vertices }) => faces_vertices
	.map(vertices => vertices
		.map(v => vertices_coords[v])
		.map((point, i, arr) => [point, arr[(i + 1) % arr.length]])
		.map(pts => (pts[1][0] - pts[0][0]) * (pts[1][1] + pts[0][1]))
		.reduce((a, b) => a + b, 0))
	.map(face => face < 0);
const makeFacesWindingFromMatrix = faces_matrix => faces_matrix
	.map(m => m[0] * m[4] - m[1] * m[3])
	.map(c => c >= 0);
const makeFacesWindingFromMatrix2 = faces_matrix2 => faces_matrix2
	.map(m => m[0] * m[3] - m[1] * m[2])
	.map(c => c >= 0);

export { makeFacesWinding, makeFacesWindingFromMatrix, makeFacesWindingFromMatrix2 };
