/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as edges from './edges.js';
import * as edgesAssignment from './edgesAssignment.js';
import * as edgesEdges from './edgesEdges.js';
import * as edgesFaces from './edgesFaces.js';
import * as edgesFoldAngle from './edgesFoldAngle.js';
import * as edgesVertices from './edgesVertices.js';
import * as faces from './faces.js';
import * as facesEdges from './facesEdges.js';
import * as facesFaces from './facesFaces.js';
import * as facesVertices from './facesVertices.js';
import * as lookup from './lookup.js';
import * as vertices from './vertices.js';
import * as verticesEdges from './verticesEdges.js';
import * as verticesFaces from './verticesFaces.js';
import * as verticesVertices from './verticesVertices.js';

const make = {
	...edges,
	...edgesAssignment,
	...edgesEdges,
	...edgesFaces,
	...edgesFoldAngle,
	...edgesVertices,
	...faces,
	...facesEdges,
	...facesFaces,
	...facesVertices,
	...lookup,
	...vertices,
	...verticesEdges,
	...verticesFaces,
	...verticesVertices,
};

export { make as default };
