/* eslint-disable */
(function () {
  "use strict";

  var SIZE = 4, PAD = 14, GAP = 8, CELL = 107;
  var ST = { READY: 0, RUN: 1, OVER: 2, WIN: 3 };

  var TILE = {
    2: { bg: "#dff5cf", fg: "#17300f" },
    4: { bg: "#c9edb0", fg: "#17300f" },
    8: { bg: "#ffd23f", fg: "#2a2103" },
    16: { bg: "#ffa14d", fg: "#2a1503" },
    32: { bg: "#ff7a3d", fg: "#2a0f03" },
    64: { bg: "#ff5c5c", fg: "#2b0808" },
    128: { bg: "#ffd76e", fg: "#2a2103" },
    256: { bg: "#b6ff9e", fg: "#10250a" },
    512: { bg: "#7bff5c", fg: "#10250a" },
    1024: { bg: "#4de1ff", fg: "#062028" },
    2048: { bg: "#c07bff", fg: "#1c0a2b" }
  };

  window.Arcade.register({
    id: "2048",
    name: "2048",
    cn: "数字合并",
    accent: "#ffd23f",
    desc: "滑动合并相同数字，凑出 2048 方块就算通关。",
    keys: [
      ["← ↑ ↓ → / WASD", "滑动方块"],
      ["R", "重新开始"],
      ["ESC", "返回大厅"]
    ],
    touch: { b: { label: "重开", key: "r" } },
    icon: [
      "................",
      "..######..######",
      "..#....#..#....#",
      "..#....#..#....#",
      "..######..######",
      "................",
      "..######..######",
      "..#....#..#....#",
      "..#....#..#....#",
      "..######..######",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var state = ST.READY;
      var grid = [];
      var score = 0;
      var won = false;
      var high = api.getHigh();

      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      function emptyGrid() {
        grid = [];
        for (var r = 0; r < SIZE; r++) {
          var row = [];
          for (var c = 0; c < SIZE; c++) row.push(null);
          grid.push(row);
        }
      }

      function spawnTile() {
        var free = [];
        for (var r = 0; r < SIZE; r++) {
          for (var c = 0; c < SIZE; c++) {
            if (!grid[r][c]) free.push([r, c]);
          }
        }
        if (!free.length) return false;
        var pos = free[Math.floor(Math.random() * free.length)];
        grid[pos[0]][pos[1]] = { v: Math.random() < 0.9 ? 2 : 4, pop: 1 };
        return true;
      }

      function reset() {
        emptyGrid();
        score = 0;
        won = false;
        api.setScore(0);
        spawnTile();
        spawnTile();
      }

      function start() {
        reset();
        state = ST.RUN;
        api.hideOverlay();
        api.setStatus("PLAYING");
        draw(0);
      }

      function lineCoords(dir, i) {
        var list = [];
        for (var j = 0; j < SIZE; j++) {
          if (dir === 0) list.push([i, j]);
          else if (dir === 1) list.push([i, SIZE - 1 - j]);
          else if (dir === 2) list.push([j, i]);
          else list.push([SIZE - 1 - j, i]);
        }
        return list;
      }

      function hasMoves() {
        var r, c;
        for (r = 0; r < SIZE; r++) {
          for (c = 0; c < SIZE; c++) {
            if (!grid[r][c]) return true;
            if (c + 1 < SIZE && grid[r][c + 1] && grid[r][c].v === grid[r][c + 1].v) return true;
            if (r + 1 < SIZE && grid[r + 1][c] && grid[r][c].v === grid[r + 1][c].v) return true;
          }
        }
        return false;
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
          msg: "得分 <strong>" + score + "</strong> · 最大方块 <strong>" + maxValue() + "</strong><br>按 <strong>R</strong> 再来一局",
          btn: "再来一局",
          onClick: start
        });
      }

      function maxValue() {
        var m = 0;
        for (var r = 0; r < SIZE; r++) {
          for (var c = 0; c < SIZE; c++) {
            if (grid[r][c] && grid[r][c].v > m) m = grid[r][c].v;
          }
        }
        return m || 0;
      }

      function move(dir) {
        if (state !== ST.RUN) return;

        var moved = false;
        var gained = 0;
        var i, k;

        for (i = 0; i < SIZE; i++) {
          var coords = lineCoords(dir, i);
          var vals = [];
          for (k = 0; k < coords.length; k++) {
            var cell = grid[coords[k][0]][coords[k][1]];
            if (cell) vals.push(cell.v);
          }

          var out = [], merged = [];
          for (k = 0; k < vals.length; k++) {
            if (k + 1 < vals.length && vals[k] === vals[k + 1]) {
              out.push(vals[k] * 2);
              merged.push(true);
              gained += vals[k] * 2;
              k++;
            } else {
              out.push(vals[k]);
              merged.push(false);
            }
          }
          while (out.length < SIZE) {
            out.push(0);
            merged.push(false);
          }

          for (k = 0; k < SIZE; k++) {
            var rc = coords[k];
            var old = grid[rc[0]][rc[1]];
            var v = out[k];
            if (!v) {
              if (old) moved = true;
              grid[rc[0]][rc[1]] = null;
            } else {
              if (!old || old.v !== v) moved = true;
              grid[rc[0]][rc[1]] = {
                v: v,
                pop: merged[k] ? 1 : (old && old.v === v ? old.pop : 0)
              };
            }
          }
        }

        if (!moved) {
          api.sfx("move");
          return;
        }

        score += gained;
        api.setScore(score);
        if (score > high) {
          high = score;
          api.setHigh(high);
        }
        api.sfx(gained ? "point" : "move");

        spawnTile();

        var maxV = maxValue();
        if (maxV >= 2048 && !won) {
          won = true;
          state = ST.WIN;
          api.setStatus("2048!");
          api.sfx("win");
          api.showOverlay({
            title: "2048!",
            msg: "你合出了 <strong>2048</strong> 方块！<br>得分 <strong>" + score + "</strong><br>可以继续挑战更大的数字",
            btn: "继续游戏",
            onClick: function () {
              state = ST.RUN;
              api.hideOverlay();
              api.setStatus("PLAYING");
            }
          });
          return;
        }

        if (!hasMoves()) gameOver();
      }

      function drawTile(px, py, value, pop) {
        var style = TILE[value] || { bg: "#ff7bd5", fg: "#2b071f" };
        var scale = 1 + 0.1 * (pop || 0);
        var size = CELL * scale;
        var ox = px + (CELL - size) / 2;
        var oy = py + (CELL - size) / 2;

        ctx.fillStyle = style.bg;
        ctx.fillRect(ox, oy, size, size);

        ctx.fillStyle = "rgba(255,255,255,.4)";
        ctx.fillRect(ox, oy, size, 3);
        ctx.fillRect(ox, oy, 3, size);
        ctx.fillStyle = "rgba(0,0,0,.28)";
        ctx.fillRect(ox, oy + size - 4, size, 4);
        ctx.fillRect(ox + size - 4, oy, 4, size);

        var text = String(value);
        var fs = text.length <= 2 ? 40 : text.length === 3 ? 32 : text.length === 4 ? 26 : 21;
        ctx.fillStyle = style.fg;
        ctx.font = "bold " + fs + "px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, ox + size / 2, oy + size / 2 + 2);
      }

      function draw() {
        ctx.fillStyle = "#050805";
        ctx.fillRect(0, 0, 480, 480);

        ctx.fillStyle = "#121c12";
        ctx.fillRect(PAD, PAD, 480 - PAD * 2, 480 - PAD * 2);

        var r, c, px, py;

        for (r = 0; r < SIZE; r++) {
          for (c = 0; c < SIZE; c++) {
            px = PAD + c * (CELL + GAP);
            py = PAD + r * (CELL + GAP);
            ctx.fillStyle = "#0b120b";
            ctx.fillRect(px, py, CELL, CELL);
            ctx.fillStyle = "rgba(123,255,92,.05)";
            ctx.fillRect(px, py, CELL, 2);
          }
        }

        for (r = 0; r < SIZE; r++) {
          for (c = 0; c < SIZE; c++) {
            var cell = grid[r][c];
            if (!cell) continue;
            px = PAD + c * (CELL + GAP);
            py = PAD + r * (CELL + GAP);
            drawTile(px, py, cell.v, cell.pop);
          }
        }
      }

      function onKey(e) {
        var k = e.key;
        var dir = -1;

        if (k === "ArrowLeft" || k === "a" || k === "A") dir = 0;
        else if (k === "ArrowRight" || k === "d" || k === "D") dir = 1;
        else if (k === "ArrowUp" || k === "w" || k === "W") dir = 2;
        else if (k === "ArrowDown" || k === "s" || k === "S") dir = 3;

        if (dir >= 0) {
          e.preventDefault();
          if (state === ST.READY) start();
          move(dir);
          return;
        }

        if (k === "r" || k === "R") {
          e.preventDefault();
          start();
          return;
        }

        if (k === "Enter" || k === " " || k === "Spacebar") {
          if (state === ST.READY) {
            e.preventDefault();
            start();
          } else if (state === ST.OVER) {
            e.preventDefault();
            start();
          } else if (k === " ") {
            e.preventDefault();
          }
        }
      }

      reset();
      state = ST.READY;
      draw();
      api.setStatus("READY");
      api.showOverlay({
        title: "2048",
        msg: "用 <strong>方向键</strong> 或 <strong>WASD</strong> 滑动方块<br>相同数字相撞会合并<br>目标：合出 <strong>2048</strong>",
        btn: "开始游戏",
        onClick: start
      });

      api.on(window, "keydown", onKey, { passive: false });

      api.loop(function (dt) {
        var changed = false;
        for (var r = 0; r < SIZE; r++) {
          for (var c = 0; c < SIZE; c++) {
            var cell = grid[r][c];
            if (cell && cell.pop > 0) {
              cell.pop = Math.max(0, cell.pop - dt / 140);
              changed = true;
            }
          }
        }
        draw();
      });
    }
  });
})();
