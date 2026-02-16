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
    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];
    var vertices = [];//indexed vertices array
    var edgeAssignmentByKey = {};
    var edgeIsPatternByKey = {};
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
                flatShading:true,
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
                flatShading:true,
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
                flatShading:true,
                side: THREE.DoubleSide
            });
            thickMaterial.color.setStyle("#" + globals.color1);
        }
        frontside.material = material;
        backside.material = material2;
        thickMesh.material = thickMaterial;
    }

    function updateEdgeVisibility(){
        mountainLines.visible = globals.edgesVisible && globals.mtnsVisible;
        valleyLines.visible = globals.edgesVisible && globals.valleysVisible;
        facetLines.visible = globals.edgesVisible && globals.panelsVisible;
        hingeLines.visible = globals.edgesVisible && globals.passiveEdgesVisible;
        borderLines.visible = globals.edgesVisible && globals.boundaryEdgesVisible;
        cutLines.visible = false;
    }

    function updateMeshVisibility(){
        var useThick = globals.simType == "thick";
        frontside.visible = globals.meshVisible && !useThick;
        backside.visible = globals.colorMode == "color" && globals.meshVisible && !useThick;
        thickMesh.visible = globals.meshVisible && useThick;
    }

    function edgeKeyForPair(a, b){
        return (a < b) ? (a + "_" + b) : (b + "_" + a);
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
            var isPattern = edgeIsPatternByKey[key] !== false;
            var addSide = isBoundary || isPattern;
            if (!addSide){
                for (var j=0;j<entries.length;j++){
                    var entry = entries[j];
                    sideMask[entry.faceIndex * 3 + entry.localEdgeIndex] = 0;
                }
            }

            if (!isPattern && !isBoundary && entries.length > 1){
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
        thickGeometry.computeVertexNormals();
        applySmoothNormals();
        thickGeometry.computeBoundingBox();
        thickGeometry.computeBoundingSphere();
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

        var area2 = (v1.x - v0.x) * (v2.y - v0.y) - (v1.y - v0.y) * (v2.x - v0.x);
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

        var i0 = intersect(l2, l0);
        var i1 = intersect(l0, l1);
        var i2 = intersect(l1, l2);
        if (!i0 || !i1 || !i2) return [p0, p1, p2];

        var p0i = p0.clone().add(u.clone().multiplyScalar(i0.x)).add(v.clone().multiplyScalar(i0.y));
        var p1i = p0.clone().add(u.clone().multiplyScalar(i1.x)).add(v.clone().multiplyScalar(i1.y));
        var p2i = p0.clone().add(u.clone().multiplyScalar(i2.x)).add(v.clone().multiplyScalar(i2.y));
        return [p0i, p1i, p2i];
    }

    function updateThickPanelGeometry(){
        if (!thickPositions || !faces || faces.length == 0) return;

        var thickness = Math.max(0, globals.panelThickness || 0);
        if (thickness <= 0) thickness = 0.0001;
        var linkageType = (globals.thickLinkageType || "bennett").toLowerCase();
        var minGap = Math.max(0, globals.minHingeGap || 0);
        function edgeKey(a, b){
            return (a < b) ? (a + "_" + b) : (b + "_" + a);
        }
        var edgeInsetByKey = buildEdgeInsetsForLinkage(thickness, linkageType, minGap);
        function assignmentForEdge(a, b){
            return edgeAssignmentByKey[edgeKey(a, b)];
        }
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

            // Mountain: hinge on bottom -> inset top. Valley: hinge on top -> inset bottom.
            var top01 = (a01 == "M") ? gap01 : 0;
            var top12 = (a12 == "M") ? gap12 : 0;
            var top20 = (a20 == "M") ? gap20 : 0;
            var bot01 = (a01 == "V") ? gap01 : 0;
            var bot12 = (a12 == "V") ? gap12 : 0;
            var bot20 = (a20 == "V") ? gap20 : 0;

            var topVerts = (top01 > 0 || top12 > 0 || top20 > 0)
                ? insetTriangleByEdges(p0, p1, p2, top01, top12, top20)
                : [p0, p1, p2];
            var botVerts = (bot01 > 0 || bot12 > 0 || bot20 > 0)
                ? insetTriangleByEdges(p0, p1, p2, bot01, bot12, bot20)
                : [p0, p1, p2];

            // Bottom face sits on the original sheet; thickness extrudes along the face normal.
            var offset = normal.clone().multiplyScalar(thickness);
            var f0 = topVerts[0].clone().add(offset);
            var f1 = topVerts[1].clone().add(offset);
            var f2 = topVerts[2].clone().add(offset);
            var b0 = botVerts[0].clone();
            var b1 = botVerts[1].clone();
            var b2 = botVerts[2].clone();

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

        thickGeometry.attributes.position.needsUpdate = true;
        thickGeometry.computeVertexNormals();
        applySmoothNormals();
        thickGeometry.computeBoundingBox();
        thickGeometry.computeBoundingSphere();
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
        var linkageType = (globals.thickLinkageType || "bennett").toLowerCase();
        var minGap = Math.max(0, globals.minHingeGap || 0);

        function edgeKey(a, b){
            return (a < b) ? (a + "_" + b) : (b + "_" + a);
        }
        function assignmentForEdge(a, b){
            return edgeAssignmentByKey[edgeKey(a, b)];
        }
        var edgeInsetByKey = buildEdgeInsetsForLinkage(thickness, linkageType, minGap);
        function insetForEdge(a, b){
            return edgeInsetByKey[edgeKey(a, b)] || 0;
        }

        var faceCount = faces.length;
        var vertexCount = faceCount * 6;
        var positionsOut = new Float32Array(vertexCount * 3);

        var edgeMeta = buildThickEdgeMeta();
        var sideMask = edgeMeta.sideMask;

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

            var top01 = (a01 == "M") ? gap01 : 0;
            var top12 = (a12 == "M") ? gap12 : 0;
            var top20 = (a20 == "M") ? gap20 : 0;
            var bot01 = (a01 == "V") ? gap01 : 0;
            var bot12 = (a12 == "V") ? gap12 : 0;
            var bot20 = (a20 == "V") ? gap20 : 0;

            var topVerts = (top01 > 0 || top12 > 0 || top20 > 0)
                ? insetTriangleByEdges(p0, p1, p2, top01, top12, top20)
                : [p0, p1, p2];
            var botVerts = (bot01 > 0 || bot12 > 0 || bot20 > 0)
                ? insetTriangleByEdges(p0, p1, p2, bot01, bot12, bot20)
                : [p0, p1, p2];

            var offset = normal.clone().multiplyScalar(thickness);
            var f0 = topVerts[0].clone().add(offset);
            var f1 = topVerts[1].clone().add(offset);
            var f2 = topVerts[2].clone().add(offset);
            var b0 = botVerts[0].clone();
            var b1 = botVerts[1].clone();
            var b2 = botVerts[2].clone();

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

        var geo = new THREE.BufferGeometry();
        geo.addAttribute('position', new THREE.BufferAttribute(positionsOut, 3));
        geo.setIndex(new THREE.BufferAttribute(indicesOut, 1));
        geo.computeVertexNormals();
        return geo;
    }

    function buildEdgeInsetsForLinkage(thickness, linkageType, minGap){
        var insets = {};
        var vertexCreases = [];
        for (var i=0;i<nodes.length;i++) vertexCreases.push([]);

        for (var i=0;i<edges.length;i++){
            var edge = edges[i];
            var a = edge.nodes[0].getIndex();
            var b = edge.nodes[1].getIndex();
            var key = (a < b) ? (a + "_" + b) : (b + "_" + a);
            var assignment = edgeAssignmentByKey[key];
            if (assignment != "M" && assignment != "V") continue;
            vertexCreases[a].push({edgeIndex:i, other:b});
            vertexCreases[b].push({edgeIndex:i, other:a});
        }

        function getAngleForEdge(centerIndex, otherIndex){
            var ix = centerIndex * 3;
            var ox = otherIndex * 3;
            var dx = positions[ox] - positions[ix];
            var dz = positions[ox+2] - positions[ix+2];
            return Math.atan2(dz, dx);
        }

        function gapsForCount(count){
            var gaps = [];
            if (linkageType == "myard" && count == 5){
                for (var i=0;i<5;i++) gaps.push(thickness);
                gaps[2] = 0; // a34 = 0
                return gaps;
            }
            if (linkageType == "bricard" && count == 6){
                for (var i=0;i<6;i++) gaps.push(thickness);
                return gaps;
            }
            if (linkageType == "bennett" && count == 4){
                for (var i=0;i<4;i++) gaps.push(thickness);
                return gaps;
            }
            for (var i=0;i<count;i++) gaps.push(thickness);
            return gaps;
        }

        var edgeInsetAtVertex = {};
        for (var v=0; v<vertexCreases.length; v++){
            var creases = vertexCreases[v];
            if (creases.length < 2) continue;
            creases.sort(function(a, b){
                return getAngleForEdge(v, a.other) - getAngleForEdge(v, b.other);
            });
            var gaps = gapsForCount(creases.length);
            for (var i=0;i<creases.length;i++){
                var prev = (i - 1 + creases.length) % creases.length;
                var inset = 0.5 * (gaps[prev] + gaps[i]);
                var edge = edges[creases[i].edgeIndex];
                var a = edge.nodes[0].getIndex();
                var b = edge.nodes[1].getIndex();
                var key = (a < b) ? (a + "_" + b) : (b + "_" + a);
                var vKey = v + "|" + key;
                edgeInsetAtVertex[vKey] = inset;
            }
        }

        for (var i=0;i<edges.length;i++){
            var edge = edges[i];
            var a = edge.nodes[0].getIndex();
            var b = edge.nodes[1].getIndex();
            var key = (a < b) ? (a + "_" + b) : (b + "_" + a);
            var assignment = edgeAssignmentByKey[key];
            if (assignment != "M" && assignment != "V") continue;
            var aInset = edgeInsetAtVertex[a + "|" + key] || 0;
            var bInset = edgeInsetAtVertex[b + "|" + key] || 0;
            insets[key] = Math.max(aInset, bInset, thickness * 0.5, minGap);
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
        creaseParams = nextCreaseParams;
        var _edges = fold.edges_vertices;
        edgeAssignmentByKey = {};
        edgeIsPatternByKey = {};
        for (var i=0;i<fold.edges_vertices.length;i++){
            var edge = fold.edges_vertices[i];
            var a = edge[0];
            var b = edge[1];
            var key = (a < b) ? (a + "_" + b) : (b + "_" + a);
            edgeAssignmentByKey[key] = fold.edges_assignment[i];
            if (fold.edges_isPattern) edgeIsPatternByKey[key] = fold.edges_isPattern[i] !== false;
            else edgeIsPatternByKey[key] = true;
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
            creases.push(new Crease(
                edges[_creaseParams[4]],
                _creaseParams[0],
                _creaseParams[2],
                _creaseParams[5] * Math.PI / 180,  // convert back to radians for the GPU math
                type,
                nodes[_creaseParams[1]],
                nodes[_creaseParams[3]],
                creases.length));
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

        updateEdgeVisibility();
        updateMeshVisibility();
        buildThickGeometry();

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

        getDimensions: getDimensions//for save stl
    }
}
