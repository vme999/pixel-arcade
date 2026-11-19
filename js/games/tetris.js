/* eslint-disable */
(function () {
  "use strict";

  var COLS = 10, ROWS = 20, CELL = 24, BX = 32;
  var PANEL_X = 288;

  var SHAPES = {
    I: [[1, 1, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
    O: [[1, 1], [1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    T: [[0, 1, 0], [1, 1, 1]],
    Z: [[1, 1, 0], [0, 1, 1]]
  };

  var COLORS = {
    I: "#4de1ff", J: "#5c8cff", L: "#ffa14d", O: "#ffd23f",
    S: "#7bff5c", T: "#c07bff", Z: "#ff5c5c"
  };

  var ST = { READY: 0, RUN: 1, PAUSE: 2, OVER: 3 };

  window.Arcade.register({
    id: "tetris",
    name: "TETRIS",
    cn: "俄罗斯方块",
    accent: "#4de1ff",
    desc: "旋转并堆叠下落的方块，填满一行即可消除，速度会越来越快。",
    keys: [
      ["← →", "移动"],
      ["↓", "软降"],
      ["↑ / X", "顺时针旋转"],
      ["Z", "逆时针旋转"],
      ["SPACE", "硬降"],
      ["P", "暂停"],
      ["R", "重开"]
    ],
    touch: {
      a: { label: "旋转", key: "ArrowUp" },
      b: { label: "落底", key: " " },
      repeat: ["ArrowLeft", "ArrowRight", "ArrowDown"]
    },
    icon: [
      "................",
      "................",
      "....####........",
      ".....####.......",
      "....####........",
      "................",
      "..##............",
      "..##....##......",
      "........##......",
      "........##......",
      "................",
      "................",
      "..############..",
      "..############..",
      "..############..",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var state = ST.READY;
      var board = [];
      var bag = [];
      var piece = null;
      var nextKey = null;
      var score = 0;
      var lines = 0;
      var level = 1;
      var dropAcc = 0;
      var high = api.getHigh();

      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      function emptyBoard() {
        board = [];
        for (var y = 0; y < ROWS; y++) {
          var row = [];
          for (var x = 0; x < COLS; x++) row.push(null);
          board.push(row);
        }
      }

      function nextFromBag() {
        if (!bag.length) {
          var keys = Object.keys(SHAPES);
          for (var i = keys.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var t = keys[i]; keys[i] = keys[j]; keys[j] = t;
          }
          bag = keys;
        }
        return bag.pop();
      }

      function makePiece(key) {
        var m = SHAPES[key].map(function (r) { return r.slice(); });
        return { key: key, m: m, x: Math.floor((COLS - m[0].length) / 2), y: 0 };
      }

      function collides(m, px, py) {
        for (var y = 0; y < m.length; y++) {
          for (var x = 0; x < m[y].length; x++) {
            if (!m[y][x]) continue;
            var bx = px + x, by = py + y;
            if (bx < 0 || bx >= COLS || by >= ROWS) return true;
            if (by >= 0 && board[by][bx]) return true;
          }
        }
        return false;
      }

      function spawn() {
        piece = makePiece(nextKey || nextFromBag());
        nextKey = nextFromBag();
        dropAcc = 0;
        if (collides(piece.m, piece.x, piece.y)) {
          gameOver();
        }
      }

      function reset() {
        emptyBoard();
        bag = [];
        nextKey = nextFromBag();
        score = 0;
        lines = 0;
        level = 1;
        dropAcc = 0;
        api.setScore(0);
        spawn();
      }

      function start() {
        reset();
        state = ST.RUN;
        api.hideOverlay();
        api.setStatus("LEVEL 1");
      }

      function togglePause() {
        if (state === ST.RUN) {
          state = ST.PAUSE;
          api.setStatus("PAUSED");
          api.showOverlay({
            title: "PAUSED",
            msg: "<strong>P</strong> 继续 · <strong>R</strong> 重新开始",
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
          msg: "得分 <strong>" + score + "</strong> · 消除 <strong>" + lines + "</strong> 行<br>按 <strong>ENTER</strong> 再来一局",
          btn: "再来一局",
          onClick: start
        });
      }

      function lockPiece() {
        var p = piece;
        for (var y = 0; y < p.m.length; y++) {
          for (var x = 0; x < p.m[y].length; x++) {
            if (p.m[y][x] && p.y + y >= 0) board[p.y + y][p.x + x] = p.key;
          }
        }
        api.sfx("lock");

        var cleared = 0;
        for (var r = ROWS - 1; r >= 0; r--) {
          var full = true;
          for (var c = 0; c < COLS; c++) {
            if (!board[r][c]) { full = false; break; }
          }
          if (full) {
            board.splice(r, 1);
            var empty = [];
            for (var i = 0; i < COLS; i++) empty.push(null);
            board.unshift(empty);
            cleared++;
            r++;
          }
        }

        if (cleared > 0) {
          var pts = [0, 100, 300, 500, 800][cleared] * level;
          score += pts;
          lines += cleared;
          level = 1 + Math.floor(lines / 10);
          api.setScore(score);
          api.sfx("clear");
          api.setStatus("LEVEL " + level);
          if (score > high) {
            high = score;
            api.setHigh(high);
          }
        }

        spawn();
      }

      function tryMove(dx, dy) {
        if (!piece) return false;
        if (!collides(piece.m, piece.x + dx, piece.y + dy)) {
          piece.x += dx;
          piece.y += dy;
          return true;
        }
        return false;
      }

      function rotatePiece(cw) {
        if (!piece) return;
        var m = piece.m;
        var R = m.length, C = m[0].length;
        var out = [];
        var y, x;
        for (y = 0; y < C; y++) {
          var row = [];
          for (x = 0; x < R; x++) row.push(0);
          out.push(row);
        }
        for (y = 0; y < R; y++) {
          for (x = 0; x < C; x++) {
            if (cw) out[x][R - 1 - y] = m[y][x];
            else out[C - 1 - x][y] = m[y][x];
          }
        }
        var kicks = [0, -1, 1, -2, 2];
        for (var i = 0; i < kicks.length; i++) {
          if (!collides(out, piece.x + kicks[i], piece.y)) {
            piece.m = out;
            piece.x += kicks[i];
            api.sfx("turn");
            return;
          }
        }
      }

      function ghostY() {
        if (!piece) return 0;
        var gy = piece.y;
        while (!collides(piece.m, piece.x, gy + 1)) gy++;
        return gy;
      }

      function hardDrop() {
        if (!piece) return;
        var cells = 0;
        while (!collides(piece.m, piece.x, piece.y + 1)) {
          piece.y++;
          cells++;
        }
        score += cells * 2;
        api.setScore(score);
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        api.sfx("drop");
        lockPiece();
      }

      function drawBlock(px, py, size, color, alpha) {
        ctx.globalAlpha = alpha == null ? 1 : alpha;
        ctx.fillStyle = color;
        ctx.fillRect(px, py, size, size);
        ctx.fillStyle = "rgba(255,255,255,.32)";
        ctx.fillRect(px, py, size - 2, 3);
        ctx.fillRect(px, py, 3, size - 2);
        ctx.fillStyle = "rgba(0,0,0,.34)";
        ctx.fillRect(px + size - 3, py + 3, 3, size - 3);
        ctx.fillRect(px + 3, py + size - 3, size - 3, 3);
        ctx.globalAlpha = 1;
      }

      function drawPanel() {
        ctx.fillStyle = "#0a0f0a";
        ctx.fillRect(PANEL_X, 24, 184, 148);
        ctx.strokeStyle = "#2b452a";
        ctx.lineWidth = 2;
        ctx.strokeRect(PANEL_X + 1, 25, 182, 146);

        ctx.fillStyle = "#3f7a33";
        ctx.font = "10px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText("NEXT", PANEL_X + 10, 0);

        if (nextKey) {
          var m = SHAPES[nextKey];
          var w = m[0].length, h = m.length;
          var cs = 18;
          var ox = PANEL_X + (184 - w * cs) / 2;
          var oy = 54 + (88 - h * cs) / 2;
          for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
              if (m[y][x]) drawBlock(ox + x * cs, oy + y * cs, cs, COLORS[nextKey]);
            }
          }
        }

        ctx.fillStyle = "#3f7a33";
        ctx.font = "10px ui-monospace, Menlo, Consolas, monospace";
        ctx.fillText("LEVEL", PANEL_X + 10, 196);
        ctx.fillText("LINES", PANEL_X + 10, 250);

        ctx.fillStyle = "#ffd23f";
        ctx.font = "22px ui-monospace, Menlo, Consolas, monospace";
        ctx.fillText(String(level), PANEL_X + 10, 212);
        ctx.fillStyle = "#7bff5c";
        ctx.fillText(String(lines), PANEL_X + 10, 266);

        ctx.fillStyle = "#2f4a2a";
        ctx.font = "9px ui-monospace, Menlo, Consolas, monospace";
        ctx.fillText("P  PAUSE", PANEL_X + 10, 320);
        ctx.fillText("R  RESTART", PANEL_X + 10, 338);
        ctx.fillText("Z  ROTATE CCW", PANEL_X + 10, 356);
      }

      function draw() {
        ctx.fillStyle = "#050805";
        ctx.fillRect(0, 0, 480, 480);

        // 棋盘
        ctx.fillStyle = "#0a0f0a";
        ctx.fillRect(BX, 0, COLS * CELL, ROWS * CELL);

        ctx.fillStyle = "#121c12";
        for (var gx = 1; gx < COLS; gx++) ctx.fillRect(BX + gx * CELL, 0, 1, ROWS * CELL);
        for (var gy = 1; gy < ROWS; gy++) ctx.fillRect(BX, gy * CELL, COLS * CELL, 1);

        var y, x;
        for (y = 0; y < ROWS; y++) {
          for (x = 0; x < COLS; x++) {
            if (board[y][x]) drawBlock(BX + x * CELL, y * CELL, CELL, COLORS[board[y][x]]);
          }
        }

        if (piece) {
          var gy2 = ghostY();
          for (y = 0; y < piece.m.length; y++) {
            for (x = 0; x < piece.m[y].length; x++) {
              if (piece.m[y][x]) {
                drawBlock(BX + (piece.x + x) * CELL, (gy2 + y) * CELL, CELL, COLORS[piece.key], 0.18);
              }
            }
          }
          for (y = 0; y < piece.m.length; y++) {
            for (x = 0; x < piece.m[y].length; x++) {
              if (piece.m[y][x]) {
                drawBlock(BX + (piece.x + x) * CELL, (piece.y + y) * CELL, CELL, COLORS[piece.key]);
              }
            }
          }
        }

        // 边框
        ctx.fillStyle = "#2b452a";
        ctx.fillRect(BX - 4, 0, 4, 480);
        ctx.fillRect(BX + COLS * CELL, 0, 4, 480);

        drawPanel();
      }

      function onKey(e) {
        var k = e.key;

        if (k === "ArrowLeft" || k === "a" || k === "A") {
          e.preventDefault();
          if (state === ST.RUN) tryMove(-1, 0);
          return;
        }
        if (k === "ArrowRight" || k === "d" || k === "D") {
          e.preventDefault();
          if (state === ST.RUN) tryMove(1, 0);
          return;
        }
        if (k === "ArrowDown" || k === "s" || k === "S") {
          e.preventDefault();
          if (state === ST.RUN) {
            if (tryMove(0, 1)) {
              score += 1;
              api.setScore(score);
            }
          }
          return;
        }
        if (k === "ArrowUp" || k === "x" || k === "X") {
          e.preventDefault();
          if (state === ST.RUN) rotatePiece(true);
          return;
        }
        if (k === "z" || k === "Z") {
          e.preventDefault();
          if (state === ST.RUN) rotatePiece(false);
          return;
        }
        if (k === " " || k === "Spacebar") {
          e.preventDefault();
          if (state === ST.RUN) hardDrop();
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

      emptyBoard();
      nextKey = nextFromBag();
      spawn();
      draw();
      state = ST.READY;
      api.setStatus("READY");
      api.showOverlay({
        title: "TETRIS",
        msg: "<strong>← →</strong> 移动 · <strong>↑ / Z</strong> 旋转<br><strong>↓</strong> 软降 · <strong>SPACE</strong> 硬降<br><strong>P</strong> 暂停",
        btn: "开始游戏",
        onClick: start
      });

      api.on(window, "keydown", onKey, { passive: false });

      api.loop(function (dt) {
        if (state === ST.RUN && piece) {
          var interval = Math.max(70, 820 - (level - 1) * 75);
          dropAcc += dt;
          while (dropAcc >= interval) {
            dropAcc -= interval;
            if (!tryMove(0, 1)) {
              lockPiece();
              if (state !== ST.RUN || !piece) break;
            }
          }
        }
        draw();
      });
    }
  });
})();
