/* eslint-disable */
(function () {
  "use strict";

  var LEVELS = [
    [
      "#######",
      "#     #",
      "# .$@ #",
      "#     #",
      "#######"
    ],
    [
      "########",
      "#      #",
      "#  .   #",
      "#  $   #",
      "#  @   #",
      "########"
    ],
    [
      "#########",
      "#       #",
      "# .   . #",
      "# $   $ #",
      "#   @   #",
      "#########"
    ],
    [
      "########",
      "#  #   #",
      "#  $ . #",
      "#  @   #",
      "#      #",
      "########"
    ],
    [
      "#########",
      "#       #",
      "#  ###  #",
      "#  $ .  #",
      "#  @    #",
      "#       #",
      "#########"
    ],
    [
      "##########",
      "#        #",
      "#  .  .  #",
      "#  $  $  #",
      "#        #",
      "#   @    #",
      "##########"
    ],
    [
      "##########",
      "#        #",
      "# . . .  #",
      "# $ $ $  #",
      "#        #",
      "#   @    #",
      "##########"
    ],
    [
      "###########",
      "#         #",
      "#  . $    #",
      "#         #",
      "#    @    #",
      "#         #",
      "###########"
    ],
    [
      "###########",
      "#         #",
      "#  .   .  #",
      "#  $   $  #",
      "#         #",
      "#    @    #",
      "#         #",
      "###########"
    ],
    [
      "############",
      "#          #",
      "#  .    .  #",
      "#  $    $  #",
      "#          #",
      "#     @    #",
      "#          #",
      "############"
    ]
  ];

  function parse(rows) {
    var walls = [], goals = [], boxes = [], player = { x: 1, y: 1 };
    for (var y = 0; y < rows.length; y++) {
      walls.push([]);
      for (var x = 0; x < rows[y].length; x++) {
        var ch = rows[y].charAt(x);
        walls[y].push(ch === "#");
        if (ch === "." || ch === "*" || ch === "+") goals.push({ x: x, y: y });
        if (ch === "$" || ch === "*") boxes.push({ x: x, y: y });
        if (ch === "@" || ch === "+") player = { x: x, y: y };
      }
    }
    return { walls: walls, goals: goals, boxes: boxes, player: player };
  }

  window.Arcade.register({
    id: "sokoban",
    name: "SOKOBAN",
    cn: "推箱子",
    accent: "#ffd23f",
    desc: "把箱子推到发光的目标点，10 个关卡逐步变难。",
    keys: [
      ["← ↑ ↓ → / WASD", "移动 / 推箱"],
      ["U / Z", "撤销一步"],
      ["R", "重开本关"],
      ["ESC", "返回大厅"]
    ],
    touch: {
      a: { label: "撤销", key: "u" },
      b: { label: "重开", key: "r" },
      repeat: ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]
    },
    icon: [
      "................",
      "................",
      "..############..",
      "..#..........#..",
      "..#..######..#..",
      "..#..#....#..#..",
      "..#..#.##.#..#..",
      "..#..######..#..",
      "..#..........#..",
      "..############..",
      "................",
      "....##..........",
      "...####.........",
      "....##..........",
      "................",
      "................"
    ],
    levels: LEVELS,
    best: function () {
      var v = window.Arcade.storage.get("arcade.sokoban.high", 0) || 0;
      return v > 0 ? "LEVEL " + v : "";
    },
    mount: function (api) {
      var ctx = api.ctx;
      var walls, goals, boxes, px, py, steps, level, state, undoStack;
      var cols = 0, rows = 0, cell = 40, ox = 0, oy = 0;
      var anim = 0;

      api.setLabels("STEPS", "LEVEL");

      function pad3(n) {
        var s = String(n);
        while (s.length < 3) s = "0" + s;
        return s;
      }

      function loadLevel(idx) {
        level = idx;
        var data = parse(LEVELS[idx]);
        walls = data.walls;
        goals = data.goals;
        boxes = data.boxes;
        px = data.player.x;
        py = data.player.y;
        steps = 0;
        undoStack = [];
        state = "play";
        rows = LEVELS[idx].length;
        cols = LEVELS[idx][0].length;
        cell = Math.min(Math.floor(440 / cols), Math.floor(440 / rows), 54);
        ox = Math.floor((480 - cols * cell) / 2);
        oy = Math.floor((480 - rows * cell) / 2);
        api.setScore(steps);
        api.setStatus("LEVEL " + (idx + 1) + "/" + LEVELS.length);
        api.hideOverlay();
      }

      function startGame() {
        loadLevel(0);
      }

      function isWall(x, y) {
        if (y < 0 || y >= walls.length) return true;
        if (x < 0 || x >= walls[y].length) return true;
        return walls[y][x];
      }

      function boxAt(x, y) {
        for (var i = 0; i < boxes.length; i++) {
          if (boxes[i].x === x && boxes[i].y === y) return i;
        }
        return -1;
      }

      function goalAt(x, y) {
        for (var i = 0; i < goals.length; i++) {
          if (goals[i].x === x && goals[i].y === y) return true;
        }
        return false;
      }

      function snapshot() {
        var list = [];
        for (var i = 0; i < boxes.length; i++) {
          list.push({ x: boxes[i].x, y: boxes[i].y });
        }
        return { px: px, py: py, boxes: list, steps: steps };
      }

      function allDone() {
        for (var i = 0; i < goals.length; i++) {
          if (boxAt(goals[i].x, goals[i].y) < 0) return false;
        }
        return true;
      }

      function move(dx, dy) {
        if (state !== "play") return;
        var nx = px + dx, ny = py + dy;
        if (isWall(nx, ny)) return;

        var bi = boxAt(nx, ny);
        if (bi >= 0) {
          var bx = nx + dx, by = ny + dy;
          if (isWall(bx, by) || boxAt(bx, by) >= 0) {
            api.sfx("hit");
            return;
          }
          undoStack.push(snapshot());
          boxes[bi].x = bx;
          boxes[bi].y = by;
          api.sfx("drop");
        } else {
          undoStack.push(snapshot());
          api.sfx("move");
        }

        px = nx;
        py = ny;
        steps++;
        api.setScore(steps);

        if (allDone()) {
          state = "won";
          api.setStatus("CLEAR");
          api.sfx("win");
          api.setHigh(Math.max(api.getHigh(), level + 1));
          var next = level + 1;
          var last = next >= LEVELS.length;
          if (last) {
            api.showOverlay({
              title: "ALL CLEAR",
              msg: "10 关全部完成！<br>最终关用了 <strong>" + steps +
                "</strong> 步<br>按 <strong>ENTER</strong> 回到第一关",
              btn: "回到第一关",
              onClick: startGame
            });
          } else {
            api.showOverlay({
              title: "LEVEL CLEAR",
              msg: "第 <strong>" + (level + 1) + "</strong> 关完成 · <strong>" +
                steps + "</strong> 步<br>按 <strong>ENTER</strong> 进入下一关",
              btn: "下一关",
              onClick: function () { loadLevel(next); }
            });
          }
        }
      }

      function undo() {
        if (state !== "play" || !undoStack.length) return;
        var s = undoStack.pop();
        px = s.px;
        py = s.py;
        boxes = s.boxes;
        steps = s.steps;
        api.setScore(steps);
        api.sfx("click");
      }

      function draw() {
        ctx.fillStyle = "#0a0f0a";
        ctx.fillRect(0, 0, 480, 480);

        var x, y, r;
        // 地板
        for (y = 0; y < rows; y++) {
          for (x = 0; x < cols; x++) {
            if (walls[y][x]) continue;
            ctx.fillStyle = (x + y) % 2 === 0 ? "#0d160d" : "#0b120b";
            ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
          }
        }

        // 目标点
        for (var g = 0; g < goals.length; g++) {
          var gx = ox + goals[g].x * cell, gy = oy + goals[g].y * cell;
          var cx = gx + cell / 2, cy = gy + cell / 2;
          var pulse = 0.45 + Math.abs(Math.sin(anim / 420 + g)) * 0.4;
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.fillStyle = "#ffd23f";
          ctx.fillRect(cx - cell * 0.16, cy - 2, cell * 0.32, 4);
          ctx.fillRect(cx - 2, cy - cell * 0.16, 4, cell * 0.32);
          ctx.restore();
        }

        // 墙
        for (y = 0; y < rows; y++) {
          for (x = 0; x < cols; x++) {
            if (!walls[y][x]) continue;
            var wx = ox + x * cell, wy = oy + y * cell;
            ctx.fillStyle = "#16240f";
            ctx.fillRect(wx, wy, cell, cell);
            ctx.fillStyle = "#2b452a";
            ctx.fillRect(wx + 2, wy + 2, cell - 4, cell - 4);
            ctx.fillStyle = "#22371d";
            ctx.fillRect(wx + 4, wy + 4, cell - 8, cell - 8);
            ctx.fillStyle = "#16240f";
            ctx.fillRect(wx + 4, wy + Math.floor(cell / 2) - 1, cell - 8, 2);
            ctx.fillRect(wx + Math.floor(cell / 2) - 1, wy + 4, 2, Math.floor(cell / 2) - 5);
          }
        }

        // 箱子
        for (var b = 0; b < boxes.length; b++) {
          var bx = ox + boxes[b].x * cell, by = oy + boxes[b].y * cell;
          var onGoal = goalAt(boxes[b].x, boxes[b].y);
          var pad = Math.max(3, Math.floor(cell * 0.1));
          ctx.fillStyle = onGoal ? "#2f6b26" : "#7a4a1c";
          ctx.fillRect(bx + pad, by + pad, cell - pad * 2, cell - pad * 2);
          ctx.fillStyle = onGoal ? "#7bff5c" : "#a8763f";
          ctx.fillRect(bx + pad + 3, by + pad + 3, cell - pad * 2 - 6, cell - pad * 2 - 6);
          ctx.fillStyle = onGoal ? "#16240f" : "#5c3614";
          ctx.fillRect(bx + pad + 3, by + pad + 3, cell - pad * 2 - 6, 3);
          ctx.fillRect(bx + pad + 3, by + cell - pad - 6, cell - pad * 2 - 6, 3);
          ctx.fillRect(bx + Math.floor(cell / 2) - 2, by + pad + 6, 4, cell - pad * 2 - 12);
        }

        // 玩家
        var pxs = ox + px * cell, pys = oy + py * cell;
        var p = Math.max(3, Math.floor(cell * 0.12));
        ctx.fillStyle = "#2f6b26";
        ctx.fillRect(pxs + p, pys + p, cell - p * 2, cell - p * 2);
        ctx.fillStyle = "#7bff5c";
        ctx.fillRect(pxs + p + 2, pys + p + 2, cell - p * 2 - 4, cell - p * 2 - 4);
        ctx.fillStyle = "#16240f";
        var eye = Math.max(2, Math.floor(cell * 0.08));
        ctx.fillRect(pxs + Math.floor(cell * 0.3), pys + Math.floor(cell * 0.3), eye, eye);
        ctx.fillRect(pxs + Math.floor(cell * 0.62), pys + Math.floor(cell * 0.3), eye, eye);
        ctx.fillStyle = "#c8f5bd";
        ctx.fillRect(pxs + Math.floor(cell * 0.36), pys + Math.floor(cell * 0.55), Math.floor(cell * 0.3), eye);
      }

      function onKey(e) {
        var k = e.key;

        if (state === "won") {
          if (k === "Enter" || k === " " || k === "Spacebar") {
            e.preventDefault();
            if (level + 1 >= LEVELS.length) startGame();
            else loadLevel(level + 1);
          } else if (k === "r" || k === "R") {
            e.preventDefault();
            loadLevel(level);
          }
          return;
        }

        if (k === "ArrowUp" || k === "w" || k === "W") { e.preventDefault(); move(0, -1); }
        else if (k === "ArrowDown" || k === "s" || k === "S") { e.preventDefault(); move(0, 1); }
        else if (k === "ArrowLeft" || k === "a" || k === "A") { e.preventDefault(); move(-1, 0); }
        else if (k === "ArrowRight" || k === "d" || k === "D") { e.preventDefault(); move(1, 0); }
        else if (k === "u" || k === "U" || k === "z" || k === "Z") { e.preventDefault(); undo(); }
        else if (k === "r" || k === "R") { e.preventDefault(); loadLevel(level); }
      }

      loadLevel(0);
      draw();
      state = "play";
      api.showOverlay({
        title: "SOKOBAN",
        msg: "把所有箱子推到发光的黄色目标点<br><strong>方向键 / WASD</strong> 移动与推箱<br><strong>U</strong> 撤销 · <strong>R</strong> 重开本关",
        btn: "开始推箱",
        onClick: function () { loadLevel(level); }
      });

      api.on(window, "keydown", onKey, { passive: false });

      api.loop(function (dt) {
        anim += dt;
        draw();
      });
    }
  });
})();
