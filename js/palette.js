/* Colour roles shared by every concept, and palettes drawn from the references. */
(function (MM) {
  'use strict';
  // Roles: ground (background), frame (border), primary (big fields), secondary (objects),
  // module (repeated elements), accent (pole / bounce highlights), metal (magnet, mirror, hairlines)
  MM.palette = {
    roles: [
      ['ground', 'Ground'], ['frame', 'Frame'], ['primary', 'Primary'], ['secondary', 'Secondary'],
      ['module', 'Module'], ['accent', 'Accent'], ['metal', 'Metal']
    ],
    presets: [
      { name: 'Signal', ground: '#262624', frame: '#7c7c7a', primary: '#1565ee', secondary: '#1f7a37', module: '#f26b2b', accent: '#ef3a2d', metal: '#8f8f8d' },
      { name: 'Paper', ground: '#e8e5dc', frame: '#bdb9ad', primary: '#1a5fe0', secondary: '#23804a', module: '#f06a2c', accent: '#e2342a', metal: '#8d8b85' },
      { name: 'Night', ground: '#0e1a33', frame: '#46526e', primary: '#2f6dff', secondary: '#8fd14f', module: '#ffae3a', accent: '#ff4f3d', metal: '#8f99b2' },
      { name: 'Mono', ground: '#151515', frame: '#4a4a4a', primary: '#e9e9e6', secondary: '#e9e9e6', module: '#e9e9e6', accent: '#ffffff', metal: '#8a8a88' }
    ]
  };
})(window.MM = window.MM || {});
