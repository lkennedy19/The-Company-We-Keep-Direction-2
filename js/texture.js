/* Print / video texture laid over each frame: animated grain, light speckle, faint horizontal
   streaks, and the inset frame from the reference. */
(function (MM) {
  'use strict';
  var SIZE = 256, grain = null, speck = null;

  function noiseCanvas(fn) {
    var c = document.createElement('canvas');
    c.width = c.height = SIZE;
    var g = c.getContext('2d'), img = g.createImageData(SIZE, SIZE), d = img.data;
    for (var i = 0; i < d.length; i += 4) fn(d, i);
    g.putImageData(img, 0, 0);
    return c;
  }

  function init(ctx) {
    var gc = noiseCanvas(function (d, i) {
      var v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    });
    var sc = noiseCanvas(function (d, i) {
      var on = Math.random() < 0.012;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = on ? 90 + Math.random() * 120 : 0;
    });
    grain = ctx.createPattern(gc, 'repeat');
    speck = ctx.createPattern(sc, 'repeat');
  }

  function patternFill(ctx, pat, W, H, scale) {
    var ox = Math.random() * SIZE, oy = Math.random() * SIZE;
    ctx.setTransform(scale, 0, 0, scale, -ox * scale, -oy * scale);
    ctx.fillStyle = pat;
    ctx.fillRect(ox, oy, W / scale, H / scale);
  }

  // o: { grain 0..1, streaks 0..1, frame (css px), frameColor }
  function draw(ctx, dpr, o) {
    if (!grain) init(ctx);
    var W = ctx.canvas.width, H = ctx.canvas.height, sc = Math.max(1, dpr * 0.75);
    ctx.save();
    if (o.grain > 0) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = o.grain * 0.5;
      patternFill(ctx, grain, W, H, sc);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = o.grain * 0.7;
      patternFill(ctx, speck, W, H, sc);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (o.streaks > 0) {
      ctx.globalCompositeOperation = 'source-over';
      var n = Math.round(o.streaks * 7);
      for (var i = 0; i < n; i++) {
        ctx.globalAlpha = (0.03 + Math.random() * 0.08) * o.streaks;
        ctx.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#000000';
        ctx.fillRect(0, Math.random() * H, W, Math.max(1, dpr * (0.5 + Math.random() * 1.5)));
      }
    }
    if (o.frame > 0) {
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      var f = o.frame * dpr;
      ctx.strokeStyle = o.frameColor;
      ctx.lineWidth = f;
      ctx.strokeRect(f / 2, f / 2, W - f, H - f);
    }
    ctx.restore();
  }

  MM.texture = { draw: draw };
})(window.MM = window.MM || {});
