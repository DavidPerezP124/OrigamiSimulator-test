/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const endOptions = () => ({
	visible: false,
	width: 8,
	height: 10,
	padding: 0.0,
});
const makeArrowOptions = () => ({
	head: endOptions(),
	tail: endOptions(),
	bend: 0.0,
	padding: 0.0,
	pinch: 0.618,
	points: [],
});

export { makeArrowOptions };
