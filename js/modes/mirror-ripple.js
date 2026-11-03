/* MIRROR · RIPPLE — rings radiate out from the pointer. As a ring passes, each element turns
   over to show its reflection and back again, so mirrored and true bands travel outward. */
(function (MM) {
  'use strict';
  var M = MM.math;
  MM.modes = MM.modes || {};

  MM.modes.ripple = {
    id: 'ripple',
    label: 'Mirror · Ripple',
    blurb: 'Rings travel out from the pointer. Each element turns over to its reflection as a ring passes, then back.',
    params: [
      { key: 'wavelength', label: 'Ring spacing', type: 'range', min: 60, max: 700, step: 5, value: 260, unit: 'px' },
      { key: 'speed', label: 'Ring speed', type: 'range', min: -400, max: 400, step: 5, value: 140, unit: 'px/s' },
      { key: 'sharpness', label: 'Snap', type: 'range', min: 1, max: 8, step: 0.1, value: 3 },
      { key: 'reach', label: 'Reach', type: 'range', min: 5, max: 100, step: 1, value: 100, unit: '%' },
      { key: 'orient', label: 'Orientation', type: 'select', value: 'orbit', options: [['orbit', 'Orbit'], ['upright', 'Upright']] },
      { key: 'response', label: 'Response', type: 'range', min: 1, max: 30, step: 0.5, value: 10 },
      { key: 'backface', label: 'Reflection opacity', type: 'range', min: 0, max: 100, step: 1, value: 40, unit: '%' }
    ],
    createState: function () { return {}; },
    reset: function (els) { els.forEach(function (e) { e.rot = 0; }); },

    update: function (els, env, p) {
      var k = M.smoothK(p.response, env.dt);
      var back = p.backface / 100, inv = 1 / p.sharpness;
      var reachPx = p.reach >= 100 ? 0 : (p.reach / 100) * Math.hypot(env.w, env.h);
      var travel = env.t * p.speed;

      for (var i = 0; i < els.length; i++) {
        var e = els[i], dx = e.x - env.tx, dy = e.y - env.ty;
        var d = Math.hypot(dx, dy), theta = Math.atan2(dy, dx);
        var c = Math.cos(((d - travel) / p.wavelength) * M.TAU);
        var s = (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), inv);
        if (reachPx) s = 1 - (1 - s) * Math.exp(-Math.pow(d / reachPx, 2));

        e.rot = p.orient === 'orbit' ? M.approachAngle(e.rot, theta - Math.PI / 2, k) : 0;
        // Mirror across the ring's tangent, so each element folds toward / away from the pointer
        e.m = M.mul(M.mirrorAcross(theta + Math.PI / 2, s), M.rot(e.rot));
        e.alpha = s < 0 ? back : 1;
      }
    }
  };
})(window.MM = window.MM || {});
