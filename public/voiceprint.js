/**
 * 声纹提取与异兽音效模块（修正版）
 * 依赖：Tone.js、Meyda.js
 */
(function (global) {
  'use strict';

  var mic = null;
  var analyzer = null;
  var effects = null;
  var running = false;
  var nativeCtx = null;
  var waveAnalyser = null;
  var loopId = null;
  var activeStream = null;
  var ownsStream = false;

  // 声纹特征 → 异兽属性映射
  var MAPPING = {
    pitchToSize:      [80, 400, 0.5, 1.5],
    zcrToRoughness:   [0.02, 0.25, 0, 1],
    centroidToColor:  [500, 4000, 0.2, 1.0],
    rmsToMuscle:      [0, 0.5, 0, 1]
  };

  function mapLinear(value, inMin, inMax, outMin, outMax) {
    var t = (value - inMin) / (inMax - inMin);
    t = Math.max(0, Math.min(1, t));
    return outMin + t * (outMax - outMin);
  }

  function toMonsterParams(f) {
    return {
      size:       mapLinear(f.pitch, MAPPING.pitchToSize[0], MAPPING.pitchToSize[1], MAPPING.pitchToSize[2], MAPPING.pitchToSize[3]),
      roughness:  mapLinear(f.zcr, MAPPING.zcrToRoughness[0], MAPPING.zcrToRoughness[1], MAPPING.zcrToRoughness[2], MAPPING.zcrToRoughness[3]),
      colorBright: mapLinear(f.spectralCentroid, MAPPING.centroidToColor[0], MAPPING.centroidToColor[1], MAPPING.centroidToColor[2], MAPPING.centroidToColor[3]),
      muscle:     mapLinear(f.rms, MAPPING.rmsToMuscle[0], MAPPING.rmsToMuscle[1], MAPPING.rmsToMuscle[2], MAPPING.rmsToMuscle[3]),
      raw: f
    };
  }

  function detectPitch(buffer, sampleRate) {
    // Decimate by two and search only the expected speech pitch range. This
    // keeps the autocorrelation work small enough for mobile browsers.
    var step = 2;
    var SIZE = Math.floor(buffer.length / step);
    var rate = sampleRate / step;
    var rms = 0;
    for (var i = 0; i < SIZE; i++) rms += buffer[i * step] * buffer[i * step];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.01) return -1;
    var minLag = Math.max(2, Math.floor(rate / 400));
    var maxLag = Math.min(SIZE - 2, Math.floor(rate / 70));
    var bestLag = -1, bestScore = 0;
    for (var lag = minLag; lag <= maxLag; lag++) {
      var score = 0;
      for (var j = 0; j < SIZE - lag; j++) {
        score += buffer[j * step] * buffer[(j + lag) * step];
      }
      if (score > bestScore) { bestScore = score; bestLag = lag; }
    }
    return bestLag > 0 ? rate / bestLag : -1;
  }

  function computeZCR(buffer) {
    var crossings = 0;
    for (var i = 1; i < buffer.length; i++) {
      if ((buffer[i - 1] >= 0) !== (buffer[i] >= 0)) crossings++;
    }
    return crossings / buffer.length;
  }

  function buildEffects() {
    var pitchShift = new Tone.PitchShift({ pitch: -12, windowSize: 0.03 });
    var distortion = new Tone.Distortion({ distortion: 0.5, wet: 0.8 });
    var bitCrusher = new Tone.BitCrusher(8);
    var filter = new Tone.Filter({ frequency: 1200, type: 'lowpass', Q: 1.5 });
    var reverb = new Tone.Reverb({ decay: 1.8, wet: 0.3 });
    mic.chain(pitchShift, distortion, bitCrusher, filter, reverb, Tone.getDestination());
    return { pitchShift, distortion, bitCrusher, filter, reverb };
  }

  function updateEffects(pitch, zcr) {
    if (!effects) return;
    var pitchAmount = -Math.max(5, Math.min(24, mapLinear(pitch, 80, 400, 8, 20)));
    effects.pitchShift.pitch = pitchAmount;
    var distAmount = Math.max(0, Math.min(1, mapLinear(zcr, 0.02, 0.25, 0.1, 0.95)));
    effects.distortion.distortion = distAmount;
    var cutoff = mapLinear(pitch, 80, 400, 600, 2400);
    effects.filter.frequency.rampTo(cutoff, 0.05);
  }

  var Voiceprint = {
    start: async function (options) {
      options = options || {};
      var onFeatures = options.onFeatures || function () {};
      var onError = options.onError || function (e) { console.error(e); };
      var enableEffects = options.enableEffects || false;

      if (running) return;

      try {
        if (global.Tone && Tone.start) await Tone.start();
        activeStream = options.stream || await navigator.mediaDevices.getUserMedia({ audio: true });
        ownsStream = !options.stream;
        if (!activeStream || !activeStream.getAudioTracks().length) throw new Error('没有可用的麦克风音轨。');
        if (enableEffects && global.Tone) mic = new Tone.UserMedia();
        
        if (enableEffects) { effects = buildEffects(); }

        nativeCtx = new (window.AudioContext || window.webkitAudioContext)();
        await nativeCtx.resume();
        var source = nativeCtx.createMediaStreamSource(activeStream);

        analyzer = Meyda.createMeydaAnalyzer({
          audioContext: nativeCtx,
          source: source,
          bufferSize: 2048,
          featureExtractors: ['rms', 'zcr', 'spectralCentroid', 'mfcc']
        });
        analyzer.start();

        waveAnalyser = nativeCtx.createAnalyser();
        waveAnalyser.fftSize = 2048;
        source.connect(waveAnalyser);

        running = true;
        var buffer = new Float32Array(2048);
        var sampleRate = nativeCtx.sampleRate;
        var smoothedPitch = 200;
        var smoothedZCR = 0.05;

        loopId = setInterval(function () {
          if (!running) return;
          var f = analyzer.get();
          if (!f) return;

          waveAnalyser.getFloatTimeDomainData(buffer);
          var pitch = detectPitch(buffer, sampleRate);
          var zcr = computeZCR(buffer);

          if (pitch > 0 && pitch < 1000) smoothedPitch = smoothedPitch * 0.7 + pitch * 0.3;
          smoothedZCR = smoothedZCR * 0.8 + zcr * 0.2;

          var features = { pitch: smoothedPitch, zcr: smoothedZCR, rms: f.rms, spectralCentroid: f.spectralCentroid, mfcc: f.mfcc };
          if (enableEffects) updateEffects(smoothedPitch, smoothedZCR);
          onFeatures(features, toMonsterParams(features));
        }, 100);
        return true;

      } catch (err) {
        running = false;
        if (loopId) clearInterval(loopId);
        loopId = null;
        if (analyzer) { analyzer.stop(); analyzer = null; }
        if (nativeCtx) { nativeCtx.close(); nativeCtx = null; }
        if (ownsStream && activeStream) activeStream.getTracks().forEach(function (track) { track.stop(); });
        activeStream = null;
        ownsStream = false;
        onError(err);
        return false;
      }
    },

    stop: function () {
      running = false;
      if (loopId) clearInterval(loopId);
      if (analyzer) { analyzer.stop(); analyzer = null; }
      if (mic) { mic.close(); mic = null; }
      if (nativeCtx) { nativeCtx.close(); nativeCtx = null; }
      if (ownsStream && activeStream) activeStream.getTracks().forEach(function (track) { track.stop(); });
      activeStream = null;
      ownsStream = false;
      effects = null;
      waveAnalyser = null;
    },

    setMapping: function (newMapping) { Object.assign(MAPPING, newMapping); },
    isRunning: function () { return running; }
  };

  global.Voiceprint = Voiceprint;
})(window);
