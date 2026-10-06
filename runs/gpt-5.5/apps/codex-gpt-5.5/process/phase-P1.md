# Phase P1 report

## What I built
- Added dependency-free evaluation, bounded search, strength-level move selection, hint, and move-review modules under `chess-coach/engine/`.
- Replaced the P0 placeholders in `engine/index.js` with real `bestMove` and `reviewMove` implementations while keeping the fixed owner interface intact.
- Added `coach-search.test.mjs` coverage for legal/timed move choice, game-over null moves, strength helpers, hints, review shape, illegal review moves, and a queen blunder with a true capture reason.

## Decisions
- Used iterative-deepening negamax with a hard local budget cap so browser calls stay responsive and hidden tests get a legal fallback even when the budget is small.
- Kept coach comments truth-first: concrete mistake reasons are emitted from legal mate-in-one or legal capture evidence, with generic wording only when the engine cannot prove a sharper claim.
- Returned `reasons` as an array of beginner-readable strings to match the frozen brief, and exported `hint`, `bestMoveForLevel`, and `chooseComputerMove` as helpers for the later UI phase.

## Checks
- Baseline before edits: `node --test chess-coach/tests/engine-rules.test.mjs` -> 8 tests passed.
- Baseline before edits: `python3 -m unittest discover -s tests -v` -> 181 tests passed.
- Phase check: `node --test chess-coach/tests/coach-search.test.mjs` -> 7 tests passed.
- Full chess check: `node --test chess-coach/tests/*.test.mjs` -> 15 tests passed.
- Full legacy suite: `python3 -m unittest discover -s tests -v` -> 181 tests passed.
- Whitespace check: `git diff --check -- chess-coach docs/run5/phase-P1.md` -> passed.
- Note: `node --test chess-coach/tests` was also tried and failed because Node 26 treated the directory as a module path; the explicit `*.test.mjs` form was used for the full chess check.

## Sample output
For `reviewMove("4k3/8/5n2/8/8/8/8/3QK3 w - - 0 1", "d1h5")`, the coach returns a blunder with a legal better move and the reason:

```text
It lets Black capture the queen on h5.
```

## Known limits
- The search is intentionally small and deterministic; it is suitable for beginner coaching and fast replies, not expert-strength chess.
- Coach prose focuses on verified mate and material tactics. Some positional mistakes may get a modest general explanation instead of an over-specific claim.
- Node still prints the existing module-type warning because P1 does not own package metadata.
