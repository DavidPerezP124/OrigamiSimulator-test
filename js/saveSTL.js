/**
 * Created by amandaghassaei on 5/2/17.
 */

//offsets the folded surface by +/- thickness/2 along angle-weighted vertex normals,
//mirrors the faces for the underside, and closes the boundary with side walls so the
//result is a watertight solid suitable for 3d printing
function thickenGeo(geo, thickness){

    var numVertices = geo.vertices.length;
    var numFaces = geo.faces.length;

    geo.computeFaceNormals();

    function angleAtVertex(vertex, prev, next){
        var v1 = prev.clone().sub(vertex);
        var v2 = next.clone().sub(vertex);
        if (v1.lengthSq() === 0 || v2.lengthSq() === 0) return 0;//degenerate face
        var cosAngle = v1.normalize().dot(v2.normalize());
        //clamp to [-1,1], rounding error can push the dot product slightly out of acos' domain
        if (cosAngle > 1) cosAngle = 1;
        else if (cosAngle < -1) cosAngle = -1;
        return Math.acos(cosAngle);
    }

    //angle-weighted pseudo vertex normals
    var vertexNormals = [];
    for (var i=0;i<numVertices;i++){
        vertexNormals.push(new THREE.Vector3());
    }
    for (var i=0;i<numFaces;i++){
        var face = geo.faces[i];
        var a = geo.vertices[face.a];
        var b = geo.vertices[face.b];
        var c = geo.vertices[face.c];
        vertexNormals[face.a].add(face.normal.clone().multiplyScalar(angleAtVertex(a, b, c)));
        vertexNormals[face.b].add(face.normal.clone().multiplyScalar(angleAtVertex(b, c, a)));
        vertexNormals[face.c].add(face.normal.clone().multiplyScalar(angleAtVertex(c, a, b)));
    }

    for (var i=0;i<numVertices;i++){
        var normal = vertexNormals[i];
        if (normal.lengthSq() > 0) normal.normalize();
    }

    //miter compensation: at a crease the vertex normal bisects the fold, so offsetting by
    //thickness/2 along it thins the walls by the cosine of the half fold angle - divide it back out,
    //clamped to 2x so nearly fully-folded creases don't send the offset to infinity
    var miterDots = [];
    var miterCounts = [];
    for (var i=0;i<numVertices;i++){
        miterDots.push(0);
        miterCounts.push(0);
    }
    for (var i=0;i<numFaces;i++){
        var face = geo.faces[i];
        var faceVertices = [face.a, face.b, face.c];
        for (var j=0;j<3;j++){
            miterDots[faceVertices[j]] += vertexNormals[faceVertices[j]].dot(face.normal);
            miterCounts[faceVertices[j]]++;
        }
    }

    //offset each vertex by +/- thickness/2, bottom copies are appended after the originals
    for (var i=0;i<numVertices;i++){
        var miter = miterCounts[i] > 0 ? miterDots[i]/miterCounts[i] : 1;
        if (miter < 0.5) miter = 0.5;
        var offset = vertexNormals[i].multiplyScalar(thickness/(2*miter));
        geo.vertices.push(geo.vertices[i].clone().sub(offset));
        geo.vertices[i].add(offset);
    }

    //mirror the faces for the underside, reversed winding so normals point down
    for (var i=0;i<numFaces;i++){
        var face = geo.faces[i];
        geo.faces.push(new THREE.Face3(face.a + numVertices, face.c + numVertices, face.b + numVertices));
    }

    //boundary edges belong to exactly one face - wall them off to close the solid
    var edges = {};
    for (var i=0;i<numFaces;i++){
        var face = geo.faces[i];
        var faceEdges = [[face.a, face.b], [face.b, face.c], [face.c, face.a]];
        for (var j=0;j<3;j++){
            var edge = faceEdges[j];
            var key = Math.min(edge[0], edge[1]) + "_" + Math.max(edge[0], edge[1]);
            if (edges[key] === undefined) edges[key] = {a: edge[0], b: edge[1], count: 1};
            else edges[key].count++;
        }
    }
    _.each(edges, function(edge){
        if (edge.count != 1) return;
        //the directed edge (a,b) comes from a top face, this winding points the walls outward
        geo.faces.push(new THREE.Face3(edge.a, edge.a + numVertices, edge.b + numVertices));
        geo.faces.push(new THREE.Face3(edge.a, edge.b + numVertices, edge.b));
    });
}

function makeSaveGEO(doublesided){
    //when thickness simulation is on (and no explicit thickening is requested), export the
    //same per-face slab solids shown on screen, so the file keeps the full simulated
    //thickness at any fold angle instead of the miter-capped offset surface
    var useSimulatedThickness = globals.simulateThickness && globals.materialThickness > 0 &&
        !(globals.thickenModel && globals.thickenOffset > 0);
    var bufferGeo = useSimulatedThickness ? globals.model.getThicknessGeometry() : globals.model.getGeometry();
    var geo = new THREE.Geometry().fromBufferGeometry( bufferGeo );

    if (geo.vertices.length == 0 || geo.faces.length == 0) {
        globals.warn("No geometry to save.");
        return;
    }

    for (var i=0;i<geo.vertices.length;i++){
        geo.vertices[i].multiplyScalar(globals.exportScale/globals.scale);
    }

    if (globals.thickenModel && globals.thickenOffset > 0){
        //thickness is applied after export scaling, so thickenOffset is in exported units
        //the thickened solid is already closed and two-sided, so doublesided is ignored
        thickenGeo(geo, globals.thickenOffset);
    } else if (useSimulatedThickness){
        //already a set of closed slab solids, nothing to add
    } else if (doublesided){
        var numFaces = geo.faces.length;
        for (var i=0;i<numFaces;i++){
            var face = geo.faces[i];
            geo.faces.push(new THREE.Face3(face.a, face.c, face.b));
        }
    }

    geo.computeFaceNormals();//facet normals are written to the binary STL

    return geo;
}

function saveSTL(){

    var data = [];
    data.push({geo: makeSaveGEO(globals.doublesidedSTL), offset:new THREE.Vector3(0,0,0), orientation:new THREE.Quaternion(0,0,0,1)});
    var stlBin = geometryToSTLBin(data);
    if (!stlBin) return;
    var blob = new Blob([stlBin], {type: 'application/octet-binary'});
    var filename = $("#stlFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".stl");
}

function saveOBJ(){
    //custom export to be compatible with freeform origami
    var geo = new THREE.Geometry().fromBufferGeometry( globals.model.getGeometry() );

    if (geo.vertices.length == 0 || geo.faces.length == 0) {
        globals.warn("No geometry to save.");
        return;
    }

    for (var i=0;i<geo.vertices.length;i++){
        geo.vertices[i].multiplyScalar(globals.exportScale/globals.scale);
    }

    if (!globals.includeCurves) {
        var fold = globals.pattern.getFoldData(false);
    } else {
        var fold = globals.curvedFolding.getFoldData(false);
    }
    var obj = "#output from https://origamisimulator.org/\n";
    obj += "# " + geo.vertices.length + " vertices\n";
    for (var i=0;i<geo.vertices.length;i++){
        var vertex = geo.vertices[i];
        obj += "v " + vertex.x + " " + vertex.y + " " + vertex.z + "\n"
    }
    obj += "# uv texture coords\n";
    // first get bounds for normalization
    var min = [Infinity, Infinity];
    var max = [-Infinity, -Infinity];
    for (var i=0;i<fold.vertices_coords.length;i++){
        var vertex = fold.vertices_coords[i];
        if (vertex[0] < min[0]) min[0] = vertex[0];
        if (vertex[2] < min[1]) min[1] = vertex[2];
        if (vertex[0] > max[0]) max[0] = vertex[0];
        if (vertex[2] > max[1]) max[1] = vertex[2];
    }
    var scale = max[0] - min[0];
    if (max[1] - min[1] > scale) scale = max[1] - min[1];
    for (var i=0;i<fold.vertices_coords.length;i++){
        var vertex = fold.vertices_coords[i];
        obj += "vt " + (vertex[0] - min[0]) / scale + " " + (vertex[2] - min[1]) / scale + "\n"
    }
    obj += "# "+ fold.faces_vertices.length + " faces\n";
    for (var i=0;i<fold.faces_vertices.length;i++){
        var face = fold.faces_vertices[i];//triangular faces
        obj += "f " + (face[0]+1) + "/" + (face[0]+1) + " " + (face[1]+1) + "/" + (face[1]+1)+ " " +
         (face[2]+1) + "/" + (face[2]+1) + "\n"
    }

    obj += "# "+ fold.edges_vertices.length + " edges\n";
    for (var i=0;i<fold.edges_vertices.length;i++){
        var edge = fold.edges_vertices[i];//triangular faces
        obj += "#e " + (edge[0]+1) + " " + (edge[1]+1) + " ";
        if (fold.edges_assignment[i] == "F") obj += 1;
        else if (fold.edges_assignment[i] == "B") obj += 0;
        else if (fold.edges_assignment[i] == "M") obj += 3;
        else if (fold.edges_assignment[i] == "V") obj += 2;
        else {
            console.log("don't know how to convert type " + fold.edges_assignment[i]);
            obj += 0;
        }
        //todo fold angle
        obj += " 0\n";
    }

    var blob = new Blob([obj], {type: 'application/octet-binary'});
    var filename = $("#objFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".obj");
}
