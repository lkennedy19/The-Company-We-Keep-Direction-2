/* Print / video texture laid over each frame: grain, light speckle, faint horizontal streaks and
   the inset frame from the reference. It is fixed (seeded), so a still composition stays still. */
(function (MM) {
  'use strict';
  var SIZE = 256, grain = null, speck = null;

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function noiseCanvas(seed, fn) {
    var rand = mulberry32(seed), c = document.createElement('canvas');
    c.width = c.height = SIZE;
    var g = c.getContext('2d'), img = g.createImageData(SIZE, SIZE), d = img.data;
    for (var i = 0; i < d.length; i += 4) fn(d, i, rand);
    g.putImageData(img, 0, 0);
    return c;
  }

  function init(ctx) {
    grain = ctx.createPattern(noiseCanvas(7, function (d, i, r) {
      var v = r() * 255;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }), 'repeat');
    speck = ctx.createPattern(noiseCanvas(11, function (d, i, r) {
      var on = r() < 0.012;
      d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = on ? 90 + r() * 120 : 0;
    }), 'repeat');
  }

  function patternFill(ctx, pat, W, H, scale) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W / scale, H / scale);
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
      var rand = mulberry32(23), n = Math.round(o.streaks * 7);
      for (var i = 0; i < n; i++) {
        var y = rand(), a = rand(), light = rand() < 0.5, thick = rand();
        ctx.globalAlpha = (0.03 + a * 0.08) * o.streaks;
        ctx.fillStyle = light ? '#ffffff' : '#000000';
        ctx.fillRect(0, y * H, W, Math.max(1, dpr * (0.5 + thick * 1.5)));
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
