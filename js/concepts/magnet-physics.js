/* Bar magnet physics shared by the magnet compositions.

   Model: a uniformly magnetised bar. Its outside field is the same as that of its two end faces
   carrying opposite, evenly spread "magnetic charge" (north face +, south face -). Each face is
   sampled as a grid of points across its width and depth, and the field is summed in 3D, then read
   in the drawing plane (the plane through the bar's long axis).

   Field lines are seeded on the centre line above the bar so that each neighbouring pair encloses
   the same amount of field (flux): where lines crowd together the field is stronger. Each line is
   then traced both ways until it reaches the bar. Coordinates are the magnet's own frame: centre at
   the origin, north end toward +x. */
(function (MM) {
  'use strict';
  var M = MM.math;
  var NY = 9, NZ = 5; // samples across each face (width x depth)

  function model(lengthPx, thicknessPx) {
    var hx = lengthPx / 2, hy = thicknessPx / 2, ys = [], zs = [];
    for (var i = 0; i < NY; i++) {
      for (var j = 0; j < NZ; j++) {
        ys.push((-0.5 + (i + 0.5) / NY) * thicknessPx);
        zs.push((-0.5 + (j + 0.5) / NZ) * thicknessPx);
      }
    }
    return { hx: hx, hy: hy, ys: ys, zs: zs, n: ys.length, q: 1 / ys.length };
  }

  // Field at (x, y) in the drawing plane, written to out = [bx, by]
  function field(m, x, y, out) {
    var bx = 0, by = 0, ax = x - m.hx, sx = x + m.hx;
    for (var k = 0; k < m.n; k++) {
      var dy = y - m.ys[k], z2 = m.zs[k] * m.zs[k];
      var r2 = ax * ax + dy * dy + z2, r3 = r2 * Math.sqrt(r2);
      bx += ax / r3; by += dy / r3;
      r2 = sx * sx + dy * dy + z2; r3 = r2 * Math.sqrt(r2);
      bx -= sx / r3; by -= dy / r3;
    }
    out[0] = bx * m.q; out[1] = by * m.q;
    return out;
  }

  function inside(m, x, y) { return Math.abs(x) <= m.hx && Math.abs(y) <= m.hy; }

  // Distance from (x, y) to the bar's outline (0 inside)
  function barDist(m, x, y) {
    var dx = Math.max(0, Math.abs(x) - m.hx), dy = Math.max(0, Math.abs(y) - m.hy);
    return Math.hypot(dx, dy);
  }

  // Heights above the bar on the centre line where n field lines cross, at equal flux steps
  function seeds(m, n) {
    var y0 = m.hy * 1.002, yMax = Math.max(m.hx, m.hy) * 80, K = 700, b = [0, 0];
    var ys = new Float64Array(K + 1), F = new Float64Array(K + 1), prev = 0;
    for (var i = 0; i <= K; i++) {
      ys[i] = y0 * Math.pow(yMax / y0, i / K);
      var v = Math.abs(field(m, 0, ys[i], b)[0]);
      if (i) F[i] = F[i - 1] + 0.5 * (v + prev) * (ys[i] - ys[i - 1]);
      prev = v;
    }
    var total = F[K] + prev * yMax / 2; // tail of a dipole field beyond yMax
    var out = [], j = 0;
    for (var k = 0; k < n; k++) {
      var target = total * (k + 0.5) / n;
      while (j < K && F[j + 1] < target) j++;
      if (j >= K) { out.push(yMax); continue; }
      var u = (target - F[j]) / ((F[j + 1] - F[j]) || 1);
      out.push(ys[j] + (ys[j + 1] - ys[j]) * u);
    }
    return out;
  }

  // Follow the field from (0, y0) toward the south face; returns flat points and whether it got there
  function traceHalf(m, y0, rFar) {
    var x = 0, y = y0, pts = [x, y], b = [0, 0], reached = false, r2 = rFar * rFar;
    for (var n = 0; n < 6000; n++) {
      var h = M.clamp(0.06 * barDist(m, x, y), 0.4, 28);
      field(m, x, y, b);
      var l = Math.hypot(b[0], b[1]) || 1, kx = b[0] / l, ky = b[1] / l;
      field(m, x + kx * h * 0.5, y + ky * h * 0.5, b);
      l = Math.hypot(b[0], b[1]) || 1;
      x += b[0] / l * h; y += b[1] / l * h;
      pts.push(x, y);
      if (inside(m, x, y)) { reached = true; break; }
      if (x * x + y * y > r2) break;
    }
    return { pts: pts, closed: reached };
  }

  // A whole line from the north face to the south face (upper side), using the bar's mirror symmetry
  function line(m, y0, rFar) {
    var half = traceHalf(m, y0, rFar), p = half.pts, n = p.length / 2, pts = [];
    for (var i = n - 1; i >= 1; i--) pts.push(-p[2 * i], p[2 * i + 1]); // north half
    for (var j = 0; j < n; j++) pts.push(p[2 * j], p[2 * j + 1]);       // south half
    return { pts: pts, closed: half.closed };
  }

  // Magnet frame → canvas: rotate, then move to (cx, cy); side -1 mirrors across the long axis
  function toWorld(pts, cx, cy, ang, side) {
    var ca = Math.cos(ang), sa = Math.sin(ang), out = new Array(pts.length);
    for (var i = 0; i < pts.length; i += 2) {
      var x = pts[i], y = pts[i + 1] * side;
      out[i] = cx + x * ca - y * sa;
      out[i + 1] = cy + x * sa + y * ca;
    }
    return out;
  }

  // The bar, as in the reference: the north half fades from accent to metal, a dark seam, then metal
  function drawBar(ctx, m, cx, cy, ang, col) {
    var d = MM.draw.dpr, ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.save();
    ctx.setTransform(d * ca, d * sa, -d * sa, d * ca, d * cx, d * cy);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-m.hx, -m.hy, m.hx * 2, m.hy * 2, Math.min(m.hx, m.hy) * 0.12);
    else ctx.rect(-m.hx, -m.hy, m.hx * 2, m.hy * 2);
    ctx.clip();
    ctx.fillStyle = col.metal;
    ctx.fillRect(-m.hx, -m.hy, m.hx * 2, m.hy * 2);
    var g = ctx.createLinearGradient(m.hx, 0, 0, 0);
    g.addColorStop(0, col.accent);
    g.addColorStop(1, col.metal);
    ctx.fillStyle = g;
    ctx.fillRect(0, -m.hy, m.hx, m.hy * 2);
    ctx.fillStyle = MM.draw.mix(col.metal, col.ground, 0.6);
    ctx.fillRect(-Math.max(1, m.hx * 0.012), -m.hy, Math.max(2, m.hx * 0.024), m.hy * 2);
    ctx.restore();
  }

  // Shared placement settings for every magnet composition
  var placement = [
    { key: 'length', label: 'Magnet length', type: 'range', min: 8, max: 90, step: 0.5, value: 36, unit: '%' },
    { key: 'thickness', label: 'Magnet thickness', type: 'range', min: 2, max: 30, step: 0.5, value: 8, unit: '%' },
    { key: 'angle', label: 'Rotation', type: 'range', min: -180, max: 180, step: 1, value: 0, unit: '°' },
    { key: 'offsetX', label: 'Position across', type: 'range', min: -60, max: 60, step: 0.5, value: 0, unit: '%' },
    { key: 'offsetY', label: 'Position down', type: 'range', min: -60, max: 60, step: 0.5, value: 0, unit: '%' },
    { key: 'showBar', label: 'Show the magnet', type: 'toggle', value: true }
  ];

  function place(env, p) {
    return {
      m: model(p.length / 100 * env.unit, p.thickness / 100 * env.unit),
      cx: env.w / 2 + p.offsetX / 100 * env.w,
      cy: env.h / 2 + p.offsetY / 100 * env.h,
      ang: p.angle * M.DEG
    };
  }

  MM.magnet = { model: model, field: field, inside: inside, seeds: seeds, line: line, toWorld: toWorld, drawBar: drawBar, placement: placement, place: place };
})(window.MM = window.MM || {});
