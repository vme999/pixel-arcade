/* eslint-disable */
(function () {
  "use strict";

  var W = 480, H = 480;
  var ACOLS = 8, AROWS = 4;
  var AGAP_X = 50, AGAP_Y = 40;
  var ALIEN_W = 22, ALIEN_H = 16;
  var START_X = 54, START_Y = 84;
  var ROW_POINTS = [30, 20, 20, 10];
  var ROW_COLORS = ["#c07bff", "#4de1ff", "#7bff5c", "#ffd23f"];

  var ALIEN_SPRITES = [
    [
      "...#...#...",
      "....#.#....",
      "...#####...",
      "..##.#.##..",
      ".#########.",
      "#.#######.#",
      "#.#.....#.#",
      "...##.##..."
    ],
    [
      "..#.....#..",
      "...#...#...",
      "..#######..",
      ".##.###.##.",
      "###########",
      "#.#######.#",
      "..#..#..#..",
      "..##...##.."
    ],
    [
      "....###....",
      "..#######..",
      ".##.###.##.",
      "###########",
      "#.#######.#",
      "#.#.....#.#",
      "...##.##...",
      "..##...##.."
    ]
  ];

  var SHIP = [
    "......#......",
    ".....###.....",
    ".....###.....",
    "..#########..",
    ".###########.",
    "#############",
    "#############",
    "##..#####..##"
  ];

  var ST = { READY: 0, RUN: 1, PAUSE: 2, OVER: 3 };

  window.Arcade.register({
    id: "invaders",
    name: "INVADERS",
    cn: "太空侵略者",
    accent: "#c07bff",
    desc: "操控像素战机击落外星舰队，别让它们压到防线。",
    keys: [
      ["← → / A D", "移动"],
      ["SPACE", "射击 / 开始"],
      ["P", "暂停"],
      ["R", "重开"],
      ["ESC", "返回大厅"]
    ],
    touch: { a: { label: "射击", key: " " } },
    icon: [
      "................",
      "................",
      ".....######.....",
      "....########....",
      "...##..##..##...",
      "...##########...",
      "...##.####.##...",
      "...##########...",
      "....##.##.##....",
      ".....######.....",
      "....##....##....",
      "................",
      "................",
      ".....######.....",
      "................",
      "................"
    ],
    mount: function (api) {
      var ctx = api.ctx;
      var state = ST.READY;
      var aliens = [];
      var player = { x: W / 2 - 13, y: 436, w: 26, h: 16 };
      var playerBullets = [];
      var enemyBullets = [];
      var lives = 3;
      var score = 0;
      var wave = 1;
      var groupX = START_X;
      var groupY = START_Y;
      var dir = 1;
      var stepAcc = 0;
      var fireTimer = 1200;
      var high = api.getHigh();
      var leftHeld = false;
      var rightHeld = false;
      var anim = 0;
      var stars = [];

      api.setLabels("SCORE", "HI");
      api.setScore(0);
      api.setHigh(high);

      for (var i = 0; i < 26; i++) {
        stars.push({
          x: Math.floor(Math.random() * W),
          y: Math.floor(Math.random() * (H - 120)) + 40,
          a: Math.random() * 0.5 + 0.15
        });
      }

      function buildAliens() {
        aliens = [];
        for (var r = 0; r < AROWS; r++) {
          for (var c = 0; c < ACOLS; c++) {
            aliens.push({ row: r, col: c, alive: true, type: r % 3 });
          }
        }
      }

      function aliveCount() {
        var n = 0;
        for (var i = 0; i < aliens.length; i++) if (aliens[i].alive) n++;
        return n;
      }

      function alienRect(a) {
        return {
          x: groupX + a.col * AGAP_X,
          y: groupY + a.row * AGAP_Y,
          w: ALIEN_W,
          h: ALIEN_H
        };
      }

      function reset() {
        buildAliens();
        player.x = W / 2 - 13;
        playerBullets = [];
        enemyBullets = [];
        lives = 3;
        score = 0;
        wave = 1;
        groupX = START_X;
        groupY = START_Y;
        dir = 1;
        stepAcc = 0;
        fireTimer = 1200;
        api.setScore(0);
      }

      function start() {
        reset();
        state = ST.RUN;
        api.hideOverlay();
        api.setStatus("WAVE 1");
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
          api.setStatus("WAVE " + wave);
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
          msg: "得分 <strong>" + score + "</strong> · 到达第 <strong>" + wave + "</strong> 波<br>按 <strong>ENTER</strong> 再来一局",
          btn: "再来一局",
          onClick: start
        });
      }

      function nextWave() {
        wave++;
        buildAliens();
        groupX = START_X;
        groupY = START_Y + Math.min(wave - 1, 4) * 8;
        dir = 1;
        stepAcc = 0;
        playerBullets = [];
        enemyBullets = [];
        fireTimer = 1000;
        api.sfx("win");
        api.setStatus("WAVE " + wave);
      }

      function loseLife() {
        lives--;
        api.sfx("boom");
        enemyBullets = [];
        if (lives <= 0) {
          gameOver();
        } else {
          api.setStatus("LIVES " + lives);
        }
      }

      function shoot() {
        if (state !== ST.RUN) return;
        if (playerBullets.length >= 3) return;
        playerBullets.push({ x: player.x + player.w / 2 - 1.5, y: player.y - 8 });
        api.sfx("shoot");
      }

      function hitPlayer(a) {
        return a.x < player.x + player.w && a.x + a.w > player.x &&
          a.y < player.y + player.h && a.y + a.h > player.y;
      }

      function update(dt) {
        var sec = dt / 1000;

        // 玩家移动
        var move = 0;
        if (leftHeld) move -= 1;
        if (rightHeld) move += 1;
        player.x += move * 280 * sec;
        player.x = Math.max(10, Math.min(W - 10 - player.w, player.x));

        // 编队步进
        var alive = aliveCount();
        var stepMs = Math.max(120, 720 - (32 - alive) * 20 - (wave - 1) * 70);
        stepAcc += dt;
        if (stepAcc >= stepMs) {
          stepAcc -= stepMs;

          var minCol = 99, maxCol = -1;
          for (var i = 0; i < aliens.length; i++) {
            if (!aliens[i].alive) continue;
            if (aliens[i].col < minCol) minCol = aliens[i].col;
            if (aliens[i].col > maxCol) maxCol = aliens[i].col;
          }
          if (maxCol >= 0) {
            var left = groupX + minCol * AGAP_X;
            var right = groupX + maxCol * AGAP_X + ALIEN_W;
            if ((dir > 0 && right + 10 > W - 10) || (dir < 0 && left - 10 < 10)) {
              dir *= -1;
              groupY += 18;
            } else {
              groupX += dir * 10;
            }

            var bottom = groupY + (AROWS - 1) * AGAP_Y + ALIEN_H;
            if (bottom >= player.y - 4) {
              gameOver();
              return;
            }
          }
        }

        // 外星人开火
        fireTimer -= dt;
        if (fireTimer <= 0 && state === ST.RUN) {
          var shooters = [];
          for (var s = 0; s < aliens.length; s++) if (aliens[s].alive) shooters.push(aliens[s]);
          if (shooters.length && enemyBullets.length < 5) {
            var shooter = shooters[Math.floor(Math.random() * shooters.length)];
            var rect = alienRect(shooter);
            enemyBullets.push({ x: rect.x + ALIEN_W / 2 - 2, y: rect.y + ALIEN_H, w: 4, h: 10 });
          }
          fireTimer = Math.max(320, 1250 - (32 - alive) * 24) + Math.random() * 300;
        }

        // 子弹移动
        var b;
        for (b = playerBullets.length - 1; b >= 0; b--) {
          playerBullets[b].y -= 540 * sec;
          if (playerBullets[b].y < 28) playerBullets.splice(b, 1);
        }
        for (b = enemyBullets.length - 1; b >= 0; b--) {
          enemyBullets[b].y += 250 * sec;
          if (enemyBullets[b].y > H) enemyBullets.splice(b, 1);
        }

        // 子弹 vs 外星人
        for (var pb = playerBullets.length - 1; pb >= 0; pb--) {
          var bullet = playerBullets[pb];
          var hit = false;
          for (var a = 0; a < aliens.length; a++) {
            if (!aliens[a].alive) continue;
            var r = alienRect(aliens[a]);
            if (bullet.x < r.x + r.w && bullet.x + 3 > r.x && bullet.y < r.y + r.h && bullet.y + 12 > r.y) {
              aliens[a].alive = false;
              hit = true;
              score += ROW_POINTS[aliens[a].row];
              api.setScore(score);
              if (score > high) {
                high = score;
                api.setHigh(high);
              }
              api.sfx("drop");
              break;
            }
          }
          if (hit) playerBullets.splice(pb, 1);
        }

        // 外星人子弹 vs 玩家
        for (var eb = enemyBullets.length - 1; eb >= 0; eb--) {
          var ebObj = enemyBullets[eb];
          if (ebObj.x < player.x + player.w && ebObj.x + ebObj.w > player.x &&
              ebObj.y < player.y + player.h && ebObj.y + ebObj.h > player.y) {
            enemyBullets.splice(eb, 1);
            loseLife();
            if (state !== ST.RUN) return;
          }
        }

        // 清波
        if (aliveCount() === 0) {
          nextWave();
        }
      }

      function drawBitmap(rows, x, y, color, scale) {
        ctx.fillStyle = color;
        for (var r = 0; r < rows.length; r++) {
          for (var c = 0; c < rows[r].length; c++) {
            if (rows[r].charAt(c) === "#") {
              ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
            }
          }
        }
      }

      function draw() {
        ctx.fillStyle = "#050805";
        ctx.fillRect(0, 0, W, H);

        for (var i = 0; i < stars.length; i++) {
          ctx.fillStyle = "rgba(123,255,92," + stars[i].a.toFixed(2) + ")";
          ctx.fillRect(stars[i].x, stars[i].y, 2, 2);
        }

        // 外星人
        for (var a = 0; a < aliens.length; a++) {
          if (!aliens[a].alive) continue;
          var rect = alienRect(aliens[a]);
          drawBitmap(ALIEN_SPRITES[aliens[a].type], rect.x, rect.y, ROW_COLORS[aliens[a].row], 2);
        }

        // 玩家子弹
        ctx.fillStyle = "#d6ffc6";
        for (var pb = 0; pb < playerBullets.length; pb++) {
          ctx.fillRect(playerBullets[pb].x, playerBullets[pb].y, 3, 12);
        }

        // 敌方子弹
        ctx.fillStyle = "#ff9a9a";
        for (var eb = 0; eb < enemyBullets.length; eb++) {
          ctx.fillRect(enemyBullets[eb].x, enemyBullets[eb].y, 4, 10);
          ctx.fillStyle = "#ff4d4d";
          ctx.fillRect(enemyBullets[eb].x + 1, enemyBullets[eb].y + 2, 2, 6);
          ctx.fillStyle = "#ff9a9a";
        }

        // 玩家
        drawBitmap(SHIP, player.x, player.y, "#7bff5c", 2);
        if (Math.floor(anim / 120) % 2 === 0) {
          ctx.fillStyle = "#ffd23f";
          ctx.fillRect(player.x + 9, player.y + 16, 8, 4);
        }

        // 底部防线
        ctx.fillStyle = "#2b452a";
        ctx.fillRect(0, H - 6, W, 6);

        // HUD
        for (var l = 0; l < lives; l++) {
          drawBitmap(SHIP, 12 + l * 30, 12, "#7bff5c", 1);
        }

        ctx.fillStyle = "#3f7a33";
        ctx.font = "10px ui-monospace, Menlo, Consolas, monospace";
        ctx.textAlign = "right";
        ctx.textBaseline = "top";
        ctx.fillText("WAVE " + wave, W - 14, 14);
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
          if (state === ST.READY || state === ST.OVER) start();
          else if (state === ST.PAUSE) togglePause();
          else shoot();
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
        title: "INVADERS",
        msg: "<strong>← →</strong> 或 <strong>A D</strong> 移动战机<br><strong>SPACE</strong> 射击 · <strong>P</strong> 暂停<br>消灭整支舰队进入下一波",
        btn: "开始游戏",
        onClick: start
      });

      api.on(window, "keydown", onKeyDown, { passive: false });
      api.on(window, "keyup", onKeyUp);

      api.loop(function (dt) {
        anim += dt;
        if (state === ST.RUN) update(dt);
        draw();
      });
    }
  });
})();
