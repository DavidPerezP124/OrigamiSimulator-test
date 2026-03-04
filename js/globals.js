/**
 * Created by ghassaei on 10/7/16.
 */


function initGlobals(){

    var _globals = {

        navMode: "simulation",
        scale: 1,

        //view
        colorMode: "color",
        calcFaceStrain: false,
        color1: "ec008b",
        color2: "dddddd",
        edgesVisible: true,
        mtnsVisible: true,
        valleysVisible: true,
        panelsVisible: false,
        passiveEdgesVisible: false,
        boundaryEdgesVisible: true,
        meshVisible: true,
        ambientOcclusion: false,

        //flags
        simulationRunning: true,
        fixedHasChanged: false,
        forceHasChanged: false,
        materialHasChanged: false,
        creaseMaterialHasChanged: false,
        shouldResetDynamicSim: false,//not used
        shouldChangeCreasePercent: false,
        nodePositionHasChanged: false,
        shouldZeroDynamicVelocity: false,
        shouldCenterGeo: false,
        needsSync: false,
        simNeedsSync: false,

        menusVisible: true,

        url: null,

        //3d vis
        simType: "dynamic",
        panelThickness: 0.02,
        thickLinkageType: "bennettpaper",
        minHingeGap: 0.0,
        thickCreasePairSeparationScale: 2.0,
        thickContainingColumnIndex: 2,
        thickStressReliefHoles: true,
        thickStressReliefMinDegree: 3,
        thickStressReliefRadiusScale: 0.7,
        miuraColumnBoost: 0.0,
        thickEdgeGapOverrides: {},
        thickEdgeGapScaleOverrides: {},
        thickClearanceEnabled: true,
        thickClearanceCheckStride: 4,
        thickClearanceMaxFaces: 300,
        thickClearanceMaxPairs: 120000,
        thickCollisionEpsilon: 1e-4,
        miuraColumnAutoPhase: true,
        thickAutoTuneBoost: true,
        thickAutoTuneBoostStep: 0.005,
        thickAutoTuneMaxBoost: 0.12,
        thickAutoTuneMaxIterations: 12,
        thickAutoTuneEnabled: true,
        miuraColumnPhase: 1,
        miuraColumnTolerance: 0,

        //compliant sim settings
        creasePercent: 0.6,
        axialStiffness: 20,
        creaseStiffness: 0.7,
        panelStiffness: 0.7,
        faceStiffness: 0.2,

        //dynamic sim settings
        percentDamping: 0.45,//damping ratio
        density: 1,
        integrationType: "euler",

        strainClip: 5.0,//for strain visualization, % strain that is drawn red

        //import pattern settings
        vertTol: 3,//vertex merge tolerance
        foldUseAngles: true,//import current angles from fold format as target angles
        //for curved folding
        includeCurves: false,
        vertInt: 20,//intervals of vertices for discretization
        apprCurve: 0.2,//approximation quality of curves

        //save stl settings
        filename: null,
        extension: null,
        doublesidedSTL: false,
        doublesidedOBJ: false,
        exportScale: 1,
        snapExportEnabled: false,
        snapPlateThickness: 0,
        snapInterlayerGap: 0,
        snapPinRadius: 0,
        snapPinHeight: 0,
        snapPinClearance: 0,
        snapPinSegments: 16,
        thickenModel: true,
        thickenOffset: 5,
        polyFacesOBJ: true,

        //save fold settings
        foldUnits: "unit",
        triangulateFOLDexport: false,
        exportFoldAngle: true,

        pausedForPatternView: false,

        userInteractionEnabled: false,
        vrEnabled: false,

        numSteps: 100,

        rotateModel: null,
        rotationSpeed: 0.01,

        backgroundColor:"ffffff",

        capturer: null,
        capturerQuality: 63,
        capturerFPS: 60,
        gifFPS: 20,
        currentFPS: null,
        capturerScale: 1,
        capturerFrames: 0,
        shouldScaleCanvas: false,
        isGif: false,
        shouldAnimateFoldPercent: false
    };

    function setCreasePercent(percent){
        _globals.creasePercent = percent;
        percent *= 100;
        $("#creasePercent>div").slider({value:percent});
        $("#creasePercent>input").val(percent.toFixed(0));
        $("#creasePercentNav>div").slider({value:percent});
        $("#creasePercentBottom>div").slider({value:percent});
    }
    _globals.setCreasePercent = setCreasePercent;

    function warn(msg){
        if (($("#warningMessage").html()) != "") $("#warningMessage").append("<br/><hr>" + msg);
        else $("#warningMessage").html(msg);
        if (!$('#warningModal').hasClass('show')) $("#warningModal").modal("show");
    }
    $('#warningModal').on('hidden.bs.modal', function () {
        $("#warningMessage").html("");
    });
    _globals.warn = warn;

    function noCreasePatternAvailable(){
        return $("#svgViewer>svg").length == 0;
    }
    _globals.noCreasePatternAvailable = noCreasePatternAvailable;

    return _globals;
}
