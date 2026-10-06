# Phase P3 report — coach (track t2)

Task / Dispatch: task_78a03c7387ef / ctx_0d50f07596bc
Base commit: d4852e4 (branch r5-t2-p3)

## What was built

Exactly phase P3 of `docs/run5/design.md`: the coach.

- **`chess-coach/engine/review.js`** — `reviewMove(fen, uci) → {verdict, reasons, betterMove}`:
  - **Verdict** from exact root scores of a depth-capped full-window search
    (`scoreRootMoves`, max depth 5, 1200 ms safety valve): `loss = score(best) −
    score(played)` banded ≤50 good / ≤110 inaccuracy / ≤250 mistake / more =
    blunder, with the design's two mate adjustments: the opponent mating in one
    after the move is always a **blunder**; missing your own mate-in-one is at
    least a **mistake**.
  - **Reasons** — one or two plain sentences from concrete detectors verified on
    the exact position, never from search scores: `mateInOne(fen, color)` (every
    legal move that mates at once), `hangingPiece(fen)` (the most serious
    capture threat against the side that just moved, with an exact
    material-chain judgment: pseudo-legal captures, individually
    legality-checked, most-valuable-first), and `materialTally(fen)` for the
    stalemate case. Every sentence states single-ply checkable facts (a legal
    capture, which piece from which square; "no legal capture exists after
    it"; arithmetic on piece values) — no engine numbers, no bare notation.
  - **betterMove** = the search's best move for inaccuracy-or-worse; `null` for
    best/good, which get "Best move." / "Good move." (or "Checkmate — you win
    the game.") only.
- **`chess-coach/engine/index.js`** — additive facade edit: `export { reviewMove }
  from './review.js'` (see decision 1).
- **`chess-coach/tests/review.test.js`** — 18 tests: shape/errors, short
  acknowledgements, verdict bands, the 21-probe SC-002 set (10 hanging, 6 missed
  mates, 5 allowed mates + the stalemate probe) with a **truthfulness prober**
  that machine-re-verifies every concrete claim (see below), a
  no-false-claims-on-normal-moves set, and detector unit tests.

The truthfulness prober (design §9a) re-verifies, for every reason on every
probe: "captured for free" ⇒ the capture is legal AND the victim has **no**
legal capture afterwards (exhaustive enumeration); "taking it back wins you
only that X" ⇒ a legal recapture onto the square exists and the occupant is
worth less than the lost piece; "you missed checkmate" ⇒ `mateInOne(before)` is
non-empty and applying the named move gives `gameStatus === 'checkmate'`; "X can
deliver checkmate" ⇒ same on the after-position, and the verdict is blunder;
plus: every sentence ends like a sentence and contains no digit outside square
names (FR-007). 21 probes × (verdict correct, ≥1 true reason, legal ≠ better
move) — the design's done-when.

## Decisions made

1. **Edited `engine/index.js` (not in P3's owned-files column)** to export
   `reviewMove` — same justification as P2's accepted `bestMove` edit: design §2
   puts `reviewMove` in the index.js fixed facade, §6's P3 outcome is "facade
   `reviewMove`", §7 freezes that facade, and the brief's fixed interface
   requires it. The edit is one import-free re-export line; no P1/P2 behavior
   touched.
2. **Review search = `scoreRootMoves` (full window, every root move) at depth
   cap 5 with a 1200 ms valve**, not `createSearch`. Exact full-window scores
   are directly comparable, which is what the loss bands need. Measured:
   depth 5 full-window costs 27 s on Kiwipete, so the valve is essential —
   sharp middlegames keep the last fully-completed depth (≥3), quiet positions
   reach 5. Worst-case `reviewMove` time ≈ 1.25 s (search-bound; detectors are
   single-digit ms after optimization).
3. **`loss === 0 ⇒ best`** (design says "0 & same move"): a move that exactly
   ties the best score is equally good — e.g. the second of two mate-in-ones —
   and calling it merely "good" would be wrong. Documented rather than silently
   deviating.
4. **Hanging reasons speak only in single-ply verifiable facts.** Whether the
   coach speaks at all is gated by a material-chain judgment (net ≥ 200 cp,
   stand-pat capture chains, pins respected via per-capture legality checks);
   the *sentences* then state facts checked by exhaustive enumeration: "for
   free" (no legal capture exists after it), "no piece of yours can capture
   that X back" (no capture onto the square), or "taking it back wins you only
   that pawn, worth far less than your knight" (arithmetic on values). This is
   the FR-006 guarantee: any intermezzo-tactics caveat applies to the gating
   judgment, never to a stated claim.
5. **Reason priority allows-mate > missed-mate > hanging > stalemate**, capped
   at two sentences (FR-005); the generic fix sentence ("A stronger move was
   moving your knight from b1 to c3.") fills the remaining slot — the
   missed-mate sentence already names the mating move, so it needs no second.
6. **Detectors are exported** (`mateInOne`, `hangingPiece`, `materialTally`):
   the tests machine-verify claims through them, and P4's hint (FR-008) will
   want the same one-sentence reasons.
7. **`hangingPiece` performance fix during the phase**: the first version ran
   the chain judgment on fully-generated legal move lists and blew up on
   capture-rich middlegames (7.5 s per call on pos 6). Rewritten to
   pseudo-legal capture generation + individual legality checks +
   most-valuable-first ordering with early break (same results, 7 ms). No
   behavior change; all tests re-run.

## Checks and results

- Phase check `node --test chess-coach/tests/review.test.js` → **18 pass, 0
  fail** (~23 s).
- Full suite `node --test chess-coach/tests/*.test.js` → **158 pass, 0 fail**
  (140 P0–P2 tests intact), stable across three consecutive runs.
- Done-when: 21 blunder probes (10 hanging + 6 missed mate + 5 allowed mate)
  each return the correct verdict, a machine-re-verified reason, and a legal
  better move; hanging claims detector-re-checked; good/best moves get a short
  ack with `betterMove: null`. ✓
- Per-call timing (this machine): quiet endgame ~0.7 s, opening ~1.2 s, sharp
  middlegame ~1.2 s (bounded by the review budget).

## Sample output (scripted beginner game, coach speaks after every move)

```
4. White plays d2d3 → inaccuracy (better: b1c3)
      A stronger move was moving your knight from b1 to c3.
5. White plays c4f7 → blunder (better: b1c3)
      Your bishop on f7 can now be captured by the king on e8, and no piece of yours can capture that king back.
      A stronger move was moving your knight from b1 to c3.
7. White plays d1h5 → blunder (better: b1c3)
      Your queen on h5 can now be captured by the knight on f6, and no piece of yours can capture that knight back.
      A stronger move was moving your knight from b1 to c3.
7. Black plays g7g6 → blunder (better: f6h5)
      A stronger move was capturing the queen on h5 with your knight from f6.
```

Stalemate-instead-of-mate probe (K+Q vs K):

```
verdict blunder, betterMove c6b6
      You missed checkmate: moving your king from c6 to b6 would have won the game at once.
      Your move leaves Black without a single legal move: that is stalemate, a draw, even though you hold more material.
```

## Known limits

- **Review depth is time-valved, not fixed**, on sharp middlegames (depth ≥3
  completes, cap 5) — verdicts near a band edge could differ on a much slower
  machine. Probe cases have wide margins; documented like P2's level-4 caveat.
- **`reviewMove` costs up to ~1.3 s per call** (search-bound). Fine for the
  hidden suite and for P4's per-move comments; if P4 finds the wait noticeable
  it can lower `REVIEW_BUDGET_MS` (exported constant) — verdicts on big
  mistakes are depth-2-stable.
- **Non-material mistakes** (positional errors, lost tempi beyond PST
  differences) get the honest but generic fix sentence rather than a concrete
  detector claim — true by construction, less instructive; the spec's probe
  classes (hanging pieces, missed mates, allowed mates) all get concrete
  reasons.
- The material-chain gate for hanging reasons uses a stand-pat capture game:
  in rare intermezzo positions the *gate* could over/under-fire, but the
  *sentences* never claim more than the enumerated single-ply facts (decision
  4), so no false claim can result.

## Handoff

Task / Dispatch: task_78a03c7387ef / ctx_0d50f07596bc
Role: builder (phase P3)
Base commit: d4852e4 · phase commit: see `git log -1` (one commit)
Output: `chess-coach/engine/review.js`, `chess-coach/engine/index.js` (facade
re-export), `chess-coach/tests/review.test.js`, this report
Decisions: see "Decisions made" (index.js facade edit; scoreRootMoves-based
review with 1200 ms valve; loss-0 ⇒ best; single-ply-fact reason wording;
reason priority + 2-sentence cap; exported detectors; hanging-detector
performance rewrite)
Checks: `node --test chess-coach/tests/review.test.js` → 18 pass;
`node --test chess-coach/tests/*.test.js` → 158 pass ×3 runs
Open questions: none
Next: code reviewer for P3; then P4 (playable app) consumes `reviewMove` and
the detectors for per-move comments and hints
