/* eslint-disable */
(function () {
  "use strict";

  var W = 480, H = 480, GROUND = 416;
  var GRAVITY = 1250, FLAP = -400, MAX_FALL = 620;
  var PIPE_W = 68;

  window.Arcade.register({
    id: "flappy",
    name: "FLAPPY",
    cn: "像素小鸟",
    accent: "#ffd23f",
    desc: "一拍一翅穿过管道缝隙，撞到管道或地面就结束。",
    keys: [
      ["SPACE / ↑ / W", "拍翅"],
      ["ENTER", "开始 / 重开"],
      ["R", "重新开始"],
      ["ESC", "返回大厅"]
    ],
    touch: { a: { label: "拍翅", key: " " } },
    icon: [
      "................",
      "..........####..",
      "..........#..#..",
      "..........####..",
      "................",
      "..####..........",
      ".##..##.........",
      ".##..##.........",
      "..####..........",
      "....#...........",
      "................",
      "......######....",
      "......#....#....",
      "......#....#....",
      "......######....",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var state = "ready";
      var bird, pipes, score, high, spawnAcc, groundScroll, anim, stars, speed;

      high = api.getHigh();
      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      stars = [];
      for (var i = 0; i < 46; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * 320,
          s: Math.random() < 0.25 ? 2 : 1
        });
      }

      function reset() {
        bird = { x: 132, y: 226, vy: 0 };
        pipes = [];
        score = 0;
        spawnAcc = 0;
        speed = 165;
        groundScroll = 0;
        state = "ready";
        api.setScore(0);
        api.setStatus("READY");
        api.hideOverlay();
      }

      function start() {
        reset();
        state = "run";
        bird.vy = -230;
        api.setStatus("PLAYING");
      }

      function gapH() {
        return Math.max(126, 168 - score * 1.6);
      }

      function spawnPipe() {
        var gap = gapH();
        var top = 62 + Math.random() * (GROUND - gap - 122);
        pipes.push({ x: W + 10, y: top, gap: gap, scored: false });
      }

      function die() {
        if (state === "over") return;
        state = "over";
        api.setStatus("GAME OVER");
        api.sfx("boom");
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        api.showOverlay({
          title: "GAME OVER",
          msg: "本次 <strong>" + score + "</strong> 分 · 最高 <strong>" + high +
            "</strong> 分<br>按 <strong>SPACE / ENTER</strong> 再来一局",
          btn: "再来一局",
          onClick: start
        });
      }

      function hitPipe(p) {
        var bx = bird.x - 13, by = bird.y - 10, bw = 26, bh = 20;
        if (bx + bw < p.x || bx > p.x + PIPE_W) return false;
        return by < p.y || by + bh > p.y + p.gap;
      }

      function update(dt) {
        if (state === "ready") {
          bird.y = 226 + Math.sin(anim / 300) * 9;
          bird.vy = 0;
          groundScroll += 60 * dt;
          return;
        }

        if (state === "over") {
          if (bird.y < GROUND - 12) {
            bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * dt);
            bird.y += bird.vy * dt;
          }
          return;
        }

        speed = Math.min(268, 165 + score * 3.2);
        groundScroll += speed * dt;
        bird.vy = Math.min(MAX_FALL, bird.vy + GRAVITY * dt);
        bird.y += bird.vy * dt;

        if (bird.y < 12) {
          bird.y = 12;
          bird.vy = 0;
        }
        if (bird.y + 11 >= GROUND) {
          bird.y = GROUND - 11;
          die();
          return;
        }

        spawnAcc += dt;
        var interval = Math.max(1.12, 1.62 - score * 0.014);
        if (spawnAcc >= interval) {
          spawnAcc -= interval;
          spawnPipe();
        }

        for (var i = pipes.length - 1; i >= 0; i--) {
          var p = pipes[i];
          p.x -= speed * dt;

          if (!p.scored && p.x + PIPE_W < bird.x - 13) {
            p.scored = true;
            score++;
            api.setScore(score);
            api.sfx("point");
          }

          if (hitPipe(p)) {
            die();
            return;
          }

          if (p.x + PIPE_W < -20) pipes.splice(i, 1);
        }
      }

      function pxDisc(cx, cy, r, color) {
        ctx.fillStyle = color;
        for (var dy = -r; dy < r; dy += 2) {
          var w = Math.sqrt(Math.max(0, r * r - (dy + 1) * (dy + 1))) * 2;
          if (w > 0) ctx.fillRect(Math.round(cx - w / 2), cy + dy, Math.round(w), 2);
        }
      }

      function drawBg() {
        ctx.fillStyle = "#060e14";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "#0a1620";
        ctx.fillRect(0, 180, W, GROUND - 180);

        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          ctx.fillStyle = i % 3 === 0 ? "#3f7a33" : "#294152";
          ctx.fillRect(Math.round(s.x), Math.round(s.y), s.s, s.s);
        }

        pxDisc(392, 78, 26, "#22371d");
        pxDisc(392, 78, 22, "#d8ffc8");
        pxDisc(384, 72, 5, "#b4e0a4");
        pxDisc(400, 88, 4, "#b4e0a4");

        // 远景城市
        ctx.fillStyle = "#0c1a16";
        var buildings = [[0, 300, 40, 116], [46, 330, 26, 86], [78, 288, 34, 128],
          [118, 318, 44, 98], [168, 296, 30, 120], [204, 324, 50, 92],
          [260, 282, 36, 134], [302, 312, 42, 104], [350, 292, 30, 124],
          [386, 320, 44, 96], [436, 300, 40, 116]];
        for (i = 0; i < buildings.length; i++) {
          var b = buildings[i];
          ctx.fillRect(b[0], b[1], b[2], b[3]);
        }
        ctx.fillStyle = "#16281c";
        for (i = 0; i < buildings.length; i++) {
          var bb = buildings[i];
          for (var wy = bb[1] + 10; wy < GROUND - 8; wy += 16) {
            for (var wx = bb[0] + 6; wx < bb[0] + bb[2] - 6; wx += 12) {
              if ((wx + wy) % 5 === 0) ctx.fillRect(wx, wy, 3, 5);
            }
          }
        }
      }

      function drawPipe(p) {
        var bottomY = p.y + p.gap;
        var i;
        for (i = 0; i < 2; i++) {
          var top = i === 0 ? p.y : bottomY;
          if (i === 0) {
            ctx.fillStyle = "#2f6b26";
            ctx.fillRect(p.x, 0, PIPE_W, p.y - 26);
            ctx.fillStyle = "#3f8a31";
            ctx.fillRect(p.x + 4, 0, PIPE_W - 8, p.y - 26);
          } else {
            ctx.fillStyle = "#2f6b26";
            ctx.fillRect(p.x, bottomY + 26, PIPE_W, GROUND - bottomY - 26);
            ctx.fillStyle = "#3f8a31";
            ctx.fillRect(p.x + 4, bottomY + 26, PIPE_W - 8, GROUND - bottomY - 26);
          }
          // 管口
          var cy = i === 0 ? top - 26 : bottomY;
          if (cy + 26 <= 0) continue;
          ctx.fillStyle = "#26571f";
          ctx.fillRect(p.x - 5, cy, PIPE_W + 10, 26);
          ctx.fillStyle = "#7bff5c";
          ctx.fillRect(p.x - 5, cy, PIPE_W + 10, 4);
          ctx.fillStyle = "#4fa83d";
          ctx.fillRect(p.x + 2, cy + 4, PIPE_W - 4, 18);
          ctx.fillStyle = "#26571f";
          for (var sx = p.x + 10; sx < p.x + PIPE_W - 6; sx += 14) {
            ctx.fillRect(sx, cy + 8, 3, 10);
          }
        }
      }

      function drawBird() {
        var rot = Math.max(-0.45, Math.min(1.0, bird.vy / 620));
        ctx.save();
        ctx.translate(Math.round(bird.x), Math.round(bird.y));
        ctx.rotate(rot);

        ctx.fillStyle = "#8a6a12";
        ctx.fillRect(-13, -9, 26, 20);
        ctx.fillStyle = "#ffd23f";
        ctx.fillRect(-13, -11, 26, 18);
        ctx.fillStyle = "#ffe98a";
        ctx.fillRect(-9, -9, 14, 6);

        var wingUp = Math.floor(anim / 120) % 2 === 0;
        ctx.fillStyle = "#ff9e3f";
        if (wingUp) {
          ctx.fillRect(-6, -2, 14, 8);
          ctx.fillStyle = "#c9752a";
          ctx.fillRect(-6, 4, 14, 2);
        } else {
          ctx.fillRect(-6, 4, 14, 8);
          ctx.fillStyle = "#c9752a";
          ctx.fillRect(-6, 10, 14, 2);
        }

        ctx.fillStyle = "#ff6b3f";
        ctx.fillRect(11, -2, 7, 7);
        ctx.fillStyle = "#c94a26";
        ctx.fillRect(12, 3, 6, 2);

        ctx.fillStyle = "#07130a";
        ctx.fillRect(4, -8, 5, 5);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(5, -7, 2, 2);
        ctx.restore();
      }

      function drawGround() {
        ctx.fillStyle = "#1f3a19";
        ctx.fillRect(0, GROUND, W, H - GROUND);
        ctx.fillStyle = "#2b4d23";
        ctx.fillRect(0, GROUND, W, 6);
        ctx.fillStyle = "#16280f";
        for (var x = -(groundScroll % 24); x < W; x += 24) {
          ctx.fillRect(x, GROUND + 12, 12, 4);
          ctx.fillRect(x + 12, GROUND + 26, 10, 4);
        }
        ctx.fillStyle = "#0f1c0b";
        for (x = -(groundScroll * 0.5 % 32); x < W; x += 32) {
          ctx.fillRect(x, GROUND + 44, 18, 3);
        }
      }

      function draw() {
        drawBg();
        for (var i = 0; i < pipes.length; i++) drawPipe(pipes[i]);
        drawGround();
        drawBird();
      }

      function onKey(e) {
        var k = e.key;
        var flap = k === " " || k === "Spacebar" || k === "ArrowUp" || k === "w" || k === "W";

        if (state === "ready") {
          if (flap || k === "Enter") {
            e.preventDefault();
            start();
          }
          return;
        }

        if (state === "over") {
          if (k === "Enter" || k === " " || k === "Spacebar" || k === "r" || k === "R") {
            e.preventDefault();
            start();
          }
          return;
        }

        if (flap) {
          e.preventDefault();
          bird.vy = FLAP;
          api.sfx("click");
        } else if (k === "r" || k === "R") {
          e.preventDefault();
          start();
        }
      }

      reset();
      anim = 0;
      draw();
      api.showOverlay({
        title: "FLAPPY",
        msg: "按 <strong>SPACE</strong> 拍翅，穿过管道缝隙<br>每穿过一根管道 <strong>+1</strong> 分",
        btn: "开始飞行",
        onClick: start
      });

      api.on(window, "keydown", onKey, { passive: false });

      api.loop(function (dt) {
        anim += dt;
        update(dt / 1000);
        draw();
      });
    }
  });
})();
