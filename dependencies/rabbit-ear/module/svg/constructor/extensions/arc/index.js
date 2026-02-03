/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import arcPath from '../shared/makeArcPath.js';
import { str_path } from '../../../environment/strings.js';
import TransformMethods from '../shared/transforms.js';

const arcArguments = (a, b, c, d, e) => [arcPath(a, b, c, d, e, false)];
const arcDef = {
	arc: {
		nodeName: str_path,
		attributes: ["d"],
		args: arcArguments,
		methods: {
			setArc: (el, ...args) => el.setAttribute("d", arcArguments(...args)),
			...TransformMethods,
		},
	},
};

export { arcDef as default };
