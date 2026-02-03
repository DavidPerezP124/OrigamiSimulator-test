/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import curveArguments from './arguments.js';
import curve_methods from './methods.js';
import { str_path } from '../../../environment/strings.js';

const curveDef = {
	curve: {
		nodeName: str_path,
		attributes: ["d"],
		args: curveArguments,
		methods: curve_methods,
	},
};

export { curveDef as default };
