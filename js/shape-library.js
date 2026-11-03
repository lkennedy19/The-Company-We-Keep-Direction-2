/* All shapes available to the concepts: the built-ins plus uploaded SVGs. Concepts ask for a
   "module" (the repeated element) and an "object" (the single subject, e.g. what faces the mirror). */
(function (MM) {
  'use strict';
  var MAX_UPLOADS = 12, uid = 0;

  function ShapeLibrary(onChange) {
    var self = this;
    this.items = [];
    this.module = 'oval';   // a shape id, or 'mix' to scatter all uploads
    this.object = 'capsule';
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

  ShapeLibrary.prototype.uploads = function () {
    return this.items.filter(function (it) { return !it.builtin; });
  };

  ShapeLibrary.prototype.get = function (id) {
    for (var i = 0; i < this.items.length; i++) if (this.items[i].id === id) return this.items[i];
    return null;
  };

  ShapeLibrary.prototype.ready = function () { return this.items.length > 0; };

  // The shape for repeated element number `i`; with 'mix', each element keeps its own upload
  ShapeLibrary.prototype.moduleAt = function (i) {
    if (this.module === 'mix') {
      var ups = this.uploads();
      if (ups.length) return ups[(Math.imul(i + 1, 2654435761) >>> 0) % ups.length];
    }
    return this.get(this.module) || this.get('oval') || this.items[0];
  };

  ShapeLibrary.prototype.objectItem = function () {
    return this.get(this.object) || this.get('capsule') || this.items[0];
  };

  ShapeLibrary.prototype.options = function (withMix) {
    var opts = this.items.map(function (it) { return [it.id, it.name]; });
    if (withMix && this.uploads().length > 1) opts.push(['mix', 'All uploads, mixed']);
    return opts;
  };

  // Adds every valid SVG in `files`. Resolves to a short status message.
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
      if (ok.length) {
        self.object = ok[0].id;
        self.module = self.uploads().length > 1 ? 'mix' : ok[0].id;
      }
      self.onChange();
      var msg = [];
      if (ok.length) msg.push('Added ' + ok.length + ' shape' + (ok.length > 1 ? 's' : '') + '. They are now the module and the object; change either below.');
      if (bad) msg.push(bad + ' file' + (bad > 1 ? 's were' : ' was') + ' not a usable SVG.');
      if (dropped) msg.push('Limit is ' + MAX_UPLOADS + ' uploads; ' + dropped + ' left out.');
      return { message: msg.join(' '), error: !ok.length };
    });
  };

  ShapeLibrary.prototype.remove = function (id) {
    this.items = this.items.filter(function (it) { return it.id !== id; });
    var ups = this.uploads();
    if (this.module === id || (this.module === 'mix' && ups.length < 2)) this.module = ups.length > 1 ? 'mix' : (ups[0] ? ups[0].id : 'oval');
    if (this.object === id) this.object = ups[0] ? ups[0].id : 'capsule';
    this.onChange();
  };

  MM.ShapeLibrary = ShapeLibrary;
})(window.MM = window.MM || {});
