/* Plane mirror geometry shared by the mirror compositions. A mirror is a line through (mx, my)
   running along `al`; `n` is its normal pointing to the front (the reflecting side). Reflection
   across that line gives the image of any point, and the reflection law follows from it: a ray
   that hits the mirror leaves as if it came straight from the image. */
(function (MM) {
  'use strict';
  var M = MM.math, D = MM.draw;

  function frame(mx, my, tiltDeg) {
    var a = tiltDeg * M.DEG;
    var al = [-Math.sin(a), Math.cos(a)], n = [-Math.cos(a), -Math.sin(a)];
    return { mx: mx, my: my, al: al, n: n, lineAngle: Math.atan2(al[1], al[0]) };
  }

  function sideDist(f, x, y) { return (x - f.mx) * f.n[0] + (y - f.my) * f.n[1]; }

  function reflect(f, x, y) {
    var d = sideDist(f, x, y);
    return [x - 2 * d * f.n[0], y - 2 * d * f.n[1]];
  }

  // 2x2 matrix that reflects across the mirror line (turns the object into its image)
  function flip(f) { return M.mirrorAcross(f.lineAngle, -1); }

  // Distance along (dx, dy) from (x, y) to just past the canvas edge
  function toEdge(x, y, dx, dy, w, h, m) {
    var t = Infinity;
    if (dx > 1e-6) t = Math.min(t, (w + m - x) / dx); else if (dx < -1e-6) t = Math.min(t, (-m - x) / dx);
    if (dy > 1e-6) t = Math.min(t, (h + m - y) / dy); else if (dy < -1e-6) t = Math.min(t, (-m - y) / dy);
    return isFinite(t) ? Math.max(0, t) : 0;
  }

  // Half the extent of a shape across the mirror (along its normal), for keeping it in front
  function halfAcross(item, size, angle, f) {
    var a = item ? item.sprite.aspect : 1;
    var w = a >= 1 ? size : size * a, h = a >= 1 ? size / a : size;
    var rel = angle - Math.atan2(f.n[1], f.n[0]);
    return 0.5 * (Math.abs(w * Math.cos(rel)) + Math.abs(h * Math.sin(rel)));
  }

  // The mirror: a slab behind the reflecting surface, lighter at the surface
  function drawMirror(ctx, f, thick, length, col) {
    if (thick <= 0) return;
    var dp = D.dpr, ux = -f.n[0], uy = -f.n[1];
    ctx.save();
    ctx.setTransform(dp * ux, dp * uy, dp * f.al[0], dp * f.al[1], dp * f.mx, dp * f.my);
    var g = ctx.createLinearGradient(0, 0, thick, 0);
    g.addColorStop(0, D.mix(col.metal, '#ffffff', 0.375));
    g.addColorStop(1, D.mix(col.metal, col.ground, 0.25));
    ctx.fillStyle = g;
    ctx.fillRect(0, -length / 2, thick, length);
    ctx.restore();
  }

  var mirrorParams = [
    { key: 'mirrorPos', label: 'Mirror position', type: 'range', min: 10, max: 90, step: 0.5, value: 50, unit: '%' },
    { key: 'tilt', label: 'Mirror tilt', type: 'range', min: -45, max: 45, step: 0.5, value: 0, unit: '°' },
    { key: 'slab', label: 'Mirror thickness', type: 'range', min: 0, max: 10, step: 0.1, value: 2, unit: '%' }
  ];

  MM.optics = { frame: frame, sideDist: sideDist, reflect: reflect, flip: flip, toEdge: toEdge, halfAcross: halfAcross, drawMirror: drawMirror, mirrorParams: mirrorParams };
})(window.MM = window.MM || {});
