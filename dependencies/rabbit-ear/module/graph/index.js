/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

import * as colors from '../fold/colors.js';
import * as frames from '../fold/frames.js';
import * as spec from '../fold/spec.js';
import * as vertex from './add/vertex.js';
import * as edge from './add/edge.js';
import * as circular from './edges/circular.js';
import * as duplicate from './edges/duplicate.js';
import * as lines from './edges/lines.js';
import * as overlap from './edges/overlap.js';
import * as planes from './faces/planes.js';
import * as matrix from './faces/matrix.js';
import * as winding from './faces/winding.js';
import * as flatFold from './fold/flatFold.js';
import * as foldGraph from './fold/foldGraph.js';
import * as foldGraphIntoSegments from './fold/foldGraphIntoSegments.js';
import * as foldGraphIntoSubgraph from './fold/foldGraphIntoSubgraph.js';
import * as splitEdge from './split/splitEdge.js';
import * as splitFace from './split/splitFace.js';
import * as splitLine from './split/splitLine.js';
import * as splitGraph from './split/splitGraph.js';
import * as validate from './validate/validate.js';
import * as clusters from './vertices/clusters.js';
import * as collinear from './vertices/collinear.js';
import * as duplicate$1 from './vertices/duplicate.js';
import * as folded from './vertices/folded.js';
import * as isolated from './vertices/isolated.js';
import * as sort from './vertices/sort.js';
import * as boundary from './boundary.js';
import * as clean from './clean.js';
import * as connectedComponents from './connectedComponents.js';
import * as count from './count.js';
import * as cycles from './cycles.js';
import * as directedGraph from './directedGraph.js';
import * as disjoint from './disjoint.js';
import * as explode from './explode.js';
import * as intersect from './intersect.js';
import * as join from './join.js';
import * as maps from './maps.js';
import * as nearest from './nearest.js';
import * as normalize from './normalize.js';
import * as normals from './normals.js';
import * as orders from './orders.js';
import * as overlap$1 from './overlap.js';
import * as intersectAllEdges from './planarize/intersectAllEdges.js';
import * as planarize from './planarize/planarize.js';
import * as planarizeCollinearEdges from './planarize/planarizeCollinearEdges.js';
import * as planarizeCollinearVertices from './planarize/planarizeCollinearVertices.js';
import * as planarizeMakeFaces from './planarize/planarizeMakeFaces.js';
import * as planarizeOverlaps from './planarize/planarizeOverlaps.js';
import * as pleat from './pleat.js';
import * as populate from './populate.js';
import * as raycast from './raycast.js';
import * as remove from './remove.js';
import * as rendering from './rendering.js';
import * as replace from './replace.js';
import * as subgraph from './subgraph.js';
import * as sweep from './sweep.js';
import * as transfer from './transfer.js';
import * as transform from './transform.js';
import * as trees from './trees.js';
import * as triangulate from './triangulate.js';
import * as walk from './walk.js';
import make from './make/index.js';
import { graphConstructor } from '../prototypes/index.js';

const graphMethods = {
	...colors,
	...frames,
	...spec,
	...vertex,
	...edge,
	...circular,
	...duplicate,
	...lines,
	...overlap,
	...planes,
	...matrix,
	...winding,
	...flatFold,
	...foldGraph,
	...foldGraphIntoSegments,
	...foldGraphIntoSubgraph,
	...clusters,
	...collinear,
	...duplicate$1,
	...folded,
	...isolated,
	...sort,
	...boundary,
	...clean,
	...connectedComponents,
	...count,
	...cycles,
	...directedGraph,
	...disjoint,
	...explode,
	...intersect,
	...join,
	...make,
	...maps,
	...nearest,
	...normalize,
	...normals,
	...orders,
	...overlap$1,
	...planarize,
	...intersectAllEdges,
	...planarizeCollinearEdges,
	...planarizeCollinearVertices,
	...planarizeMakeFaces,
	...planarizeOverlaps,
	...pleat,
	...populate,
	...raycast,
	...remove,
	...rendering,
	...replace,
	...splitEdge,
	...splitFace,
	...splitLine,
	...splitGraph,
	...subgraph,
	...sweep,
	...transfer,
	...transform,
	...trees,
	...triangulate,
	...walk,
	...validate,
};
const graphExport = Object.assign(graphConstructor, graphMethods);

export { graphExport as default };
