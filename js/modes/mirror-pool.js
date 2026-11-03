/* MIRROR · POOL — the lower half of the grid is still water. The top half reacts to the magnet;
   the bottom half shows it upside down, a beat late, swaying and fading with depth. */
(function (MM) {
  'use strict';
  var M = MM.math;
  MM.modes = MM.modes || {};

  var FLIP_Y = [1, 0, 0, -1];

  MM.modes.pool = {
    id: 'pool',
    label: 'Mirror · Pool',
    blurb: 'The bottom half of the grid is water. It reflects the top half upside down, a beat late, with a gentle ripple.',
    params: [
      { key: 'field', label: 'Field', type: 'select', value: 'orbit', options: [['orbit', 'Orbit'], ['point', 'Point']] },
      { key: 'response', label: 'Response', type: 'range', min: 1, max: 30, step: 0.5, value: 10 },
      { key: 'lag', label: 'Reflection lag', type: 'range', min: 0, max: 100, step: 1, value: 55, unit: '%' },
      { key: 'ripple', label: 'Ripple', type: 'range', min: 0, max: 100, step: 1, value: 40, unit: '%' },
      { key: 'backface', label: 'Reflection opacity', type: 'range', min: 5, max: 100, step: 1, value: 60, unit: '%' }
    ],
    createState: function () { return {}; },
    reset: function (els, st) {
      var cols = 0, rows = 0;
      els.forEach(function (e) {
        e.rot = 0; e.ox = 0;
        cols = Math.max(cols, e.col + 1); rows = Math.max(rows, e.row + 1);
      });
      st.cols = cols; st.rows = rows;
    },

    update: function (els, env, p, st) {
      var k = M.smoothK(p.response, env.dt);
      // Lag 0% = an exact reflection, 100% = slow, dreamy water
      var kr = M.smoothK(30 * Math.pow(1 - p.lag / 100, 2) + 1.5, env.dt);
      var amp = p.ripple / 100, back = p.backface / 100, half = env.h / 2;
      var ty = env.ty > env.cy ? 2 * env.cy - env.ty : env.ty; // the magnet always stays above water

      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        if (e.y > env.cy + 0.5) continue;
        e.rot = M.approachAngle(e.rot, M.fieldAngle(e.x - env.tx, e.y - ty, p.field), k);
        e.m = M.rot(e.rot); e.alpha = 1; e.ox = 0;
      }
      for (var j = 0; j < els.length; j++) {
        var r = els[j];
        if (r.y <= env.cy + 0.5) continue;
        var src = els[(st.rows - 1 - r.row) * st.cols + r.col];
        var depth = M.clamp((r.y - env.cy) / half, 0, 1);
        var wave = Math.sin(env.t * 1.6 - r.y * 0.045 + Math.sin(r.x * 0.01 + env.t * 0.7));
        r.rot = M.approachAngle(r.rot, src.rot, kr);
        r.ox = wave * amp * (4 + 14 * depth);
        r.m = M.mul(FLIP_Y, M.rot(r.rot + wave * amp * 0.25 * depth));
        r.alpha = back * (1 - 0.55 * depth);
      }
    }
  };
})(window.MM = window.MM || {});
