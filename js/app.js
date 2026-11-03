/* Wires it together: concept tabs, settings panel, shapes, colours, the loop clock and recording. */
(function (MM) {
  'use strict';
  var concepts = [MM.concepts.magnet, MM.concepts.mirror];
  var palettes = MM.palette.presets, roles = MM.palette.roles;

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('canvas'), ctx = canvas.getContext('2d'), stage = $('stage');

  // ---------- state ----------
  var shared = {
    shapeModule: 'oval', shapeObject: 'capsule',
    grain: 55, streaks: 30, frameWidth: 6,
    motion: 'idle-loop', loopLen: 6, follow: 6, tempo: 1,
    format: 'fill'
  };
  roles.forEach(function (r) { shared[r[0]] = palettes[0][r[0]]; });
  var params = {};
  concepts.forEach(function (c) { params[c.id] = MM.controls.defaults(c.params); });

  var concept = concepts[0], cstate = {};
  concepts.forEach(function (c) { cstate[c.id] = c.createState(); });
  var w = 0, h = 0, dpr = 1, clockStart = performance.now() / 1000, recording = false;
  var pointer = new MM.Pointer(canvas);
  var lib = new MM.ShapeLibrary(function () {
    shared.shapeModule = lib.module; shared.shapeObject = lib.object;
    buildShapePanel();
  });

  var FORMATS = { fill: 0, '16:9': 16 / 9, '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16 };

  // ---------- settings specs ----------
  var shapeSpecs = [
    { key: 'shapeModule', label: 'Module (repeated element)', type: 'dropdown', options: function () { return lib.options(true); } },
    { key: 'shapeObject', label: 'Object (in front of the mirror)', type: 'dropdown', options: function () { return lib.options(false); } }
  ];
  var textureSpecs = [
    { key: 'grain', label: 'Grain', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'streaks', label: 'Streaks', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'frameWidth', label: 'Frame width', type: 'range', min: 0, max: 40, step: 1, unit: 'px' }
  ];
  var motionSpecs = [
    { key: 'motion', label: 'Driven by', type: 'dropdown', options: [['idle-loop', 'Cursor, then loop when idle'], ['cursor', 'Cursor only'], ['loop', 'Loop in place'], ['wander', 'Wander on its own']] },
    { key: 'loopLen', label: 'Loop length', type: 'range', min: 2, max: 16, step: 0.5, unit: 's' },
    { key: 'tempo', label: 'Wander tempo', type: 'range', min: 0.2, max: 3, step: 0.1, unit: '×', show: function (v) { return v.motion === 'wander'; } },
    { key: 'follow', label: 'Follow smoothing', type: 'range', min: 1, max: 30, step: 0.5 }
  ];
  var canvasSpecs = [
    { key: 'format', label: 'Format', type: 'select', options: [['fill', 'Fill'], ['16:9', '16:9'], ['1:1', '1:1'], ['4:5', '4:5'], ['9:16', '9:16']] }
  ];
  var colorSpecs = roles.map(function (r) { return { key: r[0], label: r[1], type: 'color' }; });

  // ---------- shapes ----------
  function setStatus(msg, isError) {
    var s = $('shapeStatus');
    s.textContent = msg || '';
    s.classList.toggle('is-error', !!isError);
  }

  function addFiles(files) {
    if (!files || !files.length) return;
    lib.addFiles(files).then(function (r) { setStatus(r.message, r.error); });
  }

  function drawThumb(c, item) {
    var g = c.getContext('2d'), n = c.width, s = n * 0.74, a = item.sprite.aspect;
    var tw = a >= 1 ? s : s * a, th = a >= 1 ? s / a : s;
    g.fillStyle = shared.ground;
    g.fillRect(0, 0, n, n);
    var t = document.createElement('canvas');
    t.width = t.height = n;
    var tg = t.getContext('2d');
    tg.drawImage(item.sprite.canvas, (n - tw) / 2, (n - th) / 2, tw, th);
    tg.globalCompositeOperation = 'source-in';
    tg.fillStyle = shared.secondary;
    tg.fillRect(0, 0, n, n);
    g.drawImage(t, 0, 0);
  }

  function buildShapePanel() {
    MM.controls.build($('shapeParams'), shapeSpecs, shared, function (key) {
      if (key === 'shapeModule') lib.module = shared.shapeModule;
      if (key === 'shapeObject') lib.object = shared.shapeObject;
    });
    var list = $('uploadList');
    list.innerHTML = '';
    var ups = lib.uploads();
    list.hidden = !ups.length;
    ups.forEach(function (u) {
      var li = document.createElement('li');
      li.className = 'thumb';
      li.title = u.name;
      var c = document.createElement('canvas');
      c.width = c.height = 96;
      drawThumb(c, u);
      var rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'thumb__remove';
      rm.textContent = '×';
      rm.setAttribute('aria-label', 'Remove ' + u.name);
      rm.addEventListener('click', function () { lib.remove(u.id); setStatus(''); });
      li.append(c, rm);
      list.appendChild(li);
    });
  }

  // ---------- colour ----------
  function renderPalettes() {
    var wrap = $('palettes');
    wrap.innerHTML = '';
    palettes.forEach(function (pal) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.title = pal.name;
      b.setAttribute('aria-label', pal.name + ' palette');
      b.setAttribute('aria-pressed', String(roles.every(function (r) { return shared[r[0]] === pal[r[0]]; })));
      b.style.background = pal.ground;
      b.style.setProperty('--sw-a', pal.primary);
      b.style.setProperty('--sw-b', pal.secondary);
      b.style.setProperty('--sw-c', pal.module);
      b.addEventListener('click', function () {
        roles.forEach(function (r) { shared[r[0]] = pal[r[0]]; });
        buildColorPanel();
        colorsChanged();
      });
      wrap.appendChild(b);
    });
  }

  function colorsChanged() {
    document.documentElement.style.setProperty('--stage-bg', shared.ground);
    renderPalettes();
    buildShapePanel();
  }

  function buildColorPanel() {
    MM.controls.build($('colorParams'), colorSpecs, shared, colorsChanged);
  }

  // ---------- panels ----------
  function buildSharedPanels() {
    buildShapePanel();
    buildColorPanel();
    MM.controls.build($('textureParams'), textureSpecs, shared, function () {});
    MM.controls.build($('motionParams'), motionSpecs, shared, function () {});
    MM.controls.build($('canvasParams'), canvasSpecs, shared, function () { layout(); });
  }

  function buildConceptPanel() {
    $('conceptTitle').textContent = concept.label;
    $('conceptBlurb').textContent = concept.blurb;
    MM.controls.build($('conceptParams'), concept.params, params[concept.id], function () {});
  }

  function renderTabs() {
    var nav = $('tabs');
    nav.innerHTML = '';
    concepts.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(c === concept));
      b.textContent = c.label;
      b.addEventListener('click', function () { setConcept(c); });
      nav.appendChild(b);
    });
  }

  function setConcept(c) {
    concept = c;
    renderTabs();
    buildConceptPanel();
    try { localStorage.setItem('mm-concept', c.id); } catch (e) { /* storage unavailable */ }
  }

  // ---------- layout ----------
  function layout() {
    var r = stage.getBoundingClientRect(), ratio = FORMATS[shared.format];
    var pad = ratio ? 16 : 0, sw = Math.max(1, r.width - pad * 2), sh = Math.max(1, r.height - pad * 2);
    if (ratio) {
      if (sw / sh > ratio) { h = sh; w = sh * ratio; } else { w = sw; h = sw / ratio; }
    } else { w = sw; h = sh; }
    w = Math.floor(w); h = Math.floor(h);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    MM.draw.dpr = dpr;
  }

  // ---------- frame ----------
  var last = performance.now() / 1000;
  function frame(now) {
    var t = now / 1000, dt = Math.min(0.05, Math.max(0, t - last));
    last = t;
    var p = params[concept.id];
    pointer.update(t, dt, w, h, {
      motion: recording ? 'loop' : shared.motion, tempo: shared.tempo, follow: shared.follow,
      home: concept.home(w, h, p)
    });
    var clock = t - clockStart;
    var env = {
      w: w, h: h, unit: Math.min(w, h), diag: Math.hypot(w, h), t: clock, dt: dt,
      phase: (clock / shared.loopLen) % 1, tx: pointer.x, ty: pointer.y
    };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = shared.ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (lib.ready()) concept.draw(ctx, env, p, cstate[concept.id], lib, shared);
    MM.texture.draw(ctx, dpr, { grain: shared.grain / 100, streaks: shared.streaks / 100, frame: shared.frameWidth, frameColor: shared.frame });
    requestAnimationFrame(frame);
  }

  // ---------- export ----------
  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  var saveBtn = $('savePng'); // absent where downloads are not allowed
  if (saveBtn) saveBtn.addEventListener('click', function () {
    canvas.toBlob(function (blob) { download(blob, concept.id + '-' + Date.now() + '.png'); });
  });

  var recBtn = $('recordLoop');
  if (recBtn) {
    if (!MM.recorder.supported()) {
      recBtn.disabled = true;
      recBtn.textContent = 'Recording not supported here';
    }
    recBtn.addEventListener('click', function () {
      if (recording) return;
      recording = true;
      recBtn.disabled = true;
      // Settle at the home spot first, then restart the loop clock so the file starts at phase 0
      setTimeout(function () {
        clockStart = performance.now() / 1000;
        recBtn.textContent = 'Recording ' + shared.loopLen + ' s…';
        MM.recorder.record(canvas, shared.loopLen, 60).then(function (r) {
          download(r.blob, concept.id + '-loop.' + r.ext);
          recBtn.textContent = 'Saved. Record again';
        }).catch(function (err) {
          recBtn.textContent = err.message;
        }).then(function () {
          recording = false;
          recBtn.disabled = false;
        });
      }, 900);
    });
  }

  // ---------- events ----------
  new ResizeObserver(layout).observe(stage);

  $('fileInput').addEventListener('change', function (e) {
    addFiles(e.target.files);
    e.target.value = '';
  });

  stage.addEventListener('dragover', function (e) { e.preventDefault(); stage.classList.add('is-drop'); });
  stage.addEventListener('dragleave', function () { stage.classList.remove('is-drop'); });
  stage.addEventListener('drop', function (e) {
    e.preventDefault();
    stage.classList.remove('is-drop');
    addFiles(e.dataTransfer.files);
  });

  $('panelToggle').addEventListener('click', function () {
    var open = document.body.classList.toggle('panel-open');
    this.setAttribute('aria-expanded', String(open));
  });

  // ---------- boot ----------
  if (window.matchMedia('(min-width: 900px)').matches) {
    document.body.classList.add('panel-open');
    $('panelToggle').setAttribute('aria-expanded', 'true');
  }
  var saved = null;
  try { saved = localStorage.getItem('mm-concept'); } catch (e) { /* storage unavailable */ }
  concept = concepts.filter(function (c) { return c.id === saved; })[0] || concepts[0];

  renderTabs();
  buildConceptPanel();
  buildSharedPanels();
  renderPalettes();
  layout();
  colorsChanged();
  requestAnimationFrame(frame);
})(window.MM = window.MM || {});
