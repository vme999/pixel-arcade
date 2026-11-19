/* eslint-disable */
(function () {
  "use strict";

  var GROUND = 396;
  var GRAVITY = 2150;
  var JUMP_V = -700;

  window.Arcade.register({
    id: "runner",
    name: "PIXEL RUN",
    cn: "像素跑酷",
    accent: "#ff8fd0",
    desc: "不断加速的无限跑酷，跳过路障、蹲下躲开无人机。",
    keys: [
      ["SPACE / ↑ / W", "跳跃"],
      ["↓ / S", "下蹲"],
      ["R", "重新开始"],
      ["ESC", "返回大厅"]
    ],
    touch: {
      a: { label: "跳跃", key: " " },
      b: { label: "下蹲", key: "ArrowDown" }
    },
    icon: [
      "................",
      "................",
      "....##..........",
      "....##..........",
      "..######........",
      "...####.........",
      "..######..##....",
      "....##....##....",
      "....##..##......",
      "...##..##.......",
      "..##...##.......",
      "..##....##......",
      ".##......##.....",
      "##........##....",
      "................",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var player, obstacles, speed, distance, score, high, state, spawnAcc, anim;
      var keys = { jump: false, duck: false };
      var stars = [];

      high = api.getHigh();
      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      for (var i = 0; i < 40; i++) {
        stars.push({
          x: Math.random() * 480,
          y: Math.random() * 300,
          s: Math.random() < 0.3 ? 2 : 1
        });
      }

      function reset() {
        player = { x: 96, y: GROUND - 42, w: 28, h: 42, vy: 0 };
        obstacles = [];
        speed = 280;
        distance = 0;
        score = 0;
        spawnAcc = 0;
        state = "ready";
        keys.jump = false;
        keys.duck = false;
        api.setScore(0);
        api.setStatus("READY");
        api.hideOverlay();
      }

      function start() {
        reset();
        state = "run";
        api.setStatus("RUN");
      }

      function die() {
        if (state !== "run") return;
        state = "over";
        api.setStatus("GAME OVER");
        api.sfx("boom");
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        api.showOverlay({
          title: "GAME OVER",
          msg: "跑了 <strong>" + score + "</strong> 米 · 最高 <strong>" + high +
            "</strong> 米<br>按 <strong>SPACE / ENTER</strong> 再来一次",
          btn: "再来一次",
          onClick: start
        });
      }

      function grounded() {
        return player.y + player.h >= GROUND - 0.5;
      }

      function spawnObstacle() {
        var drone = Math.random() < 0.28 && score > 40;
        if (drone) {
          obstacles.push({
            type: "drone",
            x: 500,
            y: GROUND - 62,
            w: 38,
            h: 24
          });
        } else {
          var h = 28 + Math.random() * 20;
          var w = 22 + Math.random() * 14;
          obstacles.push({
            type: "block",
            x: 500,
            y: GROUND - h,
            w: w,
            h: h
          });
        }
      }

      function update(dt) {
        if (state !== "run") return;

        speed = Math.min(580, speed + 9 * dt);
        distance += speed * dt;
        score = Math.floor(distance / 14);
        api.setScore(score);

        if (keys.duck && grounded()) {
          player.h = 24;
          player.y = GROUND - 24;
        } else if (!keys.duck && grounded() && player.h < 30) {
          player.h = 42;
          player.y = GROUND - 42;
        }

        if (!grounded() || player.vy !== 0) {
          player.vy += GRAVITY * dt;
          if (keys.duck) player.vy += 1500 * dt;
          player.y += player.vy * dt;
          if (player.y + player.h >= GROUND) {
            player.y = GROUND - player.h;
            player.vy = 0;
          }
        }

        spawnAcc += dt;
        var interval = Math.max(0.62, 1.18 - speed / 1200) + Math.random() * 0.3;
        if (spawnAcc >= interval) {
          spawnAcc = 0;
          spawnObstacle();
        }

        var still = [];
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          o.x -= speed * dt;
          if (o.x + o.w < -10) continue;
          still.push(o);

          if (o.type === "drone") o.y = GROUND - 62 + Math.sin(anim / 260 + o.x / 60) * 3;

          var pl = { x: player.x, y: player.y, w: player.w, h: player.h };
          if (pl.x < o.x + o.w - 3 && pl.x + pl.w > o.x + 3 &&
            pl.y < o.y + o.h && pl.y + pl.h > o.y) {
            die();
            return;
          }
        }
        obstacles = still;
      }

      function drawBg() {
        ctx.fillStyle = "#080c14";
        ctx.fillRect(0, 0, 480, 480);
        ctx.fillStyle = "#0c1220";
        ctx.fillRect(0, 210, 480, GROUND - 210);

        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          ctx.fillStyle = i % 4 === 0 ? "#ff8fd0" : "#2e3d5a";
          ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
        }

        ctx.fillStyle = "#d8ffc8";
        ctx.fillRect(388, 54, 34, 34);
        ctx.fillStyle = "#c2eab2";
        ctx.fillRect(396, 62, 8, 8);
        ctx.fillRect(410, 76, 7, 7);

        var shift = (distance * 0.12) % 120;
        ctx.fillStyle = "#111c2a";
        for (var m = -1; m < 6; m++) {
          var mx = m * 120 - shift;
          ctx.fillRect(mx, 300, 120, GROUND - 300);
          ctx.fillRect(mx + 30, 268, 60, 32);
        }

        shift = (distance * 0.3) % 80;
        ctx.fillStyle = "#16241c";
        for (var k = -1; k < 8; k++) {
          var kx = k * 80 - shift;
          ctx.fillRect(kx, 340, 80, GROUND - 340);
          ctx.fillRect(kx + 22, 316, 36, 24);
        }
      }

      function drawGround() {
        ctx.fillStyle = "#1f3a19";
        ctx.fillRect(0, GROUND, 480, 480 - GROUND);
        ctx.fillStyle = "#2b4d23";
        ctx.fillRect(0, GROUND, 480, 5);
        ctx.fillStyle = "#14240f";
        var shift = distance % 28;
        for (var x = -shift; x < 480; x += 28) {
          ctx.fillRect(x, GROUND + 14, 14, 4);
          ctx.fillRect(x + 10, GROUND + 30, 12, 3);
        }
      }

      function drawPlayer() {
        var x = Math.round(player.x);
        var y = Math.round(player.y);
        var ducking = player.h < 30;
        var airborne = !grounded();

        if (ducking) {
          ctx.fillStyle = "#2f6b26";
          ctx.fillRect(x + 2, y + 4, 26, 18);
          ctx.fillStyle = "#7bff5c";
          ctx.fillRect(x, y + 6, 26, 14);
          ctx.fillStyle = "#16240f";
          ctx.fillRect(x + 19, y + 9, 5, 5);
          ctx.fillStyle = "#ff8fd0";
          ctx.fillRect(x + 24, y + 12, 4, 4);
          var legShift = airborne ? 0 : Math.floor(anim / 90) % 2 === 0 ? 0 : 4;
          ctx.fillStyle = "#2f6b26";
          ctx.fillRect(x + 4 + legShift, y + 20, 6, 4);
          ctx.fillRect(x + 15 - legShift, y + 20, 6, 4);
          return;
        }

        var bob = airborne ? 0 : Math.floor(anim / 100) % 2;
        ctx.fillStyle = "#2f6b26";
        ctx.fillRect(x, y + 10 + bob, 22, 22);
        ctx.fillStyle = "#7bff5c";
        ctx.fillRect(x + 2, y + 12 + bob, 18, 18);
        ctx.fillStyle = "#c8f5bd";
        ctx.fillRect(x + 8, y + 2 + bob, 14, 12);
        ctx.fillStyle = "#16240f";
        ctx.fillRect(x + 15, y + 6 + bob, 4, 4);

        var phase = Math.floor(anim / 90) % 2;
        ctx.fillStyle = "#ff8fd0";
        ctx.fillRect(x + 18, y + 20 + bob, 8, 5);

        ctx.fillStyle = "#2f6b26";
        if (airborne) {
          ctx.fillRect(x + 2, y + 32, 7, 8);
          ctx.fillRect(x + 13, y + 34, 7, 6);
        } else if (phase === 0) {
          ctx.fillRect(x + 3, y + 34, 7, 8);
          ctx.fillRect(x + 14, y + 32, 7, 6);
        } else {
          ctx.fillRect(x + 2, y + 32, 7, 6);
          ctx.fillRect(x + 13, y + 34, 7, 8);
        }
      }

      function drawObstacles() {
        for (var i = 0; i < obstacles.length; i++) {
          var o = obstacles[i];
          var x = Math.round(o.x), y = Math.round(o.y), w = Math.round(o.w), h = Math.round(o.h);

          if (o.type === "drone") {
            ctx.fillStyle = "#3a4a5a";
            ctx.fillRect(x + 6, y + 6, w - 12, h - 8);
            ctx.fillStyle = "#6e8fa8";
            ctx.fillRect(x, y + 8, w, 8);
            ctx.fillStyle = "#ff6b6b";
            ctx.fillRect(x + 8, y + 14, 5, 5);
            ctx.fillStyle = "#0a0f14";
            ctx.fillRect(x + 20, y + 12, 6, 6);
            ctx.fillStyle = "#ffd23f";
            ctx.fillRect(x + 14, y + 20, 4, 2);
          } else {
            ctx.fillStyle = "#7d3a26";
            ctx.fillRect(x, y, w, h);
            ctx.fillStyle = "#b5563a";
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
            ctx.fillStyle = "#7d3a26";
            ctx.fillRect(x + 2, y + Math.floor(h / 2), w - 4, 3);
            ctx.fillRect(x + Math.floor(w / 2), y + 2, 3, h - 4);
          }
        }
      }

      function draw() {
        drawBg();
        drawGround();
        drawObstacles();
        drawPlayer();
      }

      function onKeyDown(e) {
        var k = e.key;

        if (state === "ready" || state === "over") {
          if (k === "Enter" || k === " " || k === "Spacebar" || k === "r" || k === "R") {
            e.preventDefault();
            start();
          }
          return;
        }

        if (k === " " || k === "Spacebar" || k === "ArrowUp" || k === "w" || k === "W") {
          e.preventDefault();
          if (grounded() && player.h >= 30) {
            player.vy = JUMP_V;
            api.sfx("click");
          }
        } else if (k === "ArrowDown" || k === "s" || k === "S") {
          e.preventDefault();
          keys.duck = true;
          if (!grounded()) player.vy += 120;
        } else if (k === "r" || k === "R") {
          e.preventDefault();
          start();
        }
      }

      function onKeyUp(e) {
        var k = e.key;
        if (k === "ArrowDown" || k === "s" || k === "S") keys.duck = false;
      }

      reset();
      anim = 0;
      draw();
      api.showOverlay({
        title: "PIXEL RUN",
        msg: "跳过红色路障，<strong>↓</strong> 蹲下躲开无人机<br>速度会越来越快，跑得越远分数越高<br><strong>SPACE</strong> 跳跃",
        btn: "开始奔跑",
        onClick: start
      });

      api.on(window, "keydown", onKeyDown, { passive: false });
      api.on(window, "keyup", onKeyUp);

      api.loop(function (dt) {
        anim += dt;
        update(dt / 1000);
        draw();
      });
    }
  });
})();
