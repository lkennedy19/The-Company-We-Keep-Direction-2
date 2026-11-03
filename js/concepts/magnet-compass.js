/* MAGNET · COMPASSES — a staggered grid of compass needles around the magnet. Each needle is a
   short row of the module and turns to lie along the field where it sits, its north end (tinted)
   pointing the way the field points: away from the magnet's north pole, round toward its south. */
(function (MM) {
  'use strict';
  var M = MM.math, G = MM.magnet, D = MM.draw;
  MM.compositions = MM.compositions || [];

  MM.compositions.push({
    id: 'magnet-compass',
    group: 'magnet',
    label: 'Compasses',
    blurb: 'A grid of compass needles. Each one lines up with the field where it sits, its tinted north end pointing the way the field points.',
    uses: ['module'],
    params: [
      { key: 'module', label: 'Module', type: 'shape', value: 'dot' },
      { key: 'spacing', label: 'Grid spacing', type: 'range', min: 2, max: 30, step: 0.1, value: 7.5, unit: '%' },
      { key: 'stagger', label: 'Stagger rows', type: 'toggle', value: true },
      { key: 'segments', label: 'Modules per needle', type: 'range', min: 1, max: 9, step: 1, value: 5, snap: true },
      { key: 'size', label: 'Module size', type: 'range', min: 0.4, max: 8, step: 0.05, value: 1.7, unit: '%' },
      { key: 'overlap', label: 'Overlap', type: 'range', min: 0, max: 85, step: 1, value: 30, unit: '%' },
      { key: 'tint', label: 'North tint', type: 'range', min: 0, max: 100, step: 1, value: 45, unit: '%' },
      { key: 'strength', label: 'Length shows field strength', type: 'toggle', value: false }
    ].concat(G.placement),

    draw: function (ctx, env, p, lib, col) {
      var pl = G.place(env, p), m = pl.m, ca = Math.cos(pl.ang), sa = Math.sin(pl.ang);
      var sp = Math.max(4, p.spacing / 100 * env.unit), size = p.size / 100 * env.unit;
      var k = p.segments, step = size * (1 - p.overlap / 100), half = (size + step * (k - 1)) / 2;
      var b = [0, 0], needles = [];

      var rows = Math.ceil(env.h / sp) + 2, cols = Math.ceil(env.w / sp) + 2;
      var x0 = (env.w - (cols - 1) * sp) / 2, y0 = (env.h - (rows - 1) * sp) / 2;
      for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
          var x = x0 + i * sp + (p.stagger && j % 2 ? sp / 2 : 0), y = y0 + j * sp;
          var dx = x - pl.cx, dy = y - pl.cy;
          var lx = dx * ca + dy * sa, ly = -dx * sa + dy * ca;
          var gx = Math.max(0, Math.abs(lx) - m.hx), gy = Math.max(0, Math.abs(ly) - m.hy);
          if (Math.hypot(gx, gy) < half * 0.7) continue; // no needles on top of the magnet
          G.field(m, lx, ly, b);
          needles.push({ x: x, y: y, a: Math.atan2(b[1], b[0]) + pl.ang, s: Math.hypot(b[0], b[1]), id: j * 997 + i });
        }
      }

      var ref = 1;
      if (p.strength && needles.length) {
        var ss = needles.map(function (n) { return n.s; }).sort(function (a, c) { return a - c; });
        ref = ss[ss.length >> 1];
      }
      var tint = p.tint / 100;
      needles.forEach(function (n) {
        var scale = p.strength ? M.clamp(Math.pow(n.s / ref, 1 / 3), 0.35, 1.8) : 1;
        var c = Math.cos(n.a), s = Math.sin(n.a), mat = M.rot(n.a), item = lib.moduleAt(p.module, n.id);
        for (var q = 0; q < k; q++) {
          var t = k > 1 ? q / (k - 1) : 1;                 // 0 = south end, 1 = north end
          var off = (-half + size / 2 + q * step) * scale;
          var red = tint > 0 ? M.clamp((t - (1 - tint)) / tint, 0, 1) : 0;
          D.shape(ctx, item, D.mix(col.module, col.accent, red), n.x + c * off, n.y + s * off, mat, size * scale);
        }
      });

      if (p.showBar) G.drawBar(ctx, m, pl.cx, pl.cy, pl.ang, col);
    }
  });
})(window.MM = window.MM || {});
