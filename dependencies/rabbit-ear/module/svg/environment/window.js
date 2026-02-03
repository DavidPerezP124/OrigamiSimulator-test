/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { isBrowser } from './detect.js';
import Messages from './messages.js';

const windowContainer = { window: undefined };
if (isBrowser) { windowContainer.window = window; }
const buildDocument = (newWindow) => new newWindow.DOMParser()
	.parseFromString("<!DOCTYPE html><title>.</title>", "text/html");
const setWindow = (newWindow) => {
	if (!newWindow.document) { newWindow.document = buildDocument(newWindow); }
	windowContainer.window = newWindow;
	return windowContainer.window;
};
const RabbitEarWindow = () => {
	if (windowContainer.window === undefined) {
		throw new Error(Messages.window);
	}
	return windowContainer.window;
};

export { RabbitEarWindow as default, setWindow };
