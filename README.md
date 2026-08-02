# OrigamiSimulator

Live demo at <a href="https://origamisimulator.org/">origamisimulator.org</a><br/>

<img style="width: 100%; max-width:500px" src="assets/doc/crane.gif" />

This app allows you to simulate how any origami crease pattern will fold.  It may look a little different
from what you typically think of as "origami" - rather than folding paper in a set of sequential steps,
this simulation attempts to fold every crease simultaneously. It does this by iteratively solving for small displacements in the geometry of an initially flat sheet due to forces
exerted by creases.
You can read more about it in our paper:
<ul>
<li><a target="_blank" href="http://erikdemaine.org/papers/OrigamiSimulator_Origami7/">Fast, Interactive Origami Simulation using GPU Computation</a> by Amanda Ghassaei, Erik Demaine, and Neil Gershenfeld (7OSME)
</ul>

**If you have feedback about features you want to see in this app, please see [this thread](https://github.com/amandaghassaei/OrigamiSimulator/discussions/41).**

All simulation methods were written from scratch and are executed in parallel in several GPU fragment shaders for fast performance.
The solver extends work from the following sources:
<ul>
<li><a target="_blank" href="http://www3.eng.cam.ac.uk/~sdg/preprint/5OSME.pdf">Origami Folding: A Structural Engineering Approach</a> by Mark Schenk and Simon D. Guest<br/>
<li><a target="_blank" href="http://www.tsg.ne.jp/TT/cg/TachiFreeformOrigami2010.pdf">Freeform Variations of Origami</a> by Tomohiro Tachi<br/>
</ul>
<p>
This app also uses the methods described in <a href="http://www.cgg.cs.tsukuba.ac.jp/projects/2020/RulingAwareTriangulation/index.html" target="_blank">Simple Simulation of Curved Folds Based on Ruling-aware Triangulation</a> to import curved crease patterns and pre-process them in a way that realistically simulates the bending between the creases.
</p>

<p>
Originally built by <a href="http://www.amandaghassaei.com/" target="_blank">Amanda Ghassaei</a> as a final project for <a href="http://courses.csail.mit.edu/6.849/spring17/" target="_blank">Geometric Folding Algorithms</a>.
Other contributors include <a href="http://www.cgg.cs.tsukuba.ac.jp/~sasaki_k/" target="_blank">Sasaki Kosuke</a>, <a href="http://erikdemaine.org/" target="_blank">Erik Demaine</a>, and <a href="https://github.com/amandaghassaei/OrigamiSimulator/graphs/contributors" target="_blank">others</a>.
Code available on <a href="https://github.com/amandaghassaei/OrigamiSimulator" target="_blank">Github</a>.  If you have interesting crease patterns that would
make good demo files, please send them to me (Amanda) so I can add them to the <b>Examples</b> menu.  My email address is on my website.  Thanks!<br/>
</p><br/>
<b>Instructions:</b><br/><br/>
<img style="width: 100%; max-width:600px" src="assets/doc/demoui.gif" /><br/>

<ul>
    <li>Slide the <b>Fold Percent</b> slider to control the degree of folding of the pattern (100% is fully folded, 0% is unfolded,
        and -100% is fully folded with the opposite mountain/valley assignments).</li>
    <li>Drag to rotate the model, scroll to zoom.</li>
    <li>Import other patterns under the <b>Examples</b> menu.</li>
    <li>Upload your own crease patterns in SVG or <a href="https://github.com/edemaine/fold" target="_blank">FOLD</a> formats, following <a href="#" class="goToImportInstructions">these instructions</a>.</li>
    <li>Export FOLD files or 3D models ( STL or OBJ ) of the folded state of your design ( <b>File > Save Simulation as...</b> ).</li>
</ul>
    <img style="width: 100%;" src="assets/doc/strain.jpg" />
<ul>
    <li>Visualize the internal strain of the origami as it folds using the <b>Strain Visualization</b> in the left menu of the <b>Advanced Options</b>.</li>
</ul>
    <img style="width: 100%; max-width:600px" src="assets/doc/huffmanvr.jpg" /><br/>
<ul>
    <li>If you are working from a computer connected to a VR headset and hand controllers, follow <a href="#" id="goToViveInstructions">these instructions</a>
        to use this app in an interactive virtual reality mode. (sorry I think this may be deprecated now!)</li>
</ul>

<br/>
<b>Material Thickness Simulation:</b><br/><br/>
<p>
Enable <b>Simulate material thickness</b> in the <b>Simulation Settings</b> of the <b>Advanced Options</b> to fold as a stack of rigid plates
of a given thickness instead of a zero-thickness sheet.  The folded surface is rendered as an extruded solid, and each crease's fold angle is
limited so plates cannot pass through each other - a flat foldable pattern folds into a wedged stack of plates ("thick flat foldable")
rather than collapsing onto a single plane.
</p>
<p>
The fold angle limits are derived from two known thickness-accommodation techniques.  For patterns with a flat-folded state
(all fold angles 0&deg; or &plusmn;180&deg;), a layer ordering of the folded state is estimated from the mountain/valley assignment
(the reflection-map/layer-ordering formulation of Demaine &amp; O'Rourke, <i>Geometric Folding Algorithms</i>; the exact ordering problem
is NP-hard per Akitaya et al., so a longest-path layering heuristic over the crease constraint graph is used).  Each hinge then gets the
number of material layers it must wrap around in the folded stack, and its maximum fold angle follows the tapered-panel/axis-shift
accommodation of Tomohiro Tachi's <a href="https://origami.c.u-tokyo.ac.jp/~tachi/cg/ThickRigidOrigamiASME2011.pdf" target="_blank">
Rigid-Foldable Thick Origami</a>: a hinge spanning a gap <i>g</i> with panel depth <i>h</i> can close at most to
&pi;&nbsp;&minus;&nbsp;2&nbsp;atan(<i>g</i>/2<i>h</i>).  Like everything else in this compliant simulation the limits are applied as soft
constraints, so tightly wrapped multi-layer folds may still locally exceed their limit under load from neighboring creases.
</p>
<p>
A penalty-based collision solver backs up the fold angle limits (enabled by default when thickness simulation is on).
Every simulation substep, an additional GPU pass tests each vertex against every plate of the mesh and applies a repulsion
force along the plate normal wherever the material would overlap, with the equal and opposite reaction distributed over the
contacted triangle's vertices by barycentric weight; hinges pushed past their thickness limit stiffen one-sidedly
(hinge-line contact).  This is standard penalty-force contact as used in cloth simulation (all-pairs
vertex&ndash;triangle tests).  Because it is all-pairs its cost is a product of the model's size - the direct pass is
O(vertices&nbsp;&times;&nbsp;faces) and the reaction gather O(vertices&nbsp;&times;&nbsp;&Sigma;valence) per substep, with 100
substeps per rendered frame - so it is enabled only for models whose total stays inside a fixed budget (roughly a few
hundred vertices).  Larger models keep their thickness fold angle limits and report in the console that contact was
skipped; a spatial acceleration structure would be needed to lift that ceiling.
</p>
<p>
Known limitations of the contact pass:
</p>
<ul>
<li>It resolves vertex&ndash;triangle contacts only.  Two plates that cross edge-to-edge with no vertex of either projecting
inside the other (an "X" intersection of two long thin triangles) are not detected, and a vertex landing exactly on an
internal triangulation edge has a near-zero barycentric coordinate in both incident triangles and can be missed by both.
Full coverage needs edge&ndash;edge tests, or a closest-point-on-triangle test paired with topological exclusion of
neighbouring faces.  In practice origami layer stacking is dominated by vertex&ndash;face contact, and the fold angle
limits prevent the configurations where X-crossings typically arise.</li>
<li>Being a penalty method, deep overlaps under extreme load relax only approximately, and the anti-tunneling test uses one
substep of velocity history, so a slow sustained squeeze-through is not strictly impossible.</li>
<li>The pass is a <b>discrete penalty method with a first-order swept guard</b>, not continuous collision detection.  It
reconstructs the plate's previous position linearly over one substep and tests containment against the plate's current
triangle; it does not solve for the exact coplanarity time of a deforming triangle.  A plate that both rotates and
translates substantially within a single substep can therefore still be missed.</li>
<li>The pass keeps <b>no contact state between substeps</b>, so a crossing is detected and answered within the substep it
happens; a crossing that survives that single response is not recovered afterwards, because the following substep sees
both endpoints on the far side and no longer registers a contact.  The overlap charged for a crossing grows with the
overshoot rather than saturating at one band width, which makes the response continuous and monotone, but this was
<i>measured not to reduce the number of surviving crossings</i> - strengthening a one-substep penalty does not close the
gap.  Cancelling the approaching normal velocity outright was also tried and is <b>not</b> used: with many simultaneous
contacts each pair applies its own full cancellation, and the summed impulse diverges.  Removing this restriction needs
persistent per-pair contact state or true CCD, neither of which is implemented.  Measured on the flapping bird driven
hard into itself, contact still removes roughly 70% of plate pass-throughs (about 115 without contact, about 34 with).</li>
</ul>
<p>
<b>Offset panels.</b>  Whenever the layer ordering resolves, the simulator uses the <i>offset panel technique</i> instead of
relying on the fold angle limits: each panel's plate is shifted off the midsurface along its own normal by
(<i>layer</i>&nbsp;+&nbsp;&frac12;)&nbsp;&times;&nbsp;<i>thickness</i>&nbsp;&times;&nbsp;<i>parity</i>, placing it at its own
height in the folded stack.  Because the plates no longer share a hinge centerline, they close <b>fully flat</b> without
touching, so the angle limits above are switched off in this mode and creases reach a true 180&deg;.  Connector geometry
bridges the plates of each hinge across their offset - the "extensions" of the technique.  Offset panels preserve the folding
kinematics of the zero-thickness pattern, which is what lets the compliant solver keep driving the midsurface mesh unchanged.
</p>
<p>
<b>Separating panels that share a layer.</b>  Longest-path layering only separates panels that a folded crease directly
constrains, so two flaps folded over the same central panel both land one layer above it - at the <i>same</i> height, where
the offset construction would stack them into each other with the contact pass switched off.  The layering therefore also
computes the <b>flat-folded layout</b> (each face placed by the composition of reflections along the creases crossed to
reach it, in the crease pattern's own plane), finds panels that share a layer <i>and</i> overlap there, adds an ordering
constraint between each such pair, and re-runs the layering until no overlapping pair shares a height.  The direction
chosen for an added constraint is deterministic but arbitrary: it guarantees the plates are <b>separated</b>, not that the
stack is the order a real folder would use - deriving that needs taco-taco/taco-tortilla constraints, and the exact problem
is NP-hard.  If the added constraints turn the graph cyclic, or the pattern is not planar enough for a flat-folded layout to
be computed, offset panels are declined and the model falls back to the angle limits plus contact.
</p>
<p>
<b>Fold direction.</b>  The solver drives each crease to <i>targetTheta</i>&nbsp;&times;&nbsp;<i>creasePercent</i> and the
advanced fold slider runs -100 to 100, so a negative percent reverses every mountain and valley.  The stack order is rebuilt
when the sign flips; without that the offsets would push plates together instead of apart, and neither contact nor the angle
limits are active in this mode to catch it.  The rebuild also changes each crease's <i>layerGap</i>, and with it the fold
angle limit: the rigid solver reads that live, but the dynamic solver bakes it into its crease metadata texture, so the
rebuild flags that for re-upload.  It runs from the solver loop rather than the thick view, because the limits apply
whenever thickness is on while the thick mesh is not drawn in the strain and normal colour modes.
</p>
<p>
<b>Crease markings in the thick view.</b>  A node has no single position once the material has depth: every incident face
carries its own pair of surface vertices, and under offset panels those sit at different heights in the stack.  The edge
lines are therefore kept in two forms and swapped with the view - indexed by node against the midsurface for the flat mesh,
and against the slab surfaces for the thick mesh, where each edge is drawn once per adjacent face along both that plate's
top and underside.  Drawing them on the midsurface instead would bury them inside the opaque plates, and under offset
panels would leave them floating away from the plate they mark.
</p>
<p>
Two consequences are worth expecting rather than mistaking for bugs.  The <b>deployed (unfolded) state is stepped</b>, not a
flat sheet - panels sit at their stack heights and are joined by extensions; that staircase is what the technique produces.
And the <b>collision solver is not used in this mode</b>: it measures separation between plate midsurfaces, which offset
panels deliberately fold onto a single plane while holding the plates apart by their offsets, so running it there fires
contact everywhere and prevents the model folding flat.  Patterns with no resolvable layer ordering (not flat-foldable,
parity conflicts, cyclic stacking constraints) fall back to midsurface-centred plates with the angle limits and collision
solver as described above.
</p>
<p>
Not implemented in the offset mode: <b>through-holes</b> where one panel's extension passes through another panel's plane
(so exported solids can self-intersect there), and Ku &amp; Demaine's <b>hinge doubling</b>, which splits a hinge in two
where a single offset hinge cannot satisfy the constraints - without it, plates of adjacent layers can graze transiently at
intermediate fold angles even though the deployed and fully folded states are clean.  Chen, Peng &amp; You's spatial-linkage
conversion is a different approach to the same problem and is not implemented either.
</p>

<br/>
<b>References for the thickness work:</b>
<ul>
<li><a href="https://asmedigitalcollection.asme.org/appliedmechanicsreviews/article/70/1/010805/443701/A-Review-of-Thickness-Accommodation-Techniques-in" target="_blank">A Review of Thickness-Accommodation Techniques in Origami-Inspired Engineering</a>,
R. J. Lang, K. A. Tolman, E. B. Crampton, S. P. Magleby, L. L. Howell, <i>ASME Applied Mechanics Reviews</i> 70(1):010805, 2018 - the taxonomy of the techniques below.</li>
<li><a href="https://asmedigitalcollection.asme.org/IDETC-CIE/proceedings-abstract/IDETC-CIE2014/46377/V05BT08A054/257627" target="_blank">An Offset Panel Technique for Thick Rigidly Foldable Origami</a>,
B. J. Edmondson, R. J. Lang, S. P. Magleby, L. L. Howell, ASME IDETC 2014 - the offset panel construction used here.</li>
<li>Folding Flat Crease Patterns With Thick Materials, J. S. Ku and E. D. Demaine, <i>ASME Journal of Mechanisms and Robotics</i>, 2016 - generalises offset panels to arbitrary flat-foldable patterns; this implementation follows the offset construction but not its hinge doubling.</li>
<li><a href="https://www.science.org/doi/abs/10.1126/science.aab2870" target="_blank">Origami of thick panels</a>,
Y. Chen, R. Peng, Z. You, <i>Science</i> 349(6246):396-400, 2015 - the spatial-linkage alternative (Bennett/Myard/Bricard), not implemented here.</li>
<li><a href="https://origami.c.u-tokyo.ac.jp/~tachi/cg/ThickRigidOrigamiASME2011.pdf" target="_blank">Rigid-Foldable Thick Origami</a>,
T. Tachi, 2011 - tapered panels; the source of the fold angle limit used by the fallback mode.</li>
</ul>

<br/>
<b>External Libraries:</b><br/><br/>
<ul>
    <li>All rendering and 3D interaction done with <a target="_blank" href="https://threejs.org/">three.js</a></li>
    <li><a href="https://github.com/fontello/svgpath" target="_blank">svgpath</a> and <a href="https://www.npmjs.com/package/path-data-polyfill" target="_blank">path-data-polyfill</a> helps with SVG path parsing</li>
    <li><a href="https://github.com/edemaine/fold" target="_blank">FOLD</a> is used as the internal data structure, methods from the
        <a href="https://github.com/edemaine/fold/blob/master/doc/api.md" target="_blank">FOLD API</a> used for SVG parsing</li>
    <li>Arbitrary polygonal faces of imported geometry are triangulated using the <a target="_blank" href="https://github.com/mapbox/earcut">Earcut Library</a> and <a href="https://github.com/mikolalysenko/cdt2d" target="_blank"></a>cdt2d</a></li>
    <li><a href="http://www.numericjs.com/" target="_blank">numeric.js</a> for linear algebra operations</li>
    <li>GIF and WebM video export uses <a target="_blank" href="https://github.com/spite/ccapture.js/">CCapture</a></li>
</ul>
<p>
<br/>
You can find additional information in <a href="http://erikdemaine.org/papers/OrigamiSimulator_Origami7/" target="_blank">our 7OSME paper</a> and <a href="http://www.amandaghassaei.com/projects/origami_simulator/" target="_blank">project website</a>.
If you have feedback about features you want to see in this app, please see <a href="https://github.com/amandaghassaei/OrigamiSimulator/discussions/41" target="_blank">this thread</a>.
<br/>
</p>
