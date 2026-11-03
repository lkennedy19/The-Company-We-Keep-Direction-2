/* MIRROR · FOLD — a mirror line runs through the pointer. Elements on the far side turn over
   like cards and show their reflection; as the line sweeps, a wave of flips follows it. */
(function (MM) {
  'use strict';
  var M = MM.math;
  MM.modes = MM.modes || {};

  MM.modes.fold = {
    id: 'fold',
    label: 'Mirror · Fold',
    blurb: 'A mirror line passes through the pointer. Everything on the far side turns over like a card and shows its reflection.',
    params: [
      { key: 'axis', label: 'Mirror line', type: 'select', value: 'spin', options: [['spin', 'Spin'], ['vertical', 'Vertical'], ['horizontal', 'Horizontal']] },
      { key: 'spin', label: 'Spin speed', type: 'range', min: -90, max: 90, step: 1, value: 20, unit: '°/s', show: function (v) { return v.axis === 'spin'; } },
      { key: 'flipTime', label: 'Flip time', type: 'range', min: 120, max: 1500, step: 10, value: 480, unit: 'ms' },
      { key: 'stagger', label: 'Stagger', type: 'range', min: 0, max: 400, step: 5, value: 70, unit: 'ms' },
      { key: 'orient', label: 'Orientation', type: 'select', value: 'upright', options: [['upright', 'Upright'], ['orbit', 'Orbit']] },
      { key: 'backface', label: 'Reflection opacity', type: 'range', min: 0, max: 100, step: 1, value: 45, unit: '%' },
      { key: 'showLine', label: 'Show mirror line', type: 'toggle', value: true }
    ],
    createState: function () { return { phi: Math.PI / 2 }; },
    reset: function (els) {
      els.forEach(function (e) { e.rot = 0; e.p = 0; e.goal = 0; e.want = -1; e.at = 0; });
    },

    update: function (els, env, p, st) {
      if (p.axis === 'spin') st.phi += p.spin * M.DEG * env.dt;
      else st.phi = p.axis === 'vertical' ? Math.PI / 2 : 0;

      var cs = Math.cos(st.phi), sn = Math.sin(st.phi);
      var step = env.dt * 1000 / p.flipTime;
      var k = M.smoothK(10, env.dt);
      var back = p.backface / 100;

      for (var i = 0; i < els.length; i++) {
        var e = els[i], dx = e.x - env.tx, dy = e.y - env.ty;
        var side = (cs * dy - sn * dx) >= 0 ? 0 : 1; // 1 = behind the mirror
        if (side !== e.want) {
          e.want = side;
          e.at = env.t + (Math.hypot(dx, dy) / 100) * (p.stagger / 1000);
        }
        if (env.t >= e.at) e.goal = e.want;
        e.p += M.clamp(e.goal - e.p, -step, step);

        var s = Math.cos(Math.PI * M.easeInOut(e.p)); // 1 → 0 (edge-on) → -1 (reflected)
        e.rot = p.orient === 'orbit' ? M.approachAngle(e.rot, M.fieldAngle(dx, dy, 'orbit'), k) : 0;
        e.m = M.mul(M.mirrorAcross(st.phi, s), M.rot(e.rot));
        e.alpha = s < 0 ? back : 1;
      }
    },

    overlay: function (ctx, env, p, st, color) {
      if (!p.showLine) return;
      MM.renderer.axisLine(ctx, env.tx, env.ty, st.phi, Math.hypot(env.w, env.h), color, 0.35);
    }
  };
})(window.MM = window.MM || {});
