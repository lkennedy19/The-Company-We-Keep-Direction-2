/* MIRROR · REFLECTION — one object, one plane mirror, one image. The image is the same size, the
   same distance behind the mirror as the object is in front, and reversed. */
(function (MM) {
  'use strict';
  var M = MM.math, O = MM.optics, D = MM.draw;
  MM.compositions = MM.compositions || [];

  MM.compositions.push({
    id: 'mirror-reflection',
    group: 'mirror',
    label: 'Reflection',
    blurb: 'An object and its image in a plane mirror: the same size, the same distance behind the mirror as the object is in front, and reversed.',
    uses: ['object'],
    params: [
      { key: 'object', label: 'Object', type: 'shape', value: 'capsule' },
      { key: 'distance', label: 'Distance from mirror', type: 'range', min: 0, max: 60, step: 0.25, value: 14, unit: '%' },
      { key: 'along', label: 'Position along mirror', type: 'range', min: -60, max: 60, step: 0.25, value: 0, unit: '%' },
      { key: 'size', label: 'Object size', type: 'range', min: 4, max: 90, step: 0.25, value: 52, unit: '%' },
      { key: 'angle', label: 'Object rotation', type: 'range', min: -180, max: 180, step: 1, value: 0, unit: '°' },
      { key: 'showMirror', label: 'Show the mirror', type: 'toggle', value: true }
    ].concat(O.mirrorParams),

    draw: function (ctx, env, p, lib, col) {
      var f = O.frame(env.w * p.mirrorPos / 100, env.h / 2, p.tilt);
      var item = lib.get(p.object), size = p.size / 100 * env.unit, a = p.angle * M.DEG;
      var slab = p.showMirror ? p.slab / 100 * env.unit : 0;
      var d = O.halfAcross(item, size, a, f) + p.distance / 100 * env.unit;
      var along = p.along / 100 * env.h;
      var ox = f.mx + f.n[0] * d + f.al[0] * along, oy = f.my + f.n[1] * d + f.al[1] * along;
      var img = O.reflect(f, ox, oy), mObj = M.rot(a), mImg = M.mul(O.flip(f), mObj);

      D.shape(ctx, item, col.secondary, img[0], img[1], mImg, size, 'large');
      O.drawMirror(ctx, f, slab, env.diag * 2, col);
      D.shape(ctx, item, col.secondary, ox, oy, mObj, size, 'large');
    }
  });
})(window.MM = window.MM || {});
