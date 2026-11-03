/* The shapes in play: either one preset, or the list of uploaded SVGs (scattered across the grid). */
(function (MM) {
  'use strict';
  var MAX_UPLOADS = 12;

  function ShapeSet(onChange) {
    this.preset = 'word';      // a preset key, or 'upload'
    this.word = 'KEEP';
    this.presetSource = null;
    this.uploads = [];         // [{ name, source }]
    this.onChange = onChange;
  }

  ShapeSet.prototype.sources = function () {
    if (this.preset === 'upload') return this.uploads.map(function (u) { return u.source; });
    return this.presetSource ? [this.presetSource] : [];
  };

  ShapeSet.prototype.usePreset = function (key) {
    var self = this;
    this.preset = key;
    if (key === 'upload') { this.onChange(); return Promise.resolve(); }
    var pr = MM.shapes.presets[key];
    if (pr.word) {
      this.presetSource = MM.shapes.wordSource(this.word);
      this.onChange();
      return Promise.resolve();
    }
    return MM.shapes.loadSvg(pr.svg).then(function (src) {
      if (self.preset !== key) return;
      self.presetSource = src;
      self.onChange();
    });
  };

  ShapeSet.prototype.setWord = function (text) {
    this.word = text;
    if (this.preset === 'word') {
      this.presetSource = MM.shapes.wordSource(text);
      this.onChange();
    }
  };

  // Adds every valid SVG in `files`. Resolves to a short status message.
  ShapeSet.prototype.addFiles = function (files) {
    var self = this;
    var list = Array.prototype.filter.call(files, function (f) {
      return /\.svg$/i.test(f.name) || f.type === 'image/svg+xml';
    });
    var skipped = files.length - list.length;
    var room = MAX_UPLOADS - this.uploads.length;
    var dropped = Math.max(0, list.length - room);
    list = list.slice(0, Math.max(0, room));

    return Promise.all(list.map(function (f) {
      return f.text().then(MM.shapes.loadSvg).then(
        function (src) { return { name: f.name, source: src }; },
        function () { return null; }
      );
    })).then(function (results) {
      var ok = results.filter(Boolean);
      var bad = results.length - ok.length + skipped;
      self.uploads = self.uploads.concat(ok);
      if (self.uploads.length) self.preset = 'upload';
      self.onChange();
      var msg = [];
      if (ok.length) msg.push('Added ' + ok.length + ' shape' + (ok.length > 1 ? 's' : '') + '.');
      if (bad) msg.push(bad + ' file' + (bad > 1 ? 's were' : ' was') + ' not a usable SVG.');
      if (dropped) msg.push('Limit is ' + MAX_UPLOADS + ' shapes; ' + dropped + ' left out.');
      return { message: msg.join(' '), error: !ok.length };
    });
  };

  ShapeSet.prototype.remove = function (index) {
    this.uploads.splice(index, 1);
    if (!this.uploads.length) return this.usePreset('harpoon');
    this.onChange();
    return Promise.resolve();
  };

  MM.ShapeSet = ShapeSet;
})(window.MM = window.MM || {});
