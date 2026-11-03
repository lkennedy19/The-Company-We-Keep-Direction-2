/* MIRROR · KALEIDO — the magnet field folded through fixed mirrors at the centre of the canvas.
   The pointer is reflected into every sector, so the whole grid stays perfectly symmetric. */
(function (MM) {
  'use strict';
  var M = MM.math;
  MM.modes = MM.modes || {};

  // Fold point (px, py) about centre (cx, cy) into the first wedge of `n` mirrors starting at angle a0.
  // Returns the folded point and the sector index it came from.
  function fold(px, py, cx, cy, a0, wedge, n) {
    var dx = px - cx, dy = py - cy;
    var r = Math.hypot(dx, dy);
    var a = Math.atan2(dy, dx) - a0;
    a = ((a % M.TAU) + M.TAU) % M.TAU;
    var k = Math.min(2 * n - 1, Math.floor(a / wedge));
    var loc = a - k * wedge;
    if (k & 1) loc = wedge - loc;
    var ang = a0 + loc;
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang), k: k };
  }

  // Linear map that carries the first wedge onto sector k (rotation, plus a reflection for odd k)
  function sectorMatrix(k, a0, wedge) {
    var inner = (k & 1) ? M.mul(M.rot((k + 1) * wedge), [1, 0, 0, -1]) : M.rot(k * wedge);
    return M.mul(M.mul(M.rot(a0), inner), M.rot(-a0));
  }

  MM.modes.kaleido = {
    id: 'kaleido',
    label: 'Mirror · Kaleido',
    blurb: 'Fixed mirrors meet at the centre. The magnet is reflected into every sector, so the field is always symmetric.',
    params: [
      { key: 'mirrors', label: 'Mirrors', type: 'select', value: '2', options: [['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['6', '6']] },
      { key: 'spin', label: 'Mirror spin', type: 'range', min: -45, max: 45, step: 1, value: 0, unit: '°/s' },
      { key: 'field', label: 'Field', type: 'select', value: 'orbit', options: [['orbit', 'Orbit'], ['point', 'Point']] },
      { key: 'twist', label: 'Twist', type: 'range', min: -90, max: 90, step: 1, value: 0, unit: '°' },
      { key: 'response', label: 'Response', type: 'range', min: 1, max: 30, step: 0.5, value: 10 },
      { key: 'backface', label: 'Reflection opacity', type: 'range', min: 0, max: 100, step: 1, value: 100, unit: '%' },
      { key: 'showAxes', label: 'Show mirrors', type: 'toggle', value: false }
    ],
    createState: function () { return { spin: 0 }; },
    reset: function (els) { els.forEach(function (e) { e.rot = 0; }); },

    update: function (els, env, p, st) {
      st.spin += p.spin * M.DEG * env.dt;
      var n = Number(p.mirrors), wedge = Math.PI / n;
      var a0 = Math.PI / 2 + st.spin; // first mirror is vertical, so 1 mirror = left/right symmetry
      st.a0 = a0; st.wedge = wedge; st.n = n;

      var tf = fold(env.tx, env.ty, env.cx, env.cy, a0, wedge, n);
      var mats = [];
      for (var s = 0; s < 2 * n; s++) mats.push(sectorMatrix(s, a0, wedge));

      var k = M.smoothK(p.response, env.dt);
      var twist = p.twist * M.DEG, back = p.backface / 100;

      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        var f = fold(e.x, e.y, env.cx, env.cy, a0, wedge, n);
        var a = M.fieldAngle(f.x - tf.x, f.y - tf.y, p.field) + twist;
        e.rot = M.approachAngle(e.rot, a, k);
        e.m = M.mul(mats[f.k], M.rot(e.rot));
        e.alpha = (f.k & 1) ? back : 1;
      }
    },

    overlay: function (ctx, env, p, st, color) {
      if (!p.showAxes) return;
      var len = Math.hypot(env.w, env.h);
      for (var j = 0; j < st.n; j++) {
        MM.renderer.axisLine(ctx, env.cx, env.cy, st.a0 + j * st.wedge, len, color, 0.3);
      }
    }
  };
})(window.MM = window.MM || {});
