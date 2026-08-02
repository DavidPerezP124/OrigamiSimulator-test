/**
 * Created by amandaghassaei on 5/5/17.
 */


function init3DUI(globals) {

    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var raycasterPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1));
    var isDragging = false;
    var draggingNode = null;
    var draggingNodeFixed = false;
    var mouseDown = false;
    var highlightedObj;

    var highlighter1 = new Node(new THREE.Vector3());
    highlighter1.setTransparent();
    globals.threeView.scene.add(highlighter1.getObject3D());

    $(document).dblclick(function() {
    });

    document.addEventListener('mousedown', function(){
        mouseDown = true;
    }, false);
    document.addEventListener('mouseup', function(e){
        isDragging = false;
        if (draggingNode){
            draggingNode.setFixed(draggingNodeFixed);
            draggingNode = null;
            globals.fixedHasChanged = true;
            globals.threeView.enableControls(true);
            setHighlightedObj(null);
            globals.shouldCenterGeo = true;
        }
        mouseDown = false;
    }, false);
    document.addEventListener( 'mousemove', mouseMove, false );
    function mouseMove(e){

        if (mouseDown) {
            isDragging = true;
        }

        if (!globals.userInteractionEnabled) return;

        // e.preventDefault();
        mouse.x = (e.clientX/window.innerWidth)*2-1;
        mouse.y = - (e.clientY/window.innerHeight)*2+1;
        raycaster.setFromCamera(mouse, globals.threeView.camera);

        var _highlightedObj = null;
        if (!isDragging) {
            _highlightedObj = checkForIntersections(e, globals.model.getRaycastMeshes());
            setHighlightedObj(_highlightedObj);
        }  else if (isDragging && highlightedObj){
            if (!draggingNode) {
                draggingNode = highlightedObj;
                draggingNodeFixed = draggingNode.isFixed();
                draggingNode.setFixed(true);
                globals.fixedHasChanged = true;
                globals.threeView.enableControls(false);
            }
            var intersection = getIntersectionWithObjectPlane(highlightedObj.getPosition().clone());
            highlightedObj.moveManually(intersection);
            globals.nodePositionHasChanged = true;
        }

        if (highlightedObj){
            var position = highlightedObj.getPosition();
            highlighter1.getObject3D().position.set(position.x, position.y, position.z);
        }
    }

    function getIntersectionWithObjectPlane(position){
        var cameraOrientation = globals.threeView.camera.getWorldDirection();
        var dist = position.dot(cameraOrientation);
        raycasterPlane.set(cameraOrientation, -dist);
        var intersection = new THREE.Vector3();
        raycaster.ray.intersectPlane(raycasterPlane, intersection);
        return intersection;
    }

    function setHighlightedObj(object){
        if (highlightedObj && (object != highlightedObj)) {
            // highlightedObj.unhighlight();
            highlighter1.getObject3D().visible = false;
        }
        highlightedObj = object;
        if (highlightedObj) {
            // highlightedObj.highlight();
            highlighter1.getObject3D().visible = true;
        }
    }

    function checkForIntersections(e, objects){
        var intersections = raycaster.intersectObjects(objects, false);
        if (intersections.length == 0) return null;
        //the model owns the mapping: the hit may be on the flat surface, which is indexed by
        //node, or on the thick plates, which carry their own vertices per face
        var nodeIndex = globals.model.nodeIndexFromIntersection(intersections[0]);
        if (nodeIndex < 0) return null;
        return globals.model.getNodes()[nodeIndex];
    }

    function hideHighlighters(){
        highlighter1.getObject3D().visible = false;
    }
    
    // globals.threeView.sceneAdd(raycasterPlane);

    return {
        hideHighlighters: hideHighlighters
    }

}