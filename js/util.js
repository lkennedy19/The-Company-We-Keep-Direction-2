/* Shared math helpers. 2x2 matrices are [a, b, c, d] in canvas setTransform order:
   x' = a*x + c*y,  y' = b*x + d*y */
(function (MM) {
  'use strict';
  var TAU = Math.PI * 2;
  var DEG = Math.PI / 180;

  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  // Wrap an angle into [-PI, PI)
  function wrap(a) {
    a = (a + Math.PI) % TAU;
    if (a < 0) a += TAU;
    return a - Math.PI;
  }

  // Frame-rate independent smoothing factor for an exponential follow at `rate` per second
  function smoothK(rate, dt) { return 1 - Math.exp(-rate * dt); }

  function approachAngle(cur, target, k) { return cur + wrap(target - cur) * k; }

  function easeInOut(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }

  function rot(t) {
    var c = Math.cos(t), s = Math.sin(t);
    return [c, s, -s, c];
  }

  function mul(m, n) {
    return [
      m[0] * n[0] + m[2] * n[1],
      m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3],
      m[1] * n[2] + m[3] * n[3]
    ];
  }

  // Scale by `s` perpendicular to a line at angle `phi`. s = -1 is a true reflection across that line;
  // values in between give the "card turning over" squash.
  function mirrorAcross(phi, s) {
    return mul(mul(rot(phi), [1, 0, 0, s]), rot(-phi));
  }

  function det(m) { return m[0] * m[3] - m[1] * m[2]; }

  // The magnet field: orientation of an element offset (dx, dy) from the magnet.
  // 'orbit' lays the element along the ring around the magnet, 'point' aims it at the magnet.
  function fieldAngle(dx, dy, field) {
    var a = Math.atan2(dy, dx);
    return field === 'point' ? a : a - Math.PI / 2;
  }

  MM.math = {
    TAU: TAU, DEG: DEG, clamp: clamp, wrap: wrap, smoothK: smoothK,
    approachAngle: approachAngle, easeInOut: easeInOut,
    rot: rot, mul: mul, mirrorAcross: mirrorAcross, det: det, fieldAngle: fieldAngle
  };
})(window.MM = window.MM || {});
