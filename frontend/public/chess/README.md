# Chess Game

A chess game owned by team member **shayan** for the ForgeFlow AI platform.

## Purpose

A self-contained chess project that lives entirely inside this directory. It implements
the full rules of chess — legal move generation, castling, en passant, promotion, check,
checkmate, and stalemate detection — plus move history in SAN notation and a built-in
computer opponent with a small alpha-beta lookahead.

The project integrates with the shared platform through the generic project
runner/preview surface only (`data/projects/shayan-chess-game.json` plus the typed
`project.json` manifest in this directory). No shared Core component, route, or
stylesheet depends on this project, and no per-student logic exists in Core.

## Structure

```text
projects/shayan/chess-game/
├── project.json            # typed manifest (static-web / static-site-v1)
├── README.md               # this document
├── index.html              # static board preview (platform entry point, no scripts)
├── engine.js               # dependency-free rules engine (plain script, Node-testable)
├── play.html               # self-contained interactive game (local demo, inline CSS/JS)
└── tests/
    └── engine.test.cjs     # engine test suite (run: node tests/engine.test.cjs)
```

## Setup

None. There is no build step and there are no dependencies; all sources are plain
HTML, CSS, and JavaScript.

## Demo usage

- **Platform preview (`index.html`):** the `entry_point` of the `static-site-v1`
  contract. It renders the opening position as a pure HTML/CSS board. The platform
  preview sandbox intentionally does not grant scripts, so this page is a visual
  board only.
- **Interactive play (`play.html`):** open `play.html` in any browser. It offers the
  full game — versus the computer or two players, captured pieces, SAN move list,
  undo, and new game controls. Because the preview sandbox blocks scripts, interactive
  play is a local demo by design, not a platform surface.

## Input / output

- Input: mouse clicks on board squares (or the promotion picker when a pawn reaches
  the last rank). In computer mode the engine answers as Black after a short pause.
- Output: rendered board, game status line, captured pieces, and SAN move history.

## Tests

```bash
node tests/engine.test.cjs
```

The suite covers square naming, move generation from the initial position, en passant,
castling, checkmate and stalemate detection, promotion choices, and computer move
selection.

## Limitations

- Fifty-move rule and threefold repetition tracking are out of scope for this demo.
- The computer opponent searches a small fixed depth and is intentionally simple.

