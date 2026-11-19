/* eslint-disable */
(function () {
  "use strict";

  var COLS = 3, ROWS = 3;
  var HOLE_W = 120, HOLE_H = 92, GAP_X = 20, GAP_Y = 28;
  var OFF_X = 40, OFF_Y = 118;
  var TOTAL_TIME = 30;

  window.Arcade.register({
    id: "whack",
    name: "WHACK-A-MOLE",
    cn: "打地鼠",
    accent: "#ff9e3f",
    desc: "30 秒内敲中冒头的地鼠，金色地鼠分数更高。",
    keys: [
      ["← ↑ ↓ → / WASD", "移动锤子"],
      ["ENTER / SPACE", "敲击"],
      ["鼠标", "点击地洞"],
      ["ESC", "返回大厅"]
    ],
    touch: { a: { label: "敲击", key: "Enter" } },
    icon: [
      "................",
      "................",
      "....##....##....",
      "...####..####...",
      "...#.##..##.#...",
      "...####..####...",
      "....##....##....",
      "................",
      ".##############.",
      ".#............#.",
      ".#..##....##..#.",
      ".#..##....##..#.",
      ".#............#.",
      ".##############.",
      "................",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var holes = [];
      var cursor = 4;
      var score = 0;
      var high = api.getHigh();
      var timeLeft = TOTAL_TIME;
      var state = "ready";
      var spawnAcc = 0;
      var hitAnim = 0;
      var anim = 0;
      var combo = 0;

      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      function pad4(n) {
        var s = String(n);
        while (s.length < 4) s = "0" + s;
        return s;
      }

      for (var i = 0; i < COLS * ROWS; i++) {
        holes.push({ up: false, t: 0, life: 0, type: 0, pop: 0 });
      }

      function holeRect(i) {
        var c = i % COLS, r = Math.floor(i / COLS);
        return {
          x: OFF_X + c * (HOLE_W + GAP_X),
          y: OFF_Y + r * (HOLE_H + GAP_Y),
          w: HOLE_W,
          h: HOLE_H
        };
      }

      function reset() {
        score = 0;
        combo = 0;
        timeLeft = TOTAL_TIME;
        spawnAcc = 0;
        hitAnim = 0;
        cursor = 4;
        state = "ready";
        for (var j = 0; j < holes.length; j++) {
          holes[j].up = false;
          holes[j].pop = 0;
        }
        api.setScore(0);
        api.setStatus("TIME " + TOTAL_TIME);
        api.hideOverlay();
      }

      function start() {
        reset();
        state = "run";
        api.setStatus("TIME " + TOTAL_TIME);
      }

      function spawn() {
        var free = [];
        for (var i = 0; i < holes.length; i++) {
          if (!holes[i].up) free.push(i);
        }
        if (!free.length) return;
        var idx = free[Math.floor(Math.random() * free.length)];
        var h = holes[idx];
        h.up = true;
        h.t = 0;
        h.life = 0.72 + Math.random() * 0.42;
        h.type = Math.random() < 0.18 ? 1 : 0;
        h.pop = 0;
      }

      function whack(i) {
        if (state !== "run") return;
        var h = holes[i];
        if (h.up) {
          var pts = h.type === 1 ? 30 : 10;
          score += pts + Math.min(combo, 5) * 2;
          combo++;
          api.setScore(score);
          api.sfx(h.type === 1 ? "win" : "point");
          h.up = false;
          h.pop = 0;
          hitAnim = 0.18;
        } else {
          combo = 0;
          hitAnim = 0.12;
          api.sfx("click");
        }
      }

      function endGame() {
        state = "over";
        api.setStatus("GAME OVER");
        api.sfx("lose");
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        api.showOverlay({
          title: "TIME UP",
          msg: "敲中得分 <strong>" + score + "</strong> · 最高 <strong>" + high +
            "</strong><br>按 <strong>ENTER</strong> 再来一局",
          btn: "再来一局",
          onClick: start
        });
      }

      function update(dt) {
        if (hitAnim > 0) hitAnim -= dt;
        if (state !== "run") return;

        timeLeft -= dt;
        if (timeLeft <= 0) {
          timeLeft = 0;
          api.setStatus("TIME 0");
          endGame();
          return;
        }
        api.setStatus("TIME " + Math.ceil(timeLeft));

        spawnAcc += dt;
        var interval = Math.max(0.42, 0.86 - (TOTAL_TIME - timeLeft) * 0.014);
        if (spawnAcc >= interval) {
          spawnAcc = 0;
          spawn();
          if (Math.random() < 0.22) spawn();
        }

        for (var i = 0; i < holes.length; i++) {
          var h = holes[i];
          if (!h.up) {
            h.pop = Math.max(0, h.pop - dt * 6);
            continue;
          }
          h.t += dt;
          h.pop = Math.min(1, h.pop + dt * 8);
          if (h.t >= h.life) {
            h.up = false;
            h.pop = 1;
            combo = 0;
          }
        }
      }

      function drawHole(i) {
        var r = holeRect(i);
        var h = holes[i];

        ctx.fillStyle = "#070d07";
        ctx.fillRect(r.x, r.y + 26, r.w, r.h - 26);
        ctx.fillStyle = "#0d1a0d";
        ctx.fillRect(r.x + 4, r.y + 30, r.w - 8, r.h - 34);
        ctx.fillStyle = "#1d2f18";
        ctx.fillRect(r.x - 2, r.y + 22, r.w + 4, 8);
        ctx.fillStyle = "#101a10";
        ctx.fillRect(r.x + 8, r.y + 34, r.w - 16, 6);

        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x + 2, r.y, r.w - 4, r.h - 4);
        ctx.clip();

        if (h.up || h.pop > 0) {
          var rise = h.pop;
          var my = r.y + r.h - 8 - rise * 74;
          var body = h.type === 1 ? "#ffd23f" : "#a8763f";
          var shade = h.type === 1 ? "#a88212" : "#6e4420";
          var belly = h.type === 1 ? "#fff0b0" : "#c99a5f";

          ctx.fillStyle = shade;
          ctx.fillRect(r.x + 30, my + 46, 60, 40);
          ctx.fillStyle = body;
          ctx.fillRect(r.x + 26, my + 8, 68, 62);
          ctx.fillRect(r.x + 32, my, 56, 16);
          ctx.fillStyle = belly;
          ctx.fillRect(r.x + 46, my + 40, 28, 26);

          ctx.fillStyle = "#07130a";
          ctx.fillRect(r.x + 40, my + 22, 10, 10);
          ctx.fillRect(r.x + 70, my + 22, 10, 10);
          ctx.fillStyle = "#ff4d4d";
          ctx.fillRect(r.x + 56, my + 34, 8, 6);
          ctx.fillStyle = "#07130a";
          ctx.fillRect(r.x + 44, my + 42, 4, 3);
          ctx.fillRect(r.x + 72, my + 42, 4, 3);
        }
        ctx.restore();
      }

      function draw() {
        ctx.fillStyle = "#0a0f0a";
        ctx.fillRect(0, 0, 480, 480);

        // 草地纹理
        ctx.fillStyle = "#0d170d";
        for (var gx = 0; gx < 480; gx += 32) {
          for (var gy = 0; gy < 480; gy += 32) {
            if ((gx / 32 + gy / 32) % 2 === 0) ctx.fillRect(gx, gy, 32, 32);
          }
        }

        // 时间条
        var bw = 400, by = 62;
        ctx.fillStyle = "#101a10";
        ctx.fillRect(40, by, bw, 14);
        var ratio = Math.max(0, timeLeft / TOTAL_TIME);
        ctx.fillStyle = ratio < 0.25 ? "#ff4d4d" : "#7bff5c";
        ctx.fillRect(40, by, Math.round(bw * ratio), 14);
        ctx.strokeStyle = "#2b452a";
        ctx.lineWidth = 2;
        ctx.strokeRect(40, by, bw, 14);

        ctx.fillStyle = "#3f7a33";
        ctx.font = "10px ui-monospace, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText("TIME", 40, 54);
        ctx.textAlign = "right";
        ctx.fillText(Math.ceil(timeLeft) + "s", 440, 54);

        for (var i = 0; i < holes.length; i++) drawHole(i);

        if (state === "run") {
          var r = holeRect(cursor);
          ctx.strokeStyle = "#ff9e3f";
          ctx.lineWidth = 3;
          ctx.strokeRect(r.x - 4, r.y - 2, r.w + 8, r.h + 4);
          // 小锤子
          var hx = r.x + r.w - 26, hy = r.y - 6 + (hitAnim > 0 ? 8 : 0);
          ctx.fillStyle = "#c8f5bd";
          ctx.fillRect(hx, hy, 6, 30);
          ctx.fillStyle = "#7f8f7a";
          ctx.fillRect(hx - 10, hy - 8, 26, 14);
          ctx.fillStyle = "#c8f5bd";
          ctx.fillRect(hx - 8, hy - 6, 10, 4);
        }

        if (state === "ready") {
          ctx.fillStyle = "rgba(10,15,10,0.55)";
          ctx.fillRect(0, 0, 480, 480);
        }
      }

      function onKey(e) {
        var k = e.key;

        if (state === "ready" || state === "over") {
          if (k === "Enter" || k === " " || k === "Spacebar") {
            e.preventDefault();
            start();
          }
          return;
        }

        if (k === "ArrowLeft" || k === "a" || k === "A") {
          e.preventDefault();
          cursor = (cursor % COLS === 0) ? cursor + COLS - 1 : cursor - 1;
          api.sfx("move");
        } else if (k === "ArrowRight" || k === "d" || k === "D") {
          e.preventDefault();
          cursor = (cursor % COLS === COLS - 1) ? cursor - COLS + 1 : cursor + 1;
          api.sfx("move");
        } else if (k === "ArrowUp" || k === "w" || k === "W") {
          e.preventDefault();
          cursor = (cursor + COLS * (ROWS - 1)) % (COLS * ROWS);
          api.sfx("move");
        } else if (k === "ArrowDown" || k === "s" || k === "S") {
          e.preventDefault();
          cursor = (cursor + COLS) % (COLS * ROWS);
          api.sfx("move");
        } else if (k === "Enter" || k === " " || k === "Spacebar") {
          e.preventDefault();
          whack(cursor);
        }
      }

      function onClick(e) {
        if (state !== "run") return;
        var pt = window.Arcade.pointer(e, api.canvas);
        for (var i = 0; i < holes.length; i++) {
          var r = holeRect(i);
          if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
            cursor = i;
            whack(i);
            return;
          }
        }
      }

      reset();
      draw();
      api.showOverlay({
        title: "WHACK-A-MOLE",
        msg: "30 秒内尽可能多敲地鼠<br>普通 <strong>+10</strong> · 金色 <strong>+30</strong> · 连击有加成<br>方向键移动，ENTER 敲击",
        btn: "开始敲击",
        onClick: start
      });

      api.on(window, "keydown", onKey, { passive: false });
      api.on(api.canvas, "click", onClick);

      api.loop(function (dt) {
        anim += dt;
        update(dt / 1000);
        draw();
      });
    }
  });
})();
