/* eslint-disable */
(function () {
  "use strict";

  var W = 480, H = 480;
  var PLAYER_SPEED = 270;

  window.Arcade.register({
    id: "raider",
    name: "STAR RAIDER",
    cn: "星际突袭",
    accent: "#6ec6ff",
    desc: "Galaga 风格竖版射击，击落俯冲编队，每 3 波迎战 BOSS。",
    keys: [
      ["← → / A D", "左右移动"],
      ["SPACE", "射击"],
      ["R", "重新开始"],
      ["ESC", "返回大厅"]
    ],
    touch: { a: { label: "射击", key: " " } },
    icon: [
      "................",
      ".......##.......",
      "......####......",
      "....########....",
      "...##########...",
      "..##..####..##..",
      "......####......",
      "................",
      "................",
      "..####......####",
      "..####......####",
      "....##......##..",
      "................",
      "..##..........##",
      "..##..........##",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var player, bullets, ebullets, enemies, parts, stars;
      var lives, wave, score, high, state, time, diveTimer, between;
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

      stars = [];
      for (var i = 0; i < 60; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          s: Math.random() < 0.25 ? 2 : 1,
          sp: 18 + Math.random() * 50
        });
      }

      function reset() {
        player = { x: W / 2, y: 428, w: 34, h: 24, cd: 0, inv: 1.5 };
        bullets = [];
        ebullets = [];
        enemies = [];
        parts = [];
        lives = 3;
        wave = 1;
        score = 0;
        time = 0;
        diveTimer = 1.6;
        between = 0;
        held = {};
        state = "play";
        api.setScore(0);
        api.hideOverlay();
        buildWave();
        api.setStatus("WAVE 1");
      }

      function start() {
        reset();
        state = "play";
      }

      function buildWave() {
        enemies = [];
        if (wave % 3 === 0) {
          enemies.push({
            boss: true,
            x: W / 2,
            y: -70,
            w: 84,
            h: 54,
            hp: 18 + wave * 4,
            maxHp: 18 + wave * 4,
            fire: 1.6,
            st: "enter"
          });
        } else {
          var cols = 8, rows = 3;
          for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
              var sx = W / 2 + (c - (cols - 1) / 2) * 46;
              var sy = 78 + r * 44;
              enemies.push({
                boss: false,
                slotX: sx,
                slotY: sy,
                x: sx,
                y: -48 - r * 46,
                w: 30,
                h: 22,
                hp: 1,
                maxHp: 1,
                kind: r === 0 ? 1 : 0,
                st: "enter",
                t: 0,
                fire: 0.8 + Math.random() * 1.4
              });
            }
          }
        }
        diveTimer = 1.8;
      }

      function enemiesAlive() {
        return enemies.length;
      }

      function hit(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      }

      function boom(x, y, color, n) {
        for (var i = 0; i < n; i++) {
          parts.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 220,
            vy: (Math.random() - 0.5) * 220,
            t: 0,
            max: 0.32 + Math.random() * 0.3,
            color: color || "#ffe98a"
          });
        }
      }

      function playerHit() {
        if (player.inv > 0 || state !== "play") return;
        lives--;
        player.inv = 2.2;
        boom(player.x, player.y + 12, "#7bff5c", 18);
        api.sfx("boom");
        ebullets = [];
        if (lives <= 0) {
          state = "over";
          api.setStatus("GAME OVER");
          if (score > high) {
            high = score;
            api.setHigh(high);
          }
          api.showOverlay({
            title: "GAME OVER",
            msg: "得分 <strong>" + pad4(score) + "</strong> · 最高 <strong>" +
              pad4(high) + "</strong><br>抵达第 <strong>" + wave +
              "</strong> 波<br>按 <strong>ENTER</strong> 再次出击",
            btn: "再次出击",
            onClick: start
          });
        }
      }

      function enemyFire(e) {
        var sx = e.x, sy = e.y + e.h;
        if (e.boss) {
          for (var i = -1; i <= 1; i++) {
            ebullets.push({
              x: sx - 4,
              y: sy - 6,
              vx: i * 105,
              vy: 230,
              w: 8,
              h: 8
            });
          }
        } else {
          var ang = Math.atan2((player.y + 10) - sy, player.x - sx);
          ebullets.push({
            x: sx - 4,
            y: sy - 4,
            vx: Math.cos(ang) * 245,
            vy: Math.sin(ang) * 245,
            w: 8,
            h: 8
          });
        }
      }

      function update(dt) {
        if (state !== "play") return;

        time += dt;
        if (player.cd > 0) player.cd -= dt;
        if (player.inv > 0) player.inv -= dt;

        var dx = 0;
        if (held.ArrowLeft || held.a) dx = -1;
        else if (held.ArrowRight || held.d) dx = 1;
        player.x += dx * PLAYER_SPEED * dt;
        if (player.x < 26) player.x = 26;
        if (player.x > W - 26) player.x = W - 26;

        for (var s = 0; s < stars.length; s++) {
          stars[s].y += stars[s].sp * dt;
          if (stars[s].y > H) {
            stars[s].y = -4;
            stars[s].x = Math.random() * W;
          }
        }

        for (var i = bullets.length - 1; i >= 0; i--) {
          var b = bullets[i];
          b.y -= 560 * dt;
          if (b.y < -12) {
            bullets.splice(i, 1);
            continue;
          }

          var killed = false;
          for (var j = enemies.length - 1; j >= 0; j--) {
            var e = enemies[j];
            if (hit({ x: b.x - 2, y: b.y - 8, w: 4, h: 12 }, e)) {
              e.hp--;
              bullets.splice(i, 1);
              killed = true;
              if (e.hp <= 0) {
                var pts = e.boss ? 600 : (e.kind === 1 ? 90 : 60);
                score += pts;
                api.setScore(score);
                if (score > high) {
                  high = score;
                  api.setHigh(high);
                }
                boom(e.x, e.y + e.h / 2, e.boss ? "#ffd23f" : "#ff6b6b", e.boss ? 26 : 10);
                api.sfx("boom");
                enemies.splice(j, 1);
              } else {
                api.sfx("hit");
                boom(b.x, b.y, "#ffd23f", 3);
              }
              break;
            }
          }
          if (killed) continue;
        }

        // 编队与俯冲
        if (wave % 3 !== 0) {
          diveTimer -= dt;
          if (diveTimer <= 0) {
            var pool = [];
            for (i = 0; i < enemies.length; i++) {
              if (enemies[i].st === "form") pool.push(enemies[i]);
            }
            if (pool.length) {
              var pick = pool[Math.floor(Math.random() * pool.length)];
              pick.st = "dive";
              pick.t = 0;
              pick.diveX = pick.x;
              pick.diveSpeed = 150 + wave * 7;
              diveTimer = 1.1 + Math.random() * 1.1;
            } else {
              diveTimer = 0.6;
            }
          }
        }

        var sway = Math.sin(time * 0.9) * 22;

        for (i = enemies.length - 1; i >= 0; i--) {
          var en = enemies[i];

          if (en.boss) {
            if (en.st === "enter") {
              en.y += 90 * dt;
              if (en.y >= 112) {
                en.y = 112;
                en.st = "form";
              }
            } else {
              en.x = W / 2 + Math.sin(time * 0.8) * 118;
              en.y = 112 + Math.sin(time * 1.6) * 10;
            }
            en.fire -= dt;
            if (en.fire <= 0 && en.st === "form") {
              en.fire = 1.15;
              enemyFire(en);
              api.sfx("shoot");
            }
          } else if (en.st === "enter") {
            en.x += (en.slotX - en.x) * 3.2 * dt;
            en.y += 150 * dt;
            if (en.y >= en.slotY - 2) {
              en.y = en.slotY;
              en.st = "form";
            }
          } else if (en.st === "form") {
            en.x = en.slotX + sway;
            en.y = en.slotY;
            en.fire -= dt;
            if (en.fire <= 0) {
              en.fire = 1.6 + Math.random() * 2;
              if (Math.random() < 0.35) {
                enemyFire(en);
                api.sfx("shoot");
              }
            }
          } else if (en.st === "dive") {
            en.t += dt;
            en.x = en.diveX + sway + Math.sin(en.t * 4.2) * 46;
            en.y += en.diveSpeed * dt;
            en.fire -= dt;
            if (en.fire <= 0) {
              en.fire = 0.95;
              enemyFire(en);
            }
            if (en.y > H + 30) {
              en.st = "back";
              en.y = -34;
              en.x = en.slotX;
              en.fire = 1.2;
            }
          } else {
            en.y += 170 * dt;
            en.x += (en.slotX - en.x) * 2 * dt;
            if (en.y >= en.slotY) {
              en.y = en.slotY;
              en.st = "form";
            }
          }

          if (hit({ x: player.x - 16, y: player.y, w: 32, h: 22 },
            { x: en.x, y: en.y, w: en.boss ? en.w : 26, h: en.h })) {
            if (en.st === "dive" && !en.boss) {
              boom(en.x, en.y, "#ff6b6b", 10);
              enemies.splice(i, 1);
            }
            playerHit();
          }
        }

        for (i = ebullets.length - 1; i >= 0; i--) {
          var eb = ebullets[i];
          eb.x += eb.vx * dt;
          eb.y += eb.vy * dt;
          if (eb.y > H + 10 || eb.y < -20 || eb.x < -20 || eb.x > W + 20) {
            ebullets.splice(i, 1);
            continue;
          }
          if (hit({ x: eb.x, y: eb.y, w: eb.w, h: eb.h },
            { x: player.x - 15, y: player.y + 2, w: 30, h: 20 })) {
            ebullets.splice(i, 1);
            playerHit();
          }
        }

        for (i = parts.length - 1; i >= 0; i--) {
          var p = parts[i];
          p.t += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vx *= 0.95;
          p.vy *= 0.95;
          if (p.t >= p.max) parts.splice(i, 1);
        }

        if (enemiesAlive() === 0) {
          between += dt;
          if (between > 1.2) {
            between = 0;
            wave++;
            buildWave();
            api.setStatus("WAVE " + wave);
            if (wave % 3 === 0) api.sfx("win");
          }
        }
      }

      function drawShip(x, y, kind) {
        if (kind === 0) {
          ctx.fillStyle = "#2f6b26";
          ctx.fillRect(x - 15, y + 8, 30, 8);
          ctx.fillStyle = "#7bff5c";
          ctx.fillRect(x - 11, y + 4, 22, 8);
          ctx.fillRect(x - 4, y - 2, 8, 8);
          ctx.fillStyle = "#c8f5bd";
          ctx.fillRect(x - 3, y + 5, 6, 4);
        } else if (kind === 1) {
          ctx.fillStyle = "#8a5a12";
          ctx.fillRect(x - 15, y + 6, 30, 10);
          ctx.fillStyle = "#ffd23f";
          ctx.fillRect(x - 12, y + 2, 24, 9);
          ctx.fillRect(x - 5, y - 4, 10, 7);
          ctx.fillStyle = "#fff0b0";
          ctx.fillRect(x - 4, y + 4, 8, 4);
        } else if (kind === 2) {
          ctx.fillStyle = "#7a3a12";
          ctx.fillRect(x - 15, y + 6, 30, 10);
          ctx.fillStyle = "#ff8fd0";
          ctx.fillRect(x - 12, y + 2, 24, 9);
          ctx.fillRect(x - 5, y - 4, 10, 7);
          ctx.fillStyle = "#ffd6ef";
          ctx.fillRect(x - 4, y + 4, 8, 4);
        }
      }

      function drawBoss(e) {
        var x = e.x, y = e.y;
        ctx.fillStyle = "#4a1414";
        ctx.fillRect(x - 42, y + 14, 84, 34);
        ctx.fillStyle = "#8a2f2f";
        ctx.fillRect(x - 38, y + 8, 76, 32);
        ctx.fillStyle = "#ff6b6b";
        ctx.fillRect(x - 30, y + 2, 60, 22);
        ctx.fillRect(x - 46, y + 18, 92, 10);
        ctx.fillStyle = "#2b0d0d";
        ctx.fillRect(x - 12, y + 12, 24, 18);
        ctx.fillStyle = "#ffd23f";
        ctx.fillRect(x - 7, y + 16, 14, 10);
        ctx.fillStyle = "#fff0b0";
        ctx.fillRect(x - 3, y + 19, 6, 4);

        var bw = 160;
        ctx.fillStyle = "#2b0d0d";
        ctx.fillRect(W / 2 - bw / 2, 26, bw, 10);
        ctx.fillStyle = "#ff4d4d";
        ctx.fillRect(W / 2 - bw / 2 + 1, 27, Math.round((bw - 2) * (e.hp / e.maxHp)), 8);
      }

      function draw() {
        ctx.fillStyle = "#060b12";
        ctx.fillRect(0, 0, W, H);

        for (var i = 0; i < stars.length; i++) {
          var st = stars[i];
          ctx.fillStyle = st.s === 2 ? "#6ec6ff" : "#26384d";
          ctx.fillRect(Math.round(st.x), Math.round(st.y), st.s, st.s);
        }

        for (i = 0; i < enemies.length; i++) {
          var e = enemies[i];
          if (e.boss) drawBoss(e);
          else drawShip(e.x, e.y, e.kind);
        }

        ctx.fillStyle = "#d6ff8a";
        for (i = 0; i < bullets.length; i++) {
          ctx.fillRect(Math.round(bullets[i].x) - 2, Math.round(bullets[i].y) - 8, 4, 12);
        }

        ctx.fillStyle = "#ff6b6b";
        for (i = 0; i < ebullets.length; i++) {
          var eb = ebullets[i];
          ctx.fillRect(Math.round(eb.x), Math.round(eb.y), 8, 8);
          ctx.fillStyle = "#ffd23f";
          ctx.fillRect(Math.round(eb.x) + 2, Math.round(eb.y) + 2, 4, 4);
          ctx.fillStyle = "#ff6b6b";
        }

        for (i = 0; i < parts.length; i++) {
          var p = parts[i];
          var k = 1 - p.t / p.max;
          ctx.fillStyle = p.color;
          var s = Math.max(2, Math.round(6 * k));
          ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        }

        if (!(player.inv > 0 && Math.floor(time * 12) % 2 === 0)) {
          var px = Math.round(player.x), py = Math.round(player.y);
          ctx.fillStyle = "#2f6b26";
          ctx.fillRect(px - 17, py + 8, 34, 12);
          ctx.fillStyle = "#7bff5c";
          ctx.fillRect(px - 13, py + 2, 26, 16);
          ctx.fillRect(px - 4, py - 6, 8, 12);
          ctx.fillStyle = "#6ec6ff";
          ctx.fillRect(px - 3, py - 2, 6, 6);
          ctx.fillStyle = "#ffd23f";
          ctx.fillRect(px - 9, py + 20, 4, 4);
          ctx.fillRect(px + 5, py + 20, 4, 4);
        }

        for (i = 0; i < lives; i++) {
          ctx.fillStyle = "#7bff5c";
          ctx.fillRect(20 + i * 14, 452, 10, 5);
          ctx.fillRect(23 + i * 14, 447, 4, 5);
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
          if (player.cd <= 0) {
            bullets.push({ x: player.x, y: player.y - 6 });
            player.cd = 0.21;
            api.sfx("shoot");
          }
          return;
        }

        if (k === "r") {
          e.preventDefault();
          start();
          return;
        }

        if (k === "ArrowLeft" || k === "ArrowRight" || k === "a" || k === "d") {
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
      draw();
      api.showOverlay({
        title: "STAR RAIDER",
        msg: "击落俯冲的敌机编队，每 3 波出现 BOSS<br><strong>← → / A D</strong> 移动 · <strong>SPACE</strong> 射击<br>共 <strong>3</strong> 条命",
        btn: "开始突击",
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
