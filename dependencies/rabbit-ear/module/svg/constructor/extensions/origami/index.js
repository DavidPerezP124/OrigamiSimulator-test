/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import init from './init.js';
import methods from './methods.js';

const origamiDef = {
	origami: {
		nodeName: "g",
		init,
		args: () => [],
		methods,
	},
};

export { origamiDef as default };
