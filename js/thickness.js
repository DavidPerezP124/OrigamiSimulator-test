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
 *
 * 3. Offset panels, when the layer ordering above resolves (the offset panel technique of
 *    Edmondson, Lang, Magleby & Howell, generalised to arbitrary flat-foldable patterns by
 *    Ku & Demaine). Each panel's plate is shifted off the midsurface along its own normal by
 *    o = (layer + 0.5)*t*parity, which places it at its own height in the folded stack. The
 *    plates no longer share a hinge centerline, so they close fully flat without touching and
 *    the angle limits of (2) are switched off. Offset panels preserve the folding kinematics
 *    of the zero-thickness pattern, which is what lets the existing compliant solver keep
 *    driving the midsurface mesh unchanged while the plates ride at their stack offsets.
 *
 * Mode (3) is used whenever a layer ordering was found; otherwise the model falls back to the
 * angle limits of (2) with plates centred on the midsurface.
 *
 * Note on what is NOT implemented, in mode (3):
 *  - Through-holes. The offset panel technique cuts holes where one panel's extension passes
 *    through another panel's plane. We render the extensions without cutting the holes, so an
 *    exported solid can self-intersect there.
 *  - Hinge doubling. Ku & Demaine's central generalisation splits a hinge into two hinges plus
 *    a connecting strip where a single offset hinge cannot satisfy the constraints. We use the
 *    plain offset construction, so plates of adjacent layers can graze transiently at
 *    intermediate fold angles even though the deployed and fully folded states are clean.
 *  - Chen, Peng & You's spatial-linkage conversion (Bennett/Myard/Bricard) is a different
 *    approach to the same problem and is not implemented.
 * See the README for the references.
 */

function initThickness(globals){

    var FOLD_TOL = 0.3;//radians, tolerance for classifying target angles as flat (0) or fully folded (+/-PI)

    //the layer solution for the current model, or null if the pattern has no orderable
    //flat-folded state. {facePanel: [panel index per face], panelLayer: [stack index per
    //panel], faceParity: [+/-1 per face], numPanels}. this is what the offset panel
    //construction consumes - see getPanelOffset below
    var layerSolution = null;

    //the solver drives each crease to targetTheta*creasePercent and the advanced fold slider
    //runs -100..100, so a negative percent reverses every mountain and valley. the stack order
    //has to follow, or the offsets push plates together instead of apart - with contact and the
    //angle limits both switched off in this mode, nothing else would catch it. these remember
    //what the current solution was built for so it can be rebuilt when the sign flips
    var solutionSign = 1;
    var solutionInputs = null;

    function currentFoldSign(){
        //0 is the neutral point - nothing is folded, and treating it as a flip would thrash
        return globals.creasePercent < 0 ? -1 : 1;
    }

    //rebuilds the layer ordering if the fold direction has reversed since it was computed
    function syncFoldDirection(){
        if (!solutionInputs || currentFoldSign() === solutionSign) return false;
        assignLayerGaps(solutionInputs.creases, solutionInputs.faces, solutionInputs.nodes);
        //a rebuild changes layerGap, and with it every crease's thetaMax. the rigid solver
        //reads that live, but the dynamic solver bakes it into u_creaseMeta and only refreshes
        //on this flag - without it the gpu would keep clamping to the old direction's limits
        globals.creaseMaterialHasChanged = true;
        return true;
    }

    //"no limit" is a large finite angle rather than PI: the solvers clamp target angles to
    //this value and add a restoring force above it, and theta is unwrapped across
    //revolutions, so returning PI would cap hinges dragged past 180 degrees and change
    //zero-thickness behavior. kept well inside mediump float range for the gpu texture
    var NO_LIMIT = 10000;

    //returns the max fold angle magnitude for a crease, in radians
    function getCreaseThetaMax(crease){
        if (crease.type == 0 || !globals.simulateThickness) return NO_LIMIT;
        //offset panels are staggered across the stack rather than sharing a centerline, so
        //they close fully flat - the tapered-panel limit only applies to the fallback
        if (offsetPanelsActive()) return NO_LIMIT;
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
        layerSolution = null;//recomputed below; a stale solution must never outlive its model
        var foldSign = currentFoldSign();
        solutionSign = foldSign;
        solutionInputs = {creases: creases, faces: faces, nodes: nodes};
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
            //foldSign follows the fold slider: a negative percent reverses every crease, so the
            //whole stack has to invert with it
            var direction = (crease.getTargetTheta() > 0 ? 1 : -1)*parity[crease.face1Index]*foldSign;
            var lo = direction > 0 ? a : b;
            var hi = direction > 0 ? b : a;
            successors[lo].push(hi);
            inDegree[hi]++;
        }

        //longest-path layering via Kahn's algorithm. run repeatedly: overlapping panels left at
        //one layer get an extra constraint below and the layering is redone
        var layer = [];
        function runLayering(){
            layer = [];
            var remaining = [];
            for (var i=0;i<numPanels;i++){
                layer.push(0);
                remaining.push(inDegree[i]);
            }
            var queue = [];
            for (var i=0;i<numPanels;i++){
                if (remaining[i] == 0) queue.push(i);
            }
            var head = 0;
            while (head < queue.length){
                var p = queue[head++];
                for (var j=0;j<successors[p].length;j++){
                    var q = successors[p][j];
                    if (layer[q] < layer[p]+1) layer[q] = layer[p]+1;
                    if (--remaining[q] == 0) queue.push(q);
                }
            }
            return head == numPanels;
        }
        var ordered = runLayering();
        if (!ordered) console.warn("thickness: cyclic layer ordering constraints, layer gaps are approximate");

        //the offset construction places every panel at its own height in one shared stack, so
        //it is only sound when every panel's position is defined relative to every other. that
        //holds exactly when the folded-crease graph spans all the panels in one piece. a panel
        //reached by no folded crease, or a second component ordered independently, has no
        //defined height against the rest - and since offset mode also switches the contact
        //pass off, nothing would catch them overlapping. fall back in that case
        var spans = true;
        for (var i=0;i<numFaces && spans;i++){
            if (panelIds[find(i)] === undefined) spans = false;//panel in no folded crease
        }
        if (spans){
            var undirected = [];
            for (var i=0;i<numPanels;i++) undirected.push([]);
            for (var i=0;i<numPanels;i++){
                for (var j=0;j<successors[i].length;j++){
                    undirected[i].push(successors[i][j]);
                    undirected[successors[i][j]].push(i);
                }
            }
            var seen = new Uint8Array(numPanels);
            var stack = [0];
            seen[0] = 1;
            var reached = numPanels > 0 ? 1 : 0;
            while (stack.length){
                var p = stack.pop();
                for (var j=0;j<undirected[p].length;j++){
                    var q = undirected[p][j];
                    if (seen[q]) continue;
                    seen[q] = 1;
                    reached++;
                    stack.push(q);
                }
            }
            if (reached != numPanels) spans = false;//disconnected components
        }
        if (!spans) console.warn("thickness: folded creases do not span every panel in one " +
            "component, offset panels disabled - falling back to fold angle limits and contact");

        //Longest-path layering only separates panels that a folded crease directly constrains.
        //Two flaps folded over the same central panel are both one layer above it and therefore
        //land at the same height, where the offset construction stacks them into each other -
        //and offset mode has contact switched off, so nothing catches it. Find panels that share
        //a layer AND overlap in the flat-folded state, force them apart, and re-layer.
        //
        //The direction chosen for an added constraint is deterministic but arbitrary: it
        //guarantees the plates are separated, NOT that the stack is the order a real folder
        //would use. Deriving that needs taco-taco/taco-tortilla constraints, and deciding
        //flat-foldability with layer ordering is NP-hard (Akitaya et al.) - see the readme.
        var MAX_OVERLAP_TESTS = 4000000;
        var overlapChecked = true;//false if the check had to be skipped, which forces a fallback
        var separated = true;

        //flat-folded layout: each face maps to the plane by a composition of reflections, one
        //per folded crease crossed. Same reflection-map argument as the parity pass above, but
        //carrying the whole isometry [a b c d tx ty] rather than just its sign
        function foldedLayout(){
            //the crease pattern is flat but not necessarily in the xy plane - this model's
            //original positions span z as widely as x and y. Work in the pattern's own plane:
            //take its normal from a non-degenerate face and build an orthonormal basis in it
            if (nodes.length == 0) return null;
            var origin = nodes[0].getOriginalPosition();
            var nx = 0, ny = 0, nz = 0, ux = 0, uy = 0, uz = 0;
            for (var i=0;i<numFaces;i++){
                if (!faces[i]) continue;
                var a = nodes[faces[i][0]].getOriginalPosition();
                var b = nodes[faces[i][1]].getOriginalPosition();
                var c = nodes[faces[i][2]].getOriginalPosition();
                var abx = b.x-a.x, aby = b.y-a.y, abz = b.z-a.z;
                var acx = c.x-a.x, acy = c.y-a.y, acz = c.z-a.z;
                var cx = aby*acz-abz*acy, cy = abz*acx-abx*acz, cz = abx*acy-aby*acx;
                var cl = Math.sqrt(cx*cx+cy*cy+cz*cz);
                var al = Math.sqrt(abx*abx+aby*aby+abz*abz);
                if (cl == 0 || al == 0) continue;
                nx = cx/cl; ny = cy/cl; nz = cz/cl;
                ux = abx/al; uy = aby/al; uz = abz/al;
                origin = a;
                break;
            }
            if (nx == 0 && ny == 0 && nz == 0) return null;//no non-degenerate face
            var vx = ny*uz-nz*uy, vy = nz*ux-nx*uz, vz = nx*uy-ny*ux;

            function projectPos(p){
                var dx = p.x-origin.x, dy = p.y-origin.y, dz = p.z-origin.z;
                return [dx*ux+dy*uy+dz*uz, dx*vx+dy*vy+dz*vz];
            }
            var projected = new Array(nodes.length);
            var minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity, maxOff = 0;
            for (var i=0;i<nodes.length;i++){
                var p = nodes[i].getOriginalPosition();
                var dx = p.x-origin.x, dy = p.y-origin.y, dz = p.z-origin.z;
                var u = dx*ux+dy*uy+dz*uz;
                var v = dx*vx+dy*vy+dz*vz;
                var off = Math.abs(dx*nx+dy*ny+dz*nz);
                projected[i] = [u, v];
                if (u < minU) minU = u;
                if (u > maxU) maxU = u;
                if (v < minV) minV = v;
                if (v > maxV) maxV = v;
                if (off > maxOff) maxOff = off;
            }
            var extent = Math.sqrt((maxU-minU)*(maxU-minU) + (maxV-minV)*(maxV-minV));
            if (!(extent > 0)) return null;
            //the reflection map is a plane construction - a pattern with real depth has no
            //flat-folded layout to compare against
            if (maxOff > extent*1e-6) return null;

            var adjacency = [];
            for (var i=0;i<numFaces;i++) adjacency.push([]);
            for (var i=0;i<creases.length;i++){
                var crease = creases[i];
                var f = crease.face1Index, g = crease.face2Index;
                if (!faces[f] || !faces[g]) continue;
                adjacency[f].push({other: g, crease: crease});
                adjacency[g].push({other: f, crease: crease});
            }

            var transforms = new Array(numFaces);
            for (var s=0;s<numFaces;s++){
                if (transforms[s]) continue;
                transforms[s] = [1, 0, 0, 1, 0, 0];//identity at each component's root
                var queue = [s];
                var head = 0;
                while (head < queue.length){
                    var f = queue[head++];
                    var T = transforms[f];
                    for (var j=0;j<adjacency[f].length;j++){
                        var g = adjacency[f][j].other;
                        if (transforms[g]) continue;
                        var crease = adjacency[f][j].crease;
                        if (crease.type == 0){
                            transforms[g] = T.slice();//one rigid panel, same placement
                        } else {
                            //reflect across the image of the shared crease under T
                            var e0 = projectPos(crease.edge.nodes[0].getOriginalPosition());
                            var e1 = projectPos(crease.edge.nodes[1].getOriginalPosition());
                            var px = T[0]*e0[0] + T[1]*e0[1] + T[4], py = T[2]*e0[0] + T[3]*e0[1] + T[5];
                            var qx = T[0]*e1[0] + T[1]*e1[1] + T[4], qy = T[2]*e1[0] + T[3]*e1[1] + T[5];
                            var dx = qx-px, dy = qy-py;
                            var len = Math.sqrt(dx*dx+dy*dy);
                            if (len == 0) return null;//degenerate crease, no usable layout
                            dx /= len; dy /= len;
                            var m0 = 2*dx*dx-1, m1 = 2*dx*dy, m2 = m1, m3 = 2*dy*dy-1;
                            //R(v) = M(v-P)+P, composed after T
                            transforms[g] = [
                                m0*T[0]+m1*T[2], m0*T[1]+m1*T[3],
                                m2*T[0]+m3*T[2], m2*T[1]+m3*T[3],
                                m0*(T[4]-px)+m1*(T[5]-py)+px,
                                m2*(T[4]-px)+m3*(T[5]-py)+py
                            ];
                        }
                        queue.push(g);
                    }
                }
            }

            var xy = new Array(numFaces);
            var boxes = new Array(numFaces);
            for (var i=0;i<numFaces;i++){
                var T = transforms[i];
                var tri = [];
                var bx0 = Infinity, bx1 = -Infinity, by0 = Infinity, by1 = -Infinity;
                for (var k=0;k<3;k++){
                    var q = projected[faces[i][k]];
                    if (!q) return null;
                    var x = T[0]*q[0] + T[1]*q[1] + T[4];
                    var y = T[2]*q[0] + T[3]*q[1] + T[5];
                    tri.push([x, y]);
                    if (x < bx0) bx0 = x;
                    if (x > bx1) bx1 = x;
                    if (y < by0) by0 = y;
                    if (y > by1) by1 = y;
                }
                xy[i] = tri;
                boxes[i] = [bx0, by0, bx1, by1];
            }
            return {xy: xy, boxes: boxes, eps: extent*1e-4};
        }

        //separating axis test; a gap of eps or less counts as separated, so panels that merely
        //touch along an edge or at a vertex are not forced apart
        function trianglesOverlap(A, B, eps){
            for (var t=0;t<2;t++){
                var P = t == 0 ? A : B;
                for (var i=0;i<3;i++){
                    var j = (i+1)%3;
                    var ax = -(P[j][1]-P[i][1]), ay = P[j][0]-P[i][0];
                    var len = Math.sqrt(ax*ax+ay*ay);
                    if (len == 0) continue;
                    ax /= len; ay /= len;
                    var minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
                    for (var k=0;k<3;k++){
                        var pa = A[k][0]*ax + A[k][1]*ay;
                        if (pa < minA) minA = pa;
                        if (pa > maxA) maxA = pa;
                        var pb = B[k][0]*ax + B[k][1]*ay;
                        if (pb < minB) minB = pb;
                        if (pb > maxB) maxB = pb;
                    }
                    if (minA >= maxB-eps || minB >= maxA-eps) return false;
                }
            }
            return true;
        }

        if (ordered && numPanels > 0){
            var layout = foldedLayout();
            if (!layout){
                overlapChecked = false;
            } else {
                var tests = 0;
                var findOverlaps = function(){
                    var byLayer = {};
                    for (var i=0;i<numFaces;i++){
                        var pid = panelIds[find(i)];
                        if (pid === undefined) continue;
                        var key = layer[pid];
                        if (byLayer[key] === undefined) byLayer[key] = [];
                        byLayer[key].push(i);
                    }
                    var seen = {};
                    var pairs = [];
                    for (var key in byLayer){
                        var group = byLayer[key];
                        for (var a=0;a<group.length;a++){
                            for (var b=a+1;b<group.length;b++){
                                var fa = group[a], fb = group[b];
                                var pa = panelIds[find(fa)], pb = panelIds[find(fb)];
                                if (pa == pb) continue;//one panel is rigid, it cannot self-stack
                                var pairKey = pa < pb ? pa+","+pb : pb+","+pa;
                                if (seen[pairKey]) continue;
                                if (++tests > MAX_OVERLAP_TESTS) return null;
                                var ba = layout.boxes[fa], bb = layout.boxes[fb];
                                if (ba[2] < bb[0] || bb[2] < ba[0] || ba[3] < bb[1] || bb[3] < ba[1]) continue;
                                if (!trianglesOverlap(layout.xy[fa], layout.xy[fb], layout.eps)) continue;
                                seen[pairKey] = true;
                                pairs.push([Math.min(pa, pb), Math.max(pa, pb)]);
                            }
                        }
                    }
                    return pairs;
                };
                //each round forces every colliding pair apart, so the layering deepens until no
                //two overlapping panels share a height or the constraints turn cyclic
                separated = false;
                for (var round=0;round<=numPanels;round++){
                    var pairs = findOverlaps();
                    if (pairs === null){
                        overlapChecked = false;
                        break;
                    }
                    if (pairs.length == 0){
                        separated = true;
                        break;
                    }
                    for (var i=0;i<pairs.length;i++){
                        successors[pairs[i][0]].push(pairs[i][1]);
                        inDegree[pairs[i][1]]++;
                    }
                    ordered = runLayering();
                    if (!ordered) break;
                }
            }
        }
        if (!overlapChecked) console.warn("thickness: could not check the flat-folded layout for " +
            "overlapping panels, offset panels disabled - falling back to fold angle limits and contact");
        else if (!separated) console.warn("thickness: overlapping panels could not be separated into " +
            "distinct layers, offset panels disabled - falling back to fold angle limits and contact");

        for (var i=0;i<foldedCreases.length;i++){
            var crease = foldedCreases[i];
            var gap = Math.abs(layer[panelIds[find(crease.face1Index)]] - layer[panelIds[find(crease.face2Index)]]);
            crease.layerGap = gap > 1 ? gap : 1;
        }


        if (ordered && spans && overlapChecked && separated){
            //keep the full solution: the offset panel construction needs a stack index and an
            //orientation per face, not just the per-crease gaps
            var facePanel = new Int32Array(numFaces);
            var faceParity = new Int32Array(numFaces);
            for (var i=0;i<numFaces;i++){
                facePanel[i] = panelIds[find(i)];
                faceParity[i] = parity[i] >= 0 ? 1 : -1;
            }
            var panelLayer = new Int32Array(numPanels);
            for (var i=0;i<numPanels;i++) panelLayer[i] = layer[i];
            layerSolution = {
                facePanel: facePanel,
                panelLayer: panelLayer,
                faceParity: faceParity,
                numPanels: numPanels
            };
        }
        return ordered;
    }

    function getLayerSolution(){
        return layerSolution;
    }

    //true when the offset panel construction is in force: thickness on, a real thickness, and
    //a resolved layer ordering to place the panels in. offset panels fold fully flat, so the
    //tapered-panel angle limits are not applied in this mode
    function offsetPanelsActive(){
        return !!(globals.simulateThickness && globals.materialThickness > 0 && layerSolution);
    }

    //signed offset of a face's plate from the midsurface, along the face's own normal, in
    //pattern units. o = (layer + 0.5)*t*parity puts each panel's slab at its own height in
    //the folded stack instead of every panel sharing the midsurface centerline
    function getFaceOffset(faceIndex){
        if (!offsetPanelsActive()) return 0;
        if (faceIndex < 0 || faceIndex >= layerSolution.facePanel.length) return 0;
        var panel = layerSolution.facePanel[faceIndex];
        var layer = layerSolution.panelLayer[panel];
        return (layer+0.5)*globals.materialThickness*layerSolution.faceParity[faceIndex];
    }

    return {
        NO_LIMIT: NO_LIMIT,
        assignLayerGaps: assignLayerGaps,
        getCreaseThetaMax: getCreaseThetaMax,
        getLayerSolution: getLayerSolution,
        offsetPanelsActive: offsetPanelsActive,
        getFaceOffset: getFaceOffset,
        syncFoldDirection: syncFoldDirection
    }
}
