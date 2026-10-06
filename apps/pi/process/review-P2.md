# Code review — phase P2 (search & levels)

```
Verdict: PASS
Checks run:
  node --test chess-coach/tests/search.test.js → 34 pass, 0 fail (~14 s)
  node chess-coach/scripts/levels-check.js → PASS (proxy 7/10 at level 1, 0/10 at level 4; ~3.5 min)
  node --test chess-coach/tests/*.test.js → 140 pass, 0 fail (all P0/P1 tests intact)
Blocking findings: none
Non-blocking (Nit:) suggestions:
  1. engine/eval.js:141 — `value` is computed for kings (PIECE_VALUES['k'] + pstBonus = 0) but
     immediately discarded by the `kind === 'k'` branch. Harmless; a guard-continue before the
     `value` computation would save the dead work.
  2. engine/search.js:100-102 — Delta pruning underestimates the gain of a capture-with-promotion
     (counts only the captured piece, not the promotion upgrade). In practice capture-promotions
     are almost always large enough to survive the margin, so this is a style nit rather than a
     correctness issue; the stand-pat lower bound keeps the search sound.
  3. engine/search.js:181 — The root-window narrowing technique (`beta = -iterBest.scoreCp`) is
     correct and effective, but the comment could note that this is not PVS — later moves get a
     full alpha but a narrowed beta, which only prunes moves worse than the current best.
What was done well:
  - The steppable `createSearch` / `step()` contract is clean: clone-per-root-move avoids any
    position mutation, and the fallback chain (completed → iterBest → first legal move) ensures
    a legal answer is always returned regardless of when the deadline fires.
  - Quiescence search handles check evasions with full legal generation and uses pseudo-legal
    capture/promotion generation out of check — a correct optimization that significantly
    improved search depth (builder reports Kiwipete went from depth 2 to depth 4–5 in 1 s).
  - `scoreRootMoves` with a full window and depth cap makes level play reproducible for a given
    seed — good separation from the time-limited `createSearch`.
  - The levels-check proxy is well-calibrated (85% best / 15% random), and the builder
    documented the calibration process (75% lost, 85% wins most). The seeded self-play produces
    deterministic results at levels 1–3.
  - Test coverage is thorough: 50-FEN legality and time bound, 10 mate-in-1 positions verified
    by applyMove → gameStatus, level ordering invariants, and explicit blunder-mechanism tests
    with controlled random streams.
  - The index.js edit (adding bestMove to the facade) is additive and well-justified by three
    references in the design (§2 facade, §6 P2 outcome, §7 contract freeze).
Remaining limits:
  - No repetition or fifty-move awareness inside the search tree (documented; app handles it).
  - Level 4 is time-capped, so exact moves vary across machines; the 10–0 margin is wide.
  - A single step() can exceed 200 ms at high depths on slow machines (design accepts this).
  - levels-check takes ~3.5 min (dominated by level 4 thinking time).
```

---

Task / Dispatch: task_1151ee06f1a9 / ctx_5894948e66c9
Role: code reviewer
Base commit: 17415dc (change: 17415dc..187a924)
Output: docs/run5/review-P2.md
Decisions made: PASS — the change delivers all P2 outcomes (eval, rng, steppable search, levels, bestMove facade) with correct contracts, thorough tests, and passing checks; the index.js edit is additive and justified by the design.
Checks: `node --test chess-coach/tests/search.test.js` → 34 pass; `node chess-coach/scripts/levels-check.js` → PASS (7/10, 0/10); `node --test chess-coach/tests/*.test.js` → 140 pass
Open questions: none
Next: coordinator routes to P3 builder (coach review.js)
