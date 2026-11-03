/* Wires it together: tabs, settings panel, shape loading, resize and the animation loop. */
(function (MM) {
  'use strict';
  var M = MM.math;
  var modes = [MM.modes.magnet, MM.modes.twin, MM.modes.mimic, MM.modes.pool];
  var presets = MM.shapes.presets;

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('canvas'), ctx = canvas.getContext('2d'), stage = $('stage');

  // ---------- state ----------
  var shared = {
    preset: 'word', word: 'KEEP', keepColors: false,
    gapX: presets.word.gapX, gapY: presets.word.gapY, size: presets.word.size,
    motion: 'hybrid', tempo: 1, follow: 8,
    fg: '#ffffff', bg: '#000000'
  };
  var params = {};
  modes.forEach(function (m) { params[m.id] = MM.controls.defaults(m.params); });

  var mode = modes[0], modeState = mode.createState();
  var source = null, sprite = null, uploadedName = '';
  var els = [], w = 0, h = 0, dpr = 1;
  var pointer = new MM.Pointer(canvas);

  // ---------- settings specs ----------
  var shapeSpecs = [
    { key: 'word', label: 'Word', type: 'text', value: shared.word, maxLength: 16, show: function (v) { return v.preset === 'word'; } },
    { key: 'keepColors', label: 'Keep SVG colours', type: 'toggle', value: false, show: function (v) { return v.preset === 'upload'; } }
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

  // ---------- shape ----------
  function setStatus(msg, isError) {
    var s = $('shapeStatus');
    s.textContent = msg || '';
    s.classList.toggle('is-error', !!isError);
  }

  function rebuildSprite() {
    if (source) sprite = MM.shapes.makeSprite(source, shared.fg, shared.preset === 'upload' && shared.keepColors);
  }

  function useSource(src) { source = src; rebuildSprite(); }

  function selectPreset(key) {
    shared.preset = key;
    var pr = presets[key];
    if (pr) {
      shared.gapX = pr.gapX; shared.gapY = pr.gapY; shared.size = pr.size;
      buildSharedPanels();
      layout();
      setStatus('');
      if (pr.word) useSource(MM.shapes.wordSource(shared.word));
      else MM.shapes.loadSvg(pr.svg).then(useSource);
    }
    renderPresetButtons();
  }

  function loadFile(file) {
    if (!file) return;
    if (!/\.svg$/i.test(file.name) && file.type !== 'image/svg+xml') {
      setStatus('Please choose an .svg file.', true);
      return;
    }
    file.text().then(MM.shapes.loadSvg).then(function (src) {
      uploadedName = file.name;
      shared.preset = 'upload';
      useSource(src);
      renderPresetButtons();
      buildSharedPanels();
      setStatus('Using ' + file.name);
    }).catch(function (err) { setStatus(err.message, true); });
  }

  function renderPresetButtons() {
    var wrap = $('presets');
    wrap.innerHTML = '';
    Object.keys(presets).concat(uploadedName ? ['upload'] : []).forEach(function (key) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'seg__btn';
      b.textContent = key === 'upload' ? 'Upload' : presets[key].label;
      b.setAttribute('aria-pressed', String(shared.preset === key));
      b.addEventListener('click', function () {
        if (key === 'upload') return;
        selectPreset(key);
      });
      wrap.appendChild(b);
    });
  }

  // ---------- panels ----------
  function buildSharedPanels() {
    MM.controls.build($('shapeParams'), shapeSpecs, shared, function (key) {
      if (key === 'word') useSource(MM.shapes.wordSource(shared.word));
      if (key === 'keepColors') rebuildSprite();
    });
    MM.controls.build($('gridParams'), gridSpecs, shared, function (key) {
      if (key !== 'size') layout();
    });
    MM.controls.build($('motionParams'), motionSpecs, shared, function () {});
    MM.controls.build($('colorParams'), colorSpecs, shared, function (key) {
      if (key === 'fg') rebuildSprite();
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
      var parts = m.label.split(' · ');
      b.innerHTML = '';
      var main = document.createElement('span');
      main.textContent = parts[0];
      b.appendChild(main);
      if (parts[1]) {
        var sub = document.createElement('span');
        sub.className = 'tab__sub';
        sub.textContent = parts[1];
        b.appendChild(sub);
      }
      b.addEventListener('click', function () { setMode(m); });
      nav.appendChild(b);
    });
  }

  function setMode(m) {
    mode = m;
    modeState = m.createState();
    m.reset(els, modeState);
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
    els = MM.grid.build(w, h, shared.gapX, shared.gapY);
    mode.reset(els, modeState);
  }

  // ---------- loop ----------
  var last = performance.now() / 1000;
  function frame(now) {
    var t = now / 1000, dt = Math.min(0.05, Math.max(0, t - last));
    last = t;
    pointer.update(t, dt, w, h, shared);
    var env = { w: w, h: h, t: t, dt: dt, tx: pointer.x, ty: pointer.y, cx: w / 2, cy: h / 2 };
    mode.update(els, env, params[mode.id], modeState);
    MM.renderer.draw(ctx, els, sprite, shared.size, dpr, shared.bg);
    requestAnimationFrame(frame);
  }

  // ---------- events ----------
  new ResizeObserver(layout).observe(stage);

  $('fileInput').addEventListener('change', function (e) {
    loadFile(e.target.files[0]);
    e.target.value = '';
  });

  stage.addEventListener('dragover', function (e) { e.preventDefault(); stage.classList.add('is-drop'); });
  stage.addEventListener('dragleave', function () { stage.classList.remove('is-drop'); });
  stage.addEventListener('drop', function (e) {
    e.preventDefault();
    stage.classList.remove('is-drop');
    loadFile(e.dataTransfer.files[0]);
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
  selectPreset(shared.preset);
  requestAnimationFrame(frame);
})(window.MM = window.MM || {});
