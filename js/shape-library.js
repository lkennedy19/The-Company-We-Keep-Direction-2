/* All shapes available to the compositions: the built-ins plus uploaded SVGs. Each composition
   stores the ids it uses (its "module" and/or "object") in its own settings. */
(function (MM) {
  'use strict';
  var MAX_UPLOADS = 12, uid = 0;

  function ShapeLibrary(onChange) {
    var self = this;
    this.items = [];
    this.onChange = onChange;
    var presets = MM.shapes.presets;
    Promise.all(Object.keys(presets).map(function (key) {
      return MM.shapes.loadSvg(presets[key].svg).then(function (src) {
        return { id: key, name: presets[key].label, builtin: true, sprite: MM.shapes.makeSprite(src) };
      });
    })).then(function (list) {
      self.items = list.concat(self.uploads());
      onChange();
    });
  }

  ShapeLibrary.prototype.ready = function () { return this.items.length > 0; };

  ShapeLibrary.prototype.uploads = function () {
    return this.items.filter(function (it) { return !it.builtin; });
  };

  ShapeLibrary.prototype.get = function (id) {
    for (var i = 0; i < this.items.length; i++) if (this.items[i].id === id) return this.items[i];
    return this.items[0] || null;
  };

  // Shape for repeated element number i; 'mix' gives each element one of the uploads, consistently
  ShapeLibrary.prototype.moduleAt = function (id, i) {
    if (id === 'mix') {
      var ups = this.uploads();
      if (ups.length) return ups[(Math.imul(i + 1, 2654435761) >>> 0) % ups.length];
      return this.get('dot');
    }
    return this.get(id);
  };

  ShapeLibrary.prototype.has = function (id) {
    return id === 'mix' ? this.uploads().length > 1 : this.items.some(function (it) { return it.id === id; });
  };

  ShapeLibrary.prototype.options = function (withMix) {
    var opts = this.items.map(function (it) { return [it.id, it.name]; });
    if (withMix && this.uploads().length > 1) opts.push(['mix', 'All uploads, mixed']);
    return opts;
  };

  // Adds every valid SVG in `files`. Resolves to { added: [ids], message, error }.
  ShapeLibrary.prototype.addFiles = function (files) {
    var self = this;
    var list = Array.prototype.filter.call(files, function (f) {
      return /\.svg$/i.test(f.name) || f.type === 'image/svg+xml';
    });
    var skipped = files.length - list.length;
    var room = MAX_UPLOADS - this.uploads().length;
    var dropped = Math.max(0, list.length - room);
    list = list.slice(0, Math.max(0, room));

    return Promise.all(list.map(function (f) {
      return f.text().then(MM.shapes.loadSvg).then(
        function (src) { return { id: 'u' + (++uid), name: f.name.replace(/\.svg$/i, ''), builtin: false, sprite: MM.shapes.makeSprite(src) }; },
        function () { return null; }
      );
    })).then(function (results) {
      var ok = results.filter(Boolean);
      var bad = results.length - ok.length + skipped;
      self.items = self.items.concat(ok);
      self.onChange();
      var msg = [];
      if (ok.length) msg.push('Added ' + ok.length + ' shape' + (ok.length > 1 ? 's' : '') + ' to this composition.');
      if (bad) msg.push(bad + ' file' + (bad > 1 ? 's were' : ' was') + ' not a usable SVG.');
      if (dropped) msg.push('Limit is ' + MAX_UPLOADS + ' uploads; ' + dropped + ' left out.');
      return { added: ok.map(function (it) { return it.id; }), message: msg.join(' '), error: !ok.length };
    });
  };

  ShapeLibrary.prototype.remove = function (id) {
    this.items = this.items.filter(function (it) { return it.id !== id; });
    this.onChange();
  };

  MM.ShapeLibrary = ShapeLibrary;
})(window.MM = window.MM || {});
