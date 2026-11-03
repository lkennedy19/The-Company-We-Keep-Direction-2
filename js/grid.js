/* The grid every mode works on. It is conceptually infinite: any cell (i, j) has a fixed position
   and fixed random values, so modes can reach cells beyond the canvas (e.g. to reflect them). */
(function (MM) {
  'use strict';

  // Deterministic 0..1 random value for a cell and channel
  function hash(i, j, k) {
    var h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263) ^ Math.imul(k | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  // r1 picks which shape the cell shows, r2 is a free random value (e.g. scatter rotation)
  function cell(g, i, j) {
    return {
      x: g.x0 + i * g.gapX,
      y: g.y0 + j * g.gapY,
      col: i, row: j,
      r1: hash(i, j, g.seed * 2 + 1),
      r2: hash(i, j, g.seed * 2 + 2),
      rot: 0, m: [1, 0, 0, 1], alpha: 1
    };
  }

  // Grid centred on a w x h canvas, with the visible cells pre-built in `els`
  function create(w, h, gapX, gapY, seed) {
    var cols = Math.max(1, Math.ceil(w / gapX) + 1);
    var rows = Math.max(1, Math.ceil(h / gapY) + 1);
    var g = {
      gapX: gapX, gapY: gapY, seed: seed, cols: cols, rows: rows,
      x0: (w - (cols - 1) * gapX) / 2,
      y0: (h - (rows - 1) * gapY) / 2,
      els: []
    };
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) g.els.push(cell(g, i, j));
    }
    return g;
  }

  MM.grid = { create: create, cell: cell };
})(window.MM = window.MM || {});
