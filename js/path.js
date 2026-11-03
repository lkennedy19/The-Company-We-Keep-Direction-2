/* Polylines measured by arc length, so elements can be placed and moved along them. */
(function (MM) {
  'use strict';

  // pts: flat array [x0, y0, x1, y1, ...]
  function measure(pts) {
    var n = pts.length / 2, cum = new Float32Array(Math.max(1, n));
    for (var i = 1; i < n; i++) {
      cum[i] = cum[i - 1] + Math.hypot(pts[2 * i] - pts[2 * i - 2], pts[2 * i + 1] - pts[2 * i - 1]);
    }
    return { pts: pts, cum: cum, len: n > 1 ? cum[n - 1] : 0, n: n };
  }

  // Point and direction at arc length s: out = [x, y, angle]
  function at(path, s, out) {
    var cum = path.cum, pts = path.pts, n = path.n;
    if (n < 2) { out[0] = pts[0]; out[1] = pts[1]; out[2] = 0; return out; }
    s = s < 0 ? 0 : s > path.len ? path.len : s;
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      var mid = (lo + hi) >> 1;
      if (cum[mid] <= s) lo = mid; else hi = mid;
    }
    var seg = cum[hi] - cum[lo] || 1, u = (s - cum[lo]) / seg;
    var x0 = pts[2 * lo], y0 = pts[2 * lo + 1], x1 = pts[2 * hi], y1 = pts[2 * hi + 1];
    out[0] = x0 + (x1 - x0) * u;
    out[1] = y0 + (y1 - y0) * u;
    out[2] = Math.atan2(y1 - y0, x1 - x0);
    return out;
  }

  MM.path = { measure: measure, at: at };
})(window.MM = window.MM || {});
