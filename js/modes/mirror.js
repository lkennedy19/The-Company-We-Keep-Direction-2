/* MIRROR — a slow, liquid field folded across an invisible centre line, like an inkblot.
   Particles gather on its contours (Lines) or fill its high ground (Blots). The pointer presses
   into the liquid, and because the field is folded, the dent appears on both sides. */
(function (MM) {
  'use strict';
  var M = MM.math, P = MM.particles, N = MM.noise;
  MM.modes = MM.modes || {};
  var off = [0, 0];

  // Field values on a coarse grid over the real half, sampled bilinearly per particle
  function buildField(st, x0, x1, y0, y1, cell, fn) {
    var cols = Math.ceil((x1 - x0) / cell) + 2, rows = Math.ceil((y1 - y0) / cell) + 2;
    if (!st.v || st.v.length < cols * rows) st.v = new Float32Array(cols * rows);
    st.x0 = x0; st.y0 = y0; st.cell = cell; st.cols = cols; st.rows = rows;
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) st.v[j * cols + i] = fn(x0 + i * cell, y0 + j * cell);
    }
  }

  // Average slope of the field, used to turn a line spacing in px into contour levels
  function meanSlope(st) {
    var V = st.v, c = st.cols, sum = 0, n = 0;
    for (var j = 0; j < st.rows - 1; j += 2) {
      for (var i = 0; i < c - 1; i += 2) {
        var k = j * c + i;
        sum += Math.hypot(V[k + 1] - V[k], V[k + c] - V[k]);
        n++;
      }
    }
    return Math.max(1e-6, sum / Math.max(1, n) / st.cell);
  }

  function sample(st, x, y, out) {
    var u = M.clamp((x - st.x0) / st.cell, 0, st.cols - 1.001);
    var v = M.clamp((y - st.y0) / st.cell, 0, st.rows - 1.001);
    var i = u | 0, j = v | 0, a = u - i, b = v - j, c = st.cols, V = st.v;
    var v00 = V[j * c + i], v10 = V[j * c + i + 1], v01 = V[(j + 1) * c + i], v11 = V[(j + 1) * c + i + 1];
    out.f = (v00 * (1 - a) + v10 * a) * (1 - b) + (v01 * (1 - a) + v11 * a) * b;
    out.gx = ((v10 - v00) * (1 - b) + (v11 - v01) * b) / st.cell;
    out.gy = ((v01 - v00) * (1 - a) + (v11 - v10) * a) / st.cell;
    return out;
  }

  MM.modes.mirror = {
    id: 'mirror',
    label: 'Mirror',
    blurb: 'A slow liquid folded down an invisible centre line, like an inkblot. Press into it and the dent appears on both sides.',
    params: [
      { key: 'form', label: 'Form', type: 'select', value: 'lines', options: [['lines', 'Lines'], ['blots', 'Blots']] },
      { key: 'axis', label: 'Fold', type: 'select', value: 'v', options: [['v', 'Left | Right'], ['h', 'Top / Bottom']] },
      { key: 'scale', label: 'Scale', type: 'range', min: 80, max: 900, step: 10, value: 420, unit: 'px' },
      { key: 'lineGap', label: 'Line spacing', type: 'range', min: 20, max: 300, step: 1, value: 80, unit: 'px', show: function (v) { return v.form === 'lines'; } },
      { key: 'thickness', label: 'Band thickness', type: 'range', min: 5, max: 100, step: 1, value: 30, unit: '%', show: function (v) { return v.form === 'lines'; } },
      { key: 'ink', label: 'Ink', type: 'range', min: 0, max: 100, step: 1, value: 45, unit: '%', show: function (v) { return v.form === 'blots'; } },
      { key: 'press', label: 'Press', type: 'range', min: 0, max: 100, step: 1, value: 60, unit: '%' },
      { key: 'radius', label: 'Press size', type: 'range', min: 30, max: 500, step: 5, value: 150, unit: 'px' },
      { key: 'drift', label: 'Drift', type: 'range', min: 0, max: 100, step: 1, value: 25, unit: '%' },
      { key: 'ripple', label: 'Ripple', type: 'range', min: 0, max: 100, step: 1, value: 0, unit: '%' },
      { key: 'align', label: 'Align', type: 'range', min: 0, max: 100, step: 1, value: 100, unit: '%' }
    ],
    createState: function () { return { z: 0, s: {} }; },

    update: function (ps, env, p, st) {
      var vertical = p.axis === 'v';
      var cx = env.cx, cy = env.cy;
      st.z += env.dt * (p.drift / 100) * 0.25;

      // Fold the pointer into the real half (left or top)
      var px = env.tx, py = env.ty;
      if (vertical && px > cx) px = 2 * cx - px;
      if (!vertical && py > cy) py = 2 * cy - py;

      var sc = 1 / p.scale, z = st.z;
      var cell = Math.max(10, p.scale / 18), pad = cell * 2;
      buildField(st.s, -pad, (vertical ? cx : env.w) + pad, -pad, (vertical ? env.h : cy) + pad, cell, function (x, y) {
        var u = x * sc, v = y * sc;
        var qx = N.fbm(u, v, z), qy = N.fbm(u + 5.2, v + 1.3, z);
        return N.fbm(u + 1.6 * qx, v + 1.6 * qy, z + 3.7);
      });

      var lines = p.form === 'lines', th = p.thickness / 100, al = p.align / 100;
      var bands = lines ? 1 / (p.lineGap * meanSlope(st.s)) : 1;
      var R2 = p.radius * p.radius, A = (p.press / 100) * (lines ? 1.5 / bands : 0.9);
      var level = 0.45 - (p.ink / 100) * 0.9;
      var smp = {}, maxD = lines ? p.lineGap * 0.6 : 0;

      for (var i = 0; i < ps.length; i++) {
        var q = ps[i];
        var real = vertical ? q.hx <= cx : q.hy <= cy;
        q.hidden = !real;
        if (!real) continue;

        sample(st.s, q.hx, q.hy, smp);
        var dx = q.hx - px, dy = q.hy - py, e = A * Math.exp(-(dx * dx + dy * dy) / R2);
        var f = smp.f + e, gx = smp.gx - e * 2 * dx / R2, gy = smp.gy - e * 2 * dy / R2;

        if (lines) {
          P.toContour(f * bands, gx * bands, gy * bands, th, q.band, maxD, off);
          q.tx = q.hx + off[0]; q.ty = q.hy + off[1]; q.ts = 1;
        } else {
          q.tx = q.hx; q.ty = q.hy;
          var m = (f - level) / 0.06;
          q.ts = m <= 0 ? 0 : m >= 1 ? 1 : m * m * (3 - 2 * m);
        }
        q.trot = P.align(q, Math.atan2(gy, gx) + Math.PI / 2, al);
      }
      return { axis: vertical ? 'v' : 'h', x: cx, y: cy, ripple: p.ripple / 100 };
    }
  };
})(window.MM = window.MM || {});
