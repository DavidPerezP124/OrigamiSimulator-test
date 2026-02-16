/**
 * Created by amandaghassaei on 5/2/17.
 */

function makeSaveGEO(doublesided){
    var sourceGeo = globals.model.getGeometry();
    if (globals.simType == "thick") {
        var thickGeo = globals.model.buildThickExportGeometry
            ? globals.model.buildThickExportGeometry()
            : (globals.model.getThickGeometry && globals.model.getThickGeometry());
        if (thickGeo) sourceGeo = thickGeo;
    }

    var geo = sourceGeo.clone();
    if (geo.index) geo = geo.toNonIndexed();

    var pos = geo.attributes.position;
    if (!pos || pos.count == 0) {
        globals.warn("No geometry to save.");
        return;
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


    // if (globals.thickenModel){
    //     var numVertices = geo.vertices.length;
    //     geo.computeVertexNormals();
    //     geo.computeFaceNormals();
    //     for (var i=0;i<numVertices;i++){
    //         var face;
    //         var vertexNormal = new THREE.Vector3();
    //         var lastFaceIndex = 0;
    //         for (var j=0;j<geo.faces.length;j++){
    //             face = geo.faces[j];
    //             if (face.a == i) {
    //                 var a = geo.vertices[face.a];
    //                 var b = geo.vertices[face.b];
    //                 var c = geo.vertices[face.c];
    //                 var  weight = Math.abs(Math.acos( (b.clone().sub(a)).normalize().dot( (c.clone().sub(a)).normalize() ) ));
    //                 vertexNormal.add(face.normal.clone().multiplyScalar(weight));
    //                 lastFaceIndex = j;
    //             } else if (face.b == i) {
    //                 var a = geo.vertices[face.a];
    //                 var b = geo.vertices[face.b];
    //                 var c = geo.vertices[face.c];
    //                 var  weight = Math.abs(Math.acos( (c.clone().sub(b)).normalize().dot( (a.clone().sub(b)).normalize() ) ));
    //                 vertexNormal.add(face.normal.clone().multiplyScalar(weight));
    //                 lastFaceIndex = j;
    //             } else if (face.c == i) {
    //                 var a = geo.vertices[face.a];
    //                 var b = geo.vertices[face.b];
    //                 var c = geo.vertices[face.c];
    //                 var  weight = Math.abs(Math.acos( (b.clone().sub(c)).normalize().dot( (a.clone().sub(c)).normalize() ) ));
    //                 vertexNormal.add(face.normal.clone().multiplyScalar(weight));
    //                 lastFaceIndex = j;
    //             }
    //             // if (vertexNormal !== null) break;
    //         }
    //         // if (vertexNormal === undefined) {
    //         //     geo.vertices.push(new THREE.Vector3());
    //         //     continue;
    //         // }
    //         //filter out duplicate normals
    //         vertexNormal.normalize();
    //         console.log(vertexNormal);
    //         var offset = vertexNormal.clone().multiplyScalar(5);//globals.thickenOffset/(2*vertexNormal.clone().dot(geo.faces[lastFaceIndex].normal)));
    //
    //         geo.vertices.push(geo.vertices[i].clone().sub(offset));
    //         geo.vertices[i].add(offset);
    //     }
    //     var numFaces = geo.faces.length;
    //     for (var i=0;i<numFaces;i++){
    //         var face = geo.faces[i].clone();
    //         face.a += numVertices;
    //         face.b += numVertices;
    //         face.c += numVertices;
    //         var b = face.b;
    //         face.b = face.c;
    //         face.c = b;
    //         geo.faces.push(face);
    //     }
    //     geo.computeVertexNormals();
    //     geo.computeFaceNormals();



    return geo;
}

function saveSTL(){

    if (globals.simType == "thick" && globals.model.ensureThickGeometry) {
        globals.model.ensureThickGeometry();
        if (globals.model.updateThickPanelGeometry) globals.model.updateThickPanelGeometry();
    }

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
    if (!globals.includeCurves) {
        var flatGeo = globals.pattern.getFoldData(false);
    } else {
        var flatGeo = globals.curvedFolding.getFoldData(false);
    }

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
    obj += "# "+ geo.vertices.length + "vertices\n";
    for (var i=0;i<geo.vertices.length;i++){
        var vertex = geo.vertices[i];
        obj += "v " + vertex.x + " " + vertex.y + " " + vertex.z + "\n"
    }
    obj += "# uv texture coords\n";
    // first get bounds for normalization
    var min = [Infinity, Infinity];
    var max = [-Infinity, -Infinity];
    for (var i=0;i<flatGeo.vertices_coords.length;i++){
        var vertex = flatGeo.vertices_coords[i];
        if (vertex[0] < min[0]) min[0] = vertex[0];
        if (vertex[2] < min[1]) min[1] = vertex[2];
        if (vertex[0] > max[0]) max[0] = vertex[0];
        if (vertex[2] > max[1]) max[1] = vertex[2];
    }
    var scale = max[0] - min[0];
    if (max[1] - min[1] > scale) scale = max[1] - min[1];
    for (var i=0;i<flatGeo.vertices_coords.length;i++){
        var vertex = flatGeo.vertices_coords[i];
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

    // var exporter = new THREE.OBJExporter();
    // var result = exporter.parse (new THREE.Mesh(makeSaveGEO(globals.doublesidedOBJ)));
    // if (!result) return;
    var blob = new Blob([obj], {type: 'application/octet-binary'});
    var filename = $("#objFilename").val();
    if (filename == "") filename = globals.filename;
    saveAs(blob, filename + ".obj");
}
