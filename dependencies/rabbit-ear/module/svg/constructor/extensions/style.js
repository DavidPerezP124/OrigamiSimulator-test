/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import NS from '../../spec/namespace.js';
import RabbitEarWindow from '../../environment/window.js';
import { makeCDATASection } from '../../general/cdata.js';

const styleDef = {
	style: {
		init: (parent, text) => {
			const el = RabbitEarWindow().document.createElementNS(NS, "style");
			el.setAttribute("type", "text/css");
			el.textContent = "";
			el.appendChild(makeCDATASection(text));
			return el;
		},
		methods: {
			setTextContent: (el, text) => {
				el.textContent = "";
				el.appendChild(makeCDATASection(text));
				return el;
			},
		},
	},
};

export { styleDef as default };
