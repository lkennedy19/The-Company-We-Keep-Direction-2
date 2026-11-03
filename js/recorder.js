/* Records the canvas while you work the controls, and hands back a video file when stopped. */
(function (MM) {
  'use strict';
  var TYPES = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];

  function pickType() {
    if (!window.MediaRecorder) return null;
    for (var i = 0; i < TYPES.length; i++) if (MediaRecorder.isTypeSupported(TYPES[i])) return TYPES[i];
    return null;
  }

  function supported() { return !!(pickType() && HTMLCanvasElement.prototype.captureStream); }

  // Starts recording. Returns { stop() } where stop() resolves with { blob, ext }.
  function start(canvas, fps) {
    var type = pickType();
    if (!type) throw new Error('This browser cannot record video.');
    var stream = canvas.captureStream(fps || 60);
    var rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16000000 });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
    rec.start(250);
    return {
      stop: function () {
        return new Promise(function (resolve, reject) {
          rec.onerror = function () { reject(new Error('Recording failed.')); };
          rec.onstop = function () {
            stream.getTracks().forEach(function (t) { t.stop(); });
            resolve({ blob: new Blob(chunks, { type: type.split(';')[0] }), ext: type.indexOf('mp4') >= 0 ? 'mp4' : 'webm' });
          };
          rec.stop();
        });
      }
    };
  }

  MM.recorder = { supported: supported, start: start };
})(window.MM = window.MM || {});
