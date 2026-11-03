/* MAGNET · FIELD LINES — the magnet's field drawn as flux tubes: the space between neighbouring
   field lines holds equal flux, so tubes are thin where the field is strong (near the poles) and
   wide where it is weak. Draw them as alternating solid bands, as one solid field with the lines
   cut out of it, or as plain lines. */
(function (MM) {
  'use strict';
  var G = MM.magnet, D = MM.draw;
  MM.compositions = MM.compositions || [];

  function closedPoly(a, b) {
    // Region between line a (inner) and line b (outer): b forward, then a backward
    var out = b.slice();
    for (var i = a.length - 2; i >= 0; i -= 2) out.push(a[i], a[i + 1]);
    return out;
  }

  MM.compositions.push({
    id: 'magnet-lines',
    group: 'magnet',
    label: 'Field lines',
    blurb: 'The field of a bar magnet. Each band between neighbouring lines carries the same amount of field, so bands are thin where the field is strong and wide where it is weak.',
    uses: [],
    params: [
      { key: 'lines', label: 'Field lines', type: 'range', min: 2, max: 18, step: 1, value: 7, snap: true },
      { key: 'style', label: 'Style', type: 'select', value: 'bands', options: [['bands', 'Bands'], ['solid', 'Solid'], ['lines', 'Lines']] },
      { key: 'weight', label: 'Line weight', type: 'range', min: 0.1, max: 4, step: 0.05, value: 0.7, unit: '%', show: function (v) { return v.style !== 'bands'; } },
      { key: 'axis', label: 'Line along the axis', type: 'toggle', value: false }
    ].concat(G.placement),

    draw: function (ctx, env, p, lib, col) {
      var pl = G.place(env, p), m = pl.m, rFar = env.diag * 3;
      var seeds = G.seeds(m, p.lines);
      var lines = seeds.map(function (y) { return G.line(m, y, rFar).pts; });
      var lw = Math.max(1, p.weight / 100 * env.unit);

      [1, -1].forEach(function (side) {
        var W = lines.map(function (l) { return G.toWorld(l, pl.cx, pl.cy, pl.ang, side); });
        if (p.style === 'bands') {
          for (var k = 0; k < W.length; k += 2) D.fill(ctx, k ? closedPoly(W[k - 1], W[k]) : W[0], col.primary);
        } else if (p.style === 'solid') {
          D.fill(ctx, W[W.length - 1], col.primary);
          for (var j = 0; j < W.length - 1; j++) D.hairline(ctx, W[j], col.ground, lw);
        } else {
          for (var i = 0; i < W.length; i++) D.hairline(ctx, W[i], col.primary, lw);
        }
      });

      if (p.axis) {
        var far = env.diag * 2, axW = Math.max(1, (p.style === 'bands' ? 0.4 : p.weight) / 100 * env.unit);
        D.hairline(ctx, G.toWorld([m.hx, 0, far, 0], pl.cx, pl.cy, pl.ang, 1), p.style === 'lines' ? col.primary : col.metal, axW);
        D.hairline(ctx, G.toWorld([-m.hx, 0, -far, 0], pl.cx, pl.cy, pl.ang, 1), p.style === 'lines' ? col.primary : col.metal, axW);
      }
      if (p.showBar) G.drawBar(ctx, m, pl.cx, pl.cy, pl.ang, col);
    }
  });
})(window.MM = window.MM || {});
