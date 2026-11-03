/* Draws layers of items. Each item is { x, y, m: 2x2 matrix, r1: shape picker, alpha? };
   a layer may carry a clip polygon in CSS pixels. */
(function (MM) {
  'use strict';

  function draw(ctx, layers, sprites, size, dpr, bg) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    var n = sprites.length;
    if (!n) return;

    var dims = sprites.map(function (s) {
      return s.aspect >= 1 ? [size, size / s.aspect] : [size * s.aspect, size];
    });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    for (var l = 0; l < layers.length; l++) {
      var layer = layers[l], items = layer.items;
      if (layer.clip) {
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.beginPath();
        layer.clip.forEach(function (pt, k) { k ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]); });
        ctx.closePath();
        ctx.clip();
      }
      for (var i = 0; i < items.length; i++) {
        var e = items[i], m = e.m;
        var alpha = e.alpha == null ? 1 : e.alpha;
        if (alpha <= 0.001) continue;
        var si = Math.min(n - 1, (e.r1 * n) | 0), d = dims[si];
        ctx.globalAlpha = alpha;
        ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * e.x, dpr * e.y);
        ctx.drawImage(sprites[si].canvas, -d[0] / 2, -d[1] / 2, d[0], d[1]);
      }
      if (layer.clip) ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  MM.renderer = { draw: draw };
})(window.MM = window.MM || {});
