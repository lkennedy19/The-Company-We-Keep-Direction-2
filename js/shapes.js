/* Built-in shapes and the SVG loader. Every shape becomes a white silhouette sprite,
   which the drawing helpers tint to whatever colour a concept needs. */
(function (MM) {
  'use strict';
  var RASTER = 512; // long side of each rasterised shape, in px

  var presets = {
    oval: { label: 'Oval', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100"><ellipse cx="80" cy="50" rx="80" ry="50" fill="#fff"/></svg>' },
    capsule: { label: 'Capsule', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 220"><rect width="100" height="220" rx="50" fill="#fff"/></svg>' },
    dot: { label: 'Dot', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#fff"/></svg>' },
    pebble: { label: 'Pebble', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80"><path fill="#fff" d="M46 2c24-2 50 10 53 34 3 22-17 41-45 43C25 81 2 68 1 45-1 21 21 4 46 2z"/></svg>' },
    house: { label: 'House', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#fff" d="M0 40 50 0l50 40v60H0z"/></svg>' },
    bar: { label: 'Bar', svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 22"><rect width="100" height="22" fill="#fff"/></svg>' }
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

  // Rasterise a source as a white silhouette
  function makeSprite(source) {
    var a = source.aspect;
    var c = document.createElement('canvas');
    c.width = a >= 1 ? RASTER : Math.max(1, Math.round(RASTER * a));
    c.height = a >= 1 ? Math.max(1, Math.round(RASTER / a)) : RASTER;
    var ctx = c.getContext('2d');
    source.draw(ctx, c.width, c.height);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    return { canvas: c, aspect: a };
  }

  MM.shapes = { presets: presets, loadSvg: loadSvg, makeSprite: makeSprite };
})(window.MM = window.MM || {});
