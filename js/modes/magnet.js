/* MAGNET — particles flow into rings (or a spiral) around a moving pole, like iron filings. */
(function (MM) {
  'use strict';
  var M = MM.math, P = MM.particles;
  MM.modes = MM.modes || {};
  var off = [0, 0];

  MM.modes.magnet = {
    id: 'magnet',
    label: 'Magnet',
    blurb: 'Particles are pulled into rings around the magnet, like iron filings. Move it and they flow to their new places.',
    params: [
      { key: 'field', label: 'Field', type: 'select', value: 'rings', options: [['rings', 'Rings'], ['spiral', 'Spiral']] },
      { key: 'ringGap', label: 'Ring spacing', type: 'range', min: 20, max: 240, step: 1, value: 72, unit: 'px' },
      { key: 'thickness', label: 'Band thickness', type: 'range', min: 5, max: 100, step: 1, value: 32, unit: '%' },
      { key: 'wobble', label: 'Wobble', type: 'range', min: 0, max: 100, step: 1, value: 35, unit: '%' },
      { key: 'reach', label: 'Reach', type: 'range', min: 5, max: 100, step: 1, value: 100, unit: '%' },
      { key: 'align', label: 'Align', type: 'range', min: 0, max: 100, step: 1, value: 100, unit: '%' }
    ],
    createState: function () { return {}; },

    update: function (ps, env, p) {
      var s = p.ringGap, th = p.thickness / 100, wob = p.wobble / 100 * 0.6, al = p.align / 100;
      var spiral = p.field === 'spiral';
      var reachPx = p.reach >= 100 ? 0 : (p.reach / 100) * env.diag;
      var tz = env.t * 0.12, fs = 1 / (s * 4);

      for (var i = 0; i < ps.length; i++) {
        var q = ps[i];
        var dx = q.hx - env.tx, dy = q.hy - env.ty, r = Math.hypot(dx, dy) + 1e-6;
        var f = r / s, gx = dx / (r * s), gy = dy / (r * s);
        if (spiral) {
          var inv = 1 / (M.TAU * r * r);
          f -= Math.atan2(dy, dx) / M.TAU;
          gx += dy * inv; gy -= dx * inv;
        } else if (f < 0.55) {
          f = 0.55; // keep the pole itself clear; its particles join the first ring
        }
        if (wob) f += wob * MM.noise.noise3(q.hx * fs, q.hy * fs, tz);

        P.toContour(f, gx, gy, th, q.band, s, off);
        var w = reachPx ? Math.exp(-Math.pow(r / reachPx, 2)) : 1;
        q.tx = q.hx + off[0] * w;
        q.ty = q.hy + off[1] * w;
        q.trot = P.align(q, Math.atan2(gy, gx) + Math.PI / 2, al * w);
        q.ts = 1;
        q.hidden = false;
      }
      return null;
    }
  };
})(window.MM = window.MM || {});
