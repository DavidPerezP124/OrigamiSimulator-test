/**
 * Created by amandaghassaei on 2/24/17.
 */

//model updates object3d geometry and materials

function initModel(globals){

    var material, material2, geometry;
    var frontside = new THREE.Mesh();//front face of mesh
    var backside = new THREE.Mesh();//back face of mesh (different color)
    backside.visible = false;

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

    //extruded view of the folded surface for thickness simulation
    var thicknessMaterial = new THREE.MeshPhongMaterial({
        flatShading: true,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 0.5,
        polygonOffsetUnits: 1
    });
    var thicknessMesh = new THREE.Mesh(new THREE.BufferGeometry(), thicknessMaterial);
    thicknessMesh.visible = false;
    thicknessMesh.frustumCulled = false;//geometry updates every frame, skip bounding sphere upkeep
    var thickPositions = null;//top vertices followed by bottom vertices
    var thickFaceNormals = null;//scratch arrays for the per-frame offset calc
    var thickVertexNormals = null;
    var thickMiterDots = null;
    var thickMiterCounts = null;

    clearGeometries();
    setMeshMaterial();

    function clearGeometries(){

        if (geometry) {
            frontside.geometry = null;
            backside.geometry = null;
            geometry.dispose();
        }

        geometry = new THREE.BufferGeometry();
        frontside.geometry = geometry;
        backside.geometry = geometry;
        // geometry.verticesNeedUpdate = true;
        geometry.dynamic = true;

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
    globals.threeView.sceneAddModel(thicknessMesh);
    _.each(lines, function(line){
        globals.threeView.sceneAddModel(line);
    });

    var positions;//place to store buffer geo vertex data
    var colors;//place to store buffer geo vertex colors
    var indices;
    var nodes = [];
    var faces = [];
    var edges = [];
    var creases = [];
    var vertices = [];//indexed vertices array
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
        } else if (globals.colorMode == "axialStrain"){
            material = new THREE.MeshBasicMaterial({
                vertexColors: THREE.VertexColors, side:THREE.DoubleSide,
                polygonOffset: true,
                polygonOffsetFactor: polygonOffset, // positive value pushes polygon further away
                polygonOffsetUnits: 1
            });
            backside.visible = false;
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
        }
        frontside.material = material;
        backside.material = material2;
        thicknessMaterial.color.setStyle("#" + globals.color1);
        updateMeshVisibility();
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
        //the thick view replaces the zero-thickness surface, except in strain/normal
        //color modes which rely on the flat mesh's vertex colors
        var showThickness = globals.simulateThickness && globals.colorMode == "color" && globals.meshVisible;
        frontside.visible = globals.meshVisible && !showThickness;
        backside.visible = globals.colorMode == "color" && globals.meshVisible && !showThickness;
        thicknessMesh.visible = showThickness;
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
        if (thicknessMesh.visible) updateThicknessGeometry();
    }

    //builds the extruded mesh topology: top and bottom copies of every face plus side
    //walls along boundary edges; vertex positions are filled in by updateThicknessGeometry
    function buildThicknessGeometry(){
        var numVertices = vertices.length;
        var numFaces = faces.length;

        //boundary edges belong to exactly one face
        var edgeCounts = {};
        for (var i=0;i<numFaces;i++){
            var face = faces[i];
            for (var j=0;j<3;j++){
                var a = face[j];
                var b = face[(j+1)%3];
                var key = Math.min(a, b) + "_" + Math.max(a, b);
                if (edgeCounts[key] === undefined) edgeCounts[key] = {a: a, b: b, count: 1};
                else edgeCounts[key].count++;
            }
        }
        var boundaryEdges = [];
        _.each(edgeCounts, function(edge){
            if (edge.count == 1) boundaryEdges.push(edge);
        });

        thickPositions = new Float32Array(numVertices*2*3);
        thickFaceNormals = new Float32Array(numFaces*3);
        thickVertexNormals = new Float32Array(numVertices*3);
        thickMiterDots = new Float32Array(numVertices);
        thickMiterCounts = new Float32Array(numVertices);
        var IndexArrayType = numVertices*2 > 65535 ? Uint32Array : Uint16Array;
        var thickIndices = new IndexArrayType((numFaces*2 + boundaryEdges.length*2)*3);
        var index = 0;
        for (var i=0;i<numFaces;i++){//top
            thickIndices[index++] = faces[i][0];
            thickIndices[index++] = faces[i][1];
            thickIndices[index++] = faces[i][2];
        }
        for (var i=0;i<numFaces;i++){//bottom, reversed winding
            thickIndices[index++] = faces[i][0] + numVertices;
            thickIndices[index++] = faces[i][2] + numVertices;
            thickIndices[index++] = faces[i][1] + numVertices;
        }
        for (var i=0;i<boundaryEdges.length;i++){//side walls
            var a = boundaryEdges[i].a;
            var b = boundaryEdges[i].b;
            thickIndices[index++] = a;
            thickIndices[index++] = a + numVertices;
            thickIndices[index++] = b + numVertices;
            thickIndices[index++] = a;
            thickIndices[index++] = b + numVertices;
            thickIndices[index++] = b;
        }

        var thickGeometry = new THREE.BufferGeometry();
        thickGeometry.dynamic = true;
        thickGeometry.addAttribute('position', new THREE.BufferAttribute(thickPositions, 3));
        thickGeometry.setIndex(new THREE.BufferAttribute(thickIndices, 1));
        var oldGeometry = thicknessMesh.geometry;
        thicknessMesh.geometry = thickGeometry;
        if (oldGeometry) oldGeometry.dispose();
    }

    //offsets the current folded surface by +/- thickness/2 along angle-weighted vertex
    //normals (same construction as the STL thickening export, but updated every frame)
    function updateThicknessGeometry(){
        if (!thickPositions || !positions) return;
        var numVertices = vertices.length;
        var numFaces = faces.length;
        var thickness = globals.materialThickness*globals.scale;//pattern units -> render units

        var faceNormals = thickFaceNormals;
        var vertexNormals = thickVertexNormals;
        var miterDots = thickMiterDots;
        var miterCounts = thickMiterCounts;
        faceNormals.fill(0);
        vertexNormals.fill(0);
        miterDots.fill(0);
        miterCounts.fill(0);

        function cornerAngle(o, p1, p2){
            var v1x = positions[3*p1]-positions[3*o], v1y = positions[3*p1+1]-positions[3*o+1], v1z = positions[3*p1+2]-positions[3*o+2];
            var v2x = positions[3*p2]-positions[3*o], v2y = positions[3*p2+1]-positions[3*o+1], v2z = positions[3*p2+2]-positions[3*o+2];
            var l1 = Math.sqrt(v1x*v1x+v1y*v1y+v1z*v1z);
            var l2 = Math.sqrt(v2x*v2x+v2y*v2y+v2z*v2z);
            if (l1 == 0 || l2 == 0) return 0;
            var cosAngle = (v1x*v2x+v1y*v2y+v1z*v2z)/(l1*l2);
            if (cosAngle > 1) cosAngle = 1;
            else if (cosAngle < -1) cosAngle = -1;
            return Math.acos(cosAngle);
        }

        for (var i=0;i<numFaces;i++){
            var a = faces[i][0], b = faces[i][1], c = faces[i][2];
            var abx = positions[3*b]-positions[3*a], aby = positions[3*b+1]-positions[3*a+1], abz = positions[3*b+2]-positions[3*a+2];
            var acx = positions[3*c]-positions[3*a], acy = positions[3*c+1]-positions[3*a+1], acz = positions[3*c+2]-positions[3*a+2];
            var nx = aby*acz-abz*acy, ny = abz*acx-abx*acz, nz = abx*acy-aby*acx;
            var length = Math.sqrt(nx*nx+ny*ny+nz*nz);
            if (length > 0){
                nx /= length;
                ny /= length;
                nz /= length;
            }
            faceNormals[3*i] = nx;
            faceNormals[3*i+1] = ny;
            faceNormals[3*i+2] = nz;
            var corners = [a, b, c];
            var angles = [cornerAngle(a, b, c), cornerAngle(b, c, a), cornerAngle(c, a, b)];
            for (var j=0;j<3;j++){
                vertexNormals[3*corners[j]] += nx*angles[j];
                vertexNormals[3*corners[j]+1] += ny*angles[j];
                vertexNormals[3*corners[j]+2] += nz*angles[j];
            }
        }
        for (var i=0;i<numVertices;i++){
            var length = Math.sqrt(vertexNormals[3*i]*vertexNormals[3*i] + vertexNormals[3*i+1]*vertexNormals[3*i+1] + vertexNormals[3*i+2]*vertexNormals[3*i+2]);
            if (length > 0){
                vertexNormals[3*i] /= length;
                vertexNormals[3*i+1] /= length;
                vertexNormals[3*i+2] /= length;
            }
        }
        //miter compensation: at a crease the vertex normal bisects the fold, divide out
        //the cosine of the half fold angle so the walls keep their thickness (clamped 2x)
        for (var i=0;i<numFaces;i++){
            for (var j=0;j<3;j++){
                var v = faces[i][j];
                miterDots[v] += vertexNormals[3*v]*faceNormals[3*i] + vertexNormals[3*v+1]*faceNormals[3*i+1] + vertexNormals[3*v+2]*faceNormals[3*i+2];
                miterCounts[v]++;
            }
        }
        for (var i=0;i<numVertices;i++){
            var miter = miterCounts[i] > 0 ? miterDots[i]/miterCounts[i] : 1;
            if (miter < 0.5) miter = 0.5;
            var scale = thickness/(2*miter);
            var offsetX = vertexNormals[3*i]*scale, offsetY = vertexNormals[3*i+1]*scale, offsetZ = vertexNormals[3*i+2]*scale;
            thickPositions[3*i] = positions[3*i] + offsetX;
            thickPositions[3*i+1] = positions[3*i+1] + offsetY;
            thickPositions[3*i+2] = positions[3*i+2] + offsetZ;
            thickPositions[3*(i+numVertices)] = positions[3*i] - offsetX;
            thickPositions[3*(i+numVertices)+1] = positions[3*i+1] - offsetY;
            thickPositions[3*(i+numVertices)+2] = positions[3*i+2] - offsetZ;
        }

        thicknessMesh.geometry.attributes.position.needsUpdate = true;
        thicknessMesh.geometry.computeVertexNormals();
        thicknessMesh.geometry.attributes.normal.needsUpdate = true;
    }

    function updateThicknessView(){
        updateMeshVisibility();
        if (thicknessMesh.visible) updateThicknessGeometry();
    }

    function startSolver(){
        globals.threeView.startAnimation();
    }

    function getSolver(){
        if (globals.simType == "dynamic") return globals.dynamicSolver;
        else if (globals.simType == "static") return globals.staticSolver;
        return globals.rigidSolver;
    }




    function buildModel(fold, creaseParams){

        if (fold.vertices_coords.length == 0) {
            globals.warn("No geometry found.");
            return;
        }
        if (fold.faces_vertices.length == 0) {
            globals.warn("No faces found, try adjusting import vertex merge tolerance.");
            return;
        }
        if (fold.edges_vertices.length == 0) {
            globals.warn("No edges found.");
            return;
        }

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

        //estimate how many material layers each hinge spans in the flat-folded state,
        //used to limit fold angles when thickness simulation is on
        if (globals.thickness) globals.thickness.assignLayerGaps(creases, faces.length);

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

        buildThicknessGeometry();

        updateEdgeVisibility();
        updateMeshVisibility();
        if (thicknessMesh.visible) updateThicknessGeometry();

        syncSolver();

        globals.needsSync = false;
        if (!globals.simulationRunning) reset();
    }

    function syncSolver(){
        getSolver().syncNodesAndEdges();
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
        updateThicknessView: updateThicknessView,

        getDimensions: getDimensions//for save stl
    }
}