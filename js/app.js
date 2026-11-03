/* Wires it together: composition tabs, the settings panel, eased controls, colours, export. */
(function (MM) {
  'use strict';
  var comps = MM.compositions;
  var GROUPS = [['magnet', 'Magnet'], ['mirror', 'Mirror']];
  var palettes = MM.palette.presets, roles = MM.palette.roles;
  var FORMATS = { fill: 0, '16:9': 16 / 9, '1:1': 1, '4:5': 4 / 5, '9:16': 9 / 16 };

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('canvas'), ctx = canvas.getContext('2d'), stage = $('stage');

  // ---------- state ----------
  var shared = { grain: 55, streaks: 20, frameWidth: 6, format: 'fill', smoothing: 55 };
  roles.forEach(function (r) { shared[r[0]] = palettes[0][r[0]]; });

  // target = what the controls say; live = what is drawn, easing toward the target
  var target = {}, live = {};
  comps.forEach(function (c) {
    target[c.id] = MM.controls.defaults(c.params);
    live[c.id] = Object.assign({}, target[c.id]);
  });
  var comp = comps[0], dirty = true, recorder = null;
  var w = 0, h = 0, dpr = 1;
  var lib = new MM.ShapeLibrary(function () { checkShapes(); buildShapePanel(); dirty = true; });

  // ---------- settings specs ----------
  var textureSpecs = [
    { key: 'grain', label: 'Grain', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'streaks', label: 'Streaks', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'frameWidth', label: 'Frame width', type: 'range', min: 0, max: 40, step: 1, unit: 'px' }
  ];
  var canvasSpecs = [
    { key: 'format', label: 'Format', type: 'select', options: [['fill', 'Fill'], ['16:9', '16:9'], ['1:1', '1:1'], ['4:5', '4:5'], ['9:16', '9:16']] },
    { key: 'smoothing', label: 'Transition smoothing', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
  ];
  var colorSpecs = roles.map(function (r) { return { key: r[0], label: r[1], type: 'color' }; });

  function shapeSpecs() {
    return comp.params.filter(function (s) { return s.type === 'shape'; }).map(function (s) {
      return { key: s.key, label: s.label, type: 'dropdown', options: function () { return lib.options(s.key === 'module'); } };
    });
  }
  function conceptSpecs() { return comp.params.filter(function (s) { return s.type !== 'shape'; }); }

  // A removed upload falls back to the composition's own default shape
  function checkShapes() {
    comps.forEach(function (c) {
      c.params.forEach(function (s) {
        if (s.type === 'shape' && !lib.has(target[c.id][s.key])) target[c.id][s.key] = live[c.id][s.key] = s.value;
      });
    });
  }

  // ---------- easing ----------
  function ease(dt) {
    var t = target[comp.id], l = live[comp.id], moved = false;
    var rate = shared.smoothing > 0 ? 40 * Math.pow(1 - shared.smoothing / 100, 2) + 1.2 : 0;
    var k = rate ? 1 - Math.exp(-rate * dt) : 1;
    comp.params.forEach(function (s) {
      var key = s.key;
      if (s.type !== 'range' || s.snap) {
        if (l[key] !== t[key]) { l[key] = t[key]; moved = true; }
        return;
      }
      var d = t[key] - l[key];
      if (d === 0) return;
      l[key] = Math.abs(d) < (s.max - s.min) * 1e-4 ? t[key] : l[key] + d * k;
      moved = true;
    });
    return moved;
  }

  // ---------- shapes ----------
  function setStatus(msg, isError) {
    var s = $('shapeStatus');
    s.textContent = msg || '';
    s.classList.toggle('is-error', !!isError);
  }

  function addFiles(files) {
    if (!files || !files.length) return;
    lib.addFiles(files).then(function (r) {
      if (r.added.length) {
        comp.params.forEach(function (s) {
          if (s.type !== 'shape') return;
          var id = s.key === 'module' && lib.uploads().length > 1 ? 'mix' : r.added[0];
          target[comp.id][s.key] = live[comp.id][s.key] = id;
        });
        buildShapePanel();
        dirty = true;
      }
      setStatus(r.message, r.error);
    });
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
    var specs = shapeSpecs();
    $('shapeGroup').hidden = !specs.length;
    MM.controls.build($('shapeParams'), specs, target[comp.id], function (key) {
      live[comp.id][key] = target[comp.id][key];
      dirty = true;
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
    dirty = true;
  }

  function buildColorPanel() { MM.controls.build($('colorParams'), colorSpecs, shared, colorsChanged); }

  // ---------- panels ----------
  function buildSharedPanels() {
    buildColorPanel();
    MM.controls.build($('textureParams'), textureSpecs, shared, function () { dirty = true; });
    MM.controls.build($('canvasParams'), canvasSpecs, shared, function (key) { if (key === 'format') layout(); });
  }

  function buildCompPanel() {
    $('compTitle').textContent = comp.label;
    $('compBlurb').textContent = comp.blurb;
    MM.controls.build($('compParams'), conceptSpecs(), target[comp.id], function () { dirty = true; });
    buildShapePanel();
  }

  function renderTabs() {
    var nav = $('tabs');
    nav.innerHTML = '';
    GROUPS.forEach(function (g) {
      var wrap = document.createElement('div');
      wrap.className = 'tabgroup';
      var lab = document.createElement('span');
      lab.className = 'tabgroup__label';
      lab.textContent = g[1];
      wrap.appendChild(lab);
      comps.filter(function (c) { return c.group === g[0]; }).forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'tab';
        b.setAttribute('role', 'tab');
        b.setAttribute('aria-selected', String(c === comp));
        b.textContent = c.label;
        b.addEventListener('click', function () { setComp(c); });
        wrap.appendChild(b);
      });
      nav.appendChild(wrap);
    });
  }

  function setComp(c) {
    comp = c;
    renderTabs();
    buildCompPanel();
    setStatus('');
    dirty = true;
    try { localStorage.setItem('mm-comp', c.id); } catch (e) { /* storage unavailable */ }
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
    dirty = true;
  }

  // ---------- render ----------
  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = shared.ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (lib.ready()) {
      comp.draw(ctx, { w: w, h: h, unit: Math.min(w, h), diag: Math.hypot(w, h) }, live[comp.id], lib, shared);
    }
    MM.texture.draw(ctx, dpr, { grain: shared.grain / 100, streaks: shared.streaks / 100, frame: shared.frameWidth, frameColor: shared.frame });
  }

  var last = performance.now() / 1000;
  function frame(now) {
    var t = now / 1000, dt = Math.min(0.05, Math.max(0, t - last));
    last = t;
    if (ease(dt)) dirty = true;
    if (dirty || recorder) { render(); dirty = false; }
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
    canvas.toBlob(function (blob) { download(blob, comp.id + '-' + Date.now() + '.png'); });
  });

  var recBtn = $('record');
  if (recBtn) {
    if (!MM.recorder.supported()) {
      recBtn.disabled = true;
      recBtn.textContent = 'Recording not supported here';
    }
    recBtn.addEventListener('click', function () {
      if (!recorder) {
        try { recorder = MM.recorder.start(canvas, 60); } catch (err) { recBtn.textContent = err.message; return; }
        recBtn.textContent = 'Stop and save recording';
        recBtn.classList.add('is-recording');
        return;
      }
      var r = recorder;
      recorder = null;
      recBtn.disabled = true;
      r.stop().then(function (res) {
        download(res.blob, comp.id + '-' + Date.now() + '.' + res.ext);
        recBtn.textContent = 'Start recording';
      }).catch(function (err) {
        recBtn.textContent = err.message;
      }).then(function () {
        recBtn.disabled = false;
        recBtn.classList.remove('is-recording');
      });
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
  try { saved = localStorage.getItem('mm-comp'); } catch (e) { /* storage unavailable */ }
  comp = comps.filter(function (c) { return c.id === saved; })[0] || comps[0];

  renderTabs();
  buildCompPanel();
  buildSharedPanels();
  layout();
  colorsChanged();
  requestAnimationFrame(frame);
})(window.MM = window.MM || {});
