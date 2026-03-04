/**
 * Created by amandaghassaei on 5/2/17.
 */

function buildSnapConnectorExportParts(){
    if (!globals.model || !globals.model.getFaces || !globals.model.getPositionsArray) return null;
    var faces = globals.model.getFaces();
    var positions = globals.model.getPositionsArray();
    if (!faces || !positions || faces.length === 0) return null;

    function parseNonNegativeNumber(value){
        var num = parseFloat(value);
        if (!isFinite(num) || num < 0) return null;
        return num;
    }

    function edgeKeyForPair(a, b){
        return (a < b) ? (a + "_" + b) : (b + "_" + a);
    }

    var edgeInsetByKey = {};
    if (globals.model.getThickEdgeInsetMap){
        var rawInsetMap = globals.model.getThickEdgeInsetMap();
        if (rawInsetMap){
            for (var key in rawInsetMap){
                if (!rawInsetMap.hasOwnProperty(key)) continue;
                var inset = parseNonNegativeNumber(rawInsetMap[key]);
                if (inset === null) continue;
                edgeInsetByKey[key] = inset;
            }
        }
    }

    function parsePositiveOrAuto(value, autoValue){
        var num = parseFloat(value);
        if (!isFinite(num) || num <= 0) return autoValue;
        return num;
    }

    function makeTriangleShape2D(a, b, c){
        var shape = new THREE.Shape();
        shape.moveTo(a.x, a.y);
        shape.lineTo(b.x, b.y);
        shape.lineTo(c.x, c.y);
        shape.lineTo(a.x, a.y);
        return shape;
    }

    function addCircularHole(shape, center, radius){
        var hole = new THREE.Path();
        hole.absellipse(center.x, center.y, radius, radius, 0, Math.PI*2, false, 0);
        shape.holes.push(hole);
    }

    function triangleIncenterData(a, b, c){
        var ab = a.distanceTo(b);
        var bc = b.distanceTo(c);
        var ca = c.distanceTo(a);
        var perimeter = ab + bc + ca;
        if (perimeter < 1e-9) return null;
        var wA = bc;
        var wB = ca;
        var wC = ab;
        var center = new THREE.Vector2(
            (a.x*wA + b.x*wB + c.x*wC) / perimeter,
            (a.y*wA + b.y*wB + c.y*wC) / perimeter
        );
        var area2 = Math.abs((b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x));
        var area = 0.5 * area2;
        var semiPerimeter = 0.5 * perimeter;
        var inradius = semiPerimeter > 1e-12 ? (area / semiPerimeter) : 0;
        return {center: center, inradius: inradius};
    }

    function signedArea2(a, b, c){
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    }

    function pointInTriangle2D(p, a, b, c, eps){
        if (eps === undefined) eps = 1e-8;
        var v0x = c.x - a.x;
        var v0y = c.y - a.y;
        var v1x = b.x - a.x;
        var v1y = b.y - a.y;
        var v2x = p.x - a.x;
        var v2y = p.y - a.y;
        var dot00 = v0x*v0x + v0y*v0y;
        var dot01 = v0x*v1x + v0y*v1y;
        var dot02 = v0x*v2x + v0y*v2y;
        var dot11 = v1x*v1x + v1y*v1y;
        var dot12 = v1x*v2x + v1y*v2y;
        var denom = dot00 * dot11 - dot01 * dot01;
        if (Math.abs(denom) < 1e-12) return false;
        var invDenom = 1 / denom;
        var u = (dot11 * dot02 - dot01 * dot12) * invDenom;
        var v = (dot00 * dot12 - dot01 * dot02) * invDenom;
        return u >= -eps && v >= -eps && (u + v) <= 1 + eps;
    }

    function insetTriangle2DByEdges(a, b, c, insetAB, insetBC, insetCA){
        var area2 = signedArea2(a, b, c);
        if (Math.abs(area2) < 1e-12) return [a.clone(), b.clone(), c.clone()];
        var ccw = area2 > 0;
        var absArea2 = Math.abs(area2);

        var lenAB = b.clone().sub(a).length();
        var lenBC = c.clone().sub(b).length();
        var lenCA = a.clone().sub(c).length();
        if (lenAB < 1e-10 || lenBC < 1e-10 || lenCA < 1e-10) return [a.clone(), b.clone(), c.clone()];

        var maxInsetScale = 0.98;
        insetAB = Math.min(Math.max(0, insetAB), maxInsetScale * absArea2 / lenAB);
        insetBC = Math.min(Math.max(0, insetBC), maxInsetScale * absArea2 / lenBC);
        insetCA = Math.min(Math.max(0, insetCA), maxInsetScale * absArea2 / lenCA);

        function edgeLine(p0, p1, inset){
            var dx = p1.x - p0.x;
            var dy = p1.y - p0.y;
            var len = Math.sqrt(dx*dx + dy*dy);
            if (len < 1e-12) return null;
            var nx = ccw ? (-dy / len) : (dy / len);
            var ny = ccw ? (dx / len) : (-dx / len);
            return {nx: nx, ny: ny, c: nx * p0.x + ny * p0.y + inset};
        }

        function intersect(l1, l2){
            if (!l1 || !l2) return null;
            var det = l1.nx * l2.ny - l2.nx * l1.ny;
            if (Math.abs(det) < 1e-12) return null;
            return new THREE.Vector2(
                (l1.c * l2.ny - l2.c * l1.ny) / det,
                (l1.nx * l2.c - l2.nx * l1.c) / det
            );
        }

        function solveInset(scale){
            var l0 = edgeLine(a, b, insetAB * scale);
            var l1 = edgeLine(b, c, insetBC * scale);
            var l2 = edgeLine(c, a, insetCA * scale);
            if (!l0 || !l1 || !l2) return null;
            var i0 = intersect(l2, l0);
            var i1 = intersect(l0, l1);
            var i2 = intersect(l1, l2);
            if (!i0 || !i1 || !i2) return null;
            return [i0, i1, i2];
        }

        function isValidInset(candidate){
            if (!candidate) return false;
            var i0 = candidate[0];
            var i1 = candidate[1];
            var i2 = candidate[2];
            var insetArea2 = signedArea2(i0, i1, i2);
            if (!isFinite(insetArea2) || Math.abs(insetArea2) < 1e-10) return false;
            if (insetArea2 * area2 <= 0) return false;
            return pointInTriangle2D(i0, a, b, c) &&
                pointInTriangle2D(i1, a, b, c) &&
                pointInTriangle2D(i2, a, b, c);
        }

        var best = solveInset(1);
        if (isValidInset(best)) return best;

        var low = 0;
        var high = 1;
        best = [a.clone(), b.clone(), c.clone()];
        for (var iter=0; iter<20; iter++){
            var mid = 0.5 * (low + high);
            var candidate = solveInset(mid);
            if (isValidInset(candidate)){
                low = mid;
                best = candidate;
            } else {
                high = mid;
            }
        }
        return best;
    }

    var minX = Infinity;
    var minY = Infinity;
    var minZ = Infinity;
    var maxX = -Infinity;
    var maxY = -Infinity;
    var maxZ = -Infinity;
    for (var p=0; p<positions.length; p+=3){
        var x = positions[p];
        var y = positions[p+1];
        var z = positions[p+2];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (z < minZ) minZ = z;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
        if (z > maxZ) maxZ = z;
    }
    var dx = Math.max(0, maxX - minX);
    var dy = Math.max(0, maxY - minY);
    var dz = Math.max(0, maxZ - minZ);
    var diag = Math.sqrt(dx*dx + dy*dy + dz*dz);
    if (!isFinite(diag) || diag <= 1e-9) diag = 1;
    var minFeature = Math.max(1e-5, diag * 0.002);

    var baseThickness = Math.max(1e-4, parseFloat(globals.panelThickness) || 0.02);
    var plateThickness = parsePositiveOrAuto(globals.snapPlateThickness, Math.max(1e-4, baseThickness * 0.6));
    var interlayerGap = parsePositiveOrAuto(globals.snapInterlayerGap, Math.max(1e-4, baseThickness * 0.2));
    var pinRadiusBase = parsePositiveOrAuto(globals.snapPinRadius, Math.max(1e-4, plateThickness * 0.5));
    var pinHeightBase = parsePositiveOrAuto(globals.snapPinHeight, interlayerGap + plateThickness);
    var holeClearance = parsePositiveOrAuto(globals.snapPinClearance, Math.max(1e-5, pinRadiusBase * 0.18));
    plateThickness = Math.max(plateThickness, minFeature);
    interlayerGap = Math.max(interlayerGap, minFeature * 0.5);
    pinRadiusBase = Math.max(pinRadiusBase, minFeature * 0.8);
    holeClearance = Math.max(holeClearance, minFeature * 0.15);
    var pinSegments = parseInt(globals.snapPinSegments, 10);
    if (!isFinite(pinSegments) || pinSegments < 8) pinSegments = 16;

    var lowerMerged = new THREE.Geometry();
    var upperMerged = new THREE.Geometry();
    var lowerOffsetMatrix = new THREE.Matrix4().makeTranslation(0, 0, -(0.5 * interlayerGap + plateThickness));
    var upperOffsetMatrix = new THREE.Matrix4().makeTranslation(0, 0, 0.5 * interlayerGap);
    var cylinderAxisMatrix = new THREE.Matrix4().makeRotationX(Math.PI * 0.5);

    function vertexAt(index){
        var base = index * 3;
        return new THREE.Vector3(positions[base], positions[base+1], positions[base+2]);
    }

    function appendPanelTriangle(p0, p1, p2, inset01, inset12, inset20){
        var edge01 = p1.clone().sub(p0);
        var edge02 = p2.clone().sub(p0);
        var normal = edge01.clone().cross(edge02);
        if (normal.lengthSq() < 1e-18) return;
        normal.normalize();

        var u = edge01.clone();
        if (u.lengthSq() < 1e-18) return;
        u.normalize();
        var v = normal.clone().cross(u);
        if (v.lengthSq() < 1e-18) return;
        v.normalize();

        var a2 = new THREE.Vector2(0, 0);
        var b2 = new THREE.Vector2(edge01.length(), 0);
        var c2 = new THREE.Vector2(edge02.dot(u), edge02.dot(v));
        var inset2 = insetTriangle2DByEdges(a2, b2, c2, inset01, inset12, inset20);
        a2 = inset2[0];
        b2 = inset2[1];
        c2 = inset2[2];
        var triangleArea2 = Math.abs((b2.x-a2.x)*(c2.y-a2.y) - (b2.y-a2.y)*(c2.x-a2.x));
        if (triangleArea2 < 1e-10) return;

        var frameMatrix = new THREE.Matrix4();
        frameMatrix.set(
            u.x, v.x, normal.x, p0.x,
            u.y, v.y, normal.y, p0.y,
            u.z, v.z, normal.z, p0.z,
            0, 0, 0, 1
        );

        var incenterData = triangleIncenterData(a2, b2, c2);
        if (!incenterData || !isFinite(incenterData.inradius) || incenterData.inradius <= 1e-9) return;

        var maxSnapRadius = incenterData.inradius * 0.85;
        var localPinRadius = Math.min(pinRadiusBase, incenterData.inradius * 0.45);
        var maxClearance = incenterData.inradius * 0.25;
        var minClearance = Math.max(minFeature * 0.15, localPinRadius * 0.05);
        var localClearance = Math.max(minClearance, Math.min(holeClearance, maxClearance));
        var localHoleRadius = localPinRadius + localClearance;
        if (localHoleRadius > maxSnapRadius){
            localHoleRadius = maxSnapRadius;
            localPinRadius = Math.max(0, localHoleRadius - localClearance);
            if (localPinRadius + minClearance > localHoleRadius){
                localPinRadius = Math.max(0, localHoleRadius - minClearance);
            }
        }
        var canAddSnap = localPinRadius > 1e-9 && localHoleRadius > localPinRadius + 1e-9;
        var localPinHeight = Math.min(pinHeightBase, interlayerGap + 0.98 * plateThickness);

        var lowerShape = makeTriangleShape2D(a2, b2, c2);
        var lowerPlate = new THREE.ExtrudeGeometry(lowerShape, {
            amount: plateThickness,
            bevelEnabled: false,
            steps: 1,
            curveSegments: pinSegments
        });
        lowerPlate.applyMatrix(lowerOffsetMatrix);
        lowerPlate.applyMatrix(frameMatrix);
        lowerMerged.merge(lowerPlate);

        var upperShape = makeTriangleShape2D(a2, b2, c2);
        if (canAddSnap) addCircularHole(upperShape, incenterData.center, localHoleRadius);
        var upperPlate = new THREE.ExtrudeGeometry(upperShape, {
            amount: plateThickness,
            bevelEnabled: false,
            steps: 1,
            curveSegments: pinSegments
        });
        upperPlate.applyMatrix(upperOffsetMatrix);
        upperPlate.applyMatrix(frameMatrix);
        upperMerged.merge(upperPlate);

        if (canAddSnap && localPinRadius > 1e-9 && localPinHeight > 1e-9){
            var pin = new THREE.CylinderGeometry(localPinRadius, localPinRadius, localPinHeight, pinSegments, 1, false);
            pin.applyMatrix(cylinderAxisMatrix);
            var pinTranslate = new THREE.Matrix4().makeTranslation(
                incenterData.center.x,
                incenterData.center.y,
                -0.5 * interlayerGap + 0.5 * localPinHeight
            );
            pin.applyMatrix(pinTranslate);
            pin.applyMatrix(frameMatrix);
            lowerMerged.merge(pin);
        }
    }

    for (var i=0;i<faces.length;i++){
        var face = faces[i];
        if (!face || face.length < 3) continue;
        var v0Index = face[0];
        var v0 = vertexAt(v0Index);
        for (var j=1;j<face.length-1;j++){
            var v1Index = face[j];
            var v2Index = face[j+1];
            var inset01 = edgeInsetByKey[edgeKeyForPair(v0Index, v1Index)] || 0;
            var inset12 = edgeInsetByKey[edgeKeyForPair(v1Index, v2Index)] || 0;
            var inset20 = edgeInsetByKey[edgeKeyForPair(v2Index, v0Index)] || 0;
            appendPanelTriangle(v0, vertexAt(v1Index), vertexAt(v2Index), inset01, inset12, inset20);
        }
    }

    if (!lowerMerged.faces || lowerMerged.faces.length === 0 || !upperMerged.faces || upperMerged.faces.length === 0){
        globals.warn("Snap-layer export generated no geometry. Try larger panel size or smaller pin radius.");
        return null;
    }

    lowerMerged.computeFaceNormals();
    lowerMerged.computeVertexNormals();
    upperMerged.computeFaceNormals();
    upperMerged.computeVertexNormals();

    var lowerBuffer = new THREE.BufferGeometry().fromGeometry(lowerMerged);
    var upperBuffer = new THREE.BufferGeometry().fromGeometry(upperMerged);
    if (lowerBuffer.index) lowerBuffer = lowerBuffer.toNonIndexed();
    if (upperBuffer.index) upperBuffer = upperBuffer.toNonIndexed();
    lowerBuffer.computeVertexNormals();
    upperBuffer.computeVertexNormals();

    return {
        lower: lowerBuffer,
        upper: upperBuffer
    };
}

function applyExportScaleAndSiding(sourceGeo, doublesided){
    if (!sourceGeo) {
        globals.warn("No geometry to save.");
        return null;
    }

    var geo = sourceGeo.clone();
    if (geo.index) geo = geo.toNonIndexed();

    var pos = geo.attributes.position;
    if (!pos || pos.count == 0) {
        globals.warn("No geometry to save.");
        return null;
    }

    var scale = globals.exportScale / globals.scale;
    var verts = new Float32Array(pos.array.length);
    for (var i=0;i<pos.array.length;i+=3){
        verts[i] = pos.array[i] * scale;
        verts[i+1] = pos.array[i+1] * scale;
        verts[i+2] = pos.array[i+2] * scale;
    }

    if (doublesided){
        var triCount = verts.length / 9;
        var doubled = new Float32Array(verts.length * 2);
        var write = 0;
        for (var t=0;t<triCount;t++){
            var base = t * 9;
            for (var k=0;k<9;k++) doubled[write++] = verts[base + k];
            doubled[write++] = verts[base];
            doubled[write++] = verts[base+1];
            doubled[write++] = verts[base+2];
            doubled[write++] = verts[base+6];
            doubled[write++] = verts[base+7];
            doubled[write++] = verts[base+8];
            doubled[write++] = verts[base+3];
            doubled[write++] = verts[base+4];
            doubled[write++] = verts[base+5];
        }
        verts = doubled;
    }

    geo = new THREE.BufferGeometry();
    geo.addAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.computeVertexNormals();
    return geo;
}

function makeSaveGEO(doublesided){
    var sourceGeo = globals.model.getGeometry();
    if (globals.simType == "thick") {
        var thickGeo = globals.model.buildThickExportGeometry
            ? globals.model.buildThickExportGeometry()
            : (globals.model.getThickGeometry && globals.model.getThickGeometry());
        if (thickGeo) sourceGeo = thickGeo;
    }
    return applyExportScaleAndSiding(sourceGeo, doublesided);
}

function isSnapExportEnabled(){
    var hasSTLToggle = $("#snapExportEnabledSTL").length > 0;
    var hasOBJToggle = $("#snapExportEnabledOBJ").length > 0;
    if (hasSTLToggle || hasOBJToggle){
        var stlChecked = hasSTLToggle && $("#snapExportEnabledSTL").is(":checked");
        var objChecked = hasOBJToggle && $("#snapExportEnabledOBJ").is(":checked");
        globals.snapExportEnabled = !!(stlChecked || objChecked);
    } else {
        globals.snapExportEnabled = !!globals.snapExportEnabled;
    }
    return globals.snapExportEnabled;
}

function getSnapLayerSeparationDistance(){
    if (!globals.model || !globals.model.getDimensions) return 10;
    var dim = globals.model.getDimensions();
    var scale = globals.exportScale / globals.scale;
    dim.multiplyScalar(scale);
    var span = Math.max(dim.x, dim.z, 1e-3);
    var userGap = parseFloat(globals.snapInterlayerGap);
    if (!isFinite(userGap) || userGap <= 0) userGap = 0;
    return span * 2.2 + userGap * scale * 8;
}

function saveSTL(){
    var snapEnabled = isSnapExportEnabled();
    if ((globals.simType == "thick" || snapEnabled) && globals.model.ensureThickGeometry) {
        globals.model.ensureThickGeometry();
        if (globals.model.updateThickPanelGeometry) globals.model.updateThickPanelGeometry();
    }

    if (snapEnabled){
        var parts = buildSnapConnectorExportParts();
        if (!parts) return;
        var lowerGeo = applyExportScaleAndSiding(parts.lower, globals.doublesidedSTL);
        var upperGeo = applyExportScaleAndSiding(parts.upper, globals.doublesidedSTL);
        if (!lowerGeo || !upperGeo) return;
        var orientation = new THREE.Quaternion(0,0,0,1);
        var lowerBin = geometryToSTLBin([{geo: lowerGeo, offset:new THREE.Vector3(0,0,0), orientation:orientation}]);
        var upperBin = geometryToSTLBin([{geo: upperGeo, offset:new THREE.Vector3(0,0,0), orientation:orientation}]);
        if (!lowerBin || !upperBin) return;

        var filename = $("#stlFilename").val();
        if (filename == "") filename = globals.filename;
        saveAs(new Blob([lowerBin], {type: 'application/octet-binary'}), filename + "_lower_with_pins.stl");
        saveAs(new Blob([upperBin], {type: 'application/octet-binary'}), filename + "_upper_with_holes.stl");
        return;
    }

    var singleGeo = makeSaveGEO(globals.doublesidedSTL);
    if (!singleGeo) return;
    var stlBin = geometryToSTLBin([{geo: singleGeo, offset:new THREE.Vector3(0,0,0), orientation:new THREE.Quaternion(0,0,0,1)}]);
    if (!stlBin) return;
    var blob = new Blob([stlBin], {type: 'application/octet-binary'});
    var filename = $("#stlFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".stl");
}

function saveOBJ(){
    var snapEnabled = isSnapExportEnabled();
    if ((globals.simType == "thick" || snapEnabled) && globals.model.ensureThickGeometry) {
        globals.model.ensureThickGeometry();
        if (globals.model.updateThickPanelGeometry) globals.model.updateThickPanelGeometry();
    }

    var exporter = new THREE.OBJExporter();
    if (snapEnabled){
        var parts = buildSnapConnectorExportParts();
        if (!parts) return;
        var lowerGeo = applyExportScaleAndSiding(parts.lower, globals.doublesidedOBJ);
        var upperGeo = applyExportScaleAndSiding(parts.upper, globals.doublesidedOBJ);
        if (!lowerGeo || !upperGeo) return;

        var lowerMesh = new THREE.Mesh(lowerGeo);
        lowerMesh.name = "snap_lower_with_pins";
        var upperMesh = new THREE.Mesh(upperGeo);
        upperMesh.name = "snap_upper_with_holes";

        lowerMesh.updateMatrixWorld(true);
        upperMesh.updateMatrixWorld(true);
        var lowerResult = exporter.parse(lowerMesh);
        var upperResult = exporter.parse(upperMesh);
        if (!lowerResult || !upperResult) return;

        var filename = $("#objFilename").val();
        if (filename == "") filename = globals.filename;
        saveAs(new Blob([lowerResult], {type: 'application/octet-binary'}), filename + "_lower_with_pins.obj");
        saveAs(new Blob([upperResult], {type: 'application/octet-binary'}), filename + "_upper_with_holes.obj");
        return;
    }

    var geo = makeSaveGEO(globals.doublesidedOBJ);
    if (!geo) return;
    var result = exporter.parse(new THREE.Mesh(geo));
    if (!result) return;
    var blob = new Blob([result], {type: 'application/octet-binary'});
    var filename = $("#objFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".obj");
}
