# Phase P2 report

## Built

- Added the fixed public engine boundary in `engine/index.js`. It exports exactly `legalMoves`, `applyMove`, `perft`, `gameStatus`, `bestMove`, and `reviewMove`, translating internal positions and search results to the required FEN/UCI values.
- Added the immutable game lifecycle in `app/game.js`: standard setup and three levels, user/computer turn records, pending worker state, atomic reply validation, repetition counts, terminal moves, legal non-mutating hints, confirmed reset, and stored-review recap selection.
- Added 11 API/session tests covering public export names, shapes and typed failures; legal deadline fallback; illegal-move atomicity; move records; terminal user review; hints; threefold repetition; reset confirmation; severe recap ordering/identity; and the clean-game recap.

## Decisions

- The user is White for this release, consistent with standard-position startup and the single-user browser flow. `playUserMove` therefore accepts only an ongoing, idle White turn; computer replies accept only the resulting Black turn.
- A legal user move enters `busy: true` even when it ends the game, so the move still receives its promised review. `completeCoachAndReply` then requires no computer UCI for that terminal position.
- Worker output is validated as a unit before state is returned. An illegal computer reply, invalid review, or unsupported hint throws while the prior state remains unchanged.
- Repetition counts include the initial position and every completed ply. Keys come from P0's clock-free, usable-en-passant-aware `repetitionKey`; a third occurrence changes the session status to `draw`.
- Active reset cancellation returns the exact current state. Confirmed reset creates the standard position at the requested valid level and clears moves, feedback, hint, busy state, and repetition history.
- Recap selection ranks blunders above mistakes, breaks equal severity by earliest occurrence, caps at three, and restores game order. Returned entries and reviews are the originally stored objects, so recap wording cannot diverge from in-game feedback.
- `createGameState` accepts an optional FEN for deterministic tests and demos; the browser-facing default remains the required standard position.

## Checks

- Baseline `npm test --prefix chess-coach`: PASS, 27/27 tests, approximately 0.92 seconds.
- Phase check `node --test chess-coach/tests/api-session.test.js`: PASS, 11/11 tests, approximately 0.29 seconds on the final pre-report run.
- Full project check `npm test --prefix chess-coach`: PASS, 38/38 tests, approximately 1.05 seconds on the final pre-report run.
- `git diff --check`: PASS.
- Public API sample command using `node --input-type=module`: PASS; exactly six exports, 20 initial legal moves, initial perft depth 3 of 8,902, and a legal timed best move.

## Sample output

```json
{
  "exports": ["applyMove", "bestMove", "gameStatus", "legalMoves", "perft", "reviewMove"],
  "legalMoves": 20,
  "perft3": 8902,
  "bestMove": "a2a4"
}
```

The exact best move may vary with the deadline, but the test revalidates it against the current legal move list.

## Files read

- `docs/run5/design.md`, `docs/run5/design-review.md`, `docs/run5/spec.md`, `docs/run5/phase-P0.md`, `docs/run5/phase-P1.md`, `docs/run5/review-P0.md`, and `docs/run5/review-P1.md`
- `projects/chess-coach/brief.md` and `projects/chess-coach/quality-bar.md`
- `chess-coach/package.json`, `chess-coach/engine/rules.js`, `chess-coach/engine/search.js`, `chess-coach/engine/coach.js`, `chess-coach/tests/rules.test.js`, and `chess-coach/tests/analysis.test.js`

## Known limits

- Browser Worker messaging, stale-request IDs, UI confirmation presentation, promotion controls, and user-visible error recovery belong to P3. P2 provides the lifecycle validation and reset-confirmation boundary they consume.
- Strength-profile time/depth/noise allocation belongs to the P3 Worker/P4 calibration. P2 stores and validates the three required level names.
- `reviewMove` uses P1's intentionally modest tactical evaluator; deeper quality calibration remains P4 scope.

Task / Dispatch: task_fc3fa6d33368 / ctx_09c44eb62f3e
Role: builder
Base commit: dc6f24b3e6b3c5a48449163670c92c2964cb4242
Output: chess-coach/engine/index.js; chess-coach/app/game.js; chess-coach/tests/api-session.test.js; docs/run5/phase-P2.md
Decisions made: user is White; terminal user moves remain pending until reviewed; worker results apply atomically; repetition counts every ply; reset cancellation preserves state; recaps preserve stored identity and prioritize severity.
Checks: `node --test chess-coach/tests/api-session.test.js` -> PASS (11/11); `npm test --prefix chess-coach` -> PASS (38/38); `git diff --check` -> PASS; public API sample -> PASS.
Open questions: none.
Next: code reviewer should review P2, especially the exact six-function engine boundary, worker-result atomicity, repetition accounting, and stored-review recap identity.
