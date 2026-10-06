# Phase P0 report — board core (track t2)

## What was built

The chess position core for `chess-coach/`, exactly the P0 scope in the accepted
design (`docs/run5/design.md`, §6 row P0):

- `chess-coach/package.json` — `{"type":"module"}` (plus name/private/version),
  which makes all `.js` under `chess-coach/` ES modules in Node and lets the
  same files load unchanged in Chrome and in the owner's hidden suite.
- `chess-coach/engine/board.js` — the board core:
  - **120-square mailbox position**: playable squares at indices 21–98
    (`index = 21 + file + 10*(rank-1)`), `OFFBOARD` symbol sentinel around the
    border so piece walks cannot wrap, pieces as chars (`PNBRQK` / `pnbrqk`),
    `null` = empty. State fields: `board`, `turn`, `castling` (bit set),
    `ep` (mailbox index or null), `halfmove`, `fullmove`.
  - **FEN in/out**: `parseFen(fen)` / `positionToFen(pos)` with light structural
    validation (`invalid FEN: …` errors). `Position.clone()`.
  - **make/unmake**: `createMove(pos, from, to, {flags, promotion})` builds a
    move record; `makeMove(pos, move)` applies it in place (all move kinds:
    quiet, capture, double push, en passant, both castles per color,
    promotion/underpromotion/promotion-capture) and returns an undo record;
    `unmakeMove(pos, undo)` restores the position exactly — board, turn,
    castling rights, ep target, both clocks.
  - **Check detection**: `isSquareAttacked(pos, sq, byColor)` (pawns, knights,
    kings, slider rays with blocking), `findKing`, `isCheck(pos, color?)`.
  - Castling-right bookkeeping via a per-square keep-mask applied to both
    `from` and `to` (covers rook moves, king moves, and rook captures).
- `chess-coach/tests/board.test.js` — 40 tests, all passing.

## API P1 can rely on (documented here since `board.js` is P1's foundation)

- `sqIndex('e4') = 55`, `sqName(55) = 'e4'`, `fileOf/rankOf` (on-board only).
- Move flags: `FLAG_NORMAL=0, FLAG_EP=1, FLAG_CASTLE_K=2, FLAG_CASTLE_Q=4,
  FLAG_DOUBLE=8`. `move = {from, to, piece, captured, promotion, flags}`;
  `promotion` is one of `'q','r','b','n'` (lowercase, case applied by color).
- `makeMove` enforces exactly one invariant — the mover must be the side to
  move (throws otherwise). It does **not** validate legality; P1's movegen
  supplies only legal moves and the facade rejects illegal UCIs before calling
  it. `createMove` throws on empty origin and bad promotion chars.
- Offset tables exported for movegen: `KNIGHT_OFFSETS`, `KING_OFFSETS`,
  `BISHOP_OFFSETS`, `ROOK_OFFSETS`; `colorOf`, `opposite`, `CASTLE_KEEP`.

## Decisions made

1. **Piece encoding as characters, not numbers** — FEN parse/print and debug
   output become trivial; fast enough for the depths P2 needs.
2. **Castling rights as a 4-bit mask with a per-square keep-mask** — one table
   line handles "rook moved", "king moved", and "rook captured on its home
   square" for both colors; printing always emits standard `KQkq` order
   (non-standard input order is normalized; all 25 round-trip FENs use
   standard order).
3. **FEN leniency**: 4–6 fields accepted; missing ep defaults `-`, missing
   clocks default `0`/`1`; `fullmove` 0 accepted (some tools emit it).
   Structurally broken FENs (bad ranks/chars/turn/castling/ep/clocks) throw
   `invalid FEN: <reason>`. No king-count validation (a bare-FEN engine cannot
   see history; king legality is P1 movegen's business via check rules).
4. **ep field preserved verbatim**: an ep target that no pawn can capture
   still round-trips (design §3 treats ep detection as movegen's concern).
5. **`makeMove` checks side-to-move but not legality** — legality is P1's
   contract (`applyMove` must throw on illegal UCIs); this guard catches
   wiring bugs in later phases without ever rejecting a legal move.

## Checks

- Phase check: `node --test chess-coach/tests/board.test.js` → **40/40 pass**
  (done-when holds: 25 FENs round-trip exactly — including no-ep, full
  castling rights, partial/none, ep-with/without capturer, clock edges 99/100,
  dense board; make/unmake restores the full structural snapshot on every
  scenario plus a 6-move opening line unwound in reverse).
- Full project suite: `node --test chess-coach/tests/*.test.js` → **40/40
  pass**, exit 0. (Repo-root `tests/` are the unrelated Python project —
  design §1 says untouched; homebrew `python3` has no pytest module anyway.)
- No existing tests disappeared: this is the first `chess-coach` commit; the
  unrelated root test files are unmodified (`git status` clean besides
  `chess-coach/`).

## Sample output

```
$ node --test chess-coach/tests/*.test.js | tail -4
ℹ tests 40
ℹ pass 40
ℹ fail 0
ℹ duration_ms 109.458
```

FEN after white castling kingside, from `r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1`
move `e1g1`: `r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1` (rook to f1, `K` right lost,
clock to 1), and `unmakeMove` returns the exact starting snapshot.

## Known limits

- `makeMove` performs **no legality validation** (by design; P1 owns it).
  Applying a hand-built nonsense move can produce a nonsense position.
- `isCheck` on a kingless position returns `false` rather than throwing
  (documented; P1+ positions always have kings).
- No threefold-repetition state here — undetectable from a bare FEN, handled
  by `app/game.js` per design §3.

## Handoff

```
Task / Dispatch: task_9bef5ad049c3 / ctx_60fc60ff1ca1
Role: builder (phase P0, track t2)
Base commit: b422118
Output: chess-coach/package.json, chess-coach/engine/board.js, chess-coach/tests/board.test.js, docs/run5/phase-P0.md
Decisions made: char piece encoding (FEN/debug simplicity); castling keep-mask rights updates (one rule covers moves and captures); FEN leniency 4-6 fields + 0 fullmove (safe defaults, throws on structure errors); ep field preserved verbatim; makeMove checks side-to-move only, legality deferred to P1
Checks: node --test chess-coach/tests/board.test.js → 40/40 pass; node --test chess-coach/tests/*.test.js → 40/40 pass, exit 0
Open questions: none
Next: builder of P1 (moves.js, status.js, engine/index.js facade) on this branch
```
