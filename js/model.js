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

    //extruded view of the folded surface for thickness simulation - every triangle is
    //rendered as an independent rigid slab (per-face extrusion along the face normal), so
    //plates keep square edges and their full thickness at any fold angle, with no miter
    //thinning at sharp creases; tops are color1, undersides color2 via vertex colors
    var thicknessMaterial = new THREE.MeshPhongMaterial({
        flatShading: true,
        vertexColors: THREE.VertexColors,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 0.5,
        polygonOffsetUnits: 1
    });
    var thicknessMesh = new THREE.Mesh(new THREE.BufferGeometry(), thicknessMaterial);
    thicknessMesh.visible = false;
    thicknessMesh.frustumCulled = false;//geometry updates every frame, skip bounding sphere upkeep
    var thickPositions = null;//per face: 3 top vertices then 3 bottom vertices
    var thickColors = null;
    var slabNormals = null;//scratch: unit face normals, recomputed every frame
    var slabNeighbors = null;//per face edge slot: neighbor face index across a hinge, or -1
    var slabMaxShift = null;//per face edge slot: cap on the miter trim so slabs cannot invert
    //invisible but raycastable stand-in material for the flat mesh while the thick view is
    //shown, so node picking/dragging (3dUI, VRInterface) keeps working on the midsurface
    var raycastProxyMaterial = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        side: THREE.DoubleSide
    });

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
        updateThicknessColors();
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
        thicknessMesh.visible = showThickness;
        if (showThickness){
            //keep the flat mesh visible but non-rendering: the raycaster skips invisible
            //objects, and node picking/dragging raycasts against getMesh()
            frontside.material = raycastProxyMaterial;
            frontside.visible = true;
            backside.visible = false;
        } else {
            frontside.material = material;
            frontside.visible = globals.meshVisible;
            backside.visible = globals.colorMode == "color" && globals.meshVisible;
        }
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

    //builds the slab mesh topology: for each face, 3 top vertices, 3 bottom vertices,
    //a top and bottom triangle and 3 side walls; positions are filled in every frame by
    //updateThicknessGeometry, colors are static per topology
    function buildThicknessGeometry(){
        var numFaces = faces.length;
        var numSlabVertices = numFaces*6;

        thickPositions = new Float32Array(numSlabVertices*3);
        thickColors = new Float32Array(numSlabVertices*3);
        slabNormals = new Float32Array(numFaces*3);

        //map each face's edge slots to the neighboring face across a hinge, so slab edges
        //can be trimmed to the dihedral bisector plane (mitered joints instead of two
        //square slabs interpenetrating in a wedge along the crease line)
        slabNeighbors = new Int32Array(numFaces*3).fill(-1);
        slabMaxShift = new Float32Array(numFaces*3);
        for (var i=0;i<creases.length;i++){
            var crease = creases[i];
            if (crease.type == 0) continue;//facet creases stay coplanar, no miter needed
            var n1 = crease.edge.nodes[0].getIndex();
            var n2 = crease.edge.nodes[1].getIndex();
            var creaseFaces = [crease.face1Index, crease.face2Index];
            for (var s=0;s<2;s++){
                var face = faces[creaseFaces[s]];
                for (var j=0;j<3;j++){
                    var a = face[j];
                    var b = face[(j+1)%3];
                    if ((a == n1 && b == n2) || (a == n2 && b == n1)){
                        slabNeighbors[creaseFaces[s]*3+j] = creaseFaces[1-s];
                    }
                }
            }
        }
        //trim cap: a fraction of the opposite corner's altitude over each edge
        for (var i=0;i<numFaces;i++){
            for (var j=0;j<3;j++){
                if (slabNeighbors[3*i+j] < 0) continue;
                var pa = vertices[faces[i][j]];
                var pb = vertices[faces[i][(j+1)%3]];
                var pc = vertices[faces[i][(j+2)%3]];
                var edge = pb.clone().sub(pa);
                var edgeLength = edge.length();
                if (edgeLength == 0) continue;
                var toOpposite = pc.clone().sub(pa);
                var proj = toOpposite.dot(edge)/edgeLength;
                var altitudeSq = toOpposite.lengthSq()-proj*proj;
                slabMaxShift[3*i+j] = 0.45*Math.sqrt(altitudeSq > 0 ? altitudeSq : 0);
            }
        }

        var IndexArrayType = numSlabVertices > 65535 ? Uint32Array : Uint16Array;
        var thickIndices = new IndexArrayType(numFaces*8*3);//top + bottom + 3 walls of 2 triangles each
        var index = 0;
        for (var i=0;i<numFaces;i++){
            var top = 6*i;
            var bottom = 6*i+3;
            thickIndices[index++] = top;
            thickIndices[index++] = top+1;
            thickIndices[index++] = top+2;
            thickIndices[index++] = bottom;//reversed winding so the underside faces out
            thickIndices[index++] = bottom+2;
            thickIndices[index++] = bottom+1;
            for (var j=0;j<3;j++){//outward-facing side walls
                var k = (j+1)%3;
                thickIndices[index++] = top+j;
                thickIndices[index++] = bottom+j;
                thickIndices[index++] = bottom+k;
                thickIndices[index++] = top+j;
                thickIndices[index++] = bottom+k;
                thickIndices[index++] = top+k;
            }
        }

        var thickGeometry = new THREE.BufferGeometry();
        thickGeometry.dynamic = true;
        thickGeometry.addAttribute('position', new THREE.BufferAttribute(thickPositions, 3));
        thickGeometry.addAttribute('color', new THREE.BufferAttribute(thickColors, 3));
        thickGeometry.setIndex(new THREE.BufferAttribute(thickIndices, 1));
        var oldGeometry = thicknessMesh.geometry;
        thicknessMesh.geometry = thickGeometry;
        if (oldGeometry) oldGeometry.dispose();
        updateThicknessColors();
    }

    function updateThicknessColors(){
        if (!thickColors) return;
        var color1 = new THREE.Color("#" + globals.color1);
        var color2 = new THREE.Color("#" + globals.color2);
        for (var i=0;i<thickColors.length/3;i+=6){
            for (var j=0;j<3;j++){//plate tops get the front color, undersides the back color
                thickColors[3*(i+j)] = color1.r;
                thickColors[3*(i+j)+1] = color1.g;
                thickColors[3*(i+j)+2] = color1.b;
                thickColors[3*(i+j+3)] = color2.r;
                thickColors[3*(i+j+3)+1] = color2.g;
                thickColors[3*(i+j+3)+2] = color2.b;
            }
        }
        if (thicknessMesh.geometry.attributes.color) thicknessMesh.geometry.attributes.color.needsUpdate = true;
    }

    //extrudes each face of the current folded surface into a rigid slab: the face's three
    //vertices are offset +/- thickness/2 along the face normal, giving plates with square
    //edges that keep their full thickness at any fold angle (no miter thinning)
    function updateThicknessGeometry(){
        if (!thickPositions || !positions) return;
        var numFaces = faces.length;
        var halfThickness = 0.5*globals.materialThickness*globals.scale;//pattern units -> render units

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
            slabNormals[3*i] = nx;
            slabNormals[3*i+1] = ny;
            slabNormals[3*i+2] = nz;
            var corners = [a, b, c];
            for (var j=0;j<3;j++){
                var v = corners[j];
                var top = 3*(6*i+j);
                var bottom = 3*(6*i+j+3);
                thickPositions[top] = positions[3*v] + nx*halfThickness;
                thickPositions[top+1] = positions[3*v+1] + ny*halfThickness;
                thickPositions[top+2] = positions[3*v+2] + nz*halfThickness;
                thickPositions[bottom] = positions[3*v] - nx*halfThickness;
                thickPositions[bottom+1] = positions[3*v+1] - ny*halfThickness;
                thickPositions[bottom+2] = positions[3*v+2] - nz*halfThickness;
            }
        }

        //miter the slab edges at hinges: trim each slab to the bisector plane of the
        //dihedral (volume trimming), so folded plates form clean mitered joints instead of
        //overlapping in a wedge along the crease line
        for (var i=0;i<numFaces;i++){
            var n1x = slabNormals[3*i], n1y = slabNormals[3*i+1], n1z = slabNormals[3*i+2];
            for (var j=0;j<3;j++){
                var neighbor = slabNeighbors[3*i+j];
                if (neighbor < 0) continue;
                var k = (j+1)%3;
                var va = faces[i][j], vb = faces[i][k];
                var ex = positions[3*vb]-positions[3*va], ey = positions[3*vb+1]-positions[3*va+1], ez = positions[3*vb+2]-positions[3*va+2];
                var edgeLength = Math.sqrt(ex*ex+ey*ey+ez*ez);
                if (edgeLength == 0) continue;
                ex /= edgeLength;
                ey /= edgeLength;
                ez /= edgeLength;
                //in-plane directions from the hinge into each plate: u1 = n1 x e, u2 = e x n2
                //(the neighbor traverses this edge in the opposite direction)
                var u1x = n1y*ez-n1z*ey, u1y = n1z*ex-n1x*ez, u1z = n1x*ey-n1y*ex;
                var n2x = slabNormals[3*neighbor], n2y = slabNormals[3*neighbor+1], n2z = slabNormals[3*neighbor+2];
                var u2x = ey*n2z-ez*n2y, u2y = ez*n2x-ex*n2z, u2z = ex*n2y-ey*n2x;
                var dx = u1x+u2x, dy = u1y+u2y, dz = u1z+u2z;//bisector direction of the joint
                if (dx*dx+dy*dy+dz*dz < 0.000001) continue;//flat, nothing to trim
                //normal of the bisector plane (contains the hinge line and d)
                var bx = ey*dz-ez*dy, by = ez*dx-ex*dz, bz = ex*dy-ey*dx;
                var bLength = Math.sqrt(bx*bx+by*by+bz*bz);
                if (bLength == 0) continue;
                bx /= bLength;
                by /= bLength;
                bz /= bLength;
                var denom = u1x*bx+u1y*by+u1z*bz;
                if (Math.abs(denom) < 0.000001) continue;//nearly flat-folded, trim would diverge
                //where the offset surfaces meet the bisector plane, measured along u1
                var shift = -halfThickness*(n1x*bx+n1y*by+n1z*bz)/denom;
                //miter limit: near-flat folds would extend the outer corner without bound,
                //so cap the shift (bevel) - like an svg stroke miterlimit
                var maxShift = Math.min(slabMaxShift[3*i+j], 3*halfThickness);
                if (shift > maxShift) shift = maxShift;
                else if (shift < -maxShift) shift = -maxShift;
                var sx = u1x*shift, sy = u1y*shift, sz = u1z*shift;
                var slots = [6*i+j, 6*i+k];//this edge's two slab corners
                for (var s=0;s<2;s++){
                    var top = 3*slots[s];
                    var bottom = 3*(slots[s]+3);
                    thickPositions[top] += sx;
                    thickPositions[top+1] += sy;
                    thickPositions[top+2] += sz;
                    thickPositions[bottom] -= sx;
                    thickPositions[bottom+1] -= sy;
                    thickPositions[bottom+2] -= sz;
                }
            }
        }

        thicknessMesh.geometry.attributes.position.needsUpdate = true;
        thicknessMesh.geometry.computeVertexNormals();
        thicknessMesh.geometry.attributes.normal.needsUpdate = true;
    }

    function updateThicknessView(){
        updateMeshVisibility();
        if (thicknessMesh.visible) updateThicknessGeometry();
    }

    //for exports: the per-face slab geometry matching the on-screen thick view,
    //refreshed from the current fold state even if the thick view is hidden
    function getThicknessGeometry(){
        updateThicknessGeometry();
        return thicknessMesh.geometry;
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

        //estimate how many material layers each hinge spans in the flat-folded state and
        //each hinge's panel depth, used to limit fold angles when thickness simulation is on
        if (globals.thickness) globals.thickness.assignLayerGaps(creases, faces, nodes);

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
        getThicknessGeometry: getThicknessGeometry,//for save stl with thickness simulation on
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