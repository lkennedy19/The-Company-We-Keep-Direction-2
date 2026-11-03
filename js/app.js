/* Wires it together: tabs, settings panel, shapes, particles, and the animation loop. */
(function (MM) {
  'use strict';
  var modes = [MM.modes.magnet, MM.modes.mirror];
  var presets = MM.shapes.presets, palettes = MM.palettes;
  var STRIDE = MM.GLRenderer.STRIDE;

  var $ = function (id) { return document.getElementById(id); };
  var canvas = $('canvas'), stage = $('stage');

  var renderer = new MM.GLRenderer(canvas);
  if (!renderer.ok) {
    $('glError').hidden = false;
    return;
  }

  // ---------- state ----------
  var shared = {
    word: 'KEEP',
    spacing: presets.dot.spacing, size: presets.dot.size, sizeVar: 45,
    goo: 45, weight: 50, soft: 0, relief: 0, grain: 40,
    paper: palettes[0].paper, ink: palettes[0].ink,
    motion: 'hybrid', tempo: 1, follow: 6, flow: 3
  };
  var params = {};
  modes.forEach(function (m) { params[m.id] = MM.controls.defaults(m.params); });

  var mode = modes[0], modeState = mode.createState();
  var sprites = [], seed = 1, particles = [], inst = new Float32Array(0);
  var w = 0, h = 0, dpr = 1;
  var pointer = new MM.Pointer(canvas);
  var shapes = new MM.ShapeSet(function () { rebuildSprites(); renderShapeUI(); });
  var shapePanel = null, colorPanel = null;

  // ---------- settings specs ----------
  var shapeSpecs = [
    { key: 'word', label: 'Word', type: 'text', maxLength: 16, show: function () { return shapes.preset === 'word'; } }
  ];
  var particleSpecs = [
    { key: 'spacing', label: 'Spacing', type: 'range', min: 6, max: 80, step: 1, unit: 'px' },
    { key: 'size', label: 'Size', type: 'range', min: 2, max: 120, step: 1, unit: 'px' },
    { key: 'sizeVar', label: 'Size variation', type: 'range', min: 0, max: 90, step: 1, unit: '%' }
  ];
  var surfaceSpecs = [
    { key: 'goo', label: 'Goo', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'weight', label: 'Weight', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'soft', label: 'Soft edge', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'relief', label: 'Relief', type: 'range', min: 0, max: 100, step: 1, unit: '%' },
    { key: 'grain', label: 'Grain', type: 'range', min: 0, max: 100, step: 1, unit: '%' }
  ];
  var colorSpecs = [
    { key: 'paper', label: 'Paper', type: 'color' },
    { key: 'ink', label: 'Ink', type: 'color' }
  ];
  var motionSpecs = [
    { key: 'motion', label: 'Driven by', type: 'select', options: [['hybrid', 'Cursor + idle'], ['cursor', 'Cursor'], ['auto', 'Auto']] },
    { key: 'tempo', label: 'Auto tempo', type: 'range', min: 0.2, max: 3, step: 0.1, unit: '×', show: function (v) { return v.motion !== 'cursor'; } },
    { key: 'follow', label: 'Follow smoothing', type: 'range', min: 1, max: 30, step: 0.5 },
    { key: 'flow', label: 'Particle speed', type: 'range', min: 0.5, max: 12, step: 0.5 }
  ];

  // ---------- shapes ----------
  function setStatus(msg, isError) {
    var s = $('shapeStatus');
    s.textContent = msg || '';
    s.classList.toggle('is-error', !!isError);
  }

  function rebuildSprites() {
    sprites = shapes.sources().map(function (src) { return MM.shapes.makeSprite(src); });
    renderer.setShapes(sprites);
  }

  function choosePreset(key) {
    var pr = presets[key];
    if (pr) {
      shared.spacing = pr.spacing; shared.size = pr.size;
      buildSharedPanels();
      rebuildParticles();
    }
    setStatus('');
    shapes.usePreset(key);
  }

  function addFiles(files) {
    if (!files || !files.length) return;
    shapes.addFiles(files).then(function (r) { setStatus(r.message, r.error); });
  }

  function drawThumb(c, sp) {
    var g = c.getContext('2d'), n = c.width, s = n * 0.78;
    g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, n, n);
    var tw = sp.aspect >= 1 ? s : s * sp.aspect, th = sp.aspect >= 1 ? s / sp.aspect : s;
    g.drawImage(sp.canvas, (n - tw) / 2, (n - th) / 2, tw, th);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = shared.ink;
    g.fillRect(0, 0, n, n);
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = shared.paper;
    g.fillRect(0, 0, n, n);
  }

  function renderShapeUI() {
    var wrap = $('presets');
    wrap.innerHTML = '';
    Object.keys(presets).concat(shapes.uploads.length ? ['upload'] : []).forEach(function (key) {
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
        if (sprites[i]) drawThumb(c, sprites[i]);
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

  // ---------- colour ----------
  function applyColors() {
    document.documentElement.style.setProperty('--stage-bg', shared.paper);
    renderShapeUI();
    renderPalettes();
  }

  function renderPalettes() {
    var wrap = $('palettes');
    wrap.innerHTML = '';
    palettes.forEach(function (pal) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.title = pal.name;
      b.setAttribute('aria-label', pal.name + ' palette');
      b.setAttribute('aria-pressed', String(pal.paper === shared.paper && pal.ink === shared.ink));
      b.style.setProperty('--sw-paper', pal.paper);
      b.style.setProperty('--sw-ink', pal.ink);
      b.addEventListener('click', function () {
        shared.paper = pal.paper; shared.ink = pal.ink;
        colorPanel = MM.controls.build($('colorParams'), colorSpecs, shared, applyColors);
        applyColors();
      });
      wrap.appendChild(b);
    });
  }

  // ---------- panels ----------
  function buildSharedPanels() {
    shapePanel = MM.controls.build($('shapeParams'), shapeSpecs, shared, function (key) {
      if (key === 'word') shapes.setWord(shared.word);
    });
    MM.controls.build($('particleParams'), particleSpecs, shared, function (key) {
      if (key === 'spacing') rebuildParticles();
    });
    MM.controls.build($('surfaceParams'), surfaceSpecs, shared, function () {});
    colorPanel = MM.controls.build($('colorParams'), colorSpecs, shared, applyColors);
    MM.controls.build($('motionParams'), motionSpecs, shared, function () {});
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

  // Particles keep their positions across a switch, so they flow from one composition into the next
  function setMode(m) {
    mode = m;
    modeState = m.createState();
    renderTabs();
    buildModePanel();
    try { localStorage.setItem('mm-mode', m.id); } catch (e) { /* storage unavailable */ }
  }

  // ---------- layout ----------
  function rebuildParticles() {
    MM.noise.seed(seed);
    particles = MM.particles.create(w, h, shared.spacing, seed);
    if (inst.length < particles.length * 2 * STRIDE) inst = new Float32Array(particles.length * 2 * STRIDE);
  }

  function layout() {
    var r = stage.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.resize(w, h, dpr);
    rebuildParticles();
  }

  // ---------- frame ----------
  // Pack particles (and their reflections, for Mirror) into the instance buffer
  function buildInstances(reflect, t) {
    var n = sprites.length || 1, size = shared.size, vary = shared.sizeVar / 100, k = 0;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      if (p.hidden || p.s < 0.02) continue;
      var sc = size * p.s * (1 - vary * p.grow);
      var c = Math.cos(p.rot) * sc, s = Math.sin(p.rot) * sc;
      var cell = Math.min(n - 1, (p.shape * n) | 0);
      inst[k++] = p.x; inst[k++] = p.y; inst[k++] = c; inst[k++] = s; inst[k++] = -s; inst[k++] = c; inst[k++] = cell;
      if (!reflect) continue;
      if (reflect.axis === 'v') {
        inst[k++] = 2 * reflect.x - p.x; inst[k++] = p.y; inst[k++] = -c; inst[k++] = s; inst[k++] = s; inst[k++] = c;
      } else {
        var depth = p.y < reflect.y ? reflect.y - p.y : 0;
        var sway = reflect.ripple ? Math.sin(t * 1.6 - depth * 0.05 + Math.sin(p.x * 0.012 + t * 0.6)) * reflect.ripple * (2 + depth * 0.06) : 0;
        inst[k++] = p.x + sway; inst[k++] = 2 * reflect.y - p.y; inst[k++] = c; inst[k++] = -s; inst[k++] = -s; inst[k++] = -c;
      }
      inst[k++] = cell;
    }
    return k / STRIDE;
  }

  // Once blurred, the field reads as local particle density. Scale it so 1 means "average density":
  // evenly spread areas become solid, gathered bands stay solid, and sparse stragglers melt away.
  function fieldGain(sigma) {
    var v = shared.sizeVar / 100, sp = particles.spacing || shared.spacing;
    var density = renderer.coverage * shared.size * shared.size * (1 - v + v * v / 3) / (sp * sp);
    var full = Math.max(1, 1 / Math.max(density, 0.01));
    var u = Math.min(1, sigma / (sp * 0.9));
    return 1 + (full - 1) * u * u * (3 - 2 * u);
  }

  var last = performance.now() / 1000;
  function frame(now) {
    var t = now / 1000, dt = Math.min(0.05, Math.max(0, t - last));
    last = t;
    pointer.update(t, dt, w, h, shared);
    var env = { w: w, h: h, t: t, dt: dt, tx: pointer.x, ty: pointer.y, cx: w / 2, cy: h / 2, diag: Math.hypot(w, h) };
    var reflect = mode.update(particles, env, params[mode.id], modeState);
    MM.particles.step(particles, dt, shared.flow);
    var count = buildInstances(reflect, t);
    var sigma = (shared.goo / 100) * Math.max(shared.size, 4) * 1.4;
    renderer.draw(inst, count, {
      sigma: sigma,
      gain: fieldGain(sigma),
      thresh: 0.78 - (shared.weight / 100) * 0.56,
      soft: shared.soft / 100,
      relief: shared.relief / 100,
      grain: shared.grain / 100,
      paper: shared.paper,
      ink: shared.ink
    });
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
    rebuildParticles();
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
  choosePreset('dot');
  applyColors();
  requestAnimationFrame(frame);
})(window.MM = window.MM || {});
