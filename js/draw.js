/* Drawing helpers shared by the compositions: tinted shapes, hairlines, fills and arrowheads.
   All coordinates are CSS pixels; MM.draw.dpr is set by the app. */
(function (MM) {
  'use strict';
  var M = MM.math;
  var tints = new Map(), mixes = new Map();
  var TIERS = { small: 160, large: 512 };

  function hexRgb(hex) {
    var n = parseInt(hex.slice(1), 16);
    return [n >> 16 & 255, n >> 8 & 255, n & 255];
  }

  // Blend two colours; t is snapped to 1/16 steps so tinted shapes can be cached
  function mix(a, b, t) {
    t = Math.round(M.clamp(t, 0, 1) * 16) / 16;
    if (t === 0) return a;
    if (t === 1) return b;
    var key = a + b + t;
    var hit = mixes.get(key);
    if (hit) return hit;
    var x = hexRgb(a), y = hexRgb(b);
    var c = '#' + [0, 1, 2].map(function (i) {
      return Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
    }).join('');
    mixes.set(key, c);
    return c;
  }

  function tint(item, color, tier) {
    var key = item.id + color + tier, c = tints.get(key);
    if (c) return c;
    if (tints.size > 800) tints.clear();
    var sp = item.sprite, max = TIERS[tier] || TIERS.small;
    c = document.createElement('canvas');
    c.width = sp.aspect >= 1 ? max : Math.max(1, Math.round(max * sp.aspect));
    c.height = sp.aspect >= 1 ? Math.max(1, Math.round(max / sp.aspect)) : max;
    var g = c.getContext('2d');
    g.drawImage(sp.canvas, 0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    tints.set(key, c);
    return c;
  }

  // Draw a shape centred at (x, y) with 2x2 matrix m (rotation / reflection), long side = size
  function shape(ctx, item, color, x, y, m, size, tier) {
    if (!item || size <= 0.2) return;
    var img = tint(item, color, tier || 'small'), a = item.sprite.aspect, d = MM.draw.dpr;
    var w = a >= 1 ? size : size * a, h = a >= 1 ? size / a : size;
    ctx.setTransform(d * m[0], d * m[1], d * m[2], d * m[3], d * x, d * y);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }

  function trace(ctx, pts) {
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  }

  function hairline(ctx, pts, color, width, dash, dashOffset) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) { ctx.setLineDash(dash); ctx.lineDashOffset = dashOffset || 0; }
    trace(ctx, pts);
    ctx.stroke();
    ctx.restore();
  }

  function fill(ctx, pts, color) {
    ctx.fillStyle = color;
    trace(ctx, pts);
    ctx.closePath();
    ctx.fill();
  }

  // Small solid arrowhead at (x, y) pointing along angle a
  function arrow(ctx, x, y, a, size, color) {
    var c = Math.cos(a), s = Math.sin(a), b = size * 0.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + c * size * 0.6, y + s * size * 0.6);
    ctx.lineTo(x - c * size * 0.4 - s * b, y - s * size * 0.4 + c * b);
    ctx.lineTo(x - c * size * 0.4 + s * b, y - s * size * 0.4 - c * b);
    ctx.closePath();
    ctx.fill();
  }

  MM.draw = { dpr: 1, mix: mix, shape: shape, hairline: hairline, fill: fill, arrow: arrow };
})(window.MM = window.MM || {});
