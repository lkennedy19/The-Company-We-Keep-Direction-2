/* MIRROR · MIMIC — mirroring as imitation. Elements copy the direction you move in, and the
   copying spreads outward from you, neighbour to neighbour, like a crowd picking up a gesture. */
(function (MM) {
  'use strict';
  var M = MM.math;
  MM.modes = MM.modes || {};

  // Heading at time t from a list of {t, a} samples (oldest first), linearly interpolated
  function sample(hist, t) {
    if (t <= hist[0].t) return hist[0].a;
    var lo = 0, hi = hist.length - 1;
    if (t >= hist[hi].t) return hist[hi].a;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (hist[mid].t <= t) lo = mid; else hi = mid;
    }
    var a = hist[lo], b = hist[hi], u = (t - a.t) / ((b.t - a.t) || 1);
    return a.a + (b.a - a.a) * u;
  }

  MM.modes.mimic = {
    id: 'mimic',
    label: 'Mirror · Mimic',
    blurb: 'Every element copies the direction you move. Those nearest copy you first and the rest follow, so each gesture travels outward through the grid.',
    params: [
      { key: 'copy', label: 'Copy as', type: 'select', value: 'same', options: [['same', 'Same'], ['reversed', 'Mirror image']] },
      { key: 'spread', label: 'Spread speed', type: 'range', min: 80, max: 2000, step: 10, value: 450, unit: 'px/s' },
      { key: 'turn', label: 'Pick-up', type: 'range', min: 1, max: 20, step: 0.5, value: 6 }
    ],
    createState: function () { return { heading: 0, hist: [], px: null, py: null }; },
    reset: function (els) { els.forEach(function (e) { e.rot = 0; }); },

    update: function (els, env, p, st) {
      // Read the gesture: the pointer's direction of travel, unwrapped so it can be interpolated
      if (st.px !== null && env.dt > 0) {
        var vx = (env.tx - st.px) / env.dt, vy = (env.ty - st.py) / env.dt;
        if (Math.hypot(vx, vy) > 25) {
          st.heading += M.wrap(Math.atan2(vy, vx) - st.heading) * M.smoothK(p.turn, env.dt);
        }
      }
      st.px = env.tx; st.py = env.ty;

      var maxDelay = Math.hypot(env.w, env.h) / p.spread + 0.25;
      st.hist.push({ t: env.t, a: st.heading });
      while (st.hist.length > 2 && st.hist[1].t < env.t - maxDelay) st.hist.shift();

      var flip = p.copy === 'reversed';
      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        var d = Math.hypot(e.x - env.tx, e.y - env.ty);
        var a = sample(st.hist, env.t - d / p.spread);
        e.rot = a;
        // A mirror image turns the opposite way and reads backwards
        e.m = flip ? M.mul([-1, 0, 0, 1], M.rot(-a)) : M.rot(a);
        e.alpha = 1;
      }
    }
  };
})(window.MM = window.MM || {});
