# PIXEL ARCADE

A pixel-art collection of 12 classic arcade mini-games. Pure static HTML, CSS and JavaScript — no build step, no dependencies — with keyboard support and on-screen controls for phones.

## Games

Snake · Tetris · Breakout · 2048 · Minesweeper · Space Invaders
Flappy Pixel · Whack-a-Mole · Tank Battle · Sokoban · Star Raider · Pixel Run

## Controls

- Keyboard: Arrow keys or WASD to move, Enter or Space to confirm, R to restart, Esc to return to the lobby
- Touch: a D-pad and A/B action buttons appear automatically on phones, and their labels adapt to each game

## Run locally

Open `index.html` directly, or serve it with any static server:

```bash
python3 -m http.server 8080
```

## Project structure

```
index.html        page markup
style.css         cabinet and mobile styles
manifest.json     PWA manifest (add to home screen)
js/core.js        game registry, save data, sound effects
js/main.js        lobby, overlay, virtual controls
js/games/*.js     the 12 games
```

## Deployment

This repository is self-contained and is published with GitHub Pages. Push to `main` to update the live site.

- Live: https://vme999.github.io/pixel-arcade/
