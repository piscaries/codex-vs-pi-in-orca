# Code review: phase P2

Verdict: PASS

## Checks run

- `node --test chess-coach/tests/api-session.test.js` → PASS, 11/11 tests, ~226 ms
- `npm test --prefix chess-coach` → PASS, 38/38 tests (including P0 and P1), ~945 ms
- Manual trace of recap sort/slice logic against test expectations → correct
- Verified all imports resolve to existing exports in `rules.js`, `coach.js`, `search.js`
- Verified `bestMove(fen, null)` throws `TypeError` (via `validateOptions`) and terminal `bestMove` throws `RangeError` (via `searchPosition`), matching the contract

## Blocking findings

None.

## Non-blocking (Nit:) suggestions

1. `game.js:156` — `new Map(state.positionCounts)` is constructed even when the game ended on the user move and no reply position will be recorded. The copy is harmless but unnecessary in that branch.

2. `game.js:59–61` — The `validateReview` check on `review.reasons` combines array type, length, and element checks in a single compound condition with one error message. Separating them would produce more actionable error messages, but this is internal validation so the current form is acceptable.

## What was done well

- **Contract fidelity.** The six public exports in `engine/index.js` are thin wrappers that translate between FEN/UCI strings and internal position objects. Each delegates to exactly the right P0/P1 function with no extra logic, keeping the API surface minimal and testable.
- **Immutable state design.** Every `game.js` function returns a new state object with shallow-copied arrays and maps; the prior state is never mutated. The spread-then-override pattern is applied consistently, and the test for atomicity (`pending.moves.at(-1).review` remains `null` after a failed `completeCoachAndReply`) demonstrates this concretely.
- **Atomic validation.** `completeCoachAndReply` validates the review and the computer reply before constructing the successor state. A bad review, an illegal computer move, or a betterMove that equals the played move all throw before any state field is touched.
- **Recap identity.** Recap entries are the original move record objects (verified by `===` in the test), so the displayed recap cannot diverge from in-game feedback. The severity sort + chronological restore is correct; I traced the four-move test scenario manually.
- **Repetition correctness.** Position counting uses `repetitionKey` (which omits clocks and normalizes unusable en-passant), records the initial position, and checks >= 3. The test proves the start position reaches count 3 after two knight-shuffle cycles.
- **Thorough error coverage.** Tests exercise invalid FEN, illegal UCI, null options, terminal bestMove, betterMove-equals-played, and busy-state hint rejection, all with specific error type and message assertions.

## Remaining limits

- No browser or Worker integration yet (P3 scope). The `busy` flag and worker-result validation shape are prepared but not consumed.
- Recap selection and `hintForGame` use the P1 tactical evaluator, which has known depth limits. Calibration is P4 scope.
- `createGameState` accepts a custom FEN for testing, but the default start position is always White to move. Choosing color is explicitly a non-goal.
- Reset while `busy: true` is not tested, because the Worker cancellation flow belongs to P3. The current code would allow it (since `needsResetConfirmation` checks `ongoing && moves.length > 0`, not `busy`), which seems intentional for the browser "force restart" path.

Task / Dispatch: task_18800831512e / ctx_d0edd5886a20
Role: code reviewer
Base commit: 149bf91
Output: docs/run5/review-P2.md
Decisions made: PASS — the change delivers all P2 outcomes, matches contracts, and tests lock every required behavior with specific assertions.
Checks: `node --test chess-coach/tests/api-session.test.js` → PASS (11/11); `npm test --prefix chess-coach` → PASS (38/38); manual trace of recap sort logic → correct; import resolution → verified.
Open questions: none
Next: coordinator should record the P2 PASS and proceed to P3 builder dispatch.
