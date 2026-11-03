/* MIRROR · RAYS — light leaving an object, hitting a plane mirror and bouncing off at the same
   angle it arrived. Each ray is a row of the module; dashed lines trace the bounced rays back
   behind the mirror, where they meet at the image. */
(function (MM) {
  'use strict';
  var M = MM.math, O = MM.optics, P = MM.path, D = MM.draw;
  MM.compositions = MM.compositions || [];
  var tmp = [0, 0, 0];

  MM.compositions.push({
    id: 'mirror-rays',
    group: 'mirror',
    label: 'Rays',
    blurb: 'Rays leave the object and bounce off the mirror at the angle they arrived. Traced back, the bounced rays meet behind the mirror at the image.',
    uses: ['object', 'module'],
    params: [
      { key: 'object', label: 'Object', type: 'shape', value: 'capsule' },
      { key: 'module', label: 'Module', type: 'shape', value: 'dot' },
      { key: 'rays', label: 'Rays', type: 'range', min: 1, max: 9, step: 1, value: 3, snap: true },
      { key: 'aim', label: 'Where rays hit', type: 'range', min: -100, max: 100, step: 0.5, value: 45, unit: '%' },
      { key: 'spread', label: 'Ray spread', type: 'range', min: 0, max: 40, step: 0.25, value: 10, unit: '%' },
      { key: 'moduleSize', label: 'Module size', type: 'range', min: 0.4, max: 8, step: 0.05, value: 2.2, unit: '%' },
      { key: 'spacing', label: 'Module spacing', type: 'range', min: 0.3, max: 12, step: 0.05, value: 1.6, unit: '%' },
      { key: 'shift', label: 'Slide along rays', type: 'range', min: 0, max: 100, step: 0.5, value: 0, unit: '%' },
      { key: 'tint', label: 'Tint at the mirror', type: 'range', min: 0, max: 100, step: 1, value: 60, unit: '%' },
      { key: 'dashed', label: 'Dashed lines to the image', type: 'toggle', value: true },
      { key: 'showImage', label: 'Show the image', type: 'toggle', value: true },
      { key: 'distance', label: 'Object distance', type: 'range', min: 0, max: 60, step: 0.25, value: 18, unit: '%' },
      { key: 'along', label: 'Object position along mirror', type: 'range', min: -60, max: 60, step: 0.25, value: -18, unit: '%' },
      { key: 'size', label: 'Object size', type: 'range', min: 4, max: 60, step: 0.25, value: 20, unit: '%' },
      { key: 'angle', label: 'Object rotation', type: 'range', min: -180, max: 180, step: 1, value: 0, unit: '°' }
    ].concat(O.mirrorParams.map(function (s) { return s.key === 'mirrorPos' ? Object.assign({}, s, { value: 58 }) : s; })),

    draw: function (ctx, env, p, lib, col) {
      var f = O.frame(env.w * p.mirrorPos / 100, env.h / 2, p.tilt);
      var item = lib.get(p.object), size = p.size / 100 * env.unit, a = p.angle * M.DEG;
      var d = O.halfAcross(item, size, a, f) + p.distance / 100 * env.unit + p.slab / 200 * env.unit;
      var along = p.along / 100 * env.h;
      var ox = f.mx + f.n[0] * d + f.al[0] * along, oy = f.my + f.n[1] * d + f.al[1] * along;
      var img = O.reflect(f, ox, oy), mObj = M.rot(a), mImg = M.mul(O.flip(f), mObj);
      var fx = ox - f.n[0] * d, fy = oy - f.n[1] * d; // the object's foot on the mirror

      // Hit points along the mirror; each bounced ray heads straight away from the image
      var rays = [], aim = p.aim / 100 * env.h * 0.5, spread = p.spread / 100 * env.unit;
      for (var k = 0; k < p.rays; k++) {
        var off = aim + (k - (p.rays - 1) / 2) * spread;
        var hx = fx + f.al[0] * off, hy = fy + f.al[1] * off;
        var rx = hx - img[0], ry = hy - img[1], rl = Math.hypot(rx, ry) || 1;
        rx /= rl; ry /= rl;
        var te = O.toEdge(hx, hy, rx, ry, env.w, env.h, env.unit * 0.1);
        rays.push({ hx: hx, hy: hy, ex: hx + rx * te, ey: hy + ry * te });
      }

      var lw = Math.max(1, env.unit * 0.0022), dash = Math.max(3, env.unit * 0.011);
      if (p.dashed) rays.forEach(function (r) { D.hairline(ctx, [r.hx, r.hy, img[0], img[1]], col.metal, lw, [dash, dash]); });
      if (p.showImage) D.shape(ctx, item, col.secondary, img[0], img[1], mImg, size, 'large');
      O.drawMirror(ctx, f, p.slab / 100 * env.unit, env.diag * 2, col);

      var ms = p.moduleSize / 100 * env.unit, gapPx = Math.max(1, p.spacing / 100 * env.unit), tint = p.tint / 100;
      rays.forEach(function (r, k) {
        var path = P.measure([ox, oy, r.hx, r.hy, r.ex, r.ey]);
        var hit = Math.hypot(r.hx - ox, r.hy - oy);
        for (var i = 0, s = (p.shift / 100) * gapPx; s <= path.len; i++, s += gapPx) {
          P.at(path, s, tmp);
          var red = tint * Math.exp(-Math.pow((s - hit) / (gapPx * 1.6 + ms), 2));
          D.shape(ctx, lib.moduleAt(p.module, k * 1000 + i), D.mix(col.module, col.accent, red), tmp[0], tmp[1], M.rot(tmp[2]), ms);
        }
      });
      D.shape(ctx, item, col.secondary, ox, oy, mObj, size, 'large');
    }
  });
})(window.MM = window.MM || {});
