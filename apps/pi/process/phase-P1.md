# Phase P1 report — rules (track t2)

## What was built

Exactly the P1 scope from the accepted design (`docs/run5/design.md` §6 row P1),
on top of P0's board core:

- `chess-coach/engine/moves.js` — move generation:
  - **Pseudo-legal generation** for every piece kind: pawn single/double push
    (double only from the start rank over an empty square), diagonal captures
    only onto enemy pieces, en passant onto a matching ep target, all four
    promotions (`q r b n`) on the last rank for pushes and captures alike;
    knight and king steps; slider rays with blocking.
  - **Castling** with every restriction: right present, path squares empty,
    own king not in check, king's pass-through square not attacked (the
    destination square is proven safe by the legality filter). `b1`/`b8` being
    attacked correctly does *not* prevent queenside castling, and a missing
    rook never castles even if a malformed FEN still grants the right.
  - **Exactly-legal filtering**: each pseudo-legal move is made, the mover's
    king checked, and the move unmade — this is what makes pins, en-passant
    discoveries, and castle destinations exact. The position is restored
    bit-for-bit (tested).
  - `perft(pos, depth)` (leaf counting with a depth-1 bulk shortcut),
    `moveToUci`, `parseUci` (strict `from,to[,qrbn]` grammar), and
    `findLegalMove(pos, uci)` (exact match incl. promotion suffix).
- `chess-coach/engine/status.js` — `gameStatus` in the contract order
  (no legal moves → check? checkmate : stalemate; halfmove ≥ 100 → draw;
  insufficient material → draw; else ongoing) plus `isInsufficientMaterial`
  (K vs K, K+minor vs K, bishops-only-on-one-square-color; two knights and
  bishops on both colors stay ongoing) and `hasLegalMoves`.
- `chess-coach/engine/index.js` — the fixed facade for P1's four functions:
  `legalMoves(fen)`, `applyMove(fen, uci)` (throws `illegal move: <uci>` on
  malformed strings and illegal moves), `perft(fen, depth)` (depth 0 → 1),
  `gameStatus(fen)`. `bestMove`/`reviewMove` are intentionally absent until
  P2/P3 per the plan.
- `chess-coach/tests/rules.test.js` — 66 tests, all passing (~0.9 s).

Done-when from the plan, item by item:

- **perft**: start position d1–d4 (`d4 = 197281`) and Kiwipete d1–d3
  (`d3 = 97862`), plus four more classic positions at depth 3–5
  (pos3 d5 = 674624, pos4 d4 = 422333, pos5 d3 = 62379, pos6 d3 = 89890).
- **4 targeted suites**: castling-through-check (9 tests: through-square,
  out-of-check, b1-attacked-still-legal, c1/d1 attacked, blocked path, no
  rights, missing rook, black mirror); ep pins (horizontal and diagonal
  discoveries both illegal, legal ep applies correctly, target expires, no
  ep without target); promotions (all four listed for push and capture,
  exact FENs for q/n/capture/underpromotion, bare suffix-less promotion and
  bad suffix rejected, suffix on non-promotion rejected); draw statuses
  (21-FEN gameStatus table, see below).
- **applyMove throws on illegal**: 16 malformed/nonsensical UCIs plus
  non-string inputs, each with the exact `illegal move: …` message.
- **gameStatus on 15 status FENs**: 21 FENs — 4 checkmates (incl. one with
  halfmove 120 proving mate outranks fifty-move), 4 stalemates (incl. one at
  halfmove 100 proving no-legal-moves outranks it), 3 fifty-move cases, 7
  insufficient-material cases (4 draws incl. same-colored KB-KB; 3 ongoing:
  opposite-colored bishops, B+N, two knights), 3 ongoing.

## Decisions made

1. **Legality by make/unmake + isCheck rather than pin tracking** — simplest
   provably-exact approach; the six-position perft suite (1.4M+ nodes
   verified against published counts) is the evidence, and it is fast enough
   (full rules suite < 1 s) that P2's search budget dominates.
2. **Castling split**: generation checks rights, empty path, not-in-check,
   and the pass-through square; the destination is left to the generic
   filter. This keeps the "king may not castle into check" rule in one place
   (the filter) and avoids double-implementing attack tests.
3. **Promotions are four distinct moves; a bare `e7e8` (no suffix) is
   illegal** — the brief's interface lists promotions as `e7e8q`-style, so a
   suffix-less promotion string is rejected rather than defaulted (matches
   the spec's "never silently defaulted").
4. **`perft` depth-1 bulk counting** (`generateLegalMoves().length`) —
   identical by definition to expanding the leaves; keeps pos3 d5 fast.
5. **Insufficient material excludes KNN and opposite-colored KB-KB** —
   matches the design's enumeration (K, K+minor, KB-vs-KB same color); FIDE
   helpmate nuance is out of scope for auto-draws.
6. **Facade holds only the four P1 functions** — `bestMove` (P2) and
   `reviewMove` (P3) will extend `index.js`; keeping them absent now means
   the hidden suite cannot accidentally pass against stubs.

## Checks

- Phase check: `node --test chess-coach/tests/rules.test.js` → **66/66 pass**
  (0.93 s).
- Full project suite: `node --test chess-coach/tests/*.test.js` → **106/106
  pass** (P0's 40 board tests still green, none removed), exit 0.
- Ad-hoc facade consistency (not committed): every legal move of the six
  perft positions applies via `applyMove`, yields a parseable FEN and a valid
  status string — 178 moves round-tripped clean; `perft(start, 4)` = 197281.
- Repo-root Python `tests/` untouched (unrelated project, per design §1).

## Sample output

```
$ node --test chess-coach/tests/*.test.js | tail -4
ℹ tests 106
ℹ pass 106
ℹ fail 0
ℹ duration_ms 920.4
```

Perft sample: `perft('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 4)` → `197281`.

Facade sample: `applyMove(START, 'e2e4')` →
`rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1`;
`applyMove(PROMO, 'e7e8n')` → `2k1Nr2/8/8/8/8/8/8/4K3 b - - 0 1`;
`applyMove(START, 'e7e5')` → throws `illegal move: e7e5`.

## Known limits

- Threefold repetition is invisible to `gameStatus` by design (bare FEN has
  no history); `app/game.js` owns it in P4/P5 (design §3).
- Positions without kings or with side-to-move-attacks-king shapes (illegal
  chess positions) are accepted structurally; behavior there is inherited
  from P0 (`isCheck` → false, king "capture" possible) — the fixed interface
  only receives reachable positions, and no test depends on garbage FENs.
- Perft depth beyond 5 on the standard suite is not tested (runtime, not
  correctness, would grow).

## Handoff

```
Task / Dispatch: task_1fe76b5b10b5 / ctx_cf35d0394b90
Role: builder (phase P1, track t2)
Base commit: 8b366c4
Output: chess-coach/engine/moves.js, chess-coach/engine/status.js, chess-coach/engine/index.js, chess-coach/tests/rules.test.js, docs/run5/phase-P1.md
Decisions made: legality via make/unmake+isCheck (simplest exact, proven by 1.4M-node perft); castling split between generation (rights/path/pass-through) and the generic filter (destination); promotions are four moves and a suffix-less promotion UCI is illegal; perft depth-1 bulk counting; insufficient material excludes KNN and opposite-color KB-KB per design; facade exports only the four P1 functions (no stubs)
Checks: node --test chess-coach/tests/rules.test.js → 66/66 pass; node --test chess-coach/tests/*.test.js → 106/106 pass, exit 0; ad-hoc 178-move facade round-trip clean
Open questions: none
Next: builder of P2 (eval/rng/search/levels + facade bestMove) on this branch; note P2 must extend engine/index.js, which P1 owns — coordinator may need to grant that file to P2
```
