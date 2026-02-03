/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import Messages from '../environment/messages.js';
import { clone } from '../general/clone.js';
import { filterKeysWithPrefix } from './spec.js';

const flattenFrame = (graph, frameNumber = 0) => {
	if (!graph.file_frames || graph.file_frames.length < frameNumber) {
		return graph;
	}
	const visited = {};
	const fileMetadata = {};
	filterKeysWithPrefix(graph, "file")
		.filter(key => key !== "file_frames")
		.forEach(key => { fileMetadata[key] = graph[key]; });
	const recurse = (currentIndex, previousOrders) => {
		if (visited[currentIndex]) { throw new Error(Messages.graphCycle); }
		visited[currentIndex] = true;
		const thisOrders = [currentIndex].concat(previousOrders);
		const frame = currentIndex > 0
			? { ...graph.file_frames[currentIndex - 1] }
			: { ...graph };
		return frame.frame_inherit && frame.frame_parent != null
			? recurse(frame.frame_parent, thisOrders)
			: thisOrders;
	};
	const flattened = recurse(frameNumber, []).map((frameNum) => {
		const frame = frameNum > 0
			? { ...graph.file_frames[frameNum - 1] }
			: { ...graph };
		["file_frames", "frame_parent", "frame_inherit"]
			.forEach(key => delete frame[key]);
		return frame;
	}).reduce((a, b) => ({ ...a, ...b }), fileMetadata);
	return clone(flattened);
};
const getFileFramesAsArray = (graph) => {
	if (!graph) { return []; }
	if (!graph.file_frames || !graph.file_frames.length) {
		return [graph];
	}
	const frame0 = { ...graph };
	delete frame0.file_frames;
	return [frame0, ...graph.file_frames];
};
const countFrames = ({ file_frames }) => (!file_frames
	? 1
	: file_frames.length + 1);
const getFramesByClassName = (graph, className) => Array
	.from(Array(countFrames(graph)))
	.map((_, i) => flattenFrame(graph, i))
	.filter(frame => frame.frame_classes
		&& frame.frame_classes.includes(className));

export { countFrames, flattenFrame, getFileFramesAsArray, getFramesByClassName };
