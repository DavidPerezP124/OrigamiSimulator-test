/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const getTitleAuthorDescription = (graph) => [
	"file_title",
	"file_author",
	"file_description",
	"frame_title",
	"frame_author",
	"frame_description",
].filter(key => graph[key])
	.map(key => `# ${key.split("_")[1]}: ${graph[key]}`)
	.join("\n");
const foldToObj = (file) => {
	const graph = typeof file === "string" ? JSON.parse(file) : file;
	const metadata = getTitleAuthorDescription(graph);
	const vertices = (graph.vertices_coords || [])
		.map(coords => coords.join(" "))
		.map(str => `v ${str}`)
		.join("\n");
	const faces = (graph.faces_vertices || [])
		.map(verts => verts.map(v => v + 1).join(" "))
		.map(str => `f ${str}`)
		.join("\n");
	const fileString = [metadata, vertices, faces]
		.filter(s => s !== "")
		.join("\n");
	return `${fileString}\n`;
};

export { foldToObj };
