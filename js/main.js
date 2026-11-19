/* eslint-disable */
(function () {
  "use strict";

  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var menuEl = document.getElementById("menu");
  var stageEl = document.getElementById("stage");
  var gridEl = document.getElementById("gameGrid");
  var stageTitleEl = document.getElementById("stageTitle");
  var stageStatusEl = document.getElementById("stageStatus");
  var keyHintsEl = document.getElementById("keyHints");
  var touchUpEl = document.getElementById("touchUp");
  var touchDownEl = document.getElementById("touchDown");
  var touchLeftEl = document.getElementById("touchLeft");
  var touchRightEl = document.getElementById("touchRight");
  var touchAEl = document.getElementById("touchA");
  var touchBEl = document.getElementById("touchB");
  var touchALabelEl = document.getElementById("touchALabel");
  var touchBLabelEl = document.getElementById("touchBLabel");
  var touchAKey = "";
  var touchBKey = "";
  var touchRepeatKeys = [];
  var scoreEl = document.getElementById("score");
  var highEl = document.getElementById("high");
  var scoreLabelEl = document.getElementById("scoreLabel");
  var highLabelEl = document.getElementById("highLabel");
  var soundBtn = document.getElementById("soundBtn");
  var backBtn = document.getElementById("backBtn");
  var overlayEl = document.getElementById("overlay");
  var ovTitleEl = document.getElementById("ovTitle");
  var ovMsgEl = document.getElementById("ovMsg");
  var ovBtnEl = document.getElementById("ovBtn");

  var games = window.Arcade.games;
  var cards = [];
  var bestEls = [];
  var menuIndex = 0;
  var inMenu = true;
  var current = null;
  var overlayHandler = null;

  /* ---------------- 通用 ---------------- */
  function pad(value, len) {
    var s = String(value);
    while (s.length < len) s = "0" + s;
    return s;
  }

  function fmt(v) {
    if (typeof v === "string") return v;
    var n = Math.max(0, Math.round(Number(v) || 0));
    return pad(n, 4);
  }

  function store(key, value) {
    window.Arcade.storage.set(key, value);
  }

  function load(key, fallback) {
    return window.Arcade.storage.get(key, fallback);
  }

  function bestText(game) {
    if (game.best) return game.best();
    var v = load("arcade." + game.id + ".high", 0);
    return v > 0 ? "HI " + pad(v, 4) : "";
  }

  function setLabels(scoreLabel, highLabel) {
    scoreLabelEl.textContent = scoreLabel;
    highLabelEl.textContent = highLabel;
  }

  function setStatus(text) {
    stageStatusEl.textContent = text;
  }

  /* ---------------- 手机虚拟按键 ---------------- */
  function isTouchMode() {
    try {
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) return true;
    } catch (e) {}
    if ("ontouchstart" in window) return true;
    if (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0) return true;
    return window.innerWidth <= 820;
  }

  function sendKey(type, key) {
    if (!key || typeof window.dispatchEvent !== "function" ||
      typeof KeyboardEvent !== "function") return;
    try {
      window.dispatchEvent(new KeyboardEvent(type, {
        key: key,
        bubbles: true,
        cancelable: true
      }));
    } catch (e) {}
  }

  function bindHold(el, getKey, useRepeat) {
    if (!el || !el.addEventListener) return;
    var active = false;
    var holdTimer = null;
    var repeatTimer = null;

    function stopRepeat() {
      if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
    }

    function startRepeat() {
      var key = getKey();
      if (!useRepeat || touchRepeatKeys.indexOf(key) === -1) return;
      holdTimer = setTimeout(function () {
        holdTimer = null;
        repeatTimer = setInterval(function () {
          if (!active) return;
          sendKey("keydown", getKey());
        }, 70);
      }, 320);
    }

    function down(e) {
      if (e && e.preventDefault) e.preventDefault();
      var key = getKey();
      if (!key || active) return;
      active = true;
      el.classList.add("pressed");
      window.Arcade.sfx("click");
      sendKey("keydown", key);
      if (el.setPointerCapture && e && e.pointerId !== undefined) {
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
      startRepeat();
    }

    function up(e) {
      if (!active) return;
      active = false;
      stopRepeat();
      el.classList.remove("pressed");
      sendKey("keyup", getKey());
    }

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  function configureTouch(game) {
    var t = game.touch || {};
    touchAKey = t.a ? t.a.key : "";
    touchBKey = t.b ? t.b.key : "";
    touchRepeatKeys = t.repeat || [];
    if (touchALabelEl) touchALabelEl.textContent = t.a ? t.a.label : "";
    if (touchBLabelEl) touchBLabelEl.textContent = t.b ? t.b.label : "";
    if (touchAEl) touchAEl.classList.toggle("hidden", !t.a);
    if (touchBEl) touchBEl.classList.toggle("hidden", !t.b);
  }

  function initTouch() {
    if (isTouchMode() && document.body) {
      document.body.classList.add("touch");
    }
    bindHold(touchUpEl, function () { return "ArrowUp"; }, true);
    bindHold(touchDownEl, function () { return "ArrowDown"; }, true);
    bindHold(touchLeftEl, function () { return "ArrowLeft"; }, true);
    bindHold(touchRightEl, function () { return "ArrowRight"; }, true);
    bindHold(touchAEl, function () { return touchAKey; }, false);
    bindHold(touchBEl, function () { return touchBKey; }, false);
  }

  /* ---------------- 覆盖层 ---------------- */
  function showOverlay(opts) {
    ovTitleEl.textContent = opts.title || "";
    ovMsgEl.innerHTML = opts.msg || "";
    ovBtnEl.textContent = opts.btn || "";
    ovBtnEl.style.display = opts.btn ? "" : "none";
    overlayHandler = opts.onClick || null;
    overlayEl.classList.remove("hidden");
  }

  function hideOverlay() {
    overlayEl.classList.add("hidden");
    overlayHandler = null;
  }

  ovBtnEl.addEventListener("click", function (e) {
    e.stopPropagation();
    if (overlayHandler) {
      window.Arcade.sfx("click");
      var fn = overlayHandler;
      fn();
    }
  });

  overlayEl.addEventListener("click", function () {
    if (overlayHandler) {
      window.Arcade.sfx("click");
      overlayHandler();
    }
  });

  /* ---------------- 大厅 ---------------- */
  function drawIcon(game, cvs) {
    var ic = cvs.getContext("2d");
    var rows = game.icon || [];
    ic.clearRect(0, 0, 16, 16);
    ic.fillStyle = game.accent || "#7bff5c";
    for (var y = 0; y < rows.length; y++) {
      for (var x = 0; x < rows[y].length; x++) {
        if (rows[y].charAt(x) === "#") ic.fillRect(x, y, 1, 1);
      }
    }
  }

  function renderMenu() {
    gridEl.innerHTML = "";
    cards = [];
    bestEls = [];
    games.forEach(function (game, i) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "card";
      card.style.setProperty("--accent", game.accent || "#7bff5c");
      card.setAttribute("data-index", String(i));

      var num = document.createElement("span");
      num.className = "cnum";
      num.textContent = pad(i + 1, 2);

      var icon = document.createElement("canvas");
      icon.className = "cicon";
      icon.width = 16;
      icon.height = 16;
      drawIcon(game, icon);

      var name = document.createElement("span");
      name.className = "cname";
      name.textContent = game.name;

      var cn = document.createElement("span");
      cn.className = "ccn";
      cn.textContent = game.cn;

      var desc = document.createElement("span");
      desc.className = "cdesc";
      desc.textContent = game.desc;

      var best = document.createElement("span");
      best.className = "cbest";
      best.textContent = bestText(game);

      card.appendChild(num);
      card.appendChild(icon);
      card.appendChild(name);
      card.appendChild(cn);
      card.appendChild(desc);
      card.appendChild(best);

      card.addEventListener("mouseenter", function () {
        menuIndex = i;
        updateFocus();
      });
      card.addEventListener("click", function () {
        menuIndex = i;
        launch(game);
      });

      gridEl.appendChild(card);
      cards.push(card);
      bestEls.push(best);
    });
    updateFocus();
  }

  function updateFocus() {
    for (var i = 0; i < cards.length; i++) {
      cards[i].classList.toggle("focused", i === menuIndex && inMenu);
    }
  }

  function updateBestTexts() {
    games.forEach(function (game, i) {
      if (bestEls[i]) bestEls[i].textContent = bestText(game);
    });
  }

  function menuColumns() {
    if (window.innerWidth <= 600) return 1;
    if (window.innerWidth <= 720) return 2;
    if (window.innerWidth <= 900) return 3;
    return 4;
  }

  function menuStats() {
    setLabels("GAMES", "PLAYS");
    scoreEl.textContent = pad(games.length, 2);
    highEl.textContent = pad(load("arcade.played", 0) || 0, 3);
  }

  function handleMenuKey(e) {
    var key = e.key;
    var cols = menuColumns();
    var n = games.length;
    var handled = true;

    if (key === "ArrowRight") menuIndex = (menuIndex + 1) % n;
    else if (key === "ArrowLeft") menuIndex = (menuIndex - 1 + n) % n;
    else if (key === "ArrowDown") menuIndex = (menuIndex + cols) % n;
    else if (key === "ArrowUp") menuIndex = (menuIndex - cols + n * 2) % n;
    else if (key === "Enter" || key === " " || key === "Spacebar") launch(games[menuIndex]);
    else if (/^[1-9]$/.test(key) && Number(key) <= n) launch(games[Number(key) - 1]);
    else handled = false;

    if (handled) {
      e.preventDefault();
      updateFocus();
      if (cards[menuIndex] && cards[menuIndex].scrollIntoView) {
        cards[menuIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }

  /* ---------------- 启动游戏 ---------------- */
  function launch(game) {
    if (!inMenu || !game) return;
    inMenu = false;
    window.Arcade.sfx("click");

    var plays = (load("arcade.played", 0) || 0) + 1;
    store("arcade.played", plays);

    menuEl.classList.add("hidden");
    stageEl.classList.remove("hidden");
    if (document.body) document.body.classList.add("playing");
    stageTitleEl.textContent = game.name + " · " + game.cn;
    setStatus("READY");

    keyHintsEl.innerHTML = "";
    (game.keys || []).forEach(function (pair) {
      var span = document.createElement("span");
      span.className = "kh";
      var kb = document.createElement("kbd");
      kb.textContent = pair[0];
      span.appendChild(kb);
      span.appendChild(document.createTextNode(pair[1]));
      keyHintsEl.appendChild(span);
    });

    configureTouch(game);

    var runs = { loops: [], listeners: [], cleanups: [] };

    var api = {
      id: game.id,
      canvas: canvas,
      ctx: ctx,
      width: canvas.width,
      height: canvas.height,
      setScore: function (v) { scoreEl.textContent = fmt(v); },
      setHigh: function (v) {
        var n = Math.max(0, Math.round(Number(v) || 0));
        store("arcade." + game.id + ".high", n);
        highEl.textContent = pad(n, 4);
      },
      setHighText: function (t) { highEl.textContent = t; },
      getHigh: function () { return load("arcade." + game.id + ".high", 0) || 0; },
      setLabels: setLabels,
      setStatus: setStatus,
      showOverlay: showOverlay,
      hideOverlay: hideOverlay,
      sfx: window.Arcade.sfx,
      on: function (target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        runs.listeners.push([target, type, fn, opts]);
      },
      loop: function (fn) {
        var raf = 0;
        var last = 0;
        var stopped = false;
        function tick(t) {
          if (stopped) return;
          if (!last) last = t;
          var dt = Math.min(t - last, 100);
          last = t;
          try { fn(dt); } catch (err) { console.error(err); }
          raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        var handle = {
          stop: function () {
            stopped = true;
            cancelAnimationFrame(raf);
          }
        };
        runs.loops.push(handle);
        return handle;
      },
      onDestroy: function (fn) { runs.cleanups.push(fn); }
    };

    current = { game: game, runs: runs, api: api, controller: null };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0a0f0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    try {
      current.controller = game.mount(api) || null;
    } catch (err) {
      console.error(err);
      showOverlay({
        title: "LOAD ERROR",
        msg: "游戏加载失败，请返回大厅重试。",
        btn: "返回大厅",
        onClick: backToMenu
      });
    }
  }

  function backToMenu() {
    if (inMenu) return;

    if (current) {
      current.runs.loops.forEach(function (h) { h.stop(); });
      current.runs.listeners.forEach(function (l) {
        l[0].removeEventListener(l[1], l[2], l[3]);
      });
      current.runs.cleanups.forEach(function (fn) {
        try { fn(); } catch (e) {}
      });
      if (current.controller && typeof current.controller.destroy === "function") {
        try { current.controller.destroy(); } catch (e) {}
      }
      current = null;
    }

    hideOverlay();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0a0f0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stageEl.classList.add("hidden");
    menuEl.classList.remove("hidden");
    if (document.body) document.body.classList.remove("playing");
    inMenu = true;
    setLabels("GAMES", "PLAYS");
    menuStats();
    updateBestTexts();
    updateFocus();
    window.Arcade.sfx("click");
  }

  backBtn.addEventListener("click", backToMenu);

  /* ---------------- 全局输入 ---------------- */
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (!inMenu) {
        e.preventDefault();
        backToMenu();
      }
      return;
    }
    if (e.key === "m" || e.key === "M") {
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleSound();
        return;
      }
    }
    if (inMenu) handleMenuKey(e);
  });

  function toggleSound() {
    window.Arcade.setMuted(!window.Arcade.isMuted());
    updateSoundBtn();
    if (!window.Arcade.isMuted()) window.Arcade.sfx("click");
  }

  function updateSoundBtn() {
    var muted = window.Arcade.isMuted();
    soundBtn.textContent = muted ? "SOUND OFF" : "SOUND ON";
    soundBtn.classList.toggle("off", muted);
  }

  soundBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    toggleSound();
  });

  window.addEventListener("resize", function () {
    if (inMenu) updateFocus();
  });

  /* ---------------- 初始化 ---------------- */
  renderMenu();
  menuStats();
  updateSoundBtn();
  initTouch();
})();
