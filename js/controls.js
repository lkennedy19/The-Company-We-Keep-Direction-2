/* Builds settings UI from small param specs:
   { key, label, type: 'range'|'select'|'dropdown'|'toggle'|'color'|'text', value, min, max, step, unit,
     options (array of [value, label], or a function returning one), show(values) } */
(function (MM) {
  'use strict';
  var uid = 0;

  function defaults(specs) {
    var o = {};
    specs.forEach(function (s) { o[s.key] = s.value; });
    return o;
  }

  function fmt(s, v) {
    var dec = s.step && s.step < 1 ? String(s.step).split('.')[1].length : 0;
    return Number(v).toFixed(dec) + (s.unit || '');
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function build(container, specs, values, onChange) {
    container.innerHTML = '';
    var rows = [];

    function changed(key) {
      onChange(key);
      refresh();
    }

    specs.forEach(function (s) {
      var id = 'ctl-' + (++uid);
      var row = el('div', 'ctl ctl--' + s.type);
      var label = el('label', 'ctl__label', s.label);
      label.htmlFor = id;

      if (s.type === 'range') {
        var out = el('output', 'ctl__value', fmt(s, values[s.key]));
        var input = el('input');
        input.type = 'range'; input.id = id;
        input.min = s.min; input.max = s.max; input.step = s.step || 1;
        input.value = values[s.key];
        input.addEventListener('input', function () {
          values[s.key] = Number(input.value);
          out.textContent = fmt(s, input.value);
          changed(s.key);
        });
        var head = el('div', 'ctl__head');
        head.append(label, out);
        row.append(head, input);
      } else if (s.type === 'select') {
        var lab = el('span', 'ctl__label', s.label);
        var seg = el('div', 'seg');
        seg.setAttribute('role', 'group');
        seg.setAttribute('aria-label', s.label);
        s.options.forEach(function (opt) {
          var b = el('button', 'seg__btn', opt[1]);
          b.type = 'button';
          b.setAttribute('aria-pressed', String(values[s.key] === opt[0]));
          b.addEventListener('click', function () {
            values[s.key] = opt[0];
            seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
            changed(s.key);
          });
          seg.appendChild(b);
        });
        row.append(lab, seg);
      } else if (s.type === 'dropdown') {
        var sel = el('select');
        sel.id = id;
        (typeof s.options === 'function' ? s.options() : s.options).forEach(function (opt) {
          var o = el('option', null, opt[1]);
          o.value = opt[0];
          sel.appendChild(o);
        });
        sel.value = values[s.key];
        sel.addEventListener('change', function () { values[s.key] = sel.value; changed(s.key); });
        row.append(label, sel);
      } else if (s.type === 'toggle') {
        var cb = el('input');
        cb.type = 'checkbox'; cb.id = id; cb.checked = !!values[s.key];
        cb.addEventListener('change', function () { values[s.key] = cb.checked; changed(s.key); });
        row.append(cb, label);
      } else if (s.type === 'color') {
        var col = el('input');
        col.type = 'color'; col.id = id; col.value = values[s.key];
        col.addEventListener('input', function () { values[s.key] = col.value; changed(s.key); });
        row.append(label, col);
      } else if (s.type === 'text') {
        var tx = el('input');
        tx.type = 'text'; tx.id = id; tx.value = values[s.key];
        tx.maxLength = s.maxLength || 24; tx.autocomplete = 'off'; tx.spellcheck = false;
        tx.addEventListener('input', function () { values[s.key] = tx.value; changed(s.key); });
        row.append(label, tx);
      }
      container.appendChild(row);
      rows.push({ s: s, row: row });
    });

    function refresh() {
      rows.forEach(function (r) { r.row.hidden = r.s.show ? !r.s.show(values) : false; });
    }
    refresh();
    return { refresh: refresh };
  }

  MM.controls = { defaults: defaults, build: build };
})(window.MM = window.MM || {});
