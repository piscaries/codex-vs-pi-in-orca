# Phase P0 report

## What I built
- Added the local ES-module chess rules engine under `chess-coach/engine/`.
- Implemented FEN parsing/serialization, legal move generation, `applyMove`, `perft`, and `gameStatus` for the fixed owner interface.
- Added focused rule tests for start position and Kiwipete perft, castling, en passant, promotion, checkmate, stalemate, halfmove draws, insufficient material, and illegal moves.

## Decisions
- Kept the engine stateless and dependency-free so hidden owner tests can import `chess-coach/engine/index.js` directly without setup.
- Used `a1 = 0` board indexing from the accepted design and filtered pseudo-legal moves by king safety.
- Exported placeholder `bestMove` and `reviewMove` shapes from `index.js` so the fixed interface is importable before P1 replaces their behavior.

## Checks
- Baseline before edits: `python3 -m unittest discover -s tests -v` -> 181 tests passed.
- Extra stress check: standard perft positions 3 and 4 plus double-pawn/status spot checks -> passed.
- Phase check: `node --test chess-coach/tests/engine-rules.test.mjs` -> 8 tests passed. Node printed a module-type warning because the repo has no package metadata for `.js` ES modules, but the command exited 0.
- Full suite: `python3 -m unittest discover -s tests -v` -> 181 tests passed.
- Whitespace check: `git diff --check -- chess-coach docs/run5/phase-P0.md` -> passed.

## Sample output
`applyMove("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1", "e2e4")` returns:

```text
rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1
```

## Known limits
- Threefold repetition is not included in `gameStatus(fen)` because a single FEN does not contain repetition history; the accepted design assigns that to UI history.
- Search and coaching are minimal placeholders for P1.
