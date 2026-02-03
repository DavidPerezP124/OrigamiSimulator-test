/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../environment/window.js';
import { planarizeGraph } from './general/planarize.js';
import { invertVertical, findEpsilonInObject } from './general/options.js';
import { makeEdgesFoldAngle } from '../graph/make/edgesFoldAngle.js';

const xmlStringToDocument = (input, mimeType = "text/xml") => (
	(new (RabbitEarWindow().DOMParser)()).parseFromString(input, mimeType)
);
const getContainingValue = (oripa, value) => (oripa == null
	? null
	: Array.from(oripa.childNodes)
		.filter(el => el.attributes && el.attributes.length)
		.filter(el => Array.from(el.attributes)
			.filter(attr => attr.nodeValue === value)
			.shift() !== undefined)
		.shift());
const parseOriLineProxy = (oriLineProxy) => Array
	.from(oriLineProxy.childNodes)
	.filter(line => line.nodeName === "void")
	.filter(line => line.childNodes)
	.map(line => getContainingValue(line, "oripa.OriLineProxy"))
	.filter(lineData => lineData)
	.map(lineData => ["type", "x0", "x1", "y0", "y1"]
		.map(key => getContainingValue(lineData, key))
		.map(el => (el ? Array.from(el.childNodes) : []))
		.map(children => children
			.filter(child => child.nodeName === "double" || child.nodeName === "int")
			.shift())
		.map(node => (node && node.childNodes[0] && "data" in node.childNodes[0]
			? node.childNodes[0].data
			: "0"))
		.map(parseFloat));
const parseFileMetadata = (parsed) => {
	const strings = Array
		.from(parsed.getElementsByTagName("string"))
		.map(el => Array.from(el.childNodes)
			.map(ch => ch.nodeValue)
			.filter(str => str !== "")
			.shift());
	const titleIndex = strings.indexOf("title");
	const editorNameIndex = strings.indexOf("editorName");
	const originalAuthorNameIndex = strings.indexOf("originalAuthorName");
	const referenceIndex = strings.indexOf("reference");
	const memoIndex = strings.indexOf("memo");
	const metadata = {
		file_spec: 1.2,
		file_creator: "Rabbit Ear",
		file_classes: ["singleModel"],
		frame_classes: ["creasePattern"],
	};
	const file_authors = [];
	const file_descriptions = [];
	if (titleIndex !== -1 && strings[titleIndex + 1]) {
		metadata.file_title = strings[titleIndex + 1];
	}
	if (editorNameIndex !== -1 && strings[editorNameIndex + 1]) {
		file_authors.push(strings[editorNameIndex + 1]);
	}
	if (originalAuthorNameIndex !== -1 && strings[originalAuthorNameIndex + 1]) {
		file_authors.push(strings[originalAuthorNameIndex + 1]);
	}
	if (referenceIndex !== -1 && strings[referenceIndex + 1]) {
		file_descriptions.push(strings[referenceIndex + 1]);
	}
	if (memoIndex !== -1 && strings[memoIndex + 1]) {
		file_descriptions.push(strings[memoIndex + 1]);
	}
	if (file_authors.length) {
		metadata.file_author = file_authors.join(", ");
	}
	if (file_descriptions.length) {
		metadata.file_description = file_descriptions.join(", ");
	}
	return metadata;
};
const opxAssignment = ["F", "B", "M", "V", "U"];
const makeLineGraph = (lines) => {
	const vertices_coords = lines
		.flatMap(line => [[line[1], line[3]], [line[2], line[4]]]);
	const edges_vertices = lines.map((_, i) => [i * 2, i * 2 + 1]);
	const edges_assignment = lines.map(line => opxAssignment[line[0]]);
	const edges_foldAngle = makeEdgesFoldAngle({ edges_assignment });
	return {
		vertices_coords,
		edges_vertices,
		edges_assignment,
		edges_foldAngle,
	};
};
const opxEdgeGraph = (file) => {
	const parsed = xmlStringToDocument(file, "text/xml");
	const arrayOriLineProxy = Array
		.from(parsed.getElementsByClassName("oripa.OriLineProxy"))
		.filter(el => el.nodeName === "array" || el.tagName === "array")
		.shift();
	const lines = parseOriLineProxy(arrayOriLineProxy);
	return makeLineGraph(lines);
};
const opxToFold = (file, options) => {
	const parsed = xmlStringToDocument(file, "text/xml");
	const arrayOriLineProxy = Array
		.from(parsed.getElementsByClassName("oripa.OriLineProxy"))
		.filter(el => el.nodeName === "array" || el.tagName === "array")
		.shift();
	const firstDataSet = Array
		.from(parsed.getElementsByClassName("oripa.DataSet"))
		.filter(el => el.nodeName === "object" || el.tagName === "object")
		.shift();
	if (firstDataSet === undefined || arrayOriLineProxy === undefined) {
		return undefined;
	}
	const lines = parseOriLineProxy(arrayOriLineProxy);
	const file_metadata = parseFileMetadata(parsed);
	const graph = makeLineGraph(lines);
	if (options
		&& typeof options === "object"
		&& options.invertVertical
		&& graph.vertices_coords) {
		invertVertical(graph.vertices_coords);
	}
	const epsilon = findEpsilonInObject(graph, options);
	const planarGraph = planarizeGraph(graph, epsilon);
	return {
		...file_metadata,
		...planarGraph,
	};
};

export { opxEdgeGraph, opxToFold };
