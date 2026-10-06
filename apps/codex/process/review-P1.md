# Code review — phase P1

Verdict: PASS

## Checks run

- `node --test chess-coach/tests/analysis.test.js` → PASS (8/8 tests, ~947 ms)
- `npm test --prefix chess-coach` → PASS (27/27 tests, ~929 ms)

## Blocking findings

None.

## Non-blocking (Nit:) suggestions

1. `analysis.test.js:95` — `assert.equal(result.uci, \`${result.uci}\`)` compares a value to itself (template string identity). Likely a leftover or intended to test something else; it asserts nothing useful.
2. `search.js` and `coach.js` both define a local `capturedSquare` (and `pieceColor` in search.js duplicates rules.js). Minor duplication — acceptable given module boundaries but could be a shared utility if it grows.
3. `coach.js:145` — the `best.uci === uci` guard for inaccuracy betterMove is defensive but unreachable: when best equals played, loss is 0 and verdict is "best", never "inaccuracy". Harmless but dead.

## What was done well

- **Deadline safety is thorough.** `checkDeadline` runs at every negamax and quiescence node; the static fallback guarantees a legal move even with `timeMs: 0`. Iterative deepening retains only fully completed iterations, so partial results never leak into ranked moves.
- **Conservative coaching is well-designed.** Severe verdicts (mistake/blunder) are emitted only when a concrete capture, check, or mate is witnessed in the searched PV line. When no concrete explanation exists, the verdict downgrades to inaccuracy rather than making an unsupported claim. This directly satisfies the quality bar's "never says something false" requirement.
- **PV-based explanation is correct.** `opponentConsequence` uses `played.pv[1]` (the opponent's best response from the search tree) and applies it to `positionAfterPlayed`, which is constructed independently via `applyUciMove`. Since both paths produce equivalent board states, the move indices are consistent and the piece lookups are reliable.
- **Tests are replay-based and specific.** All 10 coaching fixtures replay the opponent response and the suggested fix, verifying legality and board state independently of the coach's own output. The mate test proves checkmate occurs after the named response and that the fix prevents it. Assertions would fail if the behavior breaks.
- **Full-width root search is the right choice** for coaching: each root move gets an accurate score from a `(-INFINITY, INFINITY)` window, enabling reliable comparison in `reviewPositionMove`. Narrower aspiration windows would undermine verdict accuracy.
- **Clean ownership.** Only the three P1-owned files plus the phase report were touched. No modifications to P0 files.

## Remaining limits

- Evaluation is purely material + small activity; positional factors (king safety, pawn structure) are absent. This is intentional for P1 scope and noted in the builder's report.
- Verdict thresholds are fixed constants; calibration against real games happens in P4.
- A numerically severe loss without a witnessed capture/check/mate silently becomes an inaccuracy. The coach won't explain all mistakes but will never make a false claim. This is the correct tradeoff per the spec and quality bar.
- `SEARCH_MATE_SCORE` is exported but unused in P1; it's a contract for P2/P4 consumers.
