/* The particles both modes move around. Each starts on a jittered grid (its "home") and eases
   toward a target the active mode sets every frame, at its own slightly different pace. */
(function (MM) {
  'use strict';
  var M = MM.math;
  var MAX_PARTICLES = 40000;

  function create(w, h, spacing, seed) {
    var area = w * h;
    if (area / (spacing * spacing) > MAX_PARTICLES) spacing = Math.sqrt(area / MAX_PARTICLES);
    var rand = MM.noise.mulberry32(seed * 9973 + 17);
    var cols = Math.ceil(w / spacing) + 1, rows = Math.ceil(h / spacing) + 1;
    var ox = (w - (cols - 1) * spacing) / 2, oy = (h - (rows - 1) * spacing) / 2;
    var ps = [];
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var hx = ox + i * spacing + (rand() - 0.5) * spacing * 0.9;
        var hy = oy + j * spacing + (rand() - 0.5) * spacing * 0.9;
        var rot = rand() * M.TAU;
        ps.push({
          hx: hx, hy: hy, x: hx, y: hy, rot: rot, s: 1,
          tx: hx, ty: hy, trot: rot, ts: 1, hidden: false,
          shape: rand(),   // which shape this particle shows
          spin: rot,       // its resting rotation
          band: rand(),    // where it sits across the thickness of a band
          grow: rand(),    // size variation
          rate: 0.55 + rand() * 0.9
        });
      }
    }
    ps.spacing = spacing; // actual spacing used, after the particle cap
    return ps;
  }

  function step(ps, dt, flow) {
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i], k = M.smoothK(flow * p.rate, dt);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
      p.rot = M.approachAngle(p.rot, p.trot, k);
      p.s += (p.ts - p.s) * k;
    }
  }

  // Offset that moves a point onto the nearest contour of a field. Contours sit at whole numbers of f;
  // (gx, gy) is the gradient of f. `band` (0..1) spreads particles across `thickness` of a band.
  function toContour(f, gx, gy, thickness, band, maxD, out) {
    var target = Math.round(f) + (band - 0.5) * thickness;
    var k = (target - f) / (gx * gx + gy * gy + 1e-9);
    var dx = gx * k, dy = gy * k, d = Math.hypot(dx, dy);
    if (d > maxD) { dx *= maxD / d; dy *= maxD / d; }
    out[0] = dx; out[1] = dy;
    return out;
  }

  // Rotation between a particle's own resting angle (align 0) and the field direction (align 1)
  function align(p, angle, amount) {
    return p.spin + M.wrap(angle - p.spin) * amount;
  }

  MM.particles = { create: create, step: step, toContour: toContour, align: align };
})(window.MM = window.MM || {});
