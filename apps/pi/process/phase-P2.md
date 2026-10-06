# Phase P2 report — search & levels (track t2)

Task / Dispatch: task_6c2b809bc10b / ctx_3292c8a0ccbd
Base commit: 17415dc → phase commit a56b6be (branch r5-t2-p2)

## What was built

Exactly phase P2 of `docs/run5/design.md`:

- **`chess-coach/engine/eval.js`** — static evaluation: material + piece-square
  tables (Michniewski's simplified evaluation), centipawns, White POV;
  `evaluateStm` flips to the side to move. Endgame king tables selected by a
  material-phase rule (no queen, or queen plus at most one rook's worth of
  support).
- **`chess-coach/engine/rng.js`** — mulberry32 seeded PRNG (`rng(seed) → () ⇒ float`,
  plus `intBelow`); the single source of randomness for levels and self-play,
  so runs are reproducible.
- **`chess-coach/engine/search.js`** — iterative-deepening fail-soft alpha-beta
  with quiescence: check evasions searched in quiescence (so mate-in-1 is
  found even at depth 1), MVV-LVA ordering, delta pruning, check extension,
  mate scores `MATE_SCORE − ply`, deadline checked every 256 nodes.
  - `createSearch(pos, budgetMs)` → `{step(): {done, move, scoreCp, depth}}`
    advances one root-move/depth chunk per call (design §3 contract).
  - `scoreRootMoves(pos, {maxDepth, budgetMs})` → exact full-window root
    scores, best first (for level candidate pools).
  - The searched `pos` is never mutated (per-root-move clones), so an aborted
    search can never corrupt the caller's position.
- **`chess-coach/engine/levels.js`** — levels 1–4 as
  `{maxDepth, budgetMs, blunderChance, candidatePool}` (see decisions).
- **`chess-coach/engine/index.js`** — facade `bestMove(fen, {timeMs=1000})`:
  throws on any terminal status, honors `timeMs`, always returns a legal move.
- **`chess-coach/tests/search.test.js`** — 34 tests.
- **`chess-coach/scripts/levels-check.js`** — seeded statistical level check (SC-003).

## Decisions made

1. **Edited `engine/index.js` (not listed in P2's owned-files column).** The
   design directs this three times: §2 lists `bestMove` in the index.js
   facade, §6's P2 outcome is "facade bestMove", §7 freezes "engine/index.js
   signatures" at end of P2, and P1's index.js header says "bestMove arrives
   with search in phase P2". The edit is additive (one import + one export);
   no P1 behavior touched.
2. **Level fields spelled `{maxDepth, budgetMs, blunderChance, candidatePool}`**
   instead of the design's compressed `maxDepthMs` — same three knobs, clearer
   names. Values: L1 depth 1 / 60% / pool 5 (as pinned in design §4); L2
   depth 2 / 35% / 3; L3 depth 4 / 15% / 2; L4 full search / 1200 ms / 0% / 1.
3. **Levels 1–3 are depth-capped only** (their `budgetMs` is a 60 s safety
   valve): move choice then depends only on the seed, making level play and
   the levels-check reproducible. Level 4 is time-capped (1200 ms) per design.
4. **Novice proxy for SC-003** (my definition; the spec says only
   "novice-strength opponent"): depth-1 quiescence-aware best move 85% of the
   time, uniformly random legal move 15%. Calibrated honestly: at 75% the
   proxy lost to level 1 (2/10), at 85% it wins 7/10 — a beginner who takes
   the obvious move but blunders often.
5. **`bestMove` throws for every non-ongoing `gameStatus`** (checkmate,
   stalemate, fifty-move, insufficient material) — "terminal positions" read
   as game over. Repetition still returns ongoing (no history in a FEN,
   design §3).
6. **Quiescence generates only pseudo-captures/promotions out of check** and
   legality-checks just those (full legal generation only for check
   evasions) — this fixed a real perf problem (Kiwipete reached only depth 2
   in 1 s; now depth 4–5). `board.js`/`moves.js` untouched (P0/P1-owned).
7. **Deadline granularity 256 nodes**: the first full-suite run flaked once
   under parallel test processes (overshoot past timeMs+50); finer deadline
   checks fixed the root cause. Contract bounds in tests were NOT weakened;
   full suite then passed 5/5 consecutive runs.

## Checks and results

- `node --test chess-coach/tests/search.test.js` → 34 pass, 0 fail (~14 s).
- `node chess-coach/scripts/levels-check.js` → PASS: proxy 7/10 wins at
  level 1 (≥6 required), 0/10 at level 4 (≤1 required); ~3.5 min runtime
  (level 4 thinks up to 1.2 s/move).
- `node --test chess-coach/tests/*.test.js` → 140 pass, 0 fail (106 P0/P1
  tests intact), stable across 5 consecutive runs.
- Design done-when for P2: 50-FEN legality+time bound ✓ (30 seeded-random
  game positions + 20 curated, each ≤ timeMs+50); mate-in-1 found in all 10
  mate FENs ✓ (each verified by applyMove → gameStatus checkmate); seeded
  self-play thresholds ✓ (above).

## Sample output

```
level 1 summary: proxy 7, engine 2, draws 1
level 4 summary: proxy 0, engine 10, draws 0
levels-check: PASS
```

Search sanity (1 s budget): Kiwipete depth 4 `e2a6` +45 cp; start depth 5;
pos5 depth 5 `d7c8q` +515 cp; mate score reported as 99999.

## Known limits

- **No repetition/50-move awareness inside the search** (only the app's game
  loop and levels-check track repetition); search can shuffle in the tree.
- **Level 4 is time-capped**, so its exact moves (and the level-4 self-play
  games) can vary slightly across machines/loads; the 10–0 margin is wide.
- **`step()` granularity is one root-move subtree**; at high depths a single
  step can exceed 200 ms on slow machines. The design accepts this
  architecture (§2: no Worker on file://); P4 drains steps across setTimeout
  chunks and can lower the level-4 budget if jank shows up in the demo.
- **levels-check takes ~3.5 min** (dominated by level-4 thinking time);
  acceptable for a statistical gate, noted for reviewers.
- Eval is the simplified PST set — fine for beginner coaching strength, not
  tournament play (by design).

## Handoff

Task / Dispatch: task_6c2b809bc10b / ctx_3292c8a0ccbd
Role: builder (phase P2)
Base commit: 17415dc · Phase commit: a56b6be
Output: `chess-coach/engine/{eval,rng,search,levels}.js`, `chess-coach/engine/index.js` (facade edit),
`chess-coach/tests/search.test.js`, `chess-coach/scripts/levels-check.js`, this report
Checks: `node --test chess-coach/tests/search.test.js` → 34 pass; `node chess-coach/scripts/levels-check.js` → PASS (7/10, 0/10);
`node --test chess-coach/tests/*.test.js` → 140 pass ×5 runs
Open questions: none blocking (decision 1 documents the index.js ownership call)
Next: code reviewer for P2; then P3 (coach review.js) consumes `createSearch`/`scoreRootMoves`/`PIECE_VALUES`
