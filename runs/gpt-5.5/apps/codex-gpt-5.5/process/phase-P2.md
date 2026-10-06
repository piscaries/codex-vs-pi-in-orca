# Phase P2 report

## What I built
- Added a dependency-free browser UI for playing White against the engine at easy, normal, or hard strength.
- Added pure UI state transitions for new games, legal user moves, rejected illegal moves, hints, threefold tracking, status updates, and legal computer replies.
- Added rendering for the board, last move, check cue, turn/status facts, coach feedback, hint text, move list, and worst-move review list.
- Added `ui-state.test.mjs` coverage for the P2 done-when behavior.

## Decisions
- Kept user play as White, matching the accepted design's release-scope decision.
- Defaulted click-based promotion to queen by choosing the legal `q` promotion when several promotion UCIs share a target square; this keeps the browser flow simple while still using engine legality.
- Used an ES-module worker for computer replies with a main-thread fallback, so the static app still works in browsers or test environments where module workers are unavailable.
- Derived threefold repetition from FEN position keys in UI history because the fixed `gameStatus(fen)` contract cannot infer unseen repetition history.

## Checks
- Baseline before edits: `node --test chess-coach/tests/*.test.mjs` -> 15 tests passed.
- Baseline before edits: `python3 -m unittest discover -s tests -v` -> 181 tests passed.
- Phase check after edits: `node --test chess-coach/tests/ui-state.test.mjs` -> 8 tests passed.
- Full chess check after edits: `node --test chess-coach/tests/*.test.mjs` -> 23 tests passed.
- Full project check after edits: `python3 -m unittest discover -s tests -v` -> 181 tests passed.
- Browser smoke after edits: headless Chrome loaded `chess-coach/index.html` through a local static server and wrote an 89,335 byte screenshot.
- Whitespace check after edits: `git diff --cached --check -- chess-coach docs/run5/phase-P2.md` -> passed.

## Sample output
After `e2e4`, the state records:

```text
lastMove: e2e4
pending: true
reviews[0].verdict: one of best/good/inaccuracy/mistake/blunder
```

## Known limits
- The user always plays White in this release.
- Promotion choice is automatic to queen in the click UI; underpromotion remains supported by the engine interface.
- The end review is populated from the worst reviewed user moves and becomes most useful after several inaccuracies or worse.

## Handoff
Task / Dispatch: task_1ff1a9fa335b / ctx_4f48c1029e40
Role: builder
Base commit: d5afb755d65e198271973f1e06b0667266fe7020
Output: `chess-coach/index.html`, `chess-coach/styles.css`, `chess-coach/app/app.js`, `chess-coach/app/render.js`, `chess-coach/app/worker.js`, `chess-coach/tests/ui-state.test.mjs`, `docs/run5/phase-P2.md`
Decisions made: User plays White to match the accepted release scope; click promotion defaults to queen to keep the UI simple while preserving engine legality; computer replies use a module worker with a main-thread fallback for static/local environments; threefold repetition is tracked from UI history because a single FEN cannot prove it.
Checks: `node --test chess-coach/tests/ui-state.test.mjs` -> 8 tests passed; `node --test chess-coach/tests/*.test.mjs` -> 23 tests passed; `python3 -m unittest discover -s tests -v` -> 181 tests passed; headless Chrome static-server smoke -> screenshot created; `git diff --cached --check -- chess-coach docs/run5/phase-P2.md` -> passed.
Open questions: none
Next: code reviewer should review the phase P2 change.
