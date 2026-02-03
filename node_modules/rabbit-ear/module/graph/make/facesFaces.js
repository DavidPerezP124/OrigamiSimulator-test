/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const makeFacesFaces = ({ faces_vertices }) => {
	const vertexPairToFaces = {};
	const facesVerticesKeys = faces_vertices
		.map(face => face
			.map((v, i, arr) => [v, arr[(i + 1) % arr.length]])
			.map(pair => pair.join(" ")));
	facesVerticesKeys
		.flat()
		.forEach(key => { vertexPairToFaces[key] = []; });
	facesVerticesKeys
		.forEach((keys, f) => keys
			.forEach(key => vertexPairToFaces[key].push(f)));
	return faces_vertices
		.map((face, f1) => face
			.map((v, i, arr) => [arr[(i + 1) % arr.length], v])
			.map(pair => pair.join(" "))
			.map(key => vertexPairToFaces[key])
			.map(faces => (faces === undefined ? [undefined] : faces))
			.flatMap(faces => faces.filter(f2 => f1 !== f2).shift()));
};

export { makeFacesFaces };
