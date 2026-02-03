/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import { solveFaceOrders, solveFaceOrders3D } from './solve.js';
import { LayerPrototype } from './prototype.js';

const layer = (graph, epsilon) => Object.assign(
	Object.create(LayerPrototype),
	solveFaceOrders(graph, epsilon),
);
const layer3D = (graph, epsilon) => Object.assign(
	Object.create(LayerPrototype),
	solveFaceOrders3D(graph, epsilon),
);

export { layer, layer3D };
