# Code review — phase P0 (board core)

```
Verdict: PASS
Checks run:
  node --test chess-coach/tests/board.test.js → 40/40 pass, exit 0
  node --test chess-coach/tests/*.test.js     → 40/40 pass, exit 0
Blocking findings: none
```

## Non-blocking (Nit:) suggestions

1. `findKing` (`board.js:217`) iterates indices 21–98, which includes offboard cells (29–30, 39–40, …). The comparison is harmless (OFFBOARD symbol never equals `'K'`/`'k'`), but skipping offboard cells would be marginally cleaner. Not worth changing — the loop is short and the cost is negligible at this scale.

2. `fileOf`/`rankOf` (`board.js:74–80`) do not validate that the index is a playable square, so calling them on an offboard index returns nonsensical values. The phase report documents them as "on-board only," and P1's movegen will only call them on valid indices, so this is fine as-is.

## What was done well

- **120-square mailbox with OFFBOARD sentinel** is a clean, standard design that makes piece-walk bounds checking trivial. The index formula (`21 + file + 10*(rank-1)`) is verified by the round-trip test over all 64 squares.
- **Castling keep-mask** (`CASTLE_KEEP` table) is an elegant solution that handles king moves, rook moves, and rook captures in a single `&=` operation on both `from` and `to`. The rook-capture-on-home-square test (`a1xa8`) confirms both sides' rights update correctly.
- **FEN round-trip suite** covers 25 positions including edge cases (no ep, partial/no castling, ep-with-no-capturer, clock brink 99/100, dense board). The double round-trip stability test is a nice touch.
- **`applyAndRestore` test helper** simultaneously validates the forward FEN and the exact undo (board + all state fields), giving strong coverage from concise test code.
- **Promotion case handling** (`us === WHITE ? move.promotion.toUpperCase() : move.promotion`) is correct and minimal — lowercase promotion chars from createMove, cased on application.
- **Test coverage of error paths**: wrong-side-to-move, bad promotion chars, empty origin — all throw with informative messages.
- **ES module setup** (`{"type":"module"}` in `package.json`) is the right call for browser+Node dual-target with no build step.

## Remaining limits

- `makeMove` performs no legality validation — by design; P1 owns this via movegen.
- `isCheck` on a kingless position returns `false` — documented and safe for P1+ where positions always have kings.
- No threefold-repetition state — correctly deferred to `app/game.js` per design §3, since repetition is undetectable from a bare FEN.
- `fileOf`/`rankOf` are unguarded on offboard indices (nit above).

---

```
Task / Dispatch: task_101d108263cd / ctx_9535b0079949
Role: code reviewer (phase P0, track t2)
Base commit: 2560461
Output: docs/run5/review-P0.md
Decisions made: PASS — no blocking issues found; all nits are documented but not required for rework
Checks: node --test chess-coach/tests/board.test.js → 40/40 pass; node --test chess-coach/tests/*.test.js → 40/40 pass, exit 0
Open questions: none
Next: coordinator routes P1 builder to begin rules phase on this branch
```
