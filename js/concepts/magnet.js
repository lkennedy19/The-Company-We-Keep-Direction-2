/* MAGNET — a bar magnet and its real field. The field comes from two opposite magnetic poles
   inside the bar; field lines are traced through it from one pole to the other. Closed loops carry
   chains of the module flowing pole to pole; the outer loop is filled as a solid field shape; a few
   flaring lines beyond it stay as hairlines. Everything animates on the loop clock. */
(function (MM) {
  'use strict';
  var M = MM.math, P = MM.path, D = MM.draw;
  MM.concepts = MM.concepts || {};

  var ALPHA_MAX = Math.PI * 0.84; // seed angles beyond this hug the bar
  var v = [0, 0], tmp = [0, 0, 0];

  // Field of +1 at (c, 0) and -1 at (-c, 0), in the magnet's own frame
  function field(c, x, y, out) {
    var ax = x - c, bx = x + c;
    var ra = ax * ax + y * y, rb = bx * bx + y * y;
    ra *= Math.sqrt(ra); rb *= Math.sqrt(rb);
    out[0] = ax / ra - bx / rb;
    out[1] = y / ra - y / rb;
  }

  // Follow the field from the north pole at seed angle `alpha`. Returns flat points and whether it closed.
  function traceLine(c, r0, alpha, rmax) {
    var x = c + r0 * Math.cos(alpha), y = r0 * Math.sin(alpha);
    var pts = [x, y], apex = Math.abs(y), closed = false, r2max = rmax * rmax;
    for (var n = 0; n < 4000; n++) {
      var rs = Math.hypot(x + c, y), rn = Math.hypot(x - c, y);
      if (rs < r0) { closed = true; break; }
      if (x * x + y * y > r2max) break;
      var h = M.clamp(0.07 * Math.min(rn, rs), 1.2, 40);
      field(c, x, y, v);
      var m = Math.hypot(v[0], v[1]) || 1, kx = v[0] / m, ky = v[1] / m;
      field(c, x + kx * h * 0.5, y + ky * h * 0.5, v);
      m = Math.hypot(v[0], v[1]) || 1;
      x += v[0] / m * h; y += v[1] / m * h;
      pts.push(x, y);
      if (Math.abs(y) > apex) apex = Math.abs(y);
    }
    return { pts: pts, closed: closed, apex: apex };
  }

  // Flux coordinate: lines evenly spaced in u leave the pole carrying equal shares of the field
  function uOf(alpha) { return (1 - Math.cos(alpha)) / (1 - Math.cos(ALPHA_MAX)); }
  function alphaOf(u) { return Math.acos(M.clamp(1 - u * (1 - Math.cos(ALPHA_MAX)), -1, 1)); }

  // Seed angle whose loop peaks at height `apex`
  function solveAlpha(c, r0, apex, rmax) {
    var lo = 0.004, hi = ALPHA_MAX;
    for (var i = 0; i < 22; i++) {
      var mid = (lo + hi) / 2;
      if (traceLine(c, r0, mid, rmax).apex > apex) lo = mid; else hi = mid;
    }
    return (lo + hi) / 2;
  }

  // Geometry that only changes when the settings or canvas size change
  function prepare(st, p, unit, diag) {
    var key = [p.length, p.thickness, p.reach, p.loops, p.gap, unit | 0].join('|');
    if (st.key === key) return st.geo;
    var L = p.length / 100 * unit, T = p.thickness / 100 * unit;
    var c = Math.max(4, L / 2 - T * 0.45), r0 = Math.max(3, T * 0.55);
    var apex = p.reach / 100 * unit * 0.5;
    var aMin = solveAlpha(c, r0, apex, apex * 4);
    var g = { L: L, T: T, c: c, r0: r0, apex: apex, uMin: uOf(aMin), uMax: 0.97, counts: [], rmax: diag * 4 };
    var gap = Math.max(2, p.gap / 100 * unit);
    for (var k = 0; k < p.loops; k++) {
      var line = traceLine(c, r0, alphaOf(loopU(g, p.loops, k, 1)), apex * 4);
      g.counts.push(Math.max(3, Math.round(P.measure(line.pts).len / gap)));
    }
    st.key = key; st.geo = g;
    return g;
  }

  // u for loop k of n; gamma fans the loops out (>1) or bunches them (<1)
  function loopU(g, n, k, gamma) {
    return g.uMin + (g.uMax - g.uMin) * Math.pow((k + 0.5) / n, gamma);
  }

  // Magnet frame → canvas: rotate by angle, then move to (cx, cy). side -1 mirrors across the axis.
  function toWorld(pts, cx, cy, ca, sa, side) {
    var out = new Array(pts.length);
    for (var i = 0; i < pts.length; i += 2) {
      var x = pts[i], y = pts[i + 1] * side;
      out[i] = cx + x * ca - y * sa;
      out[i + 1] = cy + x * sa + y * ca;
    }
    return out;
  }

  MM.concepts.magnet = {
    id: 'magnet',
    label: 'Magnet',
    blurb: 'A bar magnet and its field, traced from one pole to the other. Your module flows along the field loops.',
    params: [
      { key: 'loops', label: 'Field loops', type: 'range', min: 1, max: 12, step: 1, value: 6 },
      { key: 'reach', label: 'Field size', type: 'range', min: 30, max: 100, step: 1, value: 82, unit: '%' },
      { key: 'fan', label: 'Fan', type: 'range', min: 0, max: 100, step: 1, value: 45, unit: '%' },
      { key: 'fill', label: 'Field fill', type: 'select', value: 'solid', options: [['solid', 'Solid'], ['bands', 'Bands'], ['none', 'None']] },
      { key: 'flares', label: 'Flare lines', type: 'range', min: 0, max: 6, step: 1, value: 2 },
      { key: 'length', label: 'Magnet length', type: 'range', min: 10, max: 80, step: 1, value: 40, unit: '%' },
      { key: 'thickness', label: 'Magnet thickness', type: 'range', min: 3, max: 30, step: 0.5, value: 9, unit: '%' },
      { key: 'angle', label: 'Rotation', type: 'range', min: -90, max: 90, step: 1, value: 0, unit: '°' },
      { key: 'size', label: 'Module size', type: 'range', min: 1, max: 15, step: 0.1, value: 4.2, unit: '%' },
      { key: 'gap', label: 'Module spacing', type: 'range', min: 0.6, max: 12, step: 0.1, value: 2.6, unit: '%' },
      { key: 'bunch', label: 'Accordion', type: 'range', min: 0, max: 95, step: 1, value: 70, unit: '%' },
      { key: 'flow', label: 'Flow speed', type: 'range', min: 0, max: 8, step: 1, value: 2 },
      { key: 'poleTint', label: 'Pole tint', type: 'range', min: 0, max: 100, step: 1, value: 70, unit: '%' },
      { key: 'arrows', label: 'Arrowheads', type: 'toggle', value: false }
    ],
    createState: function () { return {}; },
    home: function (w, h) { return { x: w / 2, y: h / 2 }; },

    draw: function (ctx, env, p, st, lib, col) {
      var unit = env.unit, g = prepare(st, p, unit, env.diag);
      var ph = env.phase, wave = Math.sin(M.TAU * ph);
      var gamma = Math.pow(2, (p.fan / 100) * 1.3 * wave);
      var bunch = (p.bunch / 100) * (0.5 - 0.5 * Math.cos(M.TAU * ph));
      var a = p.angle * M.DEG, ca = Math.cos(a), sa = Math.sin(a);
      var cx = env.tx, cy = env.ty;
      var size = p.size / 100 * unit;

      // Trace this frame's loops (they fan in and out with the loop clock)
      var loops = [];
      for (var k = 0; k < p.loops; k++) loops.push(traceLine(g.c, g.r0, alphaOf(loopU(g, p.loops, k, gamma)), g.apex * 4));

      var sides = [1, -1], s, k2;

      // 1. Field fill
      if (p.fill !== 'none') {
        var dark = D.mix(col.primary, col.ground, 0.32);
        for (s = 0; s < 2; s++) {
          for (k2 = 0; k2 < loops.length; k2++) {
            if (!loops[k2].closed) continue;
            D.fill(ctx, toWorld(loops[k2].pts, cx, cy, ca, sa, sides[s]), p.fill === 'bands' && k2 % 2 ? dark : col.primary);
            if (p.fill === 'solid') break;
          }
        }
      }

      // 2. Hairlines: the axis through both poles, and flare lines beyond the field
      var lw = Math.max(1, unit * 0.0022), far = env.diag * 2;
      D.hairline(ctx, toWorld([g.L / 2, 0, far, 0], cx, cy, ca, sa, 1), col.metal, lw);
      D.hairline(ctx, toWorld([-g.L / 2, 0, -far, 0], cx, cy, ca, sa, 1), col.metal, lw);
      for (var f = 0; f < p.flares; f++) {
        var uf = g.uMin * (f + 1) / (p.flares + 1);
        var fl = traceLine(g.c, g.r0, alphaOf(uf), g.rmax);
        for (s = 0; s < 2; s++) D.hairline(ctx, toWorld(fl.pts, cx, cy, ca, sa, sides[s]), col.metal, lw);
      }

      // 3. Module chains flowing from pole to pole
      var tint = p.poleTint / 100;
      var color = function (u) { return D.mix(col.accent, col.module, 1 - tint * Math.pow(1 - Math.sin(Math.PI * u), 2.2)); };
      for (k2 = 0; k2 < loops.length; k2++) {
        for (s = 0; s < 2; s++) {
          var path = P.measure(toWorld(loops[k2].pts, cx, cy, ca, sa, sides[s]));
          var base = (k2 * 2 + s) * 1000;
          D.chain(ctx, path, {
            count: g.counts[k2],
            phase: ph * p.flow * 3, // whole steps per loop, so recordings loop seamlessly
            bunch: bunch,
            size: size,
            item: function (i) { return lib.moduleAt(base + ((i % 997) + 997) % 997); },
            color: color,
            fade: size * 0.6
          });
          if (p.arrows && k2 % 2 === 0) {
            P.at(path, path.len / 2, tmp);
            D.arrow(ctx, tmp[0], tmp[1], tmp[2], size * 1.1, col.metal);
          }
        }
      }

      // 4. The bar: accent at one pole fading to metal at the other, with a seam in the middle
      var d = D.dpr;
      ctx.save();
      ctx.setTransform(d * ca, d * sa, -d * sa, d * ca, d * cx, d * cy);
      var grad = ctx.createLinearGradient(g.L / 2, 0, -g.L / 2, 0);
      grad.addColorStop(0, col.accent);
      grad.addColorStop(0.62, col.metal);
      grad.addColorStop(1, col.metal);
      ctx.fillStyle = grad;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-g.L / 2, -g.T / 2, g.L, g.T, g.T * 0.18);
      else ctx.rect(-g.L / 2, -g.T / 2, g.L, g.T);
      ctx.fill();
      ctx.fillStyle = D.mix(col.metal, col.ground, 0.35);
      ctx.fillRect(-g.T * 0.12, -g.T / 2, g.T * 0.24, g.T);
      ctx.restore();
    }
  };
})(window.MM = window.MM || {});
