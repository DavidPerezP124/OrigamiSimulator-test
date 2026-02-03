/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import RabbitEarWindow from '../../environment/window.js';

const invisibleParent = (child) => {
	if (!RabbitEarWindow().document.body) { return undefined; }
	const parent = RabbitEarWindow().document.createElement("div");
	parent.setAttribute("display", "none");
	RabbitEarWindow().document.body.appendChild(parent);
	parent.appendChild(child);
	return parent;
};

export { invisibleParent };
