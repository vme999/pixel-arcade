/* eslint-disable */
(function () {
  "use strict";

  var COLS = 22, ROWS = 22, CELL = 20, OFF = 20;
  var BASE_TICK = 132, MIN_TICK = 64, SPEED_STEP = 4;

  var ST = { READY: 0, RUN: 1, PAUSE: 2, OVER: 3 };

  window.Arcade.register({
    id: "snake",
    name: "SNAKE",
    cn: "贪吃蛇",
    accent: "#7bff5c",
    desc: "吃掉像素苹果不断变长，撞墙或咬到自己就结束。",
    keys: [
      ["← ↑ ↓ → / WASD", "移动"],
      ["SPACE", "开始 / 暂停"],
      ["R", "重新开始"],
      ["ESC", "返回大厅"]
    ],
    touch: { a: { label: "暂停", key: " " } },
    icon: [
      "................",
      "................",
      "...####.........",
      "..#....#........",
      "..#....#...##...",
      "..#....#...##...",
      "...####.........",
      "................",
      ".....####.......",
      ".........#......",
      "........#.......",
      ".......#........",
      "......####......",
      "................",
      "................",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var state = ST.READY;
      var snake = [];
      var dir = { x: 1, y: 0 };
      var queue = [];
      var food = null;
      var score = 0;
      var tickMs = BASE_TICK;
      var acc = 0;
      var anim = 0;
      var high = api.getHigh();

      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      function pad3(n) {
        var s = String(n);
        while (s.length < 3) s = "0" + s;
        return s;
      }

      function placeFood() {
        var free = [];
        for (var y = 0; y < ROWS; y++) {
          for (var x = 0; x < COLS; x++) {
            var hit = false;
            for (var i = 0; i < snake.length; i++) {
              if (snake[i].x === x && snake[i].y === y) { hit = true; break; }
            }
            if (!hit) free.push({ x: x, y: y });
          }
        }
        food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
      }

      function reset() {
        snake = [
          { x: 11, y: 11 },
          { x: 10, y: 11 },
          { x: 9, y: 11 }
        ];
        dir = { x: 1, y: 0 };
        queue = [];
        score = 0;
        tickMs = BASE_TICK;
        acc = 0;
        placeFood();
        api.setScore(0);
      }

      function start() {
        reset();
        state = ST.RUN;
        api.hideOverlay();
        api.setStatus("PLAYING");
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
          api.setStatus("PLAYING");
        }
      }

      function die() {
        state = ST.OVER;
        api.setStatus("GAME OVER");
        api.sfx("lose");
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        api.showOverlay({
          title: "GAME OVER",
          msg: "得分 <strong>" + pad3(score) + "</strong> · 最高 <strong>" + pad3(high) +
            "</strong><br>按 <strong>ENTER / SPACE</strong> 再来一局",
          btn: "再来一局",
          onClick: start
        });
      }

      function step() {
        if (queue.length) dir = queue.shift();

        var head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

        if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
          die();
          return;
        }

        for (var i = 0; i < snake.length - 1; i++) {
          if (snake[i].x === head.x && snake[i].y === head.y) {
            die();
            return;
          }
        }

        snake.unshift(head);

        if (food && head.x === food.x && head.y === food.y) {
          score += 10;
          api.setScore(score);
          api.sfx("eat");
          if (score > high) {
            high = score;
            api.setHigh(high);
          }
          tickMs = Math.max(MIN_TICK, tickMs - SPEED_STEP);
          placeFood();
        } else {
          snake.pop();
        }
      }

      function turn(nd) {
        var ref = queue.length ? queue[queue.length - 1] : dir;
        if (nd.x === -ref.x && nd.y === -ref.y) return;
        if (nd.x === ref.x && nd.y === ref.y) return;
        if (queue.length < 2) queue.push(nd);
      }

      function block(x, y, inset) {
        return { px: OFF + x * CELL + inset, py: OFF + y * CELL + inset, s: CELL - inset * 2 };
      }

      function drawWall() {
        ctx.fillStyle = "#16240f";
        ctx.fillRect(0, 0, 480, 480);

        ctx.fillStyle = "#2b452a";
        var i;
        for (i = 0; i < 480; i += 24) {
          ctx.fillRect(i + 3, 4, 18, 7);
          ctx.fillRect(i + 3, 480 - 11, 18, 7);
        }
        for (i = 0; i < 480; i += 24) {
          ctx.fillRect(4, i + 3, 7, 18);
          ctx.fillRect(480 - 11, i + 3, 7, 18);
        }
      }

      function draw() {
        ctx.fillStyle = "#0a0f0a";
        ctx.fillRect(0, 0, 480, 480);

        // 外围砖墙
        drawWall();

        // 场地
        ctx.fillStyle = "#0b120b";
        ctx.fillRect(OFF, OFF, COLS * CELL, ROWS * CELL);

        ctx.fillStyle = "#121c12";
        var gx, gy;
        for (gx = 1; gx < COLS; gx++) ctx.fillRect(OFF + gx * CELL, OFF, 1, ROWS * CELL);
        for (gy = 1; gy < ROWS; gy++) ctx.fillRect(OFF, OFF + gy * CELL, COLS * CELL, 1);

        // 食物
        if (food) {
          var pulse = state === ST.RUN && Math.floor(anim / 260) % 2 === 0;
          var f = block(food.x, food.y, 3);
          ctx.fillStyle = "#8f1f1f";
          ctx.fillRect(f.px, f.py + 2, f.s, f.s - 2);
          ctx.fillStyle = pulse ? "#ff6b6b" : "#ff4d4d";
          ctx.fillRect(f.px, f.py, f.s, f.s - 2);
          ctx.fillStyle = "#ffb3b3";
          ctx.fillRect(f.px + 2, f.py + 2, 3, 3);
          ctx.fillStyle = "#7bff5c";
          ctx.fillRect(f.px + f.s - 5, f.py - 4, 4, 4);
        }

        // 蛇身
        for (var i = snake.length - 1; i >= 0; i--) {
          var s = snake[i];
          var r = block(s.x, s.y, 1);
          var head = i === 0;
          ctx.fillStyle = head ? "#b6ff9e" : (i % 2 ? "#63d949" : "#7bff5c");
          ctx.fillRect(r.px, r.py, r.s, r.s);
          ctx.fillStyle = head ? "#2f7a25" : "#2c6b22";
          ctx.fillRect(r.px + 3, r.py + 3, r.s - 6, r.s - 6);
          if (!head) {
            ctx.fillStyle = i % 2 ? "#63d949" : "#7bff5c";
            ctx.fillRect(r.px + 5, r.py + 5, r.s - 10, r.s - 10);
          }
        }

        // 眼睛
        if (snake.length) {
          var h = snake[0];
          var hr = block(h.x, h.y, 1);
          var eye = 4;
          ctx.fillStyle = "#07130a";
          var e1, e2;
          if (dir.x === 1) {
            e1 = { x: hr.px + hr.s - eye - 2, y: hr.py + 3 };
            e2 = { x: hr.px + hr.s - eye - 2, y: hr.py + hr.s - eye - 3 };
          } else if (dir.x === -1) {
            e1 = { x: hr.px + 2, y: hr.py + 3 };
            e2 = { x: hr.px + 2, y: hr.py + hr.s - eye - 3 };
          } else if (dir.y === 1) {
            e1 = { x: hr.px + 3, y: hr.py + hr.s - eye - 2 };
            e2 = { x: hr.px + hr.s - eye - 3, y: hr.py + hr.s - eye - 2 };
          } else {
            e1 = { x: hr.px + 3, y: hr.py + 2 };
            e2 = { x: hr.px + hr.s - eye - 3, y: hr.py + 2 };
          }
          ctx.fillRect(e1.x, e1.y, eye, eye);
          ctx.fillRect(e2.x, e2.y, eye, eye);
        }
      }

      function onKey(e) {
        var k = e.key;
        var nd = null;

        if (k === "ArrowUp" || k === "w" || k === "W") nd = { x: 0, y: -1 };
        else if (k === "ArrowDown" || k === "s" || k === "S") nd = { x: 0, y: 1 };
        else if (k === "ArrowLeft" || k === "a" || k === "A") nd = { x: -1, y: 0 };
        else if (k === "ArrowRight" || k === "d" || k === "D") nd = { x: 1, y: 0 };

        if (nd) {
          e.preventDefault();
          if (state === ST.READY || state === ST.OVER) start();
          turn(nd);
          return;
        }

        if (k === " " || k === "Spacebar") {
          e.preventDefault();
          if (state === ST.READY || state === ST.OVER) start();
          else togglePause();
          return;
        }

        if (k === "Enter") {
          e.preventDefault();
          if (state === ST.PAUSE) togglePause();
          else if (state !== ST.RUN) start();
          return;
        }

        if (k === "r" || k === "R") {
          e.preventDefault();
          start();
        }
      }

      reset();
      draw();
      api.setStatus("READY");
      api.showOverlay({
        title: "SNAKE",
        msg: "<strong>← ↑ ↓ →</strong> 或 <strong>WASD</strong> 移动<br>吃到苹果 <strong>+10</strong> 分，速度逐渐加快<br><strong>SPACE</strong> 暂停",
        btn: "开始游戏",
        onClick: start
      });

      api.on(window, "keydown", onKey, { passive: false });

      api.loop(function (dt) {
        anim += dt;
        if (state === ST.RUN) {
          acc += dt;
          while (acc >= tickMs) {
            acc -= tickMs;
            step();
            if (state !== ST.RUN) break;
          }
        }
        draw();
      });
    }
  });
})();
