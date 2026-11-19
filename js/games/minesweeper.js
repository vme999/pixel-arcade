/* eslint-disable */
(function () {
  "use strict";

  var N = 12, CELL = 40, MINES = 24;

  var NUM_COLORS = {
    1: "#4de1ff", 2: "#7bff5c", 3: "#ffd23f", 4: "#ff9a3d",
    5: "#ff5c5c", 6: "#4dc3ff", 7: "#c07bff", 8: "#c8f5bd"
  };

  window.Arcade.register({
    id: "minesweeper",
    name: "MINESWEEPER",
    cn: "扫雷",
    accent: "#ff5c5c",
    desc: "用提示数字推理雷区位置，标记全部地雷并翻开安全格。",
    keys: [
      ["← ↑ ↓ →", "移动光标"],
      ["ENTER / SPACE", "翻开"],
      ["F", "插旗"],
      ["R", "重开"],
      ["ESC", "返回大厅"]
    ],
    best: function () {
      var b = window.Arcade.storage.get("arcade.minesweeper.best", 0) || 0;
      return b > 0 ? "BEST " + Math.round(b) + "s" : "";
    },
    touch: {
      a: { label: "翻开", key: "Enter" },
      b: { label: "插旗", key: "f" },
      repeat: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]
    },
    icon: [
      "................",
      "................",
      "................",
      ".....##..##.....",
      "....########....",
      "...##########...",
      "...##..##..##...",
      "...##########...",
      "....########....",
      ".....##..##.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var grid = [];
      var cursor = { x: 5, y: 5 };
      var started = false;
      var over = false;
      var won = false;
      var flags = 0;
      var revealed = 0;
      var time = 0;
      var overlayOpen = true;
      var blink = 0;
      var best = window.Arcade.storage.get("arcade.minesweeper.best", 0) || 0;

      api.setLabels("MINES", "BEST");
      api.setScore(MINES);
      api.setHighText(best > 0 ? fmtTime(best) : "--");

      function fmtTime(seconds) {
        var s = Math.max(0, Math.round(seconds));
        return s + "s";
      }

      function emptyGrid() {
        grid = [];
        for (var y = 0; y < N; y++) {
          var row = [];
          for (var x = 0; x < N; x++) {
            row.push({ mine: false, count: 0, revealed: false, flag: false });
          }
          grid.push(row);
        }
      }

      function neighbors(x, y) {
        var list = [];
        for (var dy = -1; dy <= 1; dy++) {
          for (var dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            var nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < N && ny >= 0 && ny < N) list.push([nx, ny]);
          }
        }
        return list;
      }

      function placeMines(safeX, safeY) {
        var cells = [];
        for (var y = 0; y < N; y++) {
          for (var x = 0; x < N; x++) {
            var dx = Math.abs(x - safeX), dy = Math.abs(y - safeY);
            if (dx <= 1 && dy <= 1) continue;
            cells.push([x, y]);
          }
        }
        for (var i = cells.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = cells[i]; cells[i] = cells[j]; cells[j] = t;
        }
        for (var k = 0; k < MINES && k < cells.length; k++) {
          grid[cells[k][1]][cells[k][0]].mine = true;
        }
        for (y = 0; y < N; y++) {
          for (x = 0; x < N; x++) {
            if (grid[y][x].mine) continue;
            var n = 0;
            var ns = neighbors(x, y);
            for (var m = 0; m < ns.length; m++) {
              if (grid[ns[m][1]][ns[m][0]].mine) n++;
            }
            grid[y][x].count = n;
          }
        }
      }

      function reset() {
        emptyGrid();
        cursor = { x: 5, y: 5 };
        started = false;
        over = false;
        won = false;
        flags = 0;
        revealed = 0;
        time = 0;
        api.setScore(MINES);
        api.setStatus("READY");
      }

      function begin() {
        overlayOpen = false;
        api.hideOverlay();
      }

      function restart() {
        reset();
        begin();
      }

      function countFlags() {
        var n = 0;
        for (var y = 0; y < N; y++) {
          for (var x = 0; x < N; x++) {
            if (grid[y][x].flag) n++;
          }
        }
        return n;
      }

      function revealFlood(sx, sy) {
        var stack = [[sx, sy]];
        while (stack.length) {
          var p = stack.pop();
          var x = p[0], y = p[1];
          var cell = grid[y][x];
          if (cell.revealed || cell.flag) continue;
          cell.revealed = true;
          revealed++;
          if (cell.count === 0 && !cell.mine) {
            var ns = neighbors(x, y);
            for (var i = 0; i < ns.length; i++) {
              if (!grid[ns[i][1]][ns[i][0]].revealed) stack.push(ns[i]);
            }
          }
        }
      }

      function openCell(x, y) {
        if (over || won) return;
        var cell = grid[y][x];
        if (cell.revealed || cell.flag) return;

        if (!started) {
          placeMines(x, y);
          started = true;
          begin();
          api.setStatus("PLAYING");
        }

        if (cell.mine) {
          over = true;
          cell.revealed = true;
          api.sfx("boom");
          api.setStatus("BOOM");
          api.showOverlay({
            title: "BOOM",
            msg: "踩到地雷了！<br>按 <strong>R</strong> 再来一局",
            btn: "再来一局",
            onClick: restart
          });
          return;
        }

        revealFlood(x, y);
        api.sfx("click");
        checkWin();
      }

      function checkWin() {
        if (revealed >= N * N - MINES) {
          won = true;
          api.setStatus("CLEARED");
          api.sfx("win");
          for (var y = 0; y < N; y++) {
            for (var x = 0; x < N; x++) {
              if (grid[y][x].mine) grid[y][x].flag = true;
            }
          }
          flags = MINES;
          api.setScore(0);
          var secs = time / 1000;
          if (!best || secs < best) {
            best = secs;
            window.Arcade.storage.set("arcade.minesweeper.best", best);
          }
          api.setHighText(fmtTime(best));
          api.showOverlay({
            title: "CLEARED!",
            msg: "排雷完成，用时 <strong>" + fmtTime(secs) + "</strong><br>最佳 <strong>" + fmtTime(best) + "</strong><br>按 <strong>R</strong> 再来一局",
            btn: "再来一局",
            onClick: restart
          });
        }
      }

      function toggleFlag(x, y) {
        if (over || won) return;
        var cell = grid[y][x];
        if (cell.revealed) return;
        cell.flag = !cell.flag;
        flags = countFlags();
        api.setScore(Math.max(0, MINES - flags));
        api.sfx("turn");
      }

      function drawCell(x, y) {
        var cell = grid[y][x];
        var px = x * CELL, py = y * CELL;

        if (!cell.revealed) {
          ctx.fillStyle = "#22331f";
          ctx.fillRect(px, py, CELL, CELL);
          ctx.fillStyle = "#3a5636";
          ctx.fillRect(px, py, CELL, 3);
          ctx.fillRect(px, py, 3, CELL);
          ctx.fillStyle = "#101a0f";
          ctx.fillRect(px, py + CELL - 3, CELL, 3);
          ctx.fillRect(px + CELL - 3, py, 3, CELL);

          if (cell.flag) {
            ctx.fillStyle = "#c8f5bd";
            ctx.fillRect(px + 18, py + 10, 4, 20);
            ctx.fillStyle = "#ff4d4d";
            ctx.beginPath();
            ctx.moveTo(px + 12, py + 11);
            ctx.lineTo(px + 30, py + 17);
            ctx.lineTo(px + 12, py + 23);
            ctx.closePath();
            ctx.fill();
          }
          return;
        }

        ctx.fillStyle = "#0b110b";
        ctx.fillRect(px, py, CELL, CELL);
        ctx.strokeStyle = "#172117";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, CELL - 1, CELL - 1);

        if (cell.mine) {
          ctx.fillStyle = "#ff4d4d";
          ctx.fillRect(px + 14, py + 14, 12, 12);
          ctx.fillStyle = "#ff9a9a";
          ctx.fillRect(px + 17, py + 17, 4, 4);
          ctx.fillStyle = "#7a1f1f";
          ctx.fillRect(px + 10, py + 13, 20, 3);
          ctx.fillRect(px + 10, py + 24, 20, 3);
          ctx.fillRect(px + 13, py + 10, 3, 20);
          ctx.fillRect(px + 24, py + 10, 3, 20);
        } else if (cell.count > 0) {
          ctx.fillStyle = NUM_COLORS[cell.count] || "#c8f5bd";
          ctx.font = "bold 20px ui-monospace, Menlo, Consolas, monospace";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(cell.count), px + CELL / 2, py + CELL / 2 + 1);
        } else {
          ctx.fillStyle = "#1a271a";
          ctx.fillRect(px + 18, py + 18, 4, 4);
        }
      }

      function draw() {
        ctx.fillStyle = "#050805";
        ctx.fillRect(0, 0, 480, 480);

        for (var y = 0; y < N; y++) {
          for (var x = 0; x < N; x++) drawCell(x, y);
        }

        if (!over && !won) {
          var px = cursor.x * CELL, py = cursor.y * CELL;
          ctx.strokeStyle = "#ffd23f";
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, CELL - 2, CELL - 2);
        }
      }

      function onKey(e) {
        var k = e.key;
        var handled = true;

        if (k === "ArrowLeft" || k === "a" || k === "A") cursor.x = Math.max(0, cursor.x - 1);
        else if (k === "ArrowRight" || k === "d" || k === "D") cursor.x = Math.min(N - 1, cursor.x + 1);
        else if (k === "ArrowUp" || k === "w" || k === "W") cursor.y = Math.max(0, cursor.y - 1);
        else if (k === "ArrowDown" || k === "s" || k === "S") cursor.y = Math.min(N - 1, cursor.y + 1);
        else if (k === "Enter" || k === " " || k === "Spacebar") {
          if (overlayOpen) begin();
          else openCell(cursor.x, cursor.y);
        }
        else if (k === "f" || k === "F") {
          if (overlayOpen) begin();
          else toggleFlag(cursor.x, cursor.y);
        }
        else if (k === "r" || k === "R") restart();
        else handled = false;

        if (handled) e.preventDefault();
      }

      function onMouseDown(e) {
        if (overlayOpen) return;
        var p = window.Arcade.pointer(e, api.canvas);
        var x = Math.floor(p.x / CELL), y = Math.floor(p.y / CELL);
        if (x < 0 || x >= N || y < 0 || y >= N) return;
        cursor.x = x;
        cursor.y = y;
        if (e.button === 2) toggleFlag(x, y);
        else if (e.button === 0) {
          e.preventDefault();
          openCell(x, y);
        }
      }

      function onContext(e) { e.preventDefault(); }

      reset();
      draw();
      api.showOverlay({
        title: "MINESWEEPER",
        msg: "<strong>← ↑ ↓ →</strong> 移动光标 · <strong>ENTER</strong> 翻开<br><strong>F</strong> 或右键插旗，数字表示周围雷数<br>首次翻开会避开地雷",
        btn: "开始游戏",
        onClick: begin
      });

      api.on(window, "keydown", onKey, { passive: false });
      api.on(api.canvas, "mousedown", onMouseDown);
      api.on(api.canvas, "contextmenu", onContext);

      api.loop(function (dt) {
        blink += dt;
        if (started && !over && !won) {
          time += dt;
          api.setStatus("TIME " + Math.floor(time / 1000) + "s");
        }
        draw();
      });
    }
  });
})();
