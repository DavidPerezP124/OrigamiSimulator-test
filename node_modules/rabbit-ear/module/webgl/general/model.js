/* Rabbit Ear 0.9.4 alpha 2024-04-20 (c) Kraft, GNU GPLv3 License */

const drawModel = (gl, version, model, uniforms = {}) => {
	gl.useProgram(model.program);
	model.flags.forEach(flag => gl.enable(flag));
	const uniformCount = gl.getProgramParameter(model.program, gl.ACTIVE_UNIFORMS);
	for (let i = 0; i < uniformCount; i += 1) {
		const uniformName = gl.getActiveUniform(model.program, i).name;
		if (!uniforms[uniformName]) { continue; }
		const { func, value } = uniforms[uniformName];
		const index = gl.getUniformLocation(model.program, uniformName);
		switch (func) {
		case "uniformMatrix2fv":
		case "uniformMatrix3fv":
		case "uniformMatrix4fv": gl[func](index, false, value); break;
		default: gl[func](index, value); break;
		}
	}
	model.vertexArrays.forEach(el => {
		gl.bindBuffer(gl.ARRAY_BUFFER, el.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, el.data, gl.STATIC_DRAW);
		gl.vertexAttribPointer(el.location, el.length, el.type, false, 0, 0);
		gl.enableVertexAttribArray(el.location);
	});
	model.elementArrays.forEach(el => {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, el.buffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, el.data, gl.STATIC_DRAW);
		gl.drawElements(
			el.mode,
			el.data.length,
			version === 2 ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT,
			0,
		);
	});
	model.flags.forEach(flag => gl.disable(flag));
};
const deallocModel = (gl, model) => {
	model.vertexArrays.forEach(vert => gl.disableVertexAttribArray(vert.location));
	model.vertexArrays.forEach(vert => gl.deleteBuffer(vert.buffer));
	model.elementArrays.forEach(elements => gl.deleteBuffer(elements.buffer));
	gl.deleteProgram(model.program);
};

export { deallocModel, drawModel };
