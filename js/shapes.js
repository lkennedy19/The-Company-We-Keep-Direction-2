/* Shape sources (built-in presets, typed words, uploaded SVGs) and the tinted sprite
   that the renderer stamps across the grid. */
(function (MM) {
  'use strict';
  var RASTER = 768; // long side of the rasterised shape, in device pixels
  var WORD_FONT = '700 200px "Helvetica Neue", Helvetica, Arial, sans-serif';

  var presets = {
    bar: {
      label: 'Bar',
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 16"><rect width="100" height="16" fill="#fff"/></svg>',
      gapX: 34, gapY: 34, size: 28
    },
    harpoon: {
      label: 'Harpoon',
      // Asymmetric on both axes so mirroring is always visible
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 40"><path fill="#fff" d="M0 28h84L62 6l8-6 30 34H0z"/></svg>',
      gapX: 46, gapY: 46, size: 38
    },
    word: { label: 'Word', word: true, gapX: 120, gapY: 92, size: 78 }
  };

  function sourceFromImage(img, w, h) {
    return { draw: function (ctx, cw, ch) { ctx.drawImage(img, 0, 0, cw, ch); }, aspect: w / h };
  }

  // Parse SVG text into a drawable source. Rejects with a readable message on bad input.
  function loadSvg(text) {
    return new Promise(function (resolve, reject) {
      var doc = new DOMParser().parseFromString(text, 'image/svg+xml');
      var svg = doc.documentElement;
      if (!svg || svg.nodeName.toLowerCase() !== 'svg' || doc.getElementsByTagName('parsererror').length) {
        reject(new Error('That file is not a valid SVG.'));
        return;
      }
      var vw = 0, vh = 0, vb = svg.getAttribute('viewBox');
      if (vb) {
        var n = vb.trim().split(/[\s,]+/).map(Number);
        vw = n[2]; vh = n[3];
      }
      if (!(vw > 0 && vh > 0)) {
        vw = parseFloat(svg.getAttribute('width')) || 100;
        vh = parseFloat(svg.getAttribute('height')) || 100;
        svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
      }
      var aspect = vw / vh;
      var w = aspect >= 1 ? RASTER : Math.round(RASTER * aspect);
      var h = aspect >= 1 ? Math.round(RASTER / aspect) : RASTER;
      svg.setAttribute('width', w);
      svg.setAttribute('height', h);
      if (!svg.getAttribute('xmlns')) svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      var img = new Image();
      img.onload = function () { resolve(sourceFromImage(img, w, h)); };
      img.onerror = function () { reject(new Error('The browser could not render that SVG.')); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    });
  }

  // A word set in bold sans, trimmed tight to its ink
  function wordSource(text) {
    text = (text || '').trim() || 'KEEP';
    var probe = document.createElement('canvas').getContext('2d');
    probe.font = WORD_FONT;
    var mt = probe.measureText(text);
    var asc = mt.actualBoundingBoxAscent || 145, desc = mt.actualBoundingBoxDescent || 0;
    var left = mt.actualBoundingBoxLeft || 0, right = mt.actualBoundingBoxRight || mt.width;
    var w = Math.max(1, left + right), h = Math.max(1, asc + desc);
    return {
      aspect: w / h,
      draw: function (ctx, cw, ch) {
        ctx.save();
        ctx.scale(cw / w, ch / h);
        ctx.font = WORD_FONT;
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#fff';
        ctx.fillText(text, left, asc);
        ctx.restore();
      }
    };
  }

  // Rasterise a source; unless keepColors, flatten it to a single colour
  function makeSprite(source, color, keepColors) {
    var a = source.aspect;
    var c = document.createElement('canvas');
    c.width = a >= 1 ? RASTER : Math.max(1, Math.round(RASTER * a));
    c.height = a >= 1 ? Math.max(1, Math.round(RASTER / a)) : RASTER;
    var ctx = c.getContext('2d');
    source.draw(ctx, c.width, c.height);
    if (!keepColors) {
      ctx.globalCompositeOperation = 'source-in';
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    return { canvas: c, aspect: a };
  }

  MM.shapes = { presets: presets, loadSvg: loadSvg, wordSource: wordSource, makeSprite: makeSprite };
})(window.MM = window.MM || {});
