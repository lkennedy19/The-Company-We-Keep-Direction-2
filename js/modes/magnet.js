/* MAGNET — every element turns to face a moving magnet point. */
(function (MM) {
  'use strict';
  var M = MM.math;
  MM.modes = MM.modes || {};

  MM.modes.magnet = {
    id: 'magnet',
    label: 'Magnet',
    blurb: 'Every element turns toward the magnet. Orbit lays them along rings around it, Point aims them straight at it.',
    params: [
      { key: 'field', label: 'Field', type: 'select', value: 'orbit', options: [['orbit', 'Orbit'], ['point', 'Point']] },
      { key: 'twist', label: 'Twist', type: 'range', min: -90, max: 90, step: 1, value: 0, unit: '°' },
      { key: 'reach', label: 'Reach', type: 'range', min: 5, max: 100, step: 1, value: 100, unit: '%' },
      { key: 'response', label: 'Response', type: 'range', min: 1, max: 30, step: 0.5, value: 10 }
    ],
    createState: function () { return {}; },
    reset: function (els) { els.forEach(function (e) { e.rot = 0; }); },

    update: function (els, env, p) {
      var k = M.smoothK(p.response, env.dt);
      var twist = p.twist * M.DEG;
      var reachPx = p.reach >= 100 ? 0 : (p.reach / 100) * Math.hypot(env.w, env.h);
      for (var i = 0; i < els.length; i++) {
        var e = els[i], dx = e.x - env.tx, dy = e.y - env.ty;
        var a = M.wrap(M.fieldAngle(dx, dy, p.field) + twist);
        if (reachPx) a *= Math.exp(-Math.pow(Math.hypot(dx, dy) / reachPx, 2));
        e.rot = M.approachAngle(e.rot, a, k);
        e.m = M.rot(e.rot);
        e.alpha = 1;
      }
    }
  };
})(window.MM = window.MM || {});
