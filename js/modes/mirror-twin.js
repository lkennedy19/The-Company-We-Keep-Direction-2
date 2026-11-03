/* MIRROR · TWIN — the magnet has a reflected twin. One half of the grid follows you; the other
   half is its mirror image, so moving right sends the twin left and the two meet in the middle. */
(function (MM) {
  'use strict';
  var M = MM.math;
  MM.modes = MM.modes || {};

  var FLIP_X = [-1, 0, 0, 1], FLIP_Y = [1, 0, 0, -1];

  MM.modes.twin = {
    id: 'twin',
    label: 'Mirror · Twin',
    blurb: 'The magnet has a mirror twin. One half of the grid follows you and the other half reflects it, so you can never escape your reflection.',
    params: [
      { key: 'axis', label: 'Reflect', type: 'select', value: 'x', options: [['x', 'Left ↔ Right'], ['y', 'Top ↕ Bottom']] },
      { key: 'field', label: 'Field', type: 'select', value: 'orbit', options: [['orbit', 'Orbit'], ['point', 'Point']] },
      { key: 'twist', label: 'Twist', type: 'range', min: -90, max: 90, step: 1, value: 0, unit: '°' },
      { key: 'response', label: 'Response', type: 'range', min: 1, max: 30, step: 0.5, value: 10 },
      { key: 'backface', label: 'Reflection opacity', type: 'range', min: 0, max: 100, step: 1, value: 100, unit: '%' }
    ],
    createState: function () { return {}; },
    reset: function (els) { els.forEach(function (e) { e.rot = 0; }); },

    update: function (els, env, p) {
      var k = M.smoothK(p.response, env.dt), twist = p.twist * M.DEG, back = p.backface / 100;
      var horiz = p.axis === 'x';
      // Fold the pointer into the "real" half (left or top); the other half is its reflection
      var tx = horiz && env.tx > env.cx ? 2 * env.cx - env.tx : env.tx;
      var ty = !horiz && env.ty > env.cy ? 2 * env.cy - env.ty : env.ty;

      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        var mirrored = horiz ? e.x > env.cx + 0.5 : e.y > env.cy + 0.5;
        var fx = mirrored && horiz ? 2 * env.cx - e.x : e.x;
        var fy = mirrored && !horiz ? 2 * env.cy - e.y : e.y;
        e.rot = M.approachAngle(e.rot, M.fieldAngle(fx - tx, fy - ty, p.field) + twist, k);
        e.m = mirrored ? M.mul(horiz ? FLIP_X : FLIP_Y, M.rot(e.rot)) : M.rot(e.rot);
        e.alpha = mirrored ? back : 1;
      }
    }
  };
})(window.MM = window.MM || {});
