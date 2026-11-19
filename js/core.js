/* eslint-disable */
window.Arcade = (function () {
  "use strict";

  var games = [];

  var storage = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {}
    }
  };

  /* ---------- 8-bit 音效 ---------- */
  var audioCtx = null;
  var muted = storage.get("arcade.muted", false);

  function ac() {
    if (!audioCtx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (C) audioCtx = new C();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      try { audioCtx.resume(); } catch (e) {}
    }
    return audioCtx;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    try {
      var t0 = c.currentTime;
      var osc = c.createOscillator();
      var gain = c.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
      gain.gain.setValueAtTime(vol || 0.045, t0);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain);
      gain.connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    } catch (e) {}
  }

  function arp(notes, step, dur, vol) {
    notes.forEach(function (f, i) {
      setTimeout(function () { tone(f, dur, "square", vol); }, i * step);
    });
  }

  var SFX = {
    click: function () { tone(520, 0.05, "square", 0.035); },
    move: function () { tone(300, 0.025, "square", 0.018); },
    turn: function () { tone(420, 0.03, "square", 0.02); },
    eat: function () { tone(680, 0.07, "square", 0.05, 900); },
    point: function () { tone(860, 0.08, "square", 0.045, 1200); },
    drop: function () { tone(200, 0.09, "square", 0.05, 110); },
    lock: function () { tone(260, 0.05, "square", 0.03, 180); },
    clear: function () { arp([660, 880, 1100], 55, 0.07, 0.045); },
    hit: function () { tone(170, 0.14, "sawtooth", 0.05, 65); },
    shoot: function () { tone(900, 0.05, "square", 0.03, 500); },
    boom: function () { tone(240, 0.28, "sawtooth", 0.06, 50); },
    win: function () { arp([523, 659, 784, 1047], 95, 0.12, 0.05); },
    lose: function () { arp([392, 311, 262, 196], 130, 0.16, 0.05); }
  };

  function sfx(name) {
    if (muted) return;
    var fn = SFX[name];
    if (fn) fn();
  }

  function pointer(e, canvas) {
    var r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height)
    };
  }

  return {
    games: games,
    register: function (def) { games.push(def); },
    storage: storage,
    sfx: sfx,
    pointer: pointer,
    isMuted: function () { return !!muted; },
    setMuted: function (v) {
      muted = !!v;
      storage.set("arcade.muted", muted);
    }
  };
})();
