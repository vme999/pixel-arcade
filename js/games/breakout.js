/* eslint-disable */
(function () {
  "use strict";

  var W = 480, H = 480;
  var ROWS = 6, COLS = 9;
  var BW = 44, BH = 16, GAP = 4;
  var X0 = 26, Y0 = 64;
  var PADDLE_W = 96, PADDLE_H = 12, PADDLE_Y = 444;
  var BALL_R = 5;

  var ROW_COLORS = ["#ff5c5c", "#ffa14d", "#ffd23f", "#7bff5c", "#4de1ff", "#c07bff"];

  var ST = { READY: 0, RUN: 1, PAUSE: 2, OVER: 3, CLEAR: 4 };

  window.Arcade.register({
    id: "breakout",
    name: "BREAKOUT",
    cn: "打砖块",
    accent: "#ffa14d",
    desc: "左右移动挡板反弹小球，打光全部像素砖块进入下一关。",
    keys: [
      ["← → / A D", "移动挡板"],
      ["SPACE", "发射 / 暂停"],
      ["R", "重新开始"],
      ["ESC", "返回大厅"]
    ],
    touch: { a: { label: "发射", key: " " } },
    icon: [
      "................",
      "................",
      "..####..####....",
      "..####..####....",
      "................",
      "...##....##.....",
      "...##....##.....",
      "................",
      "................",
      "................",
      "..........##....",
      "................",
      "....########....",
      "....########....",
      "................",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var state = ST.READY;
      var bricks = [];
      var paddle = { x: (W - PADDLE_W) / 2, y: PADDLE_Y };
      var ball = { x: W / 2, y: PADDLE_Y - BALL_R - 6, vx: 0, vy: 0 };
      var speed = 320;
      var lives = 3;
      var score = 0;
      var level = 1;
      var high = api.getHigh();
      var leftHeld = false;
      var rightHeld = false;
      var attached = true;

      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      function buildBricks() {
        bricks = [];
        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            bricks.push({
              x: X0 + c * (BW + GAP),
              y: Y0 + r * (BH + GAP),
              w: BW,
              h: BH,
              color: ROW_COLORS[r],
              row: r,
              alive: true
            });
          }
        }
      }

      function aliveCount() {
        var n = 0;
        for (var i = 0; i < bricks.length; i++) if (bricks[i].alive) n++;
        return n;
      }

      function attachBall() {
        attached = true;
        ball.vx = 0;
        ball.vy = 0;
        ball.x = paddle.x + PADDLE_W / 2;
        ball.y = paddle.y - BALL_R - 6;
      }

      function reset() {
        buildBricks();
        paddle.x = (W - PADDLE_W) / 2;
        lives = 3;
        score = 0;
        level = 1;
        speed = 320;
        api.setScore(0);
        attachBall();
      }

      function start() {
        reset();
        state = ST.RUN;
        api.hideOverlay();
        api.setStatus("LEVEL 1");
      }

      function launch() {
        if (!attached) return;
        attached = false;
        var angle = (-55 + Math.random() * 20) * Math.PI / 180;
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
        api.sfx("point");
      }

      function togglePause() {
        if (state === ST.RUN) {
          state = ST.PAUSE;
          api.setStatus("PAUSED");
          api.showOverlay({
            title: "PAUSED",
            msg: "<strong>SPACE</strong> 继续 · <strong>R</strong> 重新开始",
            btn: "继续游戏",
            onClick: togglePause
          });
        } else if (state === ST.PAUSE) {
          state = ST.RUN;
          api.hideOverlay();
          api.setStatus("LEVEL " + level);
        }
      }

      function gameOver() {
        state = ST.OVER;
        api.setStatus("GAME OVER");
        api.sfx("lose");
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        api.showOverlay({
          title: "GAME OVER",
          msg: "得分 <strong>" + score + "</strong> · 到达第 <strong>" + level + "</strong> 关<br>按 <strong>ENTER</strong> 再来一局",
          btn: "再来一局",
          onClick: start
        });
      }

      function nextLevel() {
        state = ST.CLEAR;
        level++;
        speed = 320 + (level - 1) * 35;
        api.setStatus("LEVEL " + level);
        api.sfx("win");
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        api.showOverlay({
          title: "LEVEL " + level,
          msg: "砖块已清空！<br>下一关球速会更快",
          btn: "继续",
          onClick: function () {
            buildBricks();
            attachBall();
            state = ST.RUN;
            api.hideOverlay();
          }
        });
      }

      function loseLife() {
        lives--;
        api.sfx("hit");
        if (lives <= 0) {
          gameOver();
        } else {
          attachBall();
          api.setStatus("LIVES " + lives);
        }
      }

      function hitBrick(b) {
        b.alive = false;
        score += 10 * (ROWS - b.row);
        api.setScore(score);
        api.sfx("hit");
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        if (aliveCount() === 0) nextLevel();
      }

      function updateBall(dt) {
        var dist = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * dt / 1000;
        var steps = Math.max(1, Math.ceil(dist / 3));
        var sx = ball.vx * dt / 1000 / steps;
        var sy = ball.vy * dt / 1000 / steps;

        for (var s = 0; s < steps; s++) {
          ball.x += sx;
          ball.y += sy;

          if (ball.x - BALL_R < 8) {
            ball.x = 8 + BALL_R;
            ball.vx = Math.abs(ball.vx);
            api.sfx("move");
          } else if (ball.x + BALL_R > W - 8) {
            ball.x = W - 8 - BALL_R;
            ball.vx = -Math.abs(ball.vx);
            api.sfx("move");
          }

          if (ball.y - BALL_R < 8) {
            ball.y = 8 + BALL_R;
            ball.vy = Math.abs(ball.vy);
            api.sfx("move");
          }

          // 挡板
          if (ball.vy > 0 &&
              ball.y + BALL_R >= paddle.y &&
              ball.y - BALL_R <= paddle.y + PADDLE_H &&
              ball.x + BALL_R >= paddle.x &&
              ball.x - BALL_R <= paddle.x + PADDLE_W) {
            var rel = (ball.x - (paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2);
            rel = Math.max(-1, Math.min(1, rel));
            var angle = rel * (Math.PI / 3);
            speed = Math.min(500, speed * 1.01);
            ball.vx = Math.sin(angle) * speed;
            ball.vy = -Math.cos(angle) * speed;
            ball.y = paddle.y - BALL_R - 0.5;
            api.sfx("turn");
          }

          // 砖块
          for (var i = 0; i < bricks.length; i++) {
            var b = bricks[i];
            if (!b.alive) continue;
            if (ball.x + BALL_R > b.x && ball.x - BALL_R < b.x + b.w &&
                ball.y + BALL_R > b.y && ball.y - BALL_R < b.y + b.h) {
              var ox = Math.min(ball.x + BALL_R, b.x + b.w) - Math.max(ball.x - BALL_R, b.x);
              var oy = Math.min(ball.y + BALL_R, b.y + b.h) - Math.max(ball.y - BALL_R, b.y);
              if (ox < oy) {
                ball.vx = -ball.vx;
                ball.x += ball.vx > 0 ? ox : -ox;
              } else {
                ball.vy = -ball.vy;
                ball.y += ball.vy > 0 ? oy : -oy;
              }
              speed = Math.min(500, speed * 1.006);
              hitBrick(b);
              if (state !== ST.RUN) return;
              break;
            }
          }

          if (ball.y - BALL_R > H) {
            loseLife();
            return;
          }
        }
      }

      function drawBrick(b) {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "rgba(255,255,255,.35)";
        ctx.fillRect(b.x, b.y, b.w, 3);
        ctx.fillRect(b.x, b.y, 3, b.h);
        ctx.fillStyle = "rgba(0,0,0,.35)";
        ctx.fillRect(b.x, b.y + b.h - 3, b.w, 3);
        ctx.fillRect(b.x + b.w - 3, b.y, 3, b.h);
        ctx.fillStyle = "rgba(0,0,0,.15)";
        ctx.fillRect(b.x + 6, b.y + 6, 3, 3);
      }

      function draw() {
        ctx.fillStyle = "#050805";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#0a0f0a";
        ctx.fillRect(8, 8, W - 16, H - 16);

        ctx.fillStyle = "#152015";
        for (var gy = 24; gy < H; gy += 24) ctx.fillRect(8, gy, W - 16, 1);

        // 侧墙
        ctx.fillStyle = "#16240f";
        ctx.fillRect(0, 0, 8, H);
        ctx.fillRect(W - 8, 0, 8, H);
        ctx.fillRect(0, 0, W, 8);
        ctx.fillStyle = "#2b452a";
        for (var i = 0; i < H; i += 24) {
          ctx.fillRect(2, i + 4, 4, 14);
          ctx.fillRect(W - 6, i + 4, 4, 14);
        }

        for (var b = 0; b < bricks.length; b++) {
          if (bricks[b].alive) drawBrick(bricks[b]);
        }

        // 挡板
        ctx.fillStyle = "#7bff5c";
        ctx.fillRect(paddle.x, paddle.y, PADDLE_W, PADDLE_H);
        ctx.fillStyle = "#3f7a33";
        ctx.fillRect(paddle.x, paddle.y + PADDLE_H - 4, PADDLE_W, 4);
        ctx.fillStyle = "#b6ff9e";
        ctx.fillRect(paddle.x + 4, paddle.y + 2, PADDLE_W - 8, 3);

        // 球
        ctx.fillStyle = "#ffd23f";
        ctx.fillRect(ball.x - BALL_R, ball.y - BALL_R, BALL_R * 2, BALL_R * 2);
        ctx.fillStyle = "#fff6c2";
        ctx.fillRect(ball.x - BALL_R + 2, ball.y - BALL_R + 2, 3, 3);

        // 生命
        for (var l = 0; l < lives; l++) {
          ctx.fillStyle = "#7bff5c";
          ctx.fillRect(16 + l * 16, 18, 10, 5);
          ctx.fillRect(18 + l * 16, 23, 6, 2);
        }

        ctx.fillStyle = "#3f7a33";
        ctx.font = "10px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText("LEVEL " + level, W - 18, 18);

        if (attached && state === ST.RUN) {
          ctx.fillStyle = "#3f7a33";
          ctx.textAlign = "center";
          ctx.font = "10px ui-monospace, Menlo, Consolas, monospace";
          ctx.fillText("SPACE 发射", W / 2, paddle.y - 34);
        }
      }

      function onKeyDown(e) {
        var k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") {
          e.preventDefault();
          leftHeld = true;
          return;
        }
        if (k === "ArrowRight" || k === "d" || k === "D") {
          e.preventDefault();
          rightHeld = true;
          return;
        }
        if (k === " " || k === "Spacebar") {
          e.preventDefault();
          if (state === ST.READY || state === ST.OVER) {
            start();
            launch();
          } else if (state === ST.RUN) {
            if (attached) launch();
            else togglePause();
          } else if (state === ST.PAUSE) {
            togglePause();
          }
          return;
        }
        if (k === "p" || k === "P") {
          e.preventDefault();
          if (state === ST.RUN || state === ST.PAUSE) togglePause();
          return;
        }
        if (k === "r" || k === "R") {
          e.preventDefault();
          start();
          return;
        }
        if (k === "Enter") {
          e.preventDefault();
          if (state === ST.PAUSE) togglePause();
          else if (state !== ST.RUN) start();
        }
      }

      function onKeyUp(e) {
        var k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") leftHeld = false;
        if (k === "ArrowRight" || k === "d" || k === "D") rightHeld = false;
      }

      reset();
      draw();
      state = ST.READY;
      api.setStatus("READY");
      api.showOverlay({
        title: "BREAKOUT",
        msg: "<strong>← →</strong> 或 <strong>A D</strong> 移动挡板<br><strong>SPACE</strong> 发射小球 / 暂停<br>打光砖块即进入下一关",
        btn: "开始游戏",
        onClick: start
      });

      api.on(window, "keydown", onKeyDown, { passive: false });
      api.on(window, "keyup", onKeyUp);

      api.loop(function (dt) {
        if (state === ST.RUN) {
          var move = 0;
          if (leftHeld) move -= 1;
          if (rightHeld) move += 1;
          if (move) {
            paddle.x += move * 430 * dt / 1000;
            paddle.x = Math.max(8, Math.min(W - 8 - PADDLE_W, paddle.x));
            if (attached) {
              ball.x = paddle.x + PADDLE_W / 2;
              ball.y = paddle.y - BALL_R - 6;
            }
          }
          if (!attached) updateBall(dt);
        }
        draw();
      });
    }
  });
})();
