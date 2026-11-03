/* The point every concept reacts to (the magnet, the object in front of the mirror).
   Motion options:
   - 'idle-loop': follows the cursor, and settles back to the concept's home spot after a few idle
     seconds, where the animation loops seamlessly
   - 'cursor': follows the cursor only
   - 'loop': stays at the home spot (use this to record loops)
   - 'wander': drifts between random spots on its own */
(function (MM) {
  'use strict';
  var M = MM.math;
  var IDLE_SECONDS = 3;

  function Pointer(el) {
    this.x = null; this.y = null;          // smoothed position used by modes
    this.cx = 0; this.cy = 0;              // last cursor position
    this.hasCursor = false;
    this.lastMove = -Infinity;
    this.isAuto = true;
    this.auto = { fromX: 0, fromY: 0, toX: 0, toY: 0, t0: -Infinity, dur: 1, hold: 0, x: 0, y: 0 };

    var self = this;
    function onMove(e) {
      var r = el.getBoundingClientRect();
      self.cx = e.clientX - r.left;
      self.cy = e.clientY - r.top;
      self.hasCursor = true;
      self.lastMove = performance.now() / 1000;
    }
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerdown', onMove);
  }

  Pointer.prototype.update = function (t, dt, w, h, opts) {
    if (this.x === null) { this.x = opts.home.x; this.y = opts.home.y; this.auto.x = this.x; this.auto.y = this.y; }

    var idle = !this.hasCursor || t - this.lastMove > IDLE_SECONDS;
    var atHome = opts.motion === 'loop' || (opts.motion === 'idle-loop' && idle);
    var useAuto = opts.motion === 'wander';
    this.atHome = atHome;

    if (useAuto && !this.isAuto) {
      // Start wandering from wherever we are now
      this.auto.x = this.x; this.auto.y = this.y; this.auto.t0 = -Infinity;
    }
    this.isAuto = useAuto;

    var tx, ty;
    if (atHome) {
      tx = opts.home.x; ty = opts.home.y;
    } else if (useAuto) {
      this.stepAuto(t, w, h, opts.tempo);
      tx = this.auto.x; ty = this.auto.y;
    } else {
      tx = this.cx; ty = this.cy;
    }
    var k = M.smoothK(opts.follow, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;
  };

  // Ease between random waypoints, pausing briefly at each one
  Pointer.prototype.stepAuto = function (t, w, h, tempo) {
    var a = this.auto;
    tempo = Math.max(0.05, tempo);
    if (t >= a.t0 + a.dur + a.hold) {
      var mx = w * 0.1, my = h * 0.1, minD = Math.min(w, h) * 0.25;
      var nx, ny, tries = 0;
      do {
        nx = mx + Math.random() * (w - 2 * mx);
        ny = my + Math.random() * (h - 2 * my);
        tries++;
      } while (Math.hypot(nx - a.x, ny - a.y) < minD && tries < 12);
      a.fromX = a.x; a.fromY = a.y; a.toX = nx; a.toY = ny;
      a.t0 = t;
      a.dur = (0.7 + 0.8 * Math.hypot(nx - a.x, ny - a.y) / Math.max(1, Math.min(w, h))) / tempo;
      a.hold = (0.2 + Math.random() * 0.8) / tempo;
    }
    var u = M.easeInOut(M.clamp((t - a.t0) / a.dur, 0, 1));
    a.x = a.fromX + (a.toX - a.fromX) * u;
    a.y = a.fromY + (a.toY - a.fromY) * u;
  };

  MM.Pointer = Pointer;
})(window.MM = window.MM || {});
