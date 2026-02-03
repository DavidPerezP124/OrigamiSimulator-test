/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import ArrowMethods from './methods.js';
import init from './init.js';

const arrowDef = {
	arrow: {
		nodeName: "g",
		attributes: [],
		args: () => [],
		methods: ArrowMethods,
		init,
	},
};

export { arrowDef as default };
