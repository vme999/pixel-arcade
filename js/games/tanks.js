/* eslint-disable */
(function () {
  "use strict";

  var CELL = 24, COLS = 20, ROWS = 20;
  var TANK = 22;
  var PLAYER_SPEED = 122, BULLET_SPEED = 330;
  var SPAWN_POINTS = [
    { x: 48, y: 28 }, { x: 120, y: 28 }, { x: 192, y: 28 },
    { x: 264, y: 28 }, { x: 336, y: 28 }, { x: 408, y: 28 }
  ];
  var BLOCKS = [
    [3, 3], [3, 9], [3, 15],
    [8, 6], [8, 12],
    [13, 3], [13, 9], [13, 15],
    [16, 6], [16, 12]
  ];
  var DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];

  window.Arcade.register({
    id: "tanks",
    name: "TANKS",
    cn: "坦克大战",
    accent: "#ffd23f",
    desc: "驾驶坦克守住阵地，击毁一波波来袭的敌方装甲。",
    keys: [
      ["← ↑ ↓ → / WASD", "移动"],
      ["SPACE", "开炮"],
      ["R", "重新开始"],
      ["ESC", "返回大厅"]
    ],
    touch: { a: { label: "开炮", key: " " } },
    icon: [
      "................",
      "....########....",
      "....#......#....",
      "....#..##..#....",
      "....#..##..#....",
      "....########....",
      "......####......",
      "................",
      "................",
      "..##########....",
      "..#........#....",
      "..#..####..#....",
      "..#..####..#....",
      "..#........#....",
      "..##########....",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var walls, player, enemies, bullets, ebullets, parts;
      var lives, wave, score, high, state, waveTimer, anim;
      var held = {};

      high = api.getHigh();
      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      function pad4(n) {
        var s = String(n);
        while (s.length < 4) s = "0" + s;
        return s;
      }

      function buildMap() {
        walls = [];
        for (var y = 0; y < ROWS; y++) {
          var row = [];
          for (var x = 0; x < COLS; x++) {
            row.push(x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 ? 2 : 0);
          }
          walls.push(row);
        }
        for (var i = 0; i < BLOCKS.length; i++) {
          var bx = BLOCKS[i][0], by = BLOCKS[i][1];
          walls[by][bx] = 1;
          walls[by][bx + 1] = 1;
          walls[by + 1][bx] = 1;
          walls[by + 1][bx + 1] = 1;
        }
      }

      function reset() {
        buildMap();
        player = { x: 229, y: 426, dir: 3, cd: 0, inv: 1.2 };
        enemies = [];
        bullets = [];
        ebullets = [];
        parts = [];
        lives = 3;
        wave = 1;
        score = 0;
        waveTimer = 0;
        held = {};
        api.setScore(0);
        api.hideOverlay();
        spawnWave();
      }

      function start() {
        reset();
        state = "play";
        api.setStatus("WAVE 1");
      }

      function spawnWave() {
        var count = 4 + Math.min(2, wave - 1);
        enemies = [];
        for (var i = 0; i < count; i++) {
          var sp = SPAWN_POINTS[i % SPAWN_POINTS.length];
          enemies.push({
            x: sp.x,
            y: sp.y,
            dir: 2,
            cd: 1 + Math.random() * 1.4,
            moveCd: 0.4 + Math.random() * 0.8,
            speed: Math.min(112, 62 + wave * 7),
            hp: 1
          });
        }
      }

      function hitsWall(x, y, w, h) {
        if (x < 0 || y < 0 || x + w > 480 || y + h > 480) return true;
        var x0 = Math.floor(x / CELL), x1 = Math.floor((x + w - 1) / CELL);
        var y0 = Math.floor(y / CELL), y1 = Math.floor((y + h - 1) / CELL);
        for (var yy = y0; yy <= y1; yy++) {
          for (var xx = x0; xx <= x1; xx++) {
            if (walls[yy] && walls[yy][xx]) return true;
          }
        }
        return false;
      }

      function overlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      }

      function boom(x, y, big) {
        for (var i = 0; i < (big ? 12 : 6); i++) {
          parts.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * (big ? 150 : 90),
            vy: (Math.random() - 0.5) * (big ? 150 : 90),
            t: 0,
            max: 0.3 + Math.random() * 0.25
          });
        }
      }

      function playerFire() {
        if (state !== "play" || player.cd > 0) return;
        var d = DIRS[player.dir];
        bullets.push({
          x: player.x + TANK / 2 - 2 + d.x * 15,
          y: player.y + TANK / 2 - 2 + d.y * 15,
          dx: d.x,
          dy: d.y,
          w: 5,
          h: 5
        });
        player.cd = 0.34;
        api.sfx("shoot");
      }

      function hitPlayer() {
        if (player.inv > 0) return;
        lives--;
        player.inv = 2.2;
        player.x = 229;
        player.y = 426;
        player.dir = 3;
        ebullets = [];
        api.sfx("boom");
        boom(player.x + TANK / 2, player.y + TANK / 2, true);
        if (lives <= 0) {
          state = "over";
          api.setStatus("GAME OVER");
          if (score > high) {
            high = score;
            api.setHigh(high);
          }
          api.showOverlay({
            title: "GAME OVER",
            msg: "击毁得分 <strong>" + pad4(score) + "</strong> · 最高 <strong>" +
              pad4(high) + "</strong><br>坚持到第 <strong>" + wave +
              "</strong> 波<br>按 <strong>ENTER</strong> 重新出战",
            btn: "重新出战",
            onClick: start
          });
        }
      }

      function updateBullets(dt) {
        var i, j, b;

        for (i = bullets.length - 1; i >= 0; i--) {
          b = bullets[i];
          var remain = BULLET_SPEED * dt;
          var dead = false;

          while (remain > 0 && !dead) {
            var step = Math.min(7, remain);
            remain -= step;
            b.x += b.dx * step;
            b.y += b.dy * step;

            var cx = Math.floor((b.x + 2) / CELL);
            var cy = Math.floor((b.y + 2) / CELL);
            if (cy < 0 || cy >= ROWS || cx < 0 || cx >= COLS) { dead = true; break; }

            if (walls[cy][cx] === 1) {
              walls[cy][cx] = 0;
              boom(b.x, b.y, false);
              api.sfx("hit");
              dead = true;
              break;
            }
            if (walls[cy][cx] === 2) {
              boom(b.x, b.y, false);
              dead = true;
              break;
            }

            for (j = enemies.length - 1; j >= 0; j--) {
              var e = enemies[j];
              if (overlap({ x: b.x, y: b.y, w: 5, h: 5 }, { x: e.x, y: e.y, w: TANK, h: TANK })) {
                enemies.splice(j, 1);
                score += 100;
                api.setScore(score);
                if (score > high) {
                  high = score;
                  api.setHigh(high);
                }
                boom(e.x + TANK / 2, e.y + TANK / 2, true);
                api.sfx("boom");
                dead = true;
                break;
              }
            }
          }

          if (dead) bullets.splice(i, 1);
        }

        for (i = ebullets.length - 1; i >= 0; i--) {
          b = ebullets[i];
          var rem = BULLET_SPEED * 0.82 * dt;
          var gone = false;

          while (rem > 0 && !gone) {
            var st = Math.min(7, rem);
            rem -= st;
            b.x += b.dx * st;
            b.y += b.dy * st;

            var ex = Math.floor((b.x + 2) / CELL);
            var ey = Math.floor((b.y + 2) / CELL);
            if (ey < 0 || ey >= ROWS || ex < 0 || ex >= COLS) { gone = true; break; }

            if (walls[ey][ex] === 1) {
              walls[ey][ex] = 0;
              boom(b.x, b.y, false);
              gone = true;
              break;
            }
            if (walls[ey][ex] === 2) {
              boom(b.x, b.y, false);
              gone = true;
              break;
            }

            if (overlap({ x: b.x, y: b.y, w: 5, h: 5 },
              { x: player.x, y: player.y, w: TANK, h: TANK })) {
              hitPlayer();
              gone = true;
              break;
            }
          }

          if (gone) ebullets.splice(i, 1);
        }
      }

      function updateEnemies(dt) {
        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          e.moveCd -= dt;
          e.cd -= dt;

          if (e.moveCd <= 0) {
            e.moveCd = 0.7 + Math.random() * 0.9;
            if (Math.random() < 0.55) {
              if (Math.abs(player.x - e.x) > Math.abs(player.y - e.y)) {
                e.dir = player.x > e.x ? 0 : 1;
              } else {
                e.dir = player.y > e.y ? 2 : 3;
              }
            } else {
              e.dir = Math.floor(Math.random() * 4);
            }
          }

          var d = DIRS[e.dir];
          var nx = e.x + d.x * e.speed * dt;
          var ny = e.y + d.y * e.speed * dt;
          if (!hitsWall(nx, ny, TANK, TANK)) {
            e.x = nx;
            e.y = ny;
          } else {
            e.moveCd = 0;
          }

          if (e.cd <= 0) {
            e.cd = 1.35 + Math.random() * 1.3;
            ebullets.push({
              x: e.x + TANK / 2 - 2 + d.x * 15,
              y: e.y + TANK / 2 - 2 + d.y * 15,
              dx: d.x,
              dy: d.y
            });
            api.sfx("shoot");
          }
        }
      }

      function update(dt) {
        if (state !== "play") return;

        anim += dt;
        if (player.cd > 0) player.cd -= dt;
        if (player.inv > 0) player.inv -= dt;

        var dx = 0, dy = 0;
        if (held.ArrowLeft || held.a) dx = -1;
        else if (held.ArrowRight || held.d) dx = 1;
        if (dx === 0) {
          if (held.ArrowUp || held.w) dy = -1;
          else if (held.ArrowDown || held.s) dy = 1;
        }

        if (dx !== 0 || dy !== 0) {
          player.dir = dx === 1 ? 0 : dx === -1 ? 1 : dy === 1 ? 2 : 3;
          var nx = player.x + dx * PLAYER_SPEED * dt;
          if (!hitsWall(nx, player.y, TANK, TANK)) player.x = nx;
          var ny = player.y + dy * PLAYER_SPEED * dt;
          if (!hitsWall(player.x, ny, TANK, TANK)) player.y = ny;
        }

        updateEnemies(dt);
        updateBullets(dt);

        for (var i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.t += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.94;
          p.vy *= 0.94;
          if (p.t >= p.max) parts.splice(i, 1);
        }

        if (enemies.length === 0) {
          waveTimer += dt;
          if (waveTimer > 1.1) {
            waveTimer = 0;
            wave++;
            buildMap();
            spawnWave();
            api.setStatus("WAVE " + wave);
            api.sfx("win");
          }
        }
      }

      function drawTank(x, y, dir, body, light, dark) {
        var cx = x + TANK / 2, cy = y + TANK / 2;
        ctx.fillStyle = dark;
        ctx.fillRect(x + 2, y + 2, TANK - 4, TANK - 4);
        ctx.fillStyle = body;
        if (dir === 0 || dir === 1) {
          ctx.fillRect(x + 2, y + 4, TANK - 4, TANK - 8);
          ctx.fillStyle = dark;
          ctx.fillRect(x + 3, y + 1, TANK - 6, 4);
          ctx.fillRect(x + 3, y + TANK - 5, TANK - 6, 4);
        } else {
          ctx.fillRect(x + 4, y + 2, TANK - 8, TANK - 4);
          ctx.fillStyle = dark;
          ctx.fillRect(x + 1, y + 3, 4, TANK - 6);
          ctx.fillRect(x + TANK - 5, y + 3, 4, TANK - 6);
        }
        ctx.fillStyle = light;
        ctx.fillRect(cx - 6, cy - 6, 12, 12);
        ctx.fillStyle = dark;
        ctx.fillRect(cx - 2, cy - 2, 4, 4);

        ctx.fillStyle = light;
        if (dir === 0) ctx.fillRect(cx, cy - 2, TANK / 2 + 3, 4);
        else if (dir === 1) ctx.fillRect(cx - TANK / 2 - 3, cy - 2, TANK / 2 + 3, 4);
        else if (dir === 2) ctx.fillRect(cx - 2, cy, 4, TANK / 2 + 3);
        else ctx.fillRect(cx - 2, cy - TANK / 2 - 3, 4, TANK / 2 + 3);
      }

      function draw() {
        ctx.fillStyle = "#0a0f0a";
        ctx.fillRect(0, 0, 480, 480);

        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            var wx = x * CELL, wy = y * CELL;
            var v = walls[y][x];
            if (v === 0) {
              ctx.fillStyle = "#0b120b";
              ctx.fillRect(wx, wy, CELL, CELL);
              ctx.fillStyle = "#0d150d";
              ctx.fillRect(wx + CELL - 1, wy, 1, CELL);
              ctx.fillRect(wx, wy + CELL - 1, CELL, 1);
            } else if (v === 1) {
              ctx.fillStyle = "#7d3a26";
              ctx.fillRect(wx, wy, CELL, CELL);
              ctx.fillStyle = "#b5563a";
              ctx.fillRect(wx + 1, wy + 1, CELL - 2, CELL - 2);
              ctx.fillStyle = "#7d3a26";
              ctx.fillRect(wx + 1, wy + 11, CELL - 2, 2);
              ctx.fillRect(wx + 11, wy + 1, 2, CELL - 2);
            } else {
              ctx.fillStyle = "#4a5a4a";
              ctx.fillRect(wx, wy, CELL, CELL);
              ctx.fillStyle = "#7f8f7a";
              ctx.fillRect(wx + 2, wy + 2, CELL - 4, CELL - 4);
              ctx.fillStyle = "#4a5a4a";
              ctx.fillRect(wx + 6, wy + 6, CELL - 12, CELL - 12);
            }
          }
        }

        for (var i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          drawTank(e.x, e.y, e.dir, "#8a2f2f", "#ff6b6b", "#4a1414");
        }

        if (!(player.inv > 0 && Math.floor(anim * 12) % 2 === 0)) {
          drawTank(player.x, player.y, player.dir, "#2f6b26", "#7bff5c", "#16300f");
        }

        ctx.fillStyle = "#ffe98a";
        for (i = 0; i < bullets.length; i++) {
          ctx.fillRect(bullets[i].x, bullets[i].y, 5, 5);
        }
        ctx.fillStyle = "#ff6b6b";
        for (i = 0; i < ebullets.length; i++) {
          ctx.fillRect(ebullets[i].x, ebullets[i].y, 5, 5);
        }

        for (i = 0; i < parts.length; i++) {
          var p = parts[i];
          var k = 1 - p.t / p.max;
          ctx.fillStyle = k > 0.5 ? "#ffe98a" : "#ff6b3f";
          var s = Math.max(2, Math.round(7 * k));
          ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        }

        // 剩余生命
        for (i = 0; i < lives; i++) {
          ctx.fillStyle = "#7bff5c";
          ctx.fillRect(30 + i * 13, 30, 9, 9);
          ctx.fillStyle = "#16300f";
          ctx.fillRect(33 + i * 13, 33, 3, 3);
        }

        if (state === "over") {
          ctx.fillStyle = "rgba(10,15,10,0.5)";
          ctx.fillRect(0, 0, 480, 480);
        }
      }

      function onKeyDown(e) {
        var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;

        if (state === "ready") {
          if (k === "Enter" || k === " " || k === "Spacebar") {
            e.preventDefault();
            start();
          }
          return;
        }

        if (state === "over") {
          if (k === "Enter" || k === " " || k === "Spacebar" || k === "r") {
            e.preventDefault();
            start();
          }
          return;
        }

        if (k === " " || k === "Spacebar") {
          e.preventDefault();
          playerFire();
          return;
        }

        if (k === "r") {
          e.preventDefault();
          start();
          return;
        }

        if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown" ||
          k === "a" || k === "d" || k === "w" || k === "s") {
          e.preventDefault();
          held[k] = true;
        }
      }

      function onKeyUp(e) {
        var k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        held[k] = false;
      }

      reset();
      state = "ready";
      anim = 0;
      draw();
      api.showOverlay({
        title: "TANKS",
        msg: "守住阵地，击毁所有来袭坦克<br><strong>方向键 / WASD</strong> 移动 · <strong>SPACE</strong> 开炮<br>砖墙可被打穿，共 <strong>3</strong> 条命",
        btn: "开始战斗",
        onClick: start
      });

      api.on(window, "keydown", onKeyDown, { passive: false });
      api.on(window, "keyup", onKeyUp);
      api.onDestroy(function () { held = {}; });

      api.loop(function (dt) {
        update(dt / 1000);
        draw();
      });
    }
  });
})();
