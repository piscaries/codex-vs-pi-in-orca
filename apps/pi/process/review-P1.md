# Code review — phase P1 (rules)

```
Verdict: PASS
Checks run:
  node --test chess-coach/tests/rules.test.js → 66/66 pass (0.93 s)
  node --test chess-coach/tests/*.test.js → 106/106 pass (1.00 s)
  Ad-hoc facade verification (perft d4=197281, legalMoves start=20, applyMove throws on illegal, gameStatus correct on checkmate/draw/ongoing) → all correct
  Edge-case spot checks (castling into check blocked, ep with non-pinning rook allowed, promotion captures present, same-color KBB draw vs opposite-color ongoing) → all correct
Blocking findings: none
Non-blocking (Nit:) suggestions:
  1. status.js:13 — hasLegalMoves generates the full legal move list to check emptiness.
     A short-circuiting variant (return on the first legal move found) would avoid
     generating all moves in non-terminal positions. Not a blocker: the full suite
     runs in ~1 s, and P2's search will dominate runtime. Worth revisiting only if
     profiling shows gameStatus as a hotspot in the search loop.
  2. moves.js:144 — Queen offsets are rebuilt on every call via spread
     (`[...BISHOP_OFFSETS, ...ROOK_OFFSETS]`). A module-level constant would avoid
     the allocation. Again, not material at current depths.
What was done well:
  - Perft suite is thorough: six classic positions at multiple depths (1.4M+ nodes
    verified), which is strong evidence the move generator is exactly correct.
  - Targeted test suites cover the hard cases comprehensively: castling through check
    (9 tests including the b1-attacked-but-legal case), ep pins (horizontal and
    diagonal), all four promotions for pushes and captures, and 21 gameStatus FENs
    including priority-order edge cases (mate outranks fifty-move, stalemate outranks
    fifty-move).
  - The applyMove error tests are unusually complete: 16 malformed/nonsensical UCI
    strings plus non-string inputs, each asserting the exact error message format.
  - The make/unmake + isCheck legality approach is clean and provably correct via
    perft. The castling split (generation handles rights/path/pass-through, the
    generic filter handles the destination) avoids duplicating attack detection.
  - Facade is minimal and correct: only the four P1 functions are exported, no stubs
    for P2/P3, which prevents accidental passes in the hidden suite.
  - Insufficient material handles the subtle cases correctly: KNN stays ongoing, same-
    color KB-vs-KB draws, opposite-color KB-vs-KB stays ongoing — matches the design
    enumeration and FIDE conventions for auto-draws.
  - File ownership is exact: only the five files assigned to P1 were touched.
Remaining limits:
  - Threefold repetition is not detected by gameStatus (by design: bare FEN has no
    history). App-level detection is deferred to P4/P5 per the accepted plan.
  - hasLegalMoves is O(all legal moves) rather than short-circuiting — acceptable now,
    may matter in deep search if gameStatus is called per node.
  - Positions without kings or with impossible side-to-move-attacks-king states are
    accepted structurally (inherited from P0); not a concern since the fixed interface
    only receives reachable positions.
```

## Handoff

```
Task / Dispatch: task_c0f1154cb3e9 / ctx_380752c84d70
Role: code reviewer (phase P1, track t2)
Base commit: 3a5c35c
Output: docs/run5/review-P1.md
Decisions made: PASS — the change delivers all P1 requirements (exactly-legal movegen, castling/ep/promotion, status detection, facade with the four contracted functions), is proven correct by perft against published node counts, and has thorough test coverage including edge cases; two nits (hasLegalMoves allocation, queen offset spread) are non-blocking performance observations
Checks: node --test chess-coach/tests/rules.test.js → 66/66 pass; node --test chess-coach/tests/*.test.js → 106/106 pass; ad-hoc facade round-trip and edge-case spot checks all correct
Open questions: none
Next: coordinator routes PASS to the P2 builder (eval/rng/search/levels + facade bestMove)
```
