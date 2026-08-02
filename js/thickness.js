/**
 * Material thickness accommodation for the folding simulation.
 *
 * The zero-thickness solver drives each crease toward targetTheta*creasePercent, so a
 * flat-foldable pattern collapses onto a single plane with all its layers interpenetrating.
 * With a real material thickness t this is impossible - each hinge can only close far enough
 * that the plates it connects end up separated by the layers of material stacked between them.
 *
 * This module combines two known techniques from the thick-origami literature:
 *
 * 1. Layer ordering of the flat-folded state. Faces joined by facet creases are merged
 *    into rigid panels (union-find), then every fully folded crease (target angle +/-180)
 *    contributes an above/below constraint between its two panels, with the constraint
 *    direction given by the mountain/valley sign and the face's orientation parity
 *    (whether an even or odd number of folded creases is crossed to reach it - the
 *    standard reflection-map argument, see Demaine & O'Rourke, "Geometric Folding
 *    Algorithms"). Integer layer indices are assigned by longest-path layering of the
 *    constraint digraph (Kahn's algorithm). The exact layer-ordering problem is NP-hard
 *    (Akitaya et al.), so this is a heuristic: it is exact for accordions, Miura-ori and
 *    other patterns whose ordering is forced by crease adjacency, and it degrades
 *    gracefully (minimum gap of one layer) on orderings it cannot resolve.
 *
 * 2. Fold angle limits per crease (Tachi 2011, "Rigid-Foldable Thick Origami" - tapered
 *    panels/axis shift). A hinge whose plates must end up offset by a gap g = layerGap*t,
 *    with panel depth h on either side, can close at most to PI - 2*atan(g/(2h)) before the
 *    plates interpenetrate. The solver clamps each crease's target angle to this limit, so
 *    a flat-foldable pattern folds into a wedged stack of plates instead of a plane -
 *    i.e. it stays "thick flat foldable".
 */

function initThickness(globals){

    var FOLD_TOL = 0.3;//radians, tolerance for classifying target angles as flat (0) or fully folded (+/-PI)

    //"no limit" is a large finite angle rather than PI: the solvers clamp target angles to
    //this value and add a restoring force above it, and theta is unwrapped across
    //revolutions, so returning PI would cap hinges dragged past 180 degrees and change
    //zero-thickness behavior. kept well inside mediump float range for the gpu texture
    var NO_LIMIT = 10000;

    //returns the max fold angle magnitude for a crease, in radians
    function getCreaseThetaMax(crease){
        if (crease.type == 0 || !globals.simulateThickness) return NO_LIMIT;
        var t = globals.materialThickness;//pattern units - panelDepth is in pattern units too, the ratio is scale free
        if (!(t > 0)) return NO_LIMIT;
        var gap = (crease.layerGap > 0 ? crease.layerGap : 1)*t;
        var h = crease.panelDepth;//depth of the smaller rigid panel at this hinge, set by assignLayerGaps
        if (!(h > 0)) return NO_LIMIT;
        var thetaMax = Math.PI - 2*Math.atan(gap/(2*h));
        return thetaMax > 0 ? thetaMax : 0;
    }

    //sets crease.layerGap = number of material layers the hinge spans in the fully folded
    //state, and crease.panelDepth = perpendicular extent of the smaller rigid panel at the
    //hinge (pattern units), measured across the whole merged panel so the fold angle limit
    //does not depend on triangulation density
    //returns true if a layer ordering was computed, false if the default (one layer) was kept
    function assignLayerGaps(creases, faces, nodes){

        var numFaces = faces.length;
        //layerGap and panelDepth are plain data owned by this module
        for (var i=0;i<creases.length;i++){
            creases[i].layerGap = creases[i].type == 0 ? 0 : 1;
            creases[i].panelDepth = 0;
        }
        if (numFaces == 0 || creases.length == 0) return false;

        //classify creases and merge coplanar faces into rigid panels
        var parent = [];
        for (var i=0;i<numFaces;i++) parent.push(i);
        function find(a){
            while (parent[a] != a){
                parent[a] = parent[parent[a]];
                a = parent[a];
            }
            return a;
        }

        var foldedCreases = [];
        var flatFoldable = true;
        for (var i=0;i<creases.length;i++){
            var crease = creases[i];
            if (crease.type == 0){
                //facet crease: the two faces are one rigid panel. only these may be merged -
                //an active crease is a hinge between separate plates however shallow its
                //target, and merging one would inflate the panel depth its neighbours are
                //measured against and collapse distinct layer-ordering nodes
                parent[find(crease.face1Index)] = find(crease.face2Index);
            } else if (Math.abs(Math.abs(crease.getTargetTheta())-Math.PI) <= FOLD_TOL){
                foldedCreases.push(crease);
            } else {
                //a hinge that neither lies flat nor closes fully - the pattern has no
                //flat-folded state for this ordering calculation
                flatFoldable = false;
            }
        }

        //collect the vertices of each rigid panel
        var panelVertices = {};
        for (var i=0;i<numFaces;i++){
            var root = find(i);
            if (panelVertices[root] === undefined) panelVertices[root] = {};
            panelVertices[root][faces[i][0]] = true;
            panelVertices[root][faces[i][1]] = true;
            panelVertices[root][faces[i][2]] = true;
        }
        //panel depth per hinge: max perpendicular distance from the crease line over the
        //whole rigid panel on each side, min across the two sides (the overlap extent)
        for (var i=0;i<creases.length;i++){
            var crease = creases[i];
            if (crease.type == 0) continue;
            var p0 = crease.edge.nodes[0].getOriginalPosition();
            var p1 = crease.edge.nodes[1].getOriginalPosition();
            var dirX = p1.x-p0.x, dirY = p1.y-p0.y, dirZ = p1.z-p0.z;
            var dirLength = Math.sqrt(dirX*dirX+dirY*dirY+dirZ*dirZ);
            if (dirLength == 0) continue;
            dirX /= dirLength;
            dirY /= dirLength;
            dirZ /= dirLength;
            var sideDepths = [0, 0];
            var sideRoots = [find(crease.face1Index), find(crease.face2Index)];
            for (var side=0;side<2;side++){
                var verts = panelVertices[sideRoots[side]];
                for (var key in verts){
                    var position = nodes[key].getOriginalPosition();
                    var vx = position.x-p0.x, vy = position.y-p0.y, vz = position.z-p0.z;
                    var proj = vx*dirX+vy*dirY+vz*dirZ;
                    var depthSq = vx*vx+vy*vy+vz*vz - proj*proj;
                    if (depthSq > sideDepths[side]) sideDepths[side] = depthSq;
                }
            }
            crease.panelDepth = Math.sqrt(Math.min(sideDepths[0], sideDepths[1]));
        }

        if (!flatFoldable) return false;
        if (foldedCreases.length == 0) return false;

        //orientation parity: a face is mirrored in the flat-folded state iff an odd number
        //of folded creases is crossed to reach it
        var neighbors = [];
        for (var i=0;i<numFaces;i++) neighbors.push([]);
        for (var i=0;i<foldedCreases.length;i++){
            var crease = foldedCreases[i];
            neighbors[crease.face1Index].push(crease.face2Index);
            neighbors[crease.face2Index].push(crease.face1Index);
        }
        //faces of the same panel share parity - link panel members with non-flipping edges
        var panelMembers = {};
        for (var i=0;i<numFaces;i++){
            var root = find(i);
            if (panelMembers[root] === undefined) panelMembers[root] = [];
            panelMembers[root].push(i);
        }
        var parity = [];
        for (var i=0;i<numFaces;i++) parity.push(0);//0 = unvisited
        for (var s=0;s<numFaces;s++){
            if (parity[s] != 0) continue;
            parity[s] = 1;
            var queue = [s];
            var head = 0;
            while (head < queue.length){
                var f = queue[head++];
                var linked = panelMembers[find(f)];
                for (var j=0;j<linked.length;j++){//same panel, same parity
                    if (parity[linked[j]] == 0){
                        parity[linked[j]] = parity[f];
                        queue.push(linked[j]);
                    } else if (parity[linked[j]] != parity[f]) return false;//parity conflict
                }
                for (var j=0;j<neighbors[f].length;j++){//across a folded crease, flipped parity
                    var g = neighbors[f][j];
                    if (parity[g] == 0){
                        parity[g] = -parity[f];
                        queue.push(g);
                    } else if (parity[g] != -parity[f]) return false;//parity conflict
                }
            }
        }

        //stacking constraint digraph between panels: for each folded crease, the M/V sign
        //combined with the parity of face1 decides which panel lies above the other
        var panelIds = {};
        var numPanels = 0;
        for (var i=0;i<foldedCreases.length;i++){
            var crease = foldedCreases[i];
            var roots = [find(crease.face1Index), find(crease.face2Index)];
            for (var j=0;j<2;j++){
                if (panelIds[roots[j]] === undefined) panelIds[roots[j]] = numPanels++;
            }
        }
        var successors = [];
        var inDegree = [];
        for (var i=0;i<numPanels;i++){
            successors.push([]);
            inDegree.push(0);
        }
        for (var i=0;i<foldedCreases.length;i++){
            var crease = foldedCreases[i];
            var a = panelIds[find(crease.face1Index)];
            var b = panelIds[find(crease.face2Index)];
            if (a == b) return false;//a panel folded onto itself has no valid ordering
            var direction = (crease.getTargetTheta() > 0 ? 1 : -1)*parity[crease.face1Index];
            var lo = direction > 0 ? a : b;
            var hi = direction > 0 ? b : a;
            successors[lo].push(hi);
            inDegree[hi]++;
        }

        //longest-path layering via Kahn's algorithm
        var layer = [];
        for (var i=0;i<numPanels;i++) layer.push(0);
        var queue = [];
        for (var i=0;i<numPanels;i++){
            if (inDegree[i] == 0) queue.push(i);
        }
        var head = 0;
        while (head < queue.length){
            var p = queue[head++];
            for (var j=0;j<successors[p].length;j++){
                var q = successors[p][j];
                if (layer[q] < layer[p]+1) layer[q] = layer[p]+1;
                if (--inDegree[q] == 0) queue.push(q);
            }
        }
        var ordered = head == numPanels;
        if (!ordered) console.warn("thickness: cyclic layer ordering constraints, layer gaps are approximate");

        for (var i=0;i<foldedCreases.length;i++){
            var crease = foldedCreases[i];
            var gap = Math.abs(layer[panelIds[find(crease.face1Index)]] - layer[panelIds[find(crease.face2Index)]]);
            crease.layerGap = gap > 1 ? gap : 1;
        }
        return ordered;
    }

    return {
        NO_LIMIT: NO_LIMIT,
        assignLayerGaps: assignLayerGaps,
        getCreaseThetaMax: getCreaseThetaMax
    }
}
