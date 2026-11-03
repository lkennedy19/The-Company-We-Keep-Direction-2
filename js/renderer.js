/* Draws the grid: each element is the shape sprite placed with its own 2x2 matrix and opacity. */
(function (MM) {
  'use strict';

  function draw(ctx, els, sprite, size, dpr, bg) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (!sprite) return;

    var sw = sprite.aspect >= 1 ? size : size * sprite.aspect;
    var sh = sprite.aspect >= 1 ? size / sprite.aspect : size;
    var img = sprite.canvas;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    for (var i = 0; i < els.length; i++) {
      var e = els[i], m = e.m;
      if (e.alpha <= 0.001) continue;
      ctx.globalAlpha = e.alpha;
      ctx.setTransform(dpr * m[0], dpr * m[1], dpr * m[2], dpr * m[3], dpr * (e.x + (e.ox || 0)), dpr * e.y);
      ctx.drawImage(img, -sw / 2, -sh / 2, sw, sh);
    }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }


  MM.renderer = { draw: draw };
})(window.MM = window.MM || {});
