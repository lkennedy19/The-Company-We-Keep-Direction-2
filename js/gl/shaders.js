/* GLSL for the render pipeline: stamp particles → blur (goo) → threshold, relief, grain, palette. */
(function (MM) {
  'use strict';

  MM.shaders = {
    // One instanced quad per particle, cut from the shape atlas
    stampVS: [
      '#version 300 es',
      'layout(location=0) in vec2 aCorner;',
      'layout(location=1) in vec2 aPos;',
      'layout(location=2) in vec4 aMat;',
      'layout(location=3) in float aCell;',
      'uniform vec2 uRes;',
      'uniform float uCols;',
      'out vec2 vUv;',
      'void main() {',
      '  vec2 p = aPos + mat2(aMat.x, aMat.y, aMat.z, aMat.w) * aCorner;',
      '  vec2 clip = p / uRes * 2.0 - 1.0;',
      '  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);',
      '  vec2 cell = vec2(mod(aCell, uCols), floor(aCell / uCols));',
      '  vUv = (cell + aCorner + 0.5) / uCols;',
      '}'
    ].join('\n'),

    stampFS: [
      '#version 300 es',
      'precision mediump float;',
      'uniform sampler2D uAtlas;',
      'in vec2 vUv;',
      'out vec4 o;',
      'void main() { o = vec4(texture(uAtlas, vUv).a); }'
    ].join('\n'),

    quadVS: [
      '#version 300 es',
      'layout(location=0) in vec2 aCorner;',
      'out vec2 vUv;',
      'void main() { vUv = aCorner + 0.5; gl_Position = vec4(aCorner * 2.0, 0.0, 1.0); }'
    ].join('\n'),

    // 25-tap Gaussian along uDir (uv offset per tap); sigma is 4 taps
    blurFS: [
      '#version 300 es',
      'precision highp float;',
      'uniform sampler2D uTex;',
      'uniform vec2 uDir;',
      'uniform float uLod;',
      'in vec2 vUv;',
      'out vec4 o;',
      'void main() {',
      '  float s = 0.0, w = 0.0;',
      '  for (int i = -12; i <= 12; i++) {',
      '    float x = float(i), k = exp(-x * x / 32.0);',
      '    s += textureLod(uTex, vUv + uDir * x, uLod).r * k;',
      '    w += k;',
      '  }',
      '  o = vec4(s / w);',
      '}'
    ].join('\n'),

    finalFS: [
      '#version 300 es',
      'precision highp float;',
      'uniform sampler2D uField;',
      'uniform vec2 uTexel;',
      'uniform float uThresh, uGain, uSoft, uRelief, uReliefK, uGrain, uDpr;',
      'uniform vec3 uPaper, uInk;',
      'in vec2 vUv;',
      'out vec4 o;',
      'float hash(vec2 p) {',
      '  vec3 q = fract(vec3(p.xyx) * 0.1031);',
      '  q += dot(q, q.yzx + 33.33);',
      '  return fract((q.x + q.y) * q.z);',
      '}',
      'void main() {',
      '  float f = texture(uField, vUv).r * uGain;',
      '  float e = max(fwidth(f) * 0.7, uSoft * 0.3) + 1e-4;',
      '  float ink = smoothstep(uThresh - e, uThresh + e, f);',
      '  vec3 col = uInk;',
      '  if (uRelief > 0.0) {',
      '    vec2 dx = vec2(uTexel.x, 0.0), dy = vec2(0.0, uTexel.y);',
      '    float gx = (texture(uField, vUv + dx).r - texture(uField, vUv - dx).r) * uGain;',
      '    float gy = (texture(uField, vUv + dy).r - texture(uField, vUv - dy).r) * uGain;',
      '    vec3 n = normalize(vec3(-gx * uReliefK, -gy * uReliefK, 1.0));',
      '    vec3 L = normalize(vec3(-0.45, 0.55, 0.7));',
      '    float diff = max(dot(n, L), 0.0);',
      '    float spec = pow(max(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0), 18.0);',
      '    float body = smoothstep(uThresh, 1.0, f);',
      '    vec3 lit = uInk * (0.62 + 0.5 * diff) * (0.85 + 0.15 * body) + vec3(spec * 0.3);',
      '    col = mix(uInk, lit, uRelief);',
      '  }',
      '  vec3 c = mix(uPaper, col, ink);',
      '  vec2 g = floor(gl_FragCoord.xy / max(1.0, uDpr));',
      '  c += (hash(g) - 0.5) * uGrain * 0.16;',
      '  float speck = step(1.0 - uGrain * 0.035, hash(g * 1.37 + 17.0));',
      '  c = mix(c, mix(uInk, uPaper, ink), speck * 0.75);',
      '  o = vec4(c, 1.0);',
      '}'
    ].join('\n')
  };
})(window.MM = window.MM || {});
