/* MIRROR — a plane mirror diagram. The object sits in front of the mirror and its image sits the
   same distance behind it, reversed. Rays leave the object, bounce off the mirror at equal angles,
   and carry chains of the module; dashed hairlines trace the bounced rays back to the image.
   Copies of the object spread toward the mirror and fold back (an accordion), mirrored behind it. */
(function (MM) {
  'use strict';
  var M = MM.math, P = MM.path, D = MM.draw;
  MM.concepts = MM.concepts || {};

  // Mirror line through (mx, my) running along `al`; `n` is the normal pointing to the front
  function frame(env, p) {
    var a = p.mirrorAngle * M.DEG;
    var al = [-Math.sin(a), Math.cos(a)], n = [-Math.cos(a), -Math.sin(a)];
    return { mx: env.w * p.mirrorPos / 100, my: env.h / 2, al: al, n: n, lineAngle: Math.atan2(al[1], al[0]) };
  }

  function sideDist(f, x, y) { return (x - f.mx) * f.n[0] + (y - f.my) * f.n[1]; }
  function reflect(f, x, y) {
    var d = sideDist(f, x, y);
    return [x - 2 * d * f.n[0], y - 2 * d * f.n[1]];
  }

  // Distance along (dx, dy) from (x, y) to just past the canvas edge
  function toEdge(x, y, dx, dy, w, h, m) {
    var t = Infinity;
    if (dx > 1e-6) t = Math.min(t, (w + m - x) / dx); else if (dx < -1e-6) t = Math.min(t, (-m - x) / dx);
    if (dy > 1e-6) t = Math.min(t, (h + m - y) / dy); else if (dy < -1e-6) t = Math.min(t, (-m - y) / dy);
    return isFinite(t) ? Math.max(0, t) : 0;
  }

  MM.concepts.mirror = {
    id: 'mirror',
    label: 'Mirror',
    blurb: 'A plane mirror. Your object sits in front and its image the same distance behind. Rays bounce off at equal angles; dashed lines trace them back to the image.',
    params: [
      { key: 'echoes', label: 'Echoes', type: 'range', min: 0, max: 8, step: 1, value: 4 },
      { key: 'echoReach', label: 'Echo reach', type: 'range', min: 0, max: 100, step: 1, value: 90, unit: '%' },
      { key: 'rays', label: 'Rays', type: 'range', min: 0, max: 6, step: 1, value: 3 },
      { key: 'aim', label: 'Ray angle', type: 'range', min: -100, max: 100, step: 1, value: 55, unit: '%' },
      { key: 'spread', label: 'Ray spread', type: 'range', min: 0, max: 30, step: 0.5, value: 11, unit: '%' },
      { key: 'virtual', label: 'Dashed lines to the image', type: 'toggle', value: true },
      { key: 'objectSize', label: 'Object size', type: 'range', min: 5, max: 50, step: 0.5, value: 26, unit: '%' },
      { key: 'objectAngle', label: 'Object rotation', type: 'range', min: -180, max: 180, step: 1, value: 0, unit: '°' },
      { key: 'mirrorPos', label: 'Mirror position', type: 'range', min: 30, max: 85, step: 1, value: 56, unit: '%' },
      { key: 'mirrorAngle', label: 'Mirror tilt', type: 'range', min: -30, max: 30, step: 1, value: 0, unit: '°' },
      { key: 'slab', label: 'Mirror thickness', type: 'range', min: 0.5, max: 8, step: 0.1, value: 2.4, unit: '%' },
      { key: 'size', label: 'Module size', type: 'range', min: 1, max: 15, step: 0.1, value: 3.6, unit: '%' },
      { key: 'count', label: 'Modules per ray', type: 'range', min: 3, max: 60, step: 1, value: 22 },
      { key: 'bunch', label: 'Accordion', type: 'range', min: 0, max: 95, step: 1, value: 60, unit: '%' },
      { key: 'flow', label: 'Flow speed', type: 'range', min: 0, max: 8, step: 1, value: 2 },
      { key: 'bounceTint', label: 'Bounce tint', type: 'range', min: 0, max: 100, step: 1, value: 70, unit: '%' }
    ],
    createState: function () { return {}; },

    home: function (w, h, p) {
      var f = frame({ w: w, h: h }, p), front = w * p.mirrorPos / 100;
      return { x: f.mx + f.n[0] * front * 0.55 - f.al[0] * h * 0.16, y: f.my + f.n[1] * front * 0.55 - f.al[1] * h * 0.16 };
    },

    draw: function (ctx, env, p, st, lib, col) {
      var unit = env.unit, ph = env.phase, f = frame(env, p);
      var obj = lib.objectItem(), objSize = p.objectSize / 100 * unit;
      var asp = obj ? obj.sprite.aspect : 1;
      var halfW = 0.5 * objSize * Math.min(1, asp); // half the object's width across the mirror
      var slab = p.slab / 100 * unit;

      // Keep the object in front of the mirror
      var ox = env.tx, oy = env.ty, d = sideDist(f, ox, oy), dMin = halfW + slab * 0.5 + unit * 0.01;
      if (d < dMin) { ox += f.n[0] * (dMin - d); oy += f.n[1] * (dMin - d); d = dMin; }
      var fx = ox - f.n[0] * d, fy = oy - f.n[1] * d;   // foot of the object on the mirror
      var img = reflect(f, ox, oy);
      var mObj = M.rot(p.objectAngle * M.DEG);
      var mImg = M.mul(M.mirrorAcross(f.lineAngle, -1), mObj);

      // Echo positions: copies spread from the object toward the mirror and fold back
      var echoes = [], reachK = (p.echoReach / 100) * Math.max(0, d - halfW) / d;
      for (var j = p.echoes; j >= 1; j--) {
        var open = 0.5 - 0.5 * Math.cos(M.TAU * (ph - j * 0.045));
        var t = (j / p.echoes) * open * reachK;
        echoes.push([ox + (fx - ox) * t, oy + (fy - oy) * t]);
      }

      // Rays: hit points along the mirror, bounce direction away from the image
      var rays = [], aimY = p.aim / 100 * env.h * 0.5, spread = p.spread / 100 * unit;
      for (var k = 0; k < p.rays; k++) {
        var off = aimY + (k - (p.rays - 1) / 2) * spread;
        var hx = fx + f.al[0] * off, hy = fy + f.al[1] * off;
        if (hx < 0 || hx > env.w || hy < 0 || hy > env.h) continue;
        var rx = hx - img[0], ry = hy - img[1], rl = Math.hypot(rx, ry) || 1;
        rx /= rl; ry /= rl;
        var te = toEdge(hx, hy, rx, ry, env.w, env.h, unit * 0.1);
        rays.push({ hx: hx, hy: hy, ex: hx + rx * te, ey: hy + ry * te });
      }

      var lw = Math.max(1, unit * 0.0022);

      // 1. Dashed lines behind the mirror, converging on the image
      if (p.virtual) {
        var dash = Math.max(3, unit * 0.011);
        rays.forEach(function (r) {
          D.hairline(ctx, [r.hx, r.hy, img[0], img[1]], col.metal, lw, [dash, dash], ph * p.flow * 2 * dash * 2);
        });
      }

      // 2. The image and its echoes (behind the mirror)
      echoes.forEach(function (e) {
        var r = reflect(f, e[0], e[1]);
        D.shape(ctx, obj, col.secondary, r[0], r[1], mImg, objSize, 'large');
      });
      D.shape(ctx, obj, col.secondary, img[0], img[1], mImg, objSize, 'large');

      // 3. The mirror: a slab behind the reflecting surface, lighter at the surface
      var dp = D.dpr, ux = -f.n[0], uy = -f.n[1];
      ctx.save();
      ctx.setTransform(dp * ux, dp * uy, dp * f.al[0], dp * f.al[1], dp * f.mx, dp * f.my);
      var grad = ctx.createLinearGradient(0, 0, slab, 0);
      grad.addColorStop(0, D.mix(col.metal, '#ffffff', 0.375));
      grad.addColorStop(1, D.mix(col.metal, col.ground, 0.25));
      ctx.fillStyle = grad;
      ctx.fillRect(0, -env.diag, slab, env.diag * 2);
      ctx.restore();

      // 4. Rays: module chains from the object to the mirror and away
      var size = p.size / 100 * unit, tint = p.bounceTint / 100, bunch = p.bunch / 100;
      rays.forEach(function (r, k) {
        var path = P.measure([ox, oy, r.hx, r.hy, r.ex, r.ey]);
        var l1 = Math.hypot(r.hx - ox, r.hy - oy), f1 = l1 / (path.len || 1);
        var b = bunch * (0.5 - 0.5 * Math.cos(M.TAU * (ph - k * 0.08)));
        D.chain(ctx, path, {
          count: p.count,
          phase: ph * p.flow * 3,
          warp: function (u) {
            return u < f1 ? f1 * P.bunchWarp(u / f1, b) : f1 + (1 - f1) * P.bunchWarp((u - f1) / (1 - f1), b);
          },
          size: size,
          item: function (i) { return lib.moduleAt(k * 1000 + ((i % 997) + 997) % 997); },
          color: function (u) { return D.mix(col.accent, col.module, 1 - tint * Math.exp(-Math.pow((u - f1) / 0.07, 2))); },
          fade: size * 0.8
        });
      });

      // 5. Echoes, then the object on top
      echoes.forEach(function (e) { D.shape(ctx, obj, col.secondary, e[0], e[1], mObj, objSize, 'large'); });
      D.shape(ctx, obj, col.secondary, ox, oy, mObj, objSize, 'large');
    }
  };
})(window.MM = window.MM || {});
