/**
 * Created by amandaghassaei on 2/24/17.
 */

//model updates object3d geometry and materials

function initModel(globals){

    var material, material2, geometry;
    var thickMaterial, thickGeometry;
    var frontside = new THREE.Mesh();//front face of mesh
    var backside = new THREE.Mesh();//back face of mesh (different color)
    backside.visible = false;
    var thickMesh = new THREE.Mesh();
    thickMesh.visible = false;

    var lineMaterial = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1});
    var hingeLines = new THREE.LineSegments(null, lineMaterial);
    var mountainLines = new THREE.LineSegments(null, lineMaterial);
    var valleyLines = new THREE.LineSegments(null, lineMaterial);
    var cutLines = new THREE.LineSegments(null, lineMaterial);
    var facetLines = new THREE.LineSegments(null, lineMaterial);
    var borderLines = new THREE.LineSegments(null, lineMaterial);

    var lines = {
        U: hingeLines,
        M: mountainLines,
        V: valleyLines,
        C: cutLines,
        F: facetLines,
        B: borderLines
    };

    clearGeometries();
    setMeshMaterial();

    function clearGeometries(){

        if (geometry) {
            frontside.geometry = null;
            backside.geometry = null;
            geometry.dispose();
        }
        if (thickGeometry) {
            thickMesh.geometry = null;
            thickGeometry.dispose();
        }

        geometry = new THREE.BufferGeometry();
        frontside.geometry = geometry;
        backside.geometry = geometry;
        // geometry.verticesNeedUpdate = true;
        geometry.dynamic = true;

        thickGeometry = new THREE.BufferGeometry();
        thickMesh.geometry = thickGeometry;
        thickGeometry.dynamic = true;

        _.each(lines, function(line){
            var lineGeometry = line.geometry;
            if (lineGeometry) {
                line.geometry = null;
                lineGeometry.dispose();
            }

            lineGeometry = new THREE.BufferGeometry();
            line.geometry = lineGeometry;
            // lineGeometry.verticesNeedUpdate = true;
            lineGeometry.dynamic = true;
        });

        thickPositions = null;
        thickIndices = null;
        lastThickEdgeInsetByKey = {};
        autoMiuraPhase = null;
        autoMiuraBoost = 0;
        thickClearanceFrameCountdown = 0;
        thinAreaReference = null;
        if (thinAreaStats){
            thinAreaStats.valid = false;
            thinAreaStats.current = 0;
            thinAreaStats.reference = 0;
            thinAreaStats.delta = 0;
            thinAreaStats.deltaPercent = 0;
        }
        if (thickClearanceStats){
            thickClearanceStats.valid = false;
            thickClearanceStats.skipped = false;
            thickClearanceStats.minDistance = 0;
            thickClearanceStats.collision = false;
            thickClearanceStats.checkedPairs = 0;
            thickClearanceStats.truncated = false;
        }
    }

    globals.threeView.sceneAddModel(frontside);
    globals.threeView.sceneAddModel(backside);
    globals.threeView.sceneAddModel(thickMesh);
    _.each(lines, function(line){
        globals.threeView.sceneAddModel(line);
    });

    var positions;//place to store buffer geo vertex data
    var colors;//place to store buffer geo vertex colors
    var indices;
    var thickPositions;
    var thickIndices;
    var thinAreaReference = null;
    var thinAreaStats = {
        valid: false,
        current: 0,
        reference: 0,
        delta: 0,
        deltaPercent: 0
    };
    var thickClearanceStats = {
        valid: false,
        skipped: false,
        minDistance: 0,
        collision: false,
        checkedPairs: 0,
        truncated: false
    };
    var thickClearanceFrameCountdown = 0;
    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];
    var vertices = [];//indexed vertices array
    var edgeAssignmentByKey = {};
    var edgeIsPatternByKey = {};
    var edgeFoldAngleByKey = {};
    var edgeGapOverrideByKey = {};
    var edgeGapScaleByKey = {};
    var lastThickEdgeInsetByKey = {};
    var autoMiuraPhase = null;
    var autoMiuraBoost = 0;
    var thickSmoothGroups = [];
    var fold, creaseParams;

    var nextCreaseParams, nextFold;//todo only nextFold, nextCreases?

    var inited = false;

    function setMeshMaterial() {
        var polygonOffset = 0.5;
        if (globals.colorMode == "normal") {
            material = new THREE.MeshNormalMaterial({
                flatShading:true,
                side: THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
            thickMaterial = new THREE.MeshNormalMaterial({
                // Smooth shading prevents triangulation facets from reading as creases.
                flatShading:false,
                side: THREE.DoubleSide
            });
        } else if (globals.colorMode == "axialStrain"){
            material = new THREE.MeshBasicMaterial({
                vertexColors: THREE.VertexColors, side:THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
            thickMaterial = new THREE.MeshPhongMaterial({
                // Smooth shading prevents triangulation facets from reading as creases.
                flatShading:false,
                side: THREE.DoubleSide
            });
            thickMaterial.color.setStyle("#" + globals.color1);
            if (!globals.threeView.simulationRunning) {
                getSolver().render();
                setGeoUpdates();
            }
        } else {
            material = new THREE.MeshPhongMaterial({
                flatShading:true,
                side:THREE.FrontSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            material2 = new THREE.MeshPhongMaterial({
                flatShading:true,
                side:THREE.BackSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            material.color.setStyle( "#" + globals.color1);
            material2.color.setStyle( "#" + globals.color2);
            backside.visible = true;
            thickMaterial = new THREE.MeshPhongMaterial({
                // Smooth shading prevents triangulation facets from reading as creases.
                flatShading:false,
                side: THREE.DoubleSide
            });
            thickMaterial.color.setStyle("#" + globals.color1);
        }
        frontside.material = material;
        backside.material = material2;
        thickMesh.material = thickMaterial;
    }

    function updateEdgeVisibility(){
        var isThick = globals.simType == "thick";
        mountainLines.visible = globals.edgesVisible && globals.mtnsVisible;
        valleyLines.visible = globals.edgesVisible && globals.valleysVisible;
        facetLines.visible = globals.edgesVisible && globals.panelsVisible && !isThick;
        hingeLines.visible = globals.edgesVisible && globals.passiveEdgesVisible;
        borderLines.visible = globals.edgesVisible && globals.boundaryEdgesVisible;
        cutLines.visible = false;
    }

    function updateMeshVisibility(){
        var useThick = globals.simType == "thick";
        frontside.visible = globals.meshVisible && !useThick;
        backside.visible = globals.colorMode == "color" && globals.meshVisible && !useThick;
        thickMesh.visible = globals.meshVisible && useThick;
        updateEdgeVisibility();
    }

    function edgeKeyForPair(a, b){
        return (a < b) ? (a + "_" + b) : (b + "_" + a);
    }

    function hasNonZeroFoldAngleForEdgeKey(key){
        var angle = edgeFoldAngleByKey[key];
        return isFinite(angle) && Math.abs(angle) > 1e-6;
    }

    function isCreaseLikeAssignment(assignment, key){
        if (assignment == "M" || assignment == "V") return true;
        if (assignment == "F" && hasNonZeroFoldAngleForEdgeKey(key)) return true;
        return false;
    }

    function cloneNumberMap(map){
        var clone = {};
        if (!map) return clone;
        for (var key in map){
            if (!map.hasOwnProperty(key)) continue;
            var value = map[key];
            if (!isFinite(value)) continue;
            clone[key] = value;
        }
        return clone;
    }

    function parseNonNegativeNumber(value){
        var num = parseFloat(value);
        if (!isFinite(num) || num < 0) return null;
        return num;
    }

    function addIndexedGapOverrides(values, targetMap, scaleFactor){
        if (!values || values.length !== fold.edges_vertices.length) return;
        for (var i=0;i<values.length;i++){
            var amount = parseNonNegativeNumber(values[i]);
            if (amount === null) continue;
            var edge = fold.edges_vertices[i];
            var key = edgeKeyForPair(edge[0], edge[1]);
            targetMap[key] = amount * scaleFactor;
        }
    }

    function mapNumberForEdgeKey(sourceMap, key){
        if (!sourceMap) return null;
        var value = parseNonNegativeNumber(sourceMap[key]);
        if (value !== null) return value;
        var parts = key.split("_");
        if (parts.length !== 2) return null;
        var reversedKey = parts[1] + "_" + parts[0];
        return parseNonNegativeNumber(sourceMap[reversedKey]);
    }

    function getFaceLocalIndex(face, vertexIndex){
        if (face[0] === vertexIndex) return 0;
        if (face[1] === vertexIndex) return 1;
        if (face[2] === vertexIndex) return 2;
        return -1;
    }

    function buildSmoothGroups(vertexCount, pairs){
        if (!pairs || pairs.length === 0) return [];
        var parent = new Int32Array(vertexCount);
        for (var i=0;i<vertexCount;i++) parent[i] = i;

        function find(x){
            var root = x;
            while (parent[root] !== root) root = parent[root];
            while (parent[x] !== x) {
                var next = parent[x];
                parent[x] = root;
                x = next;
            }
            return root;
        }

        function union(a, b){
            var ra = find(a);
            var rb = find(b);
            if (ra !== rb) parent[rb] = ra;
        }

        var used = new Int8Array(vertexCount);
        for (var i=0;i<pairs.length;i++){
            var pair = pairs[i];
            union(pair[0], pair[1]);
            used[pair[0]] = 1;
            used[pair[1]] = 1;
        }

        var groups = {};
        for (var i=0;i<vertexCount;i++){
            if (!used[i]) continue;
            var root = find(i);
            if (!groups[root]) groups[root] = [];
            groups[root].push(i);
        }
        var out = [];
        for (var key in groups){
            if (!groups.hasOwnProperty(key)) continue;
            out.push(groups[key]);
        }
        return out;
    }

    function buildThickEdgeMeta(){
        var faceCount = faces.length;
        var sideMask = new Uint8Array(faceCount * 3);
        for (var i=0;i<sideMask.length;i++) sideMask[i] = 1;

        var edgeFaces = {};
        function addEdgeFace(key, faceIndex, localEdgeIndex){
            if (!edgeFaces[key]) edgeFaces[key] = [];
            edgeFaces[key].push({faceIndex: faceIndex, localEdgeIndex: localEdgeIndex});
        }

        for (var i=0;i<faceCount;i++){
            var face = faces[i];
            addEdgeFace(edgeKeyForPair(face[0], face[1]), i, 0);
            addEdgeFace(edgeKeyForPair(face[1], face[2]), i, 1);
            addEdgeFace(edgeKeyForPair(face[2], face[0]), i, 2);
        }

        var smoothPairs = [];
        var keys = Object.keys(edgeFaces);
        for (var k=0;k<keys.length;k++){
            var key = keys[k];
            var entries = edgeFaces[key];
            var isBoundary = entries.length < 2;
            var hasAssignment = edgeAssignmentByKey.hasOwnProperty(key);
            var assignment = hasAssignment ? edgeAssignmentByKey[key] : "F";
            // Some imported FOLD files omit interior triangulation edges from edges_vertices.
            // Treat unknown shared edges as facet splits so thick mode stays watertight.
            var isFacet = !hasAssignment || !isCreaseLikeAssignment(assignment, key);
            var isPattern = hasAssignment && edgeIsPatternByKey[key] !== false;
            var addSide = isBoundary || (isPattern && !isFacet);
            if (!addSide){
                for (var j=0;j<entries.length;j++){
                    var entry = entries[j];
                    sideMask[entry.faceIndex * 3 + entry.localEdgeIndex] = 0;
                }
            }

            if (!addSide && !isBoundary && entries.length > 1){
                var parts = key.split("_");
                var a = parseInt(parts[0]);
                var b = parseInt(parts[1]);
                var topA = [];
                var topB = [];
                var botA = [];
                var botB = [];
                for (var j=0;j<entries.length;j++){
                    var faceIndex = entries[j].faceIndex;
                    var face = faces[faceIndex];
                    var ia = getFaceLocalIndex(face, a);
                    var ib = getFaceLocalIndex(face, b);
                    if (ia < 0 || ib < 0) continue;
                    var base = faceIndex * 6;
                    topA.push(base + ia);
                    topB.push(base + ib);
                    botA.push(base + 3 + ia);
                    botB.push(base + 3 + ib);
                }
                function linkGroup(list){
                    if (list.length < 2) return;
                    var anchor = list[0];
                    for (var j=1;j<list.length;j++){
                        smoothPairs.push([anchor, list[j]]);
                    }
                }
                linkGroup(topA);
                linkGroup(topB);
                linkGroup(botA);
                linkGroup(botB);
            }
        }

        return {
            sideMask: sideMask,
            smoothGroups: buildSmoothGroups(faceCount * 6, smoothPairs)
        };
    }

    function applySmoothNormals(){
        if (!thickSmoothGroups || thickSmoothGroups.length === 0) return;
        if (!thickGeometry || !thickGeometry.attributes || !thickGeometry.attributes.normal) return;
        var normals = thickGeometry.attributes.normal.array;
        for (var i=0;i<thickSmoothGroups.length;i++){
            var group = thickSmoothGroups[i];
            var nx = 0, ny = 0, nz = 0;
            for (var j=0;j<group.length;j++){
                var idx = group[j] * 3;
                nx += normals[idx];
                ny += normals[idx+1];
                nz += normals[idx+2];
            }
            var len = Math.sqrt(nx*nx + ny*ny + nz*nz);
            if (len < 1e-12) continue;
            nx /= len;
            ny /= len;
            nz /= len;
            for (var j=0;j<group.length;j++){
                var idx = group[j] * 3;
                normals[idx] = nx;
                normals[idx+1] = ny;
                normals[idx+2] = nz;
            }
        }
        thickGeometry.attributes.normal.needsUpdate = true;
    }

    function applySmoothPositions(positionArray, smoothGroups){
        if (!smoothGroups || smoothGroups.length === 0) return;
        for (var i=0;i<smoothGroups.length;i++){
            var group = smoothGroups[i];
            if (!group || group.length < 2) continue;
            var x = 0, y = 0, z = 0;
            for (var j=0;j<group.length;j++){
                var idx = group[j] * 3;
                x += positionArray[idx];
                y += positionArray[idx+1];
                z += positionArray[idx+2];
            }
            x /= group.length;
            y /= group.length;
            z /= group.length;
            for (var j=0;j<group.length;j++){
                var idx = group[j] * 3;
                positionArray[idx] = x;
                positionArray[idx+1] = y;
                positionArray[idx+2] = z;
            }
        }
    }

    function cloneThinAreaStats(){
        return {
            valid: thinAreaStats.valid,
            current: thinAreaStats.current,
            reference: thinAreaStats.reference,
            delta: thinAreaStats.delta,
            deltaPercent: thinAreaStats.deltaPercent
        };
    }

    function notifyThinAreaStats(){
        if (globals.controls && globals.controls.updateThinAreaStats){
            globals.controls.updateThinAreaStats(cloneThinAreaStats(), globals.simType != "thick");
        }
    }

    function cloneThickClearanceStats(){
        return {
            valid: thickClearanceStats.valid,
            skipped: thickClearanceStats.skipped,
            minDistance: thickClearanceStats.minDistance,
            collision: thickClearanceStats.collision,
            checkedPairs: thickClearanceStats.checkedPairs,
            truncated: thickClearanceStats.truncated
        };
    }

    function cloneThickAutoTuneState(){
        return {
            phase: autoMiuraPhase,
            boost: autoMiuraBoost
        };
    }

    function notifyThickClearanceStats(){
        if (globals.controls && globals.controls.updateThickClearanceStats){
            globals.controls.updateThickClearanceStats(cloneThickClearanceStats(), globals.simType == "thick");
        }
    }

    function squaredDistanceBetweenAABBs(a, b){
        var dx = 0;
        if (a.minX > b.maxX) dx = a.minX - b.maxX;
        else if (b.minX > a.maxX) dx = b.minX - a.maxX;

        var dy = 0;
        if (a.minY > b.maxY) dy = a.minY - b.maxY;
        else if (b.minY > a.maxY) dy = b.minY - a.maxY;

        var dz = 0;
        if (a.minZ > b.maxZ) dz = a.minZ - b.maxZ;
        else if (b.minZ > a.maxZ) dz = b.minZ - a.maxZ;

        return dx*dx + dy*dy + dz*dz;
    }

    function facePairSharesVertex(faceA, faceB){
        for (var i=0;i<3;i++){
            var va = faceA[i];
            if (va === faceB[0] || va === faceB[1] || va === faceB[2]) return true;
        }
        return false;
    }

    function pointTriangleDistanceSq(p, a, b, c){
        var ab = b.clone().sub(a);
        var ac = c.clone().sub(a);
        var ap = p.clone().sub(a);
        var d1 = ab.dot(ap);
        var d2 = ac.dot(ap);
        if (d1 <= 0 && d2 <= 0) return ap.lengthSq();

        var bp = p.clone().sub(b);
        var d3 = ab.dot(bp);
        var d4 = ac.dot(bp);
        if (d3 >= 0 && d4 <= d3) return bp.lengthSq();

        var vc = d1*d4 - d3*d2;
        if (vc <= 0 && d1 >= 0 && d3 <= 0){
            var v = d1 / (d1 - d3);
            var projAB = a.clone().add(ab.multiplyScalar(v));
            return p.distanceToSquared(projAB);
        }

        var cp = p.clone().sub(c);
        var d5 = ab.dot(cp);
        var d6 = ac.dot(cp);
        if (d6 >= 0 && d5 <= d6) return cp.lengthSq();

        var vb = d5*d2 - d1*d6;
        if (vb <= 0 && d2 >= 0 && d6 <= 0){
            var w = d2 / (d2 - d6);
            var projAC = a.clone().add(ac.multiplyScalar(w));
            return p.distanceToSquared(projAC);
        }

        var va = d3*d6 - d5*d4;
        var bc = c.clone().sub(b);
        if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0){
            var w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
            var projBC = b.clone().add(bc.multiplyScalar(w));
            return p.distanceToSquared(projBC);
        }

        var n = ab.cross(ac);
        var nLenSq = n.lengthSq();
        if (nLenSq < 1e-20) {
            var minSq = p.distanceToSquared(a);
            minSq = Math.min(minSq, p.distanceToSquared(b));
            minSq = Math.min(minSq, p.distanceToSquared(c));
            return minSq;
        }
        var dist = n.dot(ap);
        return (dist * dist) / nLenSq;
    }

    function segmentSegmentDistanceSq(p1, q1, p2, q2){
        var d1 = q1.clone().sub(p1);
        var d2 = q2.clone().sub(p2);
        var r = p1.clone().sub(p2);
        var a = d1.dot(d1);
        var e = d2.dot(d2);
        var f = d2.dot(r);
        var s, t;
        var eps = 1e-12;

        if (a <= eps && e <= eps) return p1.distanceToSquared(p2);
        if (a <= eps){
            s = 0;
            t = Math.max(0, Math.min(1, f / e));
        } else {
            var c = d1.dot(r);
            if (e <= eps){
                t = 0;
                s = Math.max(0, Math.min(1, -c / a));
            } else {
                var b = d1.dot(d2);
                var denom = a*e - b*b;
                if (denom !== 0){
                    s = Math.max(0, Math.min(1, (b*f - c*e) / denom));
                } else {
                    s = 0;
                }
                var tNom = b*s + f;
                if (tNom < 0){
                    t = 0;
                    s = Math.max(0, Math.min(1, -c / a));
                } else if (tNom > e){
                    t = 1;
                    s = Math.max(0, Math.min(1, (b - c) / a));
                } else {
                    t = tNom / e;
                }
            }
        }
        var c1 = p1.clone().add(d1.multiplyScalar(s));
        var c2 = p2.clone().add(d2.multiplyScalar(t));
        return c1.distanceToSquared(c2);
    }

    function triangleTriangleDistanceSq(a0, a1, a2, b0, b1, b2){
        var minSq = Infinity;
        minSq = Math.min(minSq, pointTriangleDistanceSq(a0, b0, b1, b2));
        minSq = Math.min(minSq, pointTriangleDistanceSq(a1, b0, b1, b2));
        minSq = Math.min(minSq, pointTriangleDistanceSq(a2, b0, b1, b2));
        minSq = Math.min(minSq, pointTriangleDistanceSq(b0, a0, a1, a2));
        minSq = Math.min(minSq, pointTriangleDistanceSq(b1, a0, a1, a2));
        minSq = Math.min(minSq, pointTriangleDistanceSq(b2, a0, a1, a2));

        var aEdges = [[a0, a1], [a1, a2], [a2, a0]];
        var bEdges = [[b0, b1], [b1, b2], [b2, b0]];
        for (var i=0;i<3;i++){
            for (var j=0;j<3;j++){
                var d = segmentSegmentDistanceSq(
                    aEdges[i][0], aEdges[i][1],
                    bEdges[j][0], bEdges[j][1]
                );
                if (d < minSq) minSq = d;
            }
        }
        return minSq;
    }

    function updateThickClearanceStats(force, silent){
        if (globals.simType != "thick" || !globals.thickClearanceEnabled){
            thickClearanceStats.valid = false;
            thickClearanceStats.skipped = false;
            thickClearanceStats.minDistance = 0;
            thickClearanceStats.collision = false;
            thickClearanceStats.checkedPairs = 0;
            thickClearanceStats.truncated = false;
            if (!silent) notifyThickClearanceStats();
            return cloneThickClearanceStats();
        }
        var stride = parseInt(globals.thickClearanceCheckStride, 10);
        if (!isFinite(stride) || stride < 1) stride = 1;
        if (!force){
            if (thickClearanceFrameCountdown > 0){
                thickClearanceFrameCountdown--;
                return cloneThickClearanceStats();
            }
            thickClearanceFrameCountdown = stride - 1;
        } else {
            thickClearanceFrameCountdown = stride - 1;
        }

        if (!thickPositions || !faces || faces.length === 0){
            thickClearanceStats.valid = false;
            thickClearanceStats.skipped = false;
            thickClearanceStats.minDistance = 0;
            thickClearanceStats.collision = false;
            thickClearanceStats.checkedPairs = 0;
            thickClearanceStats.truncated = false;
            if (!silent) notifyThickClearanceStats();
            return cloneThickClearanceStats();
        }

        var maxFaces = parseInt(globals.thickClearanceMaxFaces, 10);
        if (!isFinite(maxFaces) || maxFaces < 1) maxFaces = 300;
        if (faces.length > maxFaces){
            thickClearanceStats.valid = true;
            thickClearanceStats.skipped = true;
            thickClearanceStats.minDistance = 0;
            thickClearanceStats.collision = false;
            thickClearanceStats.checkedPairs = 0;
            thickClearanceStats.truncated = false;
            if (!silent) notifyThickClearanceStats();
            return cloneThickClearanceStats();
        }

        function triAt(faceIndex, localOffset){
            var base = faceIndex * 18 + localOffset;
            var a = new THREE.Vector3(thickPositions[base], thickPositions[base+1], thickPositions[base+2]);
            var b = new THREE.Vector3(thickPositions[base+3], thickPositions[base+4], thickPositions[base+5]);
            var c = new THREE.Vector3(thickPositions[base+6], thickPositions[base+7], thickPositions[base+8]);
            return {
                faceIndex: faceIndex,
                a: a,
                b: b,
                c: c,
                minX: Math.min(a.x, b.x, c.x),
                minY: Math.min(a.y, b.y, c.y),
                minZ: Math.min(a.z, b.z, c.z),
                maxX: Math.max(a.x, b.x, c.x),
                maxY: Math.max(a.y, b.y, c.y),
                maxZ: Math.max(a.z, b.z, c.z)
            };
        }

        var triangles = [];
        for (var i=0;i<faces.length;i++){
            triangles.push(triAt(i, 0));  // top panel
            triangles.push(triAt(i, 9));  // bottom panel
        }

        var maxPairs = parseInt(globals.thickClearanceMaxPairs, 10);
        if (!isFinite(maxPairs) || maxPairs < 1) maxPairs = 120000;
        var minDistSq = Infinity;
        var checkedPairs = 0;
        var truncated = false;

        outer:
        for (var i=0;i<triangles.length;i++){
            var triA = triangles[i];
            for (var j=i+1;j<triangles.length;j++){
                var triB = triangles[j];
                if (triA.faceIndex === triB.faceIndex) continue;
                if (facePairSharesVertex(faces[triA.faceIndex], faces[triB.faceIndex])) continue;
                if (checkedPairs >= maxPairs){
                    truncated = true;
                    break outer;
                }
                checkedPairs++;
                var boxSq = squaredDistanceBetweenAABBs(triA, triB);
                if (boxSq >= minDistSq) continue;
                var dSq = triangleTriangleDistanceSq(triA.a, triA.b, triA.c, triB.a, triB.b, triB.c);
                if (dSq < minDistSq) minDistSq = dSq;
            }
        }

        if (checkedPairs === 0 || !isFinite(minDistSq)){
            thickClearanceStats.valid = false;
            thickClearanceStats.skipped = false;
            thickClearanceStats.minDistance = 0;
            thickClearanceStats.collision = false;
            thickClearanceStats.checkedPairs = checkedPairs;
            thickClearanceStats.truncated = truncated;
            if (!silent) notifyThickClearanceStats();
            return cloneThickClearanceStats();
        }

        var eps = parseFloat(globals.thickCollisionEpsilon);
        if (!isFinite(eps) || eps < 0) eps = 1e-4;
        var minDistance = Math.sqrt(Math.max(0, minDistSq));
        thickClearanceStats.valid = true;
        thickClearanceStats.skipped = false;
        thickClearanceStats.minDistance = minDistance;
        thickClearanceStats.collision = minDistance < eps;
        thickClearanceStats.checkedPairs = checkedPairs;
        thickClearanceStats.truncated = truncated;
        if (!silent) notifyThickClearanceStats();
        return cloneThickClearanceStats();
    }

    function computeCurrentSheetArea(){
        if (!positions || !faces || faces.length === 0) return null;
        var area = 0;
        for (var i=0;i<faces.length;i++){
            var face = faces[i];
            var ia = face[0] * 3;
            var ib = face[1] * 3;
            var ic = face[2] * 3;
            var ax = positions[ia];
            var ay = positions[ia+1];
            var az = positions[ia+2];
            var bx = positions[ib];
            var by = positions[ib+1];
            var bz = positions[ib+2];
            var cx = positions[ic];
            var cy = positions[ic+1];
            var cz = positions[ic+2];
            var abx = bx - ax;
            var aby = by - ay;
            var abz = bz - az;
            var acx = cx - ax;
            var acy = cy - ay;
            var acz = cz - az;
            var crossX = aby*acz - abz*acy;
            var crossY = abz*acx - abx*acz;
            var crossZ = abx*acy - aby*acx;
            area += 0.5 * Math.sqrt(crossX*crossX + crossY*crossY + crossZ*crossZ);
        }
        return area;
    }

    function updateThinAreaStats(lockReference){
        var area = computeCurrentSheetArea();
        if (area === null || !isFinite(area)){
            thinAreaStats.valid = false;
            notifyThinAreaStats();
            return null;
        }

        if (lockReference || !isFinite(thinAreaReference) || thinAreaReference === null || thinAreaReference <= 1e-12){
            thinAreaReference = area;
        }

        thinAreaStats.valid = true;
        thinAreaStats.current = area;
        thinAreaStats.reference = thinAreaReference;
        thinAreaStats.delta = area - thinAreaReference;
        if (thinAreaReference > 1e-12){
            thinAreaStats.deltaPercent = 100 * thinAreaStats.delta / thinAreaReference;
        } else {
            thinAreaStats.deltaPercent = 0;
        }
        notifyThinAreaStats();
        return area;
    }

    function resetThinAreaReference(){
        updateThinAreaStats(true);
    }

    function buildThickGeometry(){
        if (!faces || faces.length == 0) return;

        var faceCount = faces.length;
        var vertexCount = faceCount * 6;
        thickPositions = new Float32Array(vertexCount * 3);

        var edgeMeta = buildThickEdgeMeta();
        thickSmoothGroups = edgeMeta.smoothGroups;
        var sideMask = edgeMeta.sideMask;

        var indicesArray = [];
        for (var i=0;i<faceCount;i++){
            var base = i * 6;
            // front
            indicesArray.push(base + 0, base + 1, base + 2);
            // back (reverse)
            indicesArray.push(base + 5, base + 4, base + 3);
            // side 0-1
            if (sideMask[i*3]){
                indicesArray.push(base + 0, base + 1, base + 4);
                indicesArray.push(base + 0, base + 4, base + 3);
            }
            // side 1-2
            if (sideMask[i*3 + 1]){
                indicesArray.push(base + 1, base + 2, base + 5);
                indicesArray.push(base + 1, base + 5, base + 4);
            }
            // side 2-0
            if (sideMask[i*3 + 2]){
                indicesArray.push(base + 2, base + 0, base + 3);
                indicesArray.push(base + 2, base + 3, base + 5);
            }
        }

        var IndexArray = (vertexCount > 65535) ? Uint32Array : Uint16Array;
        thickIndices = new IndexArray(indicesArray.length);
        for (var i=0;i<indicesArray.length;i++){
            thickIndices[i] = indicesArray[i];
        }
        thickGeometry.addAttribute('position', new THREE.BufferAttribute(thickPositions, 3));
        thickGeometry.setIndex(new THREE.BufferAttribute(thickIndices, 1));
        updateThickPanelGeometry();
    }

    function insetTriangle(p0, p1, p2, inset){
        return insetTriangleByEdges(p0, p1, p2, inset, inset, inset);
    }

    function insetTriangleByEdges(p0, p1, p2, inset01, inset12, inset20){
        var e01 = p1.clone().sub(p0);
        var e02 = p2.clone().sub(p0);
        var normal = e01.clone().cross(e02);
        if (normal.lengthSq() < 1e-12) return [p0, p1, p2];
        normal.normalize();
        var u = e01.clone().normalize();
        var v = normal.clone().cross(u);

        var v0 = new THREE.Vector2(0, 0);
        var v1 = new THREE.Vector2(e01.length(), 0);
        var v2 = new THREE.Vector2(e02.dot(u), e02.dot(v));

        function signedArea2(a, b, c){
            return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        }

        var area2 = signedArea2(v0, v1, v2);
        if (Math.abs(area2) < 1e-12) return [p0, p1, p2];
        var absArea2 = Math.abs(area2);

        // Prevent impossible edge offsets on small/acute triangles.
        var len01 = v1.clone().sub(v0).length();
        var len12 = v2.clone().sub(v1).length();
        var len20 = v0.clone().sub(v2).length();
        if (len01 < 1e-10 || len12 < 1e-10 || len20 < 1e-10) return [p0, p1, p2];
        var maxInsetScale = 0.98;
        inset01 = Math.min(Math.max(0, inset01), maxInsetScale * absArea2 / len01);
        inset12 = Math.min(Math.max(0, inset12), maxInsetScale * absArea2 / len12);
        inset20 = Math.min(Math.max(0, inset20), maxInsetScale * absArea2 / len20);
        var ccw = area2 > 0;

        function edgeLine(a, b, inset){
            var dx = b.x - a.x;
            var dy = b.y - a.y;
            var len = Math.sqrt(dx*dx + dy*dy);
            if (len < 1e-8) return null;
            var nx, ny;
            if (ccw){
                nx = -dy/len;
                ny = dx/len;
            } else {
                nx = dy/len;
                ny = -dx/len;
            }
            var c = nx * a.x + ny * a.y + inset;
            return {nx:nx, ny:ny, c:c};
        }

        var l0 = edgeLine(v0, v1, inset01);
        var l1 = edgeLine(v1, v2, inset12);
        var l2 = edgeLine(v2, v0, inset20);
        if (!l0 || !l1 || !l2) return [p0, p1, p2];

        function intersect(lA, lB){
            var det = lA.nx * lB.ny - lA.ny * lB.nx;
            if (Math.abs(det) < 1e-8) return null;
            var x = (lA.c * lB.ny - lA.ny * lB.c) / det;
            var y = (lA.nx * lB.c - lA.c * lB.nx) / det;
            return new THREE.Vector2(x, y);
        }

        function pointInTriangle(pt, a, b, c){
            var eps = 1e-8;
            var v0x = c.x - a.x;
            var v0y = c.y - a.y;
            var v1x = b.x - a.x;
            var v1y = b.y - a.y;
            var v2x = pt.x - a.x;
            var v2y = pt.y - a.y;
            var dot00 = v0x*v0x + v0y*v0y;
            var dot01 = v0x*v1x + v0y*v1y;
            var dot02 = v0x*v2x + v0y*v2y;
            var dot11 = v1x*v1x + v1y*v1y;
            var dot12 = v1x*v2x + v1y*v2y;
            var denom = dot00 * dot11 - dot01 * dot01;
            if (Math.abs(denom) < 1e-12) return false;
            var invDenom = 1 / denom;
            var uu = (dot11 * dot02 - dot01 * dot12) * invDenom;
            var vv = (dot00 * dot12 - dot01 * dot02) * invDenom;
            return uu >= -eps && vv >= -eps && (uu + vv) <= 1 + eps;
        }

        function solveInset(scale){
            var s01 = inset01 * scale;
            var s12 = inset12 * scale;
            var s20 = inset20 * scale;
            var ll0 = edgeLine(v0, v1, s01);
            var ll1 = edgeLine(v1, v2, s12);
            var ll2 = edgeLine(v2, v0, s20);
            if (!ll0 || !ll1 || !ll2) return null;
            var j0 = intersect(ll2, ll0);
            var j1 = intersect(ll0, ll1);
            var j2 = intersect(ll1, ll2);
            if (!j0 || !j1 || !j2) return null;
            return [j0, j1, j2];
        }

        function validInset(cand){
            if (!cand) return false;
            var i0 = cand[0];
            var i1 = cand[1];
            var i2 = cand[2];
            var insetArea = signedArea2(i0, i1, i2);
            if (!isFinite(insetArea) || Math.abs(insetArea) < 1e-10) return false;
            if (insetArea * area2 <= 0) return false;
            return pointInTriangle(i0, v0, v1, v2) &&
                pointInTriangle(i1, v0, v1, v2) &&
                pointInTriangle(i2, v0, v1, v2);
        }

        var inset2D = solveInset(1);
        if (!validInset(inset2D)){
            // Clamp inset scale to keep the inset triangle valid/inside the source face.
            var low = 0;
            var high = 1;
            var best = [v0.clone(), v1.clone(), v2.clone()];
            for (var iter=0; iter<24; iter++){
                var mid = 0.5 * (low + high);
                var candidate = solveInset(mid);
                if (validInset(candidate)){
                    low = mid;
                    best = candidate;
                } else {
                    high = mid;
                }
            }
            inset2D = best;
        }

        var i0 = inset2D[0];
        var i1 = inset2D[1];
        var i2 = inset2D[2];

        var p0i = p0.clone().add(u.clone().multiplyScalar(i0.x)).add(v.clone().multiplyScalar(i0.y));
        var p1i = p0.clone().add(u.clone().multiplyScalar(i1.x)).add(v.clone().multiplyScalar(i1.y));
        var p2i = p0.clone().add(u.clone().multiplyScalar(i2.x)).add(v.clone().multiplyScalar(i2.y));
        return [p0i, p1i, p2i];
    }

    function normalizePaperLinkageType(linkageType){
        linkageType = (linkageType || "").toLowerCase();
        if (linkageType == "bennettpaper" || linkageType == "myard" || linkageType == "bricard") return linkageType;
        return "bennettpaper";
    }

    function updateThickPanelGeometry(){
        if (!thickPositions || !faces || faces.length == 0) return;

        var thickness = Math.max(0, globals.panelThickness || 0);
        if (thickness <= 0) thickness = 0.0001;
        var linkageType = normalizePaperLinkageType(globals.thickLinkageType);
        if (globals.thickLinkageType !== linkageType) globals.thickLinkageType = linkageType;
        var simpleExtrusionMode = true;
        var minGap = Math.max(0, globals.minHingeGap || 0);
        var manualBoost = parseNonNegativeNumber(globals.miuraColumnBoost);
        if (manualBoost === null) manualBoost = 0;
        var manualPhase = parseInt(globals.miuraColumnPhase, 10);
        if (!isFinite(manualPhase)) manualPhase = 1;
        manualPhase = ((manualPhase % 2) + 2) % 2;
        var autoPhaseEnabled = globals.miuraColumnAutoPhase !== false;
        var autoBoostEnabled = globals.thickAutoTuneBoost !== false;
        var autoTuneEnabled = false;

        function edgeKey(a, b){
            return (a < b) ? (a + "_" + b) : (b + "_" + a);
        }
        function assignmentForEdge(a, b){
            return edgeAssignmentByKey[edgeKey(a, b)];
        }

        function applyInsetsToThickPositions(edgeInsetByKey){
            function insetForEdge(a, b){
                return edgeInsetByKey[edgeKey(a, b)] || 0;
            }

            for (var i=0;i<faces.length;i++){
                var face = faces[i];
                var ia = face[0] * 3;
                var ib = face[1] * 3;
                var ic = face[2] * 3;
                var p0 = new THREE.Vector3(positions[ia], positions[ia+1], positions[ia+2]);
                var p1 = new THREE.Vector3(positions[ib], positions[ib+1], positions[ib+2]);
                var p2 = new THREE.Vector3(positions[ic], positions[ic+1], positions[ic+2]);

                var e01 = p1.clone().sub(p0);
                var e02 = p2.clone().sub(p0);
                var normal = e01.clone().cross(e02);
                if (normal.lengthSq() < 1e-12) continue;
                normal.normalize();

                var gap01 = insetForEdge(face[0], face[1]);
                var gap12 = insetForEdge(face[1], face[2]);
                var gap20 = insetForEdge(face[2], face[0]);

                var a01 = assignmentForEdge(face[0], face[1]);
                var a12 = assignmentForEdge(face[1], face[2]);
                var a20 = assignmentForEdge(face[2], face[0]);
                var topVerts;
                var botVerts;
                if (simpleExtrusionMode){
                    var faceInset01 = gap01;
                    var faceInset12 = gap12;
                    var faceInset20 = gap20;
                    var insetVerts = (faceInset01 > 0 || faceInset12 > 0 || faceInset20 > 0)
                        ? insetTriangleByEdges(p0, p1, p2, faceInset01, faceInset12, faceInset20)
                        : [p0, p1, p2];
                    topVerts = insetVerts;
                    botVerts = insetVerts;
                } else {
                    var top01 = (a01 == "V") ? gap01 : 0;
                    var top12 = (a12 == "V") ? gap12 : 0;
                    var top20 = (a20 == "V") ? gap20 : 0;
                    var bot01 = (a01 == "M") ? gap01 : 0;
                    var bot12 = (a12 == "M") ? gap12 : 0;
                    var bot20 = (a20 == "M") ? gap20 : 0;

                    topVerts = (top01 > 0 || top12 > 0 || top20 > 0)
                        ? insetTriangleByEdges(p0, p1, p2, top01, top12, top20)
                        : [p0, p1, p2];
                    botVerts = (bot01 > 0 || bot12 > 0 || bot20 > 0)
                        ? insetTriangleByEdges(p0, p1, p2, bot01, bot12, bot20)
                        : [p0, p1, p2];
                }

                var halfOffset = normal.clone().multiplyScalar(0.5 * thickness);
                var f0 = topVerts[0].clone().add(halfOffset);
                var f1 = topVerts[1].clone().add(halfOffset);
                var f2 = topVerts[2].clone().add(halfOffset);
                var b0 = botVerts[0].clone().sub(halfOffset);
                var b1 = botVerts[1].clone().sub(halfOffset);
                var b2 = botVerts[2].clone().sub(halfOffset);

                var base = i * 6 * 3;
                thickPositions[base] = f0.x;
                thickPositions[base+1] = f0.y;
                thickPositions[base+2] = f0.z;
                thickPositions[base+3] = f1.x;
                thickPositions[base+4] = f1.y;
                thickPositions[base+5] = f1.z;
                thickPositions[base+6] = f2.x;
                thickPositions[base+7] = f2.y;
                thickPositions[base+8] = f2.z;
                thickPositions[base+9] = b0.x;
                thickPositions[base+10] = b0.y;
                thickPositions[base+11] = b0.z;
                thickPositions[base+12] = b1.x;
                thickPositions[base+13] = b1.y;
                thickPositions[base+14] = b1.z;
                thickPositions[base+15] = b2.x;
                thickPositions[base+16] = b2.y;
                thickPositions[base+17] = b2.z;
            }
            applySmoothPositions(thickPositions, thickSmoothGroups);
        }

        function finalizeThickGeometry(){
            thickGeometry.attributes.position.needsUpdate = true;
            thickGeometry.computeVertexNormals();
            applySmoothNormals();
            thickGeometry.computeBoundingBox();
            thickGeometry.computeBoundingSphere();
        }

        function evaluateCandidate(phase, boost){
            var edgeInsetByKey = buildEdgeInsetsForLinkage(
                thickness,
                linkageType,
                minGap,
                {phase: phase, boost: boost}
            );
            applyInsetsToThickPositions(edgeInsetByKey);
            var stats = updateThickClearanceStats(true, true);
            return {
                phase: phase,
                boost: boost,
                edgeInsetByKey: edgeInsetByKey,
                stats: stats
            };
        }

        function candidateScore(candidate){
            if (!candidate || !candidate.stats || !candidate.stats.valid || candidate.stats.skipped) return -Infinity;
            var score = candidate.stats.minDistance;
            if (candidate.stats.collision) score -= 1e6;
            if (candidate.stats.truncated) score -= 1e3;
            return score;
        }

        function pickBetterCandidate(a, b){
            if (!a) return b;
            if (!b) return a;
            if (candidateScore(b) > candidateScore(a) + 1e-12) return b;
            return a;
        }

        var phaseForStart = autoPhaseEnabled && autoMiuraPhase !== null ? autoMiuraPhase : manualPhase;
        var boostForStart = Math.max(0, manualBoost + (autoBoostEnabled ? autoMiuraBoost : 0));
        var best = evaluateCandidate(phaseForStart, boostForStart);

        if (autoTuneEnabled){
            if (autoPhaseEnabled && boostForStart > 1e-9){
                var phase0 = evaluateCandidate(0, boostForStart);
                var phase1 = evaluateCandidate(1, boostForStart);
                best = pickBetterCandidate(best, phase0);
                best = pickBetterCandidate(best, phase1);
            }

            if (autoBoostEnabled){
                var step = parseNonNegativeNumber(globals.thickAutoTuneBoostStep);
                if (!(step > 0)) step = 0.005;
                var maxBoost = parseNonNegativeNumber(globals.thickAutoTuneMaxBoost);
                if (!(maxBoost >= 0)) maxBoost = 0.12;
                var maxIter = parseInt(globals.thickAutoTuneMaxIterations, 10);
                if (!isFinite(maxIter) || maxIter < 1) maxIter = 12;
                var targetBoost = best.boost;
                var maxAllowed = Math.max(manualBoost, maxBoost);
                for (var iter=0; iter<maxIter; iter++){
                    if (!best.stats || !best.stats.valid || best.stats.skipped || !best.stats.collision) break;
                    if (targetBoost + step > maxAllowed + 1e-12) break;
                    targetBoost += step;
                    var candidate = evaluateCandidate(best.phase, targetBoost);
                    if (autoPhaseEnabled){
                        var candidatePhase0 = evaluateCandidate(0, targetBoost);
                        var candidatePhase1 = evaluateCandidate(1, targetBoost);
                        candidate = pickBetterCandidate(candidate, candidatePhase0);
                        candidate = pickBetterCandidate(candidate, candidatePhase1);
                    }
                    best = pickBetterCandidate(best, candidate);
                    if (candidate.stats && candidate.stats.valid && !candidate.stats.collision) {
                        best = candidate;
                        break;
                    }
                }
            }

            if (autoPhaseEnabled) autoMiuraPhase = best.phase;
            else autoMiuraPhase = null;

            if (autoBoostEnabled){
                autoMiuraBoost = Math.max(0, best.boost - manualBoost);
            } else {
                autoMiuraBoost = 0;
            }
        } else {
            autoMiuraPhase = null;
            autoMiuraBoost = 0;
        }

        applyInsetsToThickPositions(best.edgeInsetByKey);
        lastThickEdgeInsetByKey = cloneNumberMap(best.edgeInsetByKey);
        finalizeThickGeometry();
        updateThickClearanceStats(true, false);
    }

    function ensureThickGeometry(){
        if (!thickGeometry) return;
        if (!thickPositions || !thickGeometry.attributes || !thickGeometry.attributes.position) {
            buildThickGeometry();
        }
    }

    function buildThickExportGeometry(){
        if (!faces || faces.length == 0) return null;
        var thickness = Math.max(0, globals.panelThickness || 0);
        if (thickness <= 0) thickness = 0.0001;
        var linkageType = normalizePaperLinkageType(globals.thickLinkageType);
        var simpleExtrusionMode = true;
        var minGap = Math.max(0, globals.minHingeGap || 0);

        function edgeKey(a, b){
            return (a < b) ? (a + "_" + b) : (b + "_" + a);
        }
        function assignmentForEdge(a, b){
            return edgeAssignmentByKey[edgeKey(a, b)];
        }
        var exportManualBoost = parseNonNegativeNumber(globals.miuraColumnBoost);
        if (exportManualBoost === null) exportManualBoost = 0;
        var exportBoost = Math.max(0, exportManualBoost + (globals.thickAutoTuneBoost !== false ? autoMiuraBoost : 0));
        var exportPhase = parseInt(globals.miuraColumnPhase, 10);
        if (!isFinite(exportPhase)) exportPhase = 1;
        exportPhase = ((exportPhase % 2) + 2) % 2;
        if (globals.miuraColumnAutoPhase !== false && autoMiuraPhase !== null) exportPhase = autoMiuraPhase;
        var edgeInsetByKey = buildEdgeInsetsForLinkage(
            thickness,
            linkageType,
            minGap,
            {phase: exportPhase, boost: exportBoost}
        );
        function insetForEdge(a, b){
            return edgeInsetByKey[edgeKey(a, b)] || 0;
        }

        var faceCount = faces.length;
        var vertexCount = faceCount * 6;
        var positionsOut = new Float32Array(vertexCount * 3);

        var edgeMeta = buildThickEdgeMeta();
        var sideMask = edgeMeta.sideMask;
        var smoothGroups = edgeMeta.smoothGroups;

        var indicesArray = [];
        for (var i=0;i<faceCount;i++){
            var base = i * 6;
            indicesArray.push(base + 0, base + 1, base + 2);
            indicesArray.push(base + 5, base + 4, base + 3);
            if (sideMask[i*3]){
                indicesArray.push(base + 0, base + 1, base + 4);
                indicesArray.push(base + 0, base + 4, base + 3);
            }
            if (sideMask[i*3 + 1]){
                indicesArray.push(base + 1, base + 2, base + 5);
                indicesArray.push(base + 1, base + 5, base + 4);
            }
            if (sideMask[i*3 + 2]){
                indicesArray.push(base + 2, base + 0, base + 3);
                indicesArray.push(base + 2, base + 3, base + 5);
            }
        }
        var IndexArray = (vertexCount > 65535) ? Uint32Array : Uint16Array;
        var indicesOut = new IndexArray(indicesArray.length);
        for (var i=0;i<indicesArray.length;i++){
            indicesOut[i] = indicesArray[i];
        }

        for (var i=0;i<faceCount;i++){
            var face = faces[i];
            var ia = face[0] * 3;
            var ib = face[1] * 3;
            var ic = face[2] * 3;
            var p0 = new THREE.Vector3(positions[ia], positions[ia+1], positions[ia+2]);
            var p1 = new THREE.Vector3(positions[ib], positions[ib+1], positions[ib+2]);
            var p2 = new THREE.Vector3(positions[ic], positions[ic+1], positions[ic+2]);

            var e01 = p1.clone().sub(p0);
            var e02 = p2.clone().sub(p0);
            var normal = e01.clone().cross(e02);
            if (normal.lengthSq() < 1e-12) continue;
            normal.normalize();

            var gap01 = insetForEdge(face[0], face[1]);
            var gap12 = insetForEdge(face[1], face[2]);
            var gap20 = insetForEdge(face[2], face[0]);

            var a01 = assignmentForEdge(face[0], face[1]);
            var a12 = assignmentForEdge(face[1], face[2]);
            var a20 = assignmentForEdge(face[2], face[0]);
            var topVerts;
            var botVerts;
            if (simpleExtrusionMode){
                var faceInset01 = gap01;
                var faceInset12 = gap12;
                var faceInset20 = gap20;
                var insetVerts = (faceInset01 > 0 || faceInset12 > 0 || faceInset20 > 0)
                    ? insetTriangleByEdges(p0, p1, p2, faceInset01, faceInset12, faceInset20)
                    : [p0, p1, p2];
                topVerts = insetVerts;
                botVerts = insetVerts;
            } else {
                var top01 = (a01 == "V") ? gap01 : 0;
                var top12 = (a12 == "V") ? gap12 : 0;
                var top20 = (a20 == "V") ? gap20 : 0;
                var bot01 = (a01 == "M") ? gap01 : 0;
                var bot12 = (a12 == "M") ? gap12 : 0;
                var bot20 = (a20 == "M") ? gap20 : 0;

                topVerts = (top01 > 0 || top12 > 0 || top20 > 0)
                    ? insetTriangleByEdges(p0, p1, p2, top01, top12, top20)
                    : [p0, p1, p2];
                botVerts = (bot01 > 0 || bot12 > 0 || bot20 > 0)
                    ? insetTriangleByEdges(p0, p1, p2, bot01, bot12, bot20)
                    : [p0, p1, p2];
            }

            var halfOffset = normal.clone().multiplyScalar(0.5 * thickness);
            var f0 = topVerts[0].clone().add(halfOffset);
            var f1 = topVerts[1].clone().add(halfOffset);
            var f2 = topVerts[2].clone().add(halfOffset);
            var b0 = botVerts[0].clone().sub(halfOffset);
            var b1 = botVerts[1].clone().sub(halfOffset);
            var b2 = botVerts[2].clone().sub(halfOffset);

            var base = i * 6 * 3;
            positionsOut[base] = f0.x;
            positionsOut[base+1] = f0.y;
            positionsOut[base+2] = f0.z;
            positionsOut[base+3] = f1.x;
            positionsOut[base+4] = f1.y;
            positionsOut[base+5] = f1.z;
            positionsOut[base+6] = f2.x;
            positionsOut[base+7] = f2.y;
            positionsOut[base+8] = f2.z;
            positionsOut[base+9] = b0.x;
            positionsOut[base+10] = b0.y;
            positionsOut[base+11] = b0.z;
            positionsOut[base+12] = b1.x;
            positionsOut[base+13] = b1.y;
            positionsOut[base+14] = b1.z;
            positionsOut[base+15] = b2.x;
            positionsOut[base+16] = b2.y;
            positionsOut[base+17] = b2.z;
        }

        applySmoothPositions(positionsOut, smoothGroups);
        var geo = new THREE.BufferGeometry();
        geo.addAttribute('position', new THREE.BufferAttribute(positionsOut, 3));
        geo.setIndex(new THREE.BufferAttribute(indicesOut, 1));
        geo.computeVertexNormals();
        return geo;
    }

    function buildEdgeInsetsForLinkage(thickness, linkageType, minGap){
        linkageType = normalizePaperLinkageType(linkageType);
        var insets = {};
        var vertexCreases = [];
        for (var i=0;i<nodes.length;i++) vertexCreases.push([]);

        function edgeKey(a, b){
            return (a < b) ? (a + "_" + b) : (b + "_" + a);
        }

        function getAngleForEdge(centerIndex, otherIndex){
            var center = nodes[centerIndex].getOriginalPosition();
            var other = nodes[otherIndex].getOriginalPosition();
            return Math.atan2(other.z - center.z, other.x - center.x);
        }

        function gapsForCount(count){
            var gaps = [];
            for (var i=0;i<count;i++) gaps.push(thickness);
            if (linkageType == "myard" && count == 5) gaps[2] = 0; // a34 = 0
            return gaps;
        }

        for (var i=0;i<edges.length;i++){
            var edge = edges[i];
            var a = edge.nodes[0].getIndex();
            var b = edge.nodes[1].getIndex();
            var key = edgeKey(a, b);
            var assignment = edgeAssignmentByKey[key];
            if (edgeIsPatternByKey[key] === false) continue;
            if (!isCreaseLikeAssignment(assignment, key)) continue;
            vertexCreases[a].push({edgeIndex: i, other: b});
            vertexCreases[b].push({edgeIndex: i, other: a});
        }

        var edgeInsetAtVertex = {};
        for (var v=0; v<vertexCreases.length; v++){
            var creases = vertexCreases[v];
            if (creases.length < 2) continue;
            creases.sort(function(a, b){
                return getAngleForEdge(v, a.other) - getAngleForEdge(v, b.other);
            });

            if (linkageType == "bennettpaper" && creases.length == 4){
                var sector = [];
                for (var i=0;i<4;i++){
                    var a0 = getAngleForEdge(v, creases[i].other);
                    var a1 = getAngleForEdge(v, creases[(i+1)%4].other);
                    while (a1 <= a0) a1 += Math.PI * 2;
                    sector.push(a1 - a0);
                }
                var eps = 1e-8;
                var s0 = Math.abs(Math.sin(sector[0]));
                var s1 = Math.abs(Math.sin(sector[1]));
                var s2 = Math.abs(Math.sin(sector[2]));
                var s3 = Math.abs(Math.sin(sector[3]));
                var ratios = [];
                if (s1 > eps) ratios.push(s0 / s1);
                if (s3 > eps) ratios.push(s2 / s3);
                var ratio = 1;
                if (ratios.length > 0){
                    var sum = 0;
                    for (var i=0;i<ratios.length;i++) sum += ratios[i];
                    ratio = sum / ratios.length;
                }
                if (!isFinite(ratio) || ratio <= eps) ratio = 1;
                ratio = Math.max(0.05, Math.min(20, ratio));

                var baseInset = Math.max(minGap, thickness);
                var insetEven = ratio >= 1 ? baseInset * ratio : baseInset;
                var insetOdd = ratio >= 1 ? baseInset : baseInset / ratio;

                for (var i=0;i<4;i++){
                    var edge = edges[creases[i].edgeIndex];
                    var a = edge.nodes[0].getIndex();
                    var b = edge.nodes[1].getIndex();
                    var key = edgeKey(a, b);
                    edgeInsetAtVertex[v + "|" + key] = (i % 2 === 0) ? insetEven : insetOdd;
                }
                continue;
            }

            var gaps = gapsForCount(creases.length);
            for (var i=0;i<creases.length;i++){
                var prev = (i - 1 + creases.length) % creases.length;
                var inset = 0.5 * (gaps[prev] + gaps[i]);
                var edge = edges[creases[i].edgeIndex];
                var a = edge.nodes[0].getIndex();
                var b = edge.nodes[1].getIndex();
                var key = edgeKey(a, b);
                edgeInsetAtVertex[v + "|" + key] = inset;
            }
        }

        for (var i=0;i<edges.length;i++){
            var edge = edges[i];
            var a = edge.nodes[0].getIndex();
            var b = edge.nodes[1].getIndex();
            var key = edgeKey(a, b);
            var assignment = edgeAssignmentByKey[key];
            if (edgeIsPatternByKey[key] === false) continue;
            if (!isCreaseLikeAssignment(assignment, key)) continue;

            var aInset = edgeInsetAtVertex[a + "|" + key] || 0;
            var bInset = edgeInsetAtVertex[b + "|" + key] || 0;
            var inset = Math.max(aInset, bInset, thickness * 0.5, minGap);

            var runtimeScaleOverride = mapNumberForEdgeKey(globals.thickEdgeGapScaleOverrides, key);
            var scaleOverride = edgeGapScaleByKey[key];
            if (runtimeScaleOverride !== null) scaleOverride = runtimeScaleOverride;
            if (isFinite(scaleOverride) && scaleOverride >= 0) inset *= scaleOverride;

            var runtimeAbsoluteOverride = mapNumberForEdgeKey(globals.thickEdgeGapOverrides, key);
            var absoluteOverride = edgeGapOverrideByKey[key];
            if (runtimeAbsoluteOverride !== null) absoluteOverride = runtimeAbsoluteOverride;
            if (isFinite(absoluteOverride) && absoluteOverride >= 0) inset = Math.max(inset, absoluteOverride);

            insets[key] = inset;
        }

        return insets;
    }
    function getGeometry(){
        return geometry;
    }

    function getMesh(){
        return [frontside, backside];
    }

    function getPositionsArray(){
        return positions;
    }

    function getColorsArray(){
        return colors;
    }

    function pause(){
        globals.threeView.pauseSimulation();
    }

    function resume(){
        globals.threeView.startSimulation();
    }

    function reset(){
        getSolver().reset();
        setGeoUpdates();
        if (globals.simType != "thick") resetThinAreaReference();
    }

    function step(numSteps){
        getSolver().solve(numSteps);
        setGeoUpdates();
    }

    function setGeoUpdates(){
        geometry.attributes.position.needsUpdate = true;
        if (globals.colorMode == "axialStrain") geometry.attributes.color.needsUpdate = true;
        if (globals.userInteractionEnabled || globals.vrEnabled) geometry.computeBoundingBox();
        if (globals.simType == "thick") updateThickPanelGeometry();
        else updateThinAreaStats(false);
    }

    function startSolver(){
        globals.threeView.startAnimation();
    }

    function getSolver(){
        if (globals.simType == "dynamic" || globals.simType == "thick") return globals.dynamicSolver;
        else if (globals.simType == "static") return globals.staticSolver;
        return globals.rigidSolver;
    }




    function buildModel(fold, creaseParams){

        // if (fold.vertices_coords.length == 0) {
        //     globals.warn("No geometry found.");
        //     return;
        // }
        // if (fold.faces_vertices.length == 0) {
        //     globals.warn("No faces found, try adjusting import vertex merge tolerance.");
        //     return;
        // }
        // if (fold.edges_vertices.length == 0) {
        //     globals.warn("No edges found.");
        //     return;
        // }

        nextFold = fold;
        nextCreaseParams = creaseParams;

        globals.needsSync = true;
        globals.simNeedsSync = true;

        if (!inited) {
            startSolver();//start animation loop
            inited = true;
        }
    }



    function sync(){
        for (var i=0;i<nodes.length;i++){
            nodes[i].destroy();
        }

        for (var i=0;i<edges.length;i++){
            edges[i].destroy();
        }

        for (var i=0;i<creases.length;i++){
            creases[i].destroy();
        }

        fold = nextFold;
        nodes = [];
        edges = [];
        faces = fold.faces_vertices;
        creases = [];
        thinAreaReference = null;
        thinAreaStats.valid = false;
        thinAreaStats.current = 0;
        thinAreaStats.reference = 0;
        thinAreaStats.delta = 0;
        thinAreaStats.deltaPercent = 0;
        thickClearanceStats.valid = false;
        thickClearanceStats.skipped = false;
        thickClearanceStats.minDistance = 0;
        thickClearanceStats.collision = false;
        thickClearanceStats.checkedPairs = 0;
        thickClearanceStats.truncated = false;
        thickClearanceFrameCountdown = 0;
        creaseParams = nextCreaseParams;
        var _edges = fold.edges_vertices;
        edgeAssignmentByKey = {};
        edgeIsPatternByKey = {};
        edgeFoldAngleByKey = {};
        edgeGapOverrideByKey = {};
        edgeGapScaleByKey = {};
        lastThickEdgeInsetByKey = {};
        autoMiuraPhase = null;
        autoMiuraBoost = 0;
        for (var i=0;i<fold.edges_vertices.length;i++){
            var edge = fold.edges_vertices[i];
            var a = edge[0];
            var b = edge[1];
            var key = (a < b) ? (a + "_" + b) : (b + "_" + a);
            edgeAssignmentByKey[key] = fold.edges_assignment[i];
            if (fold.edges_isPattern) edgeIsPatternByKey[key] = fold.edges_isPattern[i] !== false;
            else edgeIsPatternByKey[key] = true;
            if (fold.edges_foldAngle && i < fold.edges_foldAngle.length){
                var foldAngle = fold.edges_foldAngle[i];
                if (isFinite(foldAngle)){
                    var current = edgeFoldAngleByKey[key];
                    if (!isFinite(current) || Math.abs(foldAngle) > Math.abs(current)){
                        edgeFoldAngleByKey[key] = foldAngle;
                    }
                }
            }
        }

        var _vertices = [];
        for (var i=0;i<fold.vertices_coords.length;i++){
            var vertex = fold.vertices_coords[i];
            _vertices.push(new THREE.Vector3(vertex[0], vertex[1], vertex[2]));
        }

        for (var i=0;i<_vertices.length;i++){
            nodes.push(new Node(_vertices[i].clone(), nodes.length));
        }
        // _nodes[_faces[0][0]].setFixed(true);
        // _nodes[_faces[0][1]].setFixed(true);
        // _nodes[_faces[0][2]].setFixed(true);

        for (var i=0;i<_edges.length;i++) {
            edges.push(new Beam([nodes[_edges[i][0]], nodes[_edges[i][1]]]));
        }

        for (var i=0;i<creaseParams.length;i++) {//allCreaseParams.length
            var _creaseParams = creaseParams[i];//face1Ind, vert1Ind, face2Ind, ver2Ind, edgeInd, angle
            var type = _creaseParams[5]!=0 ? 1:0;
            //edge, face1Index, face2Index, targetTheta, type, node1, node2, index
            var crease = new Crease(
                edges[_creaseParams[4]],
                _creaseParams[0],
                _creaseParams[2],
                _creaseParams[5] * Math.PI / 180,  // convert back to radians for the GPU math
                type,
                nodes[_creaseParams[1]],
                nodes[_creaseParams[3]],
                creases.length);
            creases.push(crease);

        }

        vertices = [];
        for (var i=0;i<nodes.length;i++){
            vertices.push(nodes[i].getOriginalPosition());
        }

        if (globals.noCreasePatternAvailable() && globals.navMode == "pattern"){
            //switch to simulation mode
            $("#navSimulation").parent().addClass("open");
            $("#navPattern").parent().removeClass("open");
            $("#svgViewer").hide();
            globals.navMode = "simulation";
        }

        positions = new Float32Array(vertices.length*3);
        colors = new Float32Array(vertices.length*3);
        indices = new Uint16Array(faces.length*3);

        for (var i=0;i<vertices.length;i++){
            positions[3*i] = vertices[i].x;
            positions[3*i+1] = vertices[i].y;
            positions[3*i+2] = vertices[i].z;
        }
        for (var i=0;i<faces.length;i++){
            var face = faces[i];
            indices[3*i] = face[0];
            indices[3*i+1] = face[1];
            indices[3*i+2] = face[2];
        }

        clearGeometries();

        var positionsAttribute = new THREE.BufferAttribute(positions, 3);

        var lineIndices = {
            U: [],
            V: [],
            M: [],
            B: [],
            F: [],
            C: []
        };
        for (var i=0;i<fold.edges_assignment.length;i++){
            var edge = fold.edges_vertices[i];
            var assignment = fold.edges_assignment[i];
            lineIndices[assignment].push(edge[0]);
            lineIndices[assignment].push(edge[1]);
        }
        _.each(lines, function(line, key){
            var indicesArray = lineIndices[key];
            var indices = new Uint16Array(indicesArray.length);
            for (var i=0;i<indicesArray.length;i++){
                indices[i] = indicesArray[i];
            }
            lines[key].geometry.addAttribute('position', positionsAttribute);
            lines[key].geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            // lines[key].geometry.attributes.position.needsUpdate = true;
            // lines[key].geometry.index.needsUpdate = true;
            lines[key].geometry.computeBoundingBox();
            lines[key].geometry.computeBoundingSphere();
            lines[key].geometry.center();
        });

        geometry.addAttribute('position', positionsAttribute);
        geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        // geometry.attributes.position.needsUpdate = true;
        // geometry.index.needsUpdate = true;
        // geometry.verticesNeedUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        geometry.center();

        var scale = 1/geometry.boundingSphere.radius;
        globals.scale = scale;

        //scale geometry
        for (var i=0;i<positions.length;i++){
            positions[i] *= scale;
        }
        for (var i=0;i<vertices.length;i++){
            vertices[i].multiplyScalar(scale);
        }

        //update vertices and edges
        for (var i=0;i<vertices.length;i++){
            nodes[i].setOriginalPosition(positions[3*i], positions[3*i+1], positions[3*i+2]);
        }
        for (var i=0;i<edges.length;i++){
            edges[i].recalcOriginalLength();
        }

        addIndexedGapOverrides(fold.edges_thickGap, edgeGapOverrideByKey, scale);
        addIndexedGapOverrides(fold.edges_thickGapScale, edgeGapScaleByKey, 1);

        updateEdgeVisibility();
        updateMeshVisibility();
        buildThickGeometry();
        if (globals.simType != "thick") resetThinAreaReference();
        else notifyThinAreaStats();

        syncSolver();

        globals.needsSync = false;
        if (!globals.simulationRunning) reset();
    }

    function syncSolver(){
        var solver = getSolver();
        if (!solver || !solver.syncNodesAndEdges) return;
        solver.syncNodesAndEdges();
        globals.simNeedsSync = false;
    }

    function getNodes(){
        return nodes;
    }

    function getEdges(){
        return edges;
    }

    function getFaces(){
        return faces;
    }

    function getCreases(){
        return creases;
    }

    function getDimensions(){
        if (globals.simType == "thick" && thickGeometry) {
            thickGeometry.computeBoundingBox();
            return thickGeometry.boundingBox.max.clone().sub(thickGeometry.boundingBox.min);
        }
        geometry.computeBoundingBox();
        return geometry.boundingBox.max.clone().sub(geometry.boundingBox.min);
    }

    return {
        pause: pause,
        resume: resume,
        reset: reset,
        step: step,

        getNodes: getNodes,
        getEdges: getEdges,
        getFaces: getFaces,
        getCreases: getCreases,
        getGeometry: getGeometry,//for save stl
        getThickGeometry: function(){ return thickGeometry; },
        getThickEdgeInsetMap: function(){ return cloneNumberMap(lastThickEdgeInsetByKey); },
        ensureThickGeometry: ensureThickGeometry,
        buildThickExportGeometry: buildThickExportGeometry,
        getPositionsArray: getPositionsArray,
        getColorsArray: getColorsArray,
        getMesh: getMesh,

        buildModel: buildModel,//load new model
        sync: sync,//update geometry to new model
        syncSolver: syncSolver,//update solver params

        //rendering
        setMeshMaterial: setMeshMaterial,
        updateEdgeVisibility: updateEdgeVisibility,
        updateMeshVisibility: updateMeshVisibility,
        updateThickPanelGeometry: updateThickPanelGeometry,
        resetThinAreaReference: resetThinAreaReference,
        getThinAreaStats: cloneThinAreaStats,
        getThickClearanceStats: cloneThickClearanceStats,
        getThickAutoTuneState: cloneThickAutoTuneState,

        getDimensions: getDimensions//for save stl
    }
}
