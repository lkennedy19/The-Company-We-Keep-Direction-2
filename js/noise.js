/* Seeded 3D simplex noise (after Stefan Gustavson's public-domain version) and a small fbm helper. */
(function (MM) {
  'use strict';
  var F3 = 1 / 3, G3 = 1 / 6;
  var grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
  var perm = new Uint8Array(512), pm12 = new Uint8Array(512);

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function seed(s) {
    var rand = mulberry32(s * 7919 + 1), p = new Uint8Array(256), i;
    for (i = 0; i < 256; i++) p[i] = i;
    for (i = 255; i > 0; i--) { var j = (rand() * (i + 1)) | 0, t = p[i]; p[i] = p[j]; p[j] = t; }
    for (i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm12[i] = perm[i] % 12; }
  }

  function corner(t, gi, x, y, z) {
    if (t < 0) return 0;
    t *= t;
    return t * t * (grad3[gi] * x + grad3[gi + 1] * y + grad3[gi + 2] * z);
  }

  // Roughly -1..1
  function noise3(xin, yin, zin) {
    var s = (xin + yin + zin) * F3;
    var i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    var t = (i + j + k) * G3;
    var x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    var i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    var x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    var x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    var ii = i & 255, jj = j & 255, kk = k & 255;
    var n = corner(0.6 - x0 * x0 - y0 * y0 - z0 * z0, pm12[ii + perm[jj + perm[kk]]] * 3, x0, y0, z0) +
      corner(0.6 - x1 * x1 - y1 * y1 - z1 * z1, pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3, x1, y1, z1) +
      corner(0.6 - x2 * x2 - y2 * y2 - z2 * z2, pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3, x2, y2, z2) +
      corner(0.6 - x3 * x3 - y3 * y3 - z3 * z3, pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3, x3, y3, z3);
    return 32 * n;
  }

  // Two octaves: enough for organic shapes, cheap enough to run per frame
  function fbm(x, y, z) {
    return noise3(x, y, z) * 0.67 + noise3(x * 2.03 + 11.1, y * 2.03 - 7.3, z * 1.3) * 0.33;
  }

  seed(1);
  MM.noise = { seed: seed, noise3: noise3, fbm: fbm, mulberry32: mulberry32 };
})(window.MM = window.MM || {});
