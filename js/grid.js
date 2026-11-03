/* Builds the centred grid of elements that every mode animates. */
(function (MM) {
  'use strict';

  function build(w, h, gapX, gapY) {
    var cols = Math.max(1, Math.ceil(w / gapX) + 1);
    var rows = Math.max(1, Math.ceil(h / gapY) + 1);
    var x0 = (w - (cols - 1) * gapX) / 2;
    var y0 = (h - (rows - 1) * gapY) / 2;
    var els = [];
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        els.push({ x: x0 + i * gapX, y: y0 + j * gapY, col: i, row: j, rot: 0, m: [1, 0, 0, 1], alpha: 1 });
      }
    }
    return els;
  }

  MM.grid = { build: build };
})(window.MM = window.MM || {});
