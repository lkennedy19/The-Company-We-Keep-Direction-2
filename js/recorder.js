/* Records the canvas for one loop length and hands back a video file. */
(function (MM) {
  'use strict';
  var TYPES = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

  function pickType() {
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < TYPES.length; i++) if (MediaRecorder.isTypeSupported(TYPES[i])) return TYPES[i];
    return null;
  }

  function supported() { return !!(pickType() && HTMLCanvasElement.prototype.captureStream); }

  // Resolves with { blob, ext }
  function record(canvas, seconds, fps) {
    return new Promise(function (resolve, reject) {
      var type = pickType();
      if (!type) { reject(new Error('This browser cannot record video.')); return; }
      var stream = canvas.captureStream(fps || 60);
      var rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16000000 });
      var chunks = [];
      rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onerror = function () { reject(new Error('Recording failed.')); };
      rec.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        resolve({ blob: new Blob(chunks, { type: type.split(';')[0] }), ext: type.indexOf('mp4') >= 0 ? 'mp4' : 'webm' });
      };
      rec.start(250);
      setTimeout(function () { rec.stop(); }, seconds * 1000);
    });
  }

  MM.recorder = { supported: supported, record: record };
})(window.MM = window.MM || {});
