/* WebGL 2 renderer. Each frame: stamp every particle into a mask, blur it (goo), then threshold the
   result into two flat colours with optional relief shading and print grain. */
(function (MM) {
  'use strict';
  var S = MM.shaders;
  var ATLAS = 1024, COLS = 4, PAD = 18; // 4 x 4 cells of 256px
  var STRIDE = 7;                        // x, y, m0, m1, m2, m3, cell

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
    return sh;
  }

  function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var cache = {};
    return { p: p, u: function (n) { return n in cache ? cache[n] : (cache[n] = gl.getUniformLocation(p, n)); } };
  }

  function hexRgb(hex) {
    var n = parseInt(hex.replace('#', ''), 16);
    return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
  }

  // Average share of a particle's square that its shape fills (a dot is about 0.6, a bar much less)
  function measureCoverage(ctx, count, cell) {
    if (!count) return 0.5;
    var data, total = 0;
    try { data = ctx.getImageData(0, 0, ATLAS, ATLAS).data; } catch (e) { return 0.5; } // pixels unreadable

    for (var i = 0; i < count; i++) {
      var x0 = (i % COLS) * cell, y0 = Math.floor(i / COLS) * cell, sum = 0;
      for (var y = y0; y < y0 + cell; y += 2) {
        for (var x = x0; x < x0 + cell; x += 2) sum += data[(y * ATLAS + x) * 4 + 3];
      }
      total += sum / 255 / ((cell / 2) * (cell / 2));
    }
    return Math.max(0.02, total / count);
  }

  function GLRenderer(canvas) {
    var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
    this.ok = !!gl;
    if (!gl) return;
    this.gl = gl;
    this.canvas = canvas;
    this.floatOK = !!gl.getExtension('EXT_color_buffer_float');

    this.stamp = program(gl, S.stampVS, S.stampFS);
    this.blur = program(gl, S.quadVS, S.blurFS);
    this.final = program(gl, S.quadVS, S.finalFS);

    var corners = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]);
    this.cornerBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuf);
    gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);

    // Full-screen quad
    this.quadVao = gl.createVertexArray();
    gl.bindVertexArray(this.quadVao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    // Instanced particles
    this.instBuf = gl.createBuffer();
    this.stampVao = gl.createVertexArray();
    gl.bindVertexArray(this.stampVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cornerBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
    var b = STRIDE * 4;
    [[1, 2, 0], [2, 4, 8], [3, 1, 24]].forEach(function (a) {
      gl.enableVertexAttribArray(a[0]);
      gl.vertexAttribPointer(a[0], a[1], gl.FLOAT, false, b, a[2]);
      gl.vertexAttribDivisor(a[0], 1);
    });
    gl.bindVertexArray(null);

    this.atlas = gl.createTexture();
    this.shapeCount = 0;
    this.coverage = 0.5;
  }

  GLRenderer.prototype.target = function (old, w, h, float, mips) {
    var gl = this.gl;
    if (old) { gl.deleteTexture(old.tex); gl.deleteFramebuffer(old.fbo); }
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    if (float) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    var fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex: tex, fbo: fbo, w: w, h: h };
  };

  GLRenderer.prototype.resize = function (cssW, cssH, dpr) {
    var W = Math.max(1, Math.round(cssW * dpr)), H = Math.max(1, Math.round(cssH * dpr));
    this.cssW = cssW; this.cssH = cssH; this.dpr = dpr;
    this.canvas.width = W; this.canvas.height = H;
    var hw = Math.ceil(W / 2), hh = Math.ceil(H / 2);
    this.mask = this.target(this.mask, W, H, false, true);
    this.blurA = this.target(this.blurA, hw, hh, this.floatOK, false);
    this.blurB = this.target(this.blurB, hw, hh, this.floatOK, false);
  };

  // sprites: [{ canvas, aspect }] white shapes; each is centred in its own atlas cell
  GLRenderer.prototype.setShapes = function (sprites) {
    var gl = this.gl, cell = ATLAS / COLS, inner = cell - PAD * 2;
    var c = document.createElement('canvas');
    c.width = c.height = ATLAS;
    var ctx = c.getContext('2d');
    sprites.slice(0, COLS * COLS).forEach(function (sp, i) {
      var w = sp.aspect >= 1 ? inner : inner * sp.aspect, h = sp.aspect >= 1 ? inner / sp.aspect : inner;
      ctx.drawImage(sp.canvas, (i % COLS) * cell + (cell - w) / 2, Math.floor(i / COLS) * cell + (cell - h) / 2, w, h);
    });
    this.coverage = measureCoverage(ctx, Math.min(sprites.length, COLS * COLS), cell);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.shapeCount = Math.min(sprites.length, COLS * COLS);
  };

  GLRenderer.prototype.quad = function (prog, fbo, w, h) {
    var gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog.p);
    gl.bindVertexArray(this.quadVao);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  // o: { sigma (css px), gain (field multiplier), thresh, soft, relief, grain, paper, ink }
  GLRenderer.prototype.draw = function (inst, count, o) {
    var gl = this.gl, dpr = this.dpr;

    // 1. Stamp particles into the mask
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.mask.fbo);
    gl.viewport(0, 0, this.mask.w, this.mask.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (count && this.shapeCount) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(this.stamp.p);
      gl.uniform2f(this.stamp.u('uRes'), this.cssW, this.cssH);
      gl.uniform1f(this.stamp.u('uCols'), COLS);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.atlas);
      gl.uniform1i(this.stamp.u('uAtlas'), 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instBuf);
      gl.bufferData(gl.ARRAY_BUFFER, inst.subarray(0, count * STRIDE), gl.STREAM_DRAW);
      gl.bindVertexArray(this.stampVao);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
      gl.disable(gl.BLEND);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.mask.tex);
    gl.generateMipmap(gl.TEXTURE_2D);

    // 2. Goo: separable blur at half resolution
    var field = this.mask, reliefK = 2;
    var sigma = o.sigma * dpr / 2; // in half-res texels
    if (sigma > 0.4) {
      var step = sigma / 4; // sigma is 4 taps in the shader
      var b = this.blur;
      gl.activeTexture(gl.TEXTURE0);
      gl.useProgram(b.p);
      gl.uniform1i(b.u('uTex'), 0);

      gl.bindTexture(gl.TEXTURE_2D, this.mask.tex);
      gl.uniform2f(b.u('uDir'), (step * 2) / this.mask.w, 0);
      gl.uniform1f(b.u('uLod'), Math.max(0, Math.log2(step * 2) - 0.5));
      this.quad(b, this.blurA.fbo, this.blurA.w, this.blurA.h);

      gl.bindTexture(gl.TEXTURE_2D, this.blurA.tex);
      gl.uniform2f(b.u('uDir'), 0, step / this.blurA.h);
      gl.uniform1f(b.u('uLod'), 0);
      this.quad(b, this.blurB.fbo, this.blurB.w, this.blurB.h);

      field = this.blurB;
      reliefK = Math.max(2, sigma * 1.6);
    }

    // 3. Threshold, relief, grain, palette
    var f = this.final, paper = hexRgb(o.paper), ink = hexRgb(o.ink);
    gl.useProgram(f.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, field.tex);
    gl.uniform1i(f.u('uField'), 0);
    gl.uniform2f(f.u('uTexel'), 1 / field.w, 1 / field.h);
    gl.uniform1f(f.u('uThresh'), o.thresh);
    gl.uniform1f(f.u('uGain'), field === this.mask ? 1 : o.gain);
    gl.uniform1f(f.u('uSoft'), o.soft);
    gl.uniform1f(f.u('uRelief'), o.relief);
    gl.uniform1f(f.u('uReliefK'), reliefK);
    gl.uniform1f(f.u('uGrain'), o.grain);
    gl.uniform1f(f.u('uDpr'), dpr);
    gl.uniform3fv(f.u('uPaper'), paper);
    gl.uniform3fv(f.u('uInk'), ink);
    this.quad(f, null, this.canvas.width, this.canvas.height);
  };

  GLRenderer.STRIDE = STRIDE;
  MM.GLRenderer = GLRenderer;
})(window.MM = window.MM || {});
