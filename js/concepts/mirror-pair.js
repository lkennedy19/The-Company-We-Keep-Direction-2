/* MIRROR · MIRROR PAIR — an object between two parallel mirrors. Light bounces back and forth,
   so images repeat on both sides at fixed steps: every second image is reversed. With the mirrors
   a gap D apart, images of the same orientation repeat every 2D. */
(function (MM) {
  'use strict';
  var M = MM.math, O = MM.optics, D = MM.draw;
  MM.compositions = MM.compositions || [];

  MM.compositions.push({
    id: 'mirror-pair',
    group: 'mirror',
    label: 'Mirror pair',
    blurb: 'An object between two parallel mirrors. Its images repeat on both sides, every second one reversed; bring the mirrors closer and the images close up.',
    uses: ['object'],
    params: [
      { key: 'object', label: 'Object', type: 'shape', value: 'oval' },
      { key: 'gap', label: 'Gap between mirrors', type: 'range', min: 2, max: 100, step: 0.25, value: 28, unit: '%' },
      { key: 'position', label: 'Object position in the gap', type: 'range', min: 0, max: 100, step: 0.5, value: 50, unit: '%' },
      { key: 'reflections', label: 'Reflections shown', type: 'range', min: 0, max: 16, step: 1, value: 6, snap: true },
      { key: 'size', label: 'Object size', type: 'range', min: 4, max: 120, step: 0.25, value: 62, unit: '%' },
      { key: 'angle', label: 'Object rotation', type: 'range', min: -180, max: 180, step: 1, value: 90, unit: '°' },
      { key: 'turn', label: 'Mirror angle', type: 'range', min: -90, max: 90, step: 0.5, value: 0, unit: '°' },
      { key: 'slab', label: 'Mirror thickness', type: 'range', min: 0, max: 10, step: 0.1, value: 1.2, unit: '%' },
      { key: 'showMirrors', label: 'Show the mirrors', type: 'toggle', value: true }
    ],

    draw: function (ctx, env, p, lib, col) {
      var item = lib.get(p.object), size = p.size / 100 * env.unit, a = p.angle * M.DEG;
      var gap = p.gap / 100 * env.unit, turn = p.turn * M.DEG;
      var cx = env.w / 2, cy = env.h / 2, ux = Math.cos(turn), uy = Math.sin(turn);
      // Both mirrors share one frame; `n` of the right mirror points back into the gap
      var right = O.frame(cx + ux * gap / 2, cy + uy * gap / 2, p.turn);
      var left = O.frame(cx - ux * gap / 2, cy - uy * gap / 2, p.turn + 180);
      var halfW = O.halfAcross(item, size, a, right);
      var room = gap / 2 - halfW;
      var x0 = room > 0 ? -room + (p.position / 100) * room * 2 : 0; // object centre across the gap

      // Images along the axis: upright at x0 + 2nD, reversed at (D - x0) + 2nD
      var shots = [];
      for (var n = -p.reflections; n <= p.reflections; n++) {
        var up = Math.abs(2 * n), rev = n >= 0 ? 2 * n + 1 : -2 * n - 1;
        if (n !== 0 && up <= p.reflections) shots.push({ x: x0 + 2 * n * gap, flip: false, order: up });
        if (rev <= p.reflections) shots.push({ x: gap - x0 + 2 * n * gap, flip: true, order: rev });
      }
      shots.sort(function (s1, s2) { return s2.order - s1.order; });

      var mObj = M.mul(M.rot(turn), M.rot(a - turn));
      var mRev = M.mul(O.flip(right), mObj);
      shots.forEach(function (s) {
        D.shape(ctx, item, col.primary, cx + ux * s.x, cy + uy * s.x, s.flip ? mRev : mObj, size, 'large');
      });
      if (p.showMirrors) {
        var t = p.slab / 100 * env.unit;
        O.drawMirror(ctx, right, t, env.diag * 2, col);
        O.drawMirror(ctx, left, t, env.diag * 2, col);
      }
      D.shape(ctx, item, col.primary, cx + ux * x0, cy + uy * x0, mObj, size, 'large');
    }
  });
})(window.MM = window.MM || {});
