/* MIRROR — the pointer carries an invisible mirror line. The grid on one side stays put; the
   other side shows its reflection. Moving the mirror rewrites half the composition: the reflection
   slides at twice your speed and pieces from off-screen swing into view. Nothing turns to face
   anything, which keeps it distinct from Magnet. */
(function (MM) {
  'use strict';
  var M = MM.math;
  MM.modes = MM.modes || {};

  function inRect(x, y, x0, y0, x1, y1) { return x >= x0 && x <= x1 && y >= y0 && y <= y1; }

  MM.modes.mirror = {
    id: 'mirror',
    label: 'Mirror',
    blurb: 'Your cursor carries an invisible mirror. One side of the grid is reflected onto the other, so moving the mirror rewrites half the composition.',
    params: [
      { key: 'direction', label: 'Mirror', type: 'select', value: 'h', options: [['h', 'Horizontal'], ['v', 'Vertical']] },
      { key: 'tilt', label: 'Tilt', type: 'range', min: -45, max: 45, step: 1, value: 0, unit: '°' },
      { key: 'scatter', label: 'Scatter', type: 'range', min: 0, max: 180, step: 1, value: 40, unit: '°' },
      { key: 'surface', label: 'Surface', type: 'select', value: 'glass', options: [['glass', 'Glass'], ['water', 'Water']] },
      { key: 'ripple', label: 'Ripple', type: 'range', min: 0, max: 100, step: 1, value: 45, unit: '%', show: function (v) { return v.surface === 'water'; } }
    ],
    createState: function () { return {}; },
    reset: function () {},

    update: function (els, env, p) {
      var g = env.grid, size = env.size, margin = size;
      // Horizontal: top is real, bottom is the reflection. Vertical: left is real, right reflects.
      var phi = (p.direction === 'h' ? 0 : -Math.PI / 2) + p.tilt * M.DEG;
      var dx = Math.cos(phi), dy = Math.sin(phi), nx = -dy, ny = dx;
      var px = env.tx, py = env.ty;
      var flip = M.mirrorAcross(phi, -1);
      var scatter = p.scatter * M.DEG;
      var water = p.surface === 'water', amp = p.ripple / 100;
      var diag = Math.hypot(env.w, env.h);

      function cellsIn(x0, y0, x1, y1, visit) {
        var i0 = Math.ceil((x0 - g.x0) / g.gapX), i1 = Math.floor((x1 - g.x0) / g.gapX);
        var j0 = Math.ceil((y0 - g.y0) / g.gapY), j1 = Math.floor((y1 - g.y0) / g.gapY);
        for (var j = j0; j <= j1; j++) for (var i = i0; i <= i1; i++) visit(i, j);
      }

      // Real side: cells as they are, each with its fixed scatter tilt
      var real = [];
      cellsIn(-margin, -margin, env.w + margin, env.h + margin, function (i, j) {
        var c = MM.grid.cell(g, i, j);
        if (nx * (c.x - px) + ny * (c.y - py) < margin) {
          c.m = M.rot((c.r2 * 2 - 1) * scatter);
          real.push(c);
        }
      });

      // Reflection: find the real cells whose mirror image lands on screen, and reflect them
      var bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
      [[0, 0], [env.w, 0], [0, env.h], [env.w, env.h]].forEach(function (q) {
        var s = nx * (q[0] - px) + ny * (q[1] - py);
        var rx = q[0] - 2 * s * nx, ry = q[1] - 2 * s * ny;
        bx0 = Math.min(bx0, rx); by0 = Math.min(by0, ry); bx1 = Math.max(bx1, rx); by1 = Math.max(by1, ry);
      });
      var refl = [];
      cellsIn(bx0 - margin, by0 - margin, bx1 + margin, by1 + margin, function (i, j) {
        var c = MM.grid.cell(g, i, j);
        var s = nx * (c.x - px) + ny * (c.y - py);
        if (s >= margin) return;
        var rx = c.x - 2 * s * nx, ry = c.y - 2 * s * ny;
        if (!inRect(rx, ry, -margin, -margin, env.w + margin, env.h + margin)) return;
        var rot = (c.r2 * 2 - 1) * scatter;
        if (water) {
          var depth = Math.abs(s), along = dx * (rx - px) + dy * (ry - py);
          var wave = Math.sin(env.t * 1.6 - depth * 0.045 + Math.sin(along * 0.01 + env.t * 0.7));
          var k = M.clamp(depth / (diag * 0.5), 0, 1);
          rx += dx * wave * amp * (3 + 16 * k);
          ry += dy * wave * amp * (3 + 16 * k);
          rot += wave * amp * 0.3 * k;
        }
        c.x = rx; c.y = ry;
        c.m = M.mul(flip, M.rot(rot));
        refl.push(c);
      });

      // Each side is clipped at the mirror, so pieces that touch it are cut like real objects
      var L = diag * 2;
      var a = [px - dx * L, py - dy * L], b = [px + dx * L, py + dy * L];
      var realClip = [a, b, [b[0] - nx * L, b[1] - ny * L], [a[0] - nx * L, a[1] - ny * L]];
      var reflClip = [a, b, [b[0] + nx * L, b[1] + ny * L], [a[0] + nx * L, a[1] + ny * L]];
      return [{ items: real, clip: realClip }, { items: refl, clip: reflClip }];
    }
  };
})(window.MM = window.MM || {});
