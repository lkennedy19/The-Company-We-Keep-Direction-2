/* Wires it together: tabs, settings panel, shapes, resize and the animation loop. */
(function (MM) {
  'use strict';
  var modes = [MM.modes.magnet, MM.modes.mirror];
  var presets = MM.shapes.presets;

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('canvas'), ctx = canvas.getContext('2d'), stage = $('stage');

  // ---------- state ----------
  var shared = {
    word: 'KEEP', keepColors: false,
    gapX: presets.word.gapX, gapY: presets.word.gapY, size: presets.word.size,
    motion: 'hybrid', tempo: 1, follow: 8,
    fg: '#ffffff', bg: '#000000'
  };
  var params = {};
  modes.forEach(function (m) { params[m.id] = MM.controls.defaults(m.params); });

  var mode = modes[0], modeState = mode.createState();
  var sprites = [], seed = 1;
  var grid = null, w = 0, h = 0, dpr = 1;
  var pointer = new MM.Pointer(canvas);
  var shapes = new MM.ShapeSet(function () { rebuildSprites(); renderShapeUI(); });
  var shapePanel = null;

  // ---------- settings specs ----------
  var shapeSpecs = [
    { key: 'word', label: 'Word', type: 'text', maxLength: 16, show: function () { return shapes.preset === 'word'; } },
    { key: 'keepColors', label: 'Keep SVG colours', type: 'toggle', show: function () { return shapes.preset === 'upload'; } }
  ];
  var gridSpecs = [
    { key: 'gapX', label: 'Column spacing', type: 'range', min: 18, max: 260, step: 1, unit: 'px' },
    { key: 'gapY', label: 'Row spacing', type: 'range', min: 18, max: 260, step: 1, unit: 'px' },
    { key: 'size', label: 'Element size', type: 'range', min: 6, max: 260, step: 1, unit: 'px' }
  ];
  var motionSpecs = [
    { key: 'motion', label: 'Driven by', type: 'select', options: [['hybrid', 'Cursor + idle'], ['cursor', 'Cursor'], ['auto', 'Auto']] },
    { key: 'tempo', label: 'Auto tempo', type: 'range', min: 0.2, max: 3, step: 0.1, unit: '×', show: function (v) { return v.motion !== 'cursor'; } },
    { key: 'follow', label: 'Follow smoothing', type: 'range', min: 1, max: 30, step: 0.5 }
  ];
  var colorSpecs = [
    { key: 'fg', label: 'Shape', type: 'color' },
    { key: 'bg', label: 'Background', type: 'color' }
  ];

  // ---------- shapes ----------
  function setStatus(msg, isError) {
    var s = $('shapeStatus');
    s.textContent = msg || '';
    s.classList.toggle('is-error', !!isError);
  }

  function rebuildSprites() {
    var keep = shapes.preset === 'upload' && shared.keepColors;
    sprites = shapes.sources().map(function (src) { return MM.shapes.makeSprite(src, shared.fg, keep); });
  }

  function choosePreset(key) {
    var pr = presets[key];
    if (pr) {
      shared.gapX = pr.gapX; shared.gapY = pr.gapY; shared.size = pr.size;
      buildSharedPanels();
      layout();
    }
    setStatus('');
    shapes.usePreset(key);
  }

  function addFiles(files) {
    if (!files || !files.length) return;
    shapes.addFiles(files).then(function (r) { setStatus(r.message, r.error); });
  }

  function renderShapeUI() {
    var wrap = $('presets');
    wrap.innerHTML = '';
    var keys = Object.keys(presets).concat(shapes.uploads.length ? ['upload'] : []);
    keys.forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg__btn';
      b.textContent = key === 'upload' ? 'Uploads (' + shapes.uploads.length + ')' : presets[key].label;
      b.setAttribute('aria-pressed', String(shapes.preset === key));
      b.addEventListener('click', function () { choosePreset(key); });
      wrap.appendChild(b);
    });

    var list = $('uploadList');
    list.innerHTML = '';
    list.hidden = shapes.preset !== 'upload';
    if (!list.hidden) {
      shapes.uploads.forEach(function (u, i) {
        var li = document.createElement('li');
        li.className = 'thumb';
        li.title = u.name;
        var c = document.createElement('canvas');
        c.width = c.height = 96;
        var sp = sprites[i];
        if (sp) {
          var g = c.getContext('2d'), s = 76;
          var tw = sp.aspect >= 1 ? s : s * sp.aspect, th = sp.aspect >= 1 ? s / sp.aspect : s;
          g.drawImage(sp.canvas, (96 - tw) / 2, (96 - th) / 2, tw, th);
        }
        var rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'thumb__remove';
        rm.textContent = '×';
        rm.setAttribute('aria-label', 'Remove ' + u.name);
        rm.addEventListener('click', function () { shapes.remove(i); setStatus(''); });
        li.append(c, rm);
        list.appendChild(li);
      });
    }
    if (shapePanel) shapePanel.refresh();
  }

  // ---------- panels ----------
  function buildSharedPanels() {
    shapePanel = MM.controls.build($('shapeParams'), shapeSpecs, shared, function (key) {
      if (key === 'word') shapes.setWord(shared.word);
      if (key === 'keepColors') { rebuildSprites(); renderShapeUI(); }
    });
    MM.controls.build($('gridParams'), gridSpecs, shared, function (key) {
      if (key !== 'size') layout();
    });
    MM.controls.build($('motionParams'), motionSpecs, shared, function () {});
    MM.controls.build($('colorParams'), colorSpecs, shared, function (key) {
      if (key === 'fg') { rebuildSprites(); renderShapeUI(); }
      document.documentElement.style.setProperty('--stage-bg', shared.bg);
    });
  }

  function buildModePanel() {
    $('modeTitle').textContent = mode.label;
    $('modeBlurb').textContent = mode.blurb;
    MM.controls.build($('modeParams'), mode.params, params[mode.id], function () {});
  }

  function renderTabs() {
    var nav = $('tabs');
    nav.innerHTML = '';
    modes.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(m === mode));
      b.textContent = m.label;
      b.addEventListener('click', function () { setMode(m); });
      nav.appendChild(b);
    });
  }

  function setMode(m) {
    mode = m;
    modeState = m.createState();
    m.reset(grid.els, modeState);
    renderTabs();
    buildModePanel();
    try { localStorage.setItem('mm-mode', m.id); } catch (e) { /* storage unavailable */ }
  }

  // ---------- layout ----------
  function layout() {
    var r = stage.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    grid = MM.grid.create(w, h, shared.gapX, shared.gapY, seed);
    mode.reset(grid.els, modeState);
  }

  // ---------- loop ----------
  var last = performance.now() / 1000;
  function frame(now) {
    var t = now / 1000, dt = Math.min(0.05, Math.max(0, t - last));
    last = t;
    pointer.update(t, dt, w, h, shared);
    var env = {
      w: w, h: h, t: t, dt: dt, tx: pointer.x, ty: pointer.y, cx: w / 2, cy: h / 2,
      grid: grid, size: shared.size
    };
    var layers = mode.update(grid.els, env, params[mode.id], modeState) || [{ items: grid.els }];
    MM.renderer.draw(ctx, layers, sprites, shared.size, dpr, shared.bg);
    requestAnimationFrame(frame);
  }

  // ---------- events ----------
  new ResizeObserver(layout).observe(stage);

  $('fileInput').addEventListener('change', function (e) {
    addFiles(e.target.files);
    e.target.value = '';
  });

  $('shuffle').addEventListener('click', function () {
    seed += 1;
    layout();
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
    setTimeout(layout, 0);
  });

  var saveBtn = $('savePng'); // absent where downloads are not allowed
  if (saveBtn) saveBtn.addEventListener('click', function () {
    canvas.toBlob(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = mode.id + '-' + Date.now() + '.png';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
  });

  // ---------- boot ----------
  if (window.matchMedia('(min-width: 900px)').matches) {
    document.body.classList.add('panel-open');
    $('panelToggle').setAttribute('aria-expanded', 'true');
  }
  var saved = null;
  try { saved = localStorage.getItem('mm-mode'); } catch (e) { /* storage unavailable */ }
  mode = modes.filter(function (m) { return m.id === saved; })[0] || modes[0];
  modeState = mode.createState();

  renderTabs();
  buildModePanel();
  buildSharedPanels();
  layout();
  choosePreset('word');
  requestAnimationFrame(frame);
})(window.MM = window.MM || {});
