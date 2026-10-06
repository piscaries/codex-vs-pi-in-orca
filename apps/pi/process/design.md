# Engineering design and build plan

## 1. Codebase facts

- **Greenfield.** No chess code exists; `chess-coach/` is absent (verified `ls`). Repo `tests/` are Python for an unrelated project — untouched.
- **Node v26.0.0**, `node --test <glob>` works (verified with a scratch ES-module project). Repo root has no `package.json`, so `.js` defaults to CommonJS; a `chess-coach/package.json` with `{"type":"module"}` (verified) makes our `.js` files ES modules in Node **and** importable by the hidden suite and the browser unchanged.
- **Chrome 154** headless available (verified). No packages, no build step, no network at runtime; the engine avoids all Node-only APIs so the same files run in the browser.

## 2. Architecture

```
chess-coach/
  package.json            {"type":"module"}
  engine/                 pure, no DOM, no Node APIs
    index.js              fixed facade: legalMoves, applyMove, perft, gameStatus, bestMove, reviewMove
  board.js              position (120-square mailbox), FEN parse/print, make/unmake, isCheck
  moves.js              legal move generation incl. castling/en-passant/promotions
  status.js             checkmate/stalemate/fifty-move/insufficient-material
  eval.js               material + piece-square tables (centipawns, White POV)
  rng.js                seeded PRNG (deterministic level tests)
  search.js             iterative-deepening alpha-beta + quiescence, deadline-driven, steppable
  levels.js             level → {maxDepthMs, blunderChance, candidatePool}
  review.js             verdict classification + truthful concrete reasons
  app/
    index.html (at chess-coach/index.html), app.css
    main.js               boot, level select, new game, side choice
    game.js               game loop, history, repetition draw, turn/state machine
    board-ui.js           board render, click-move, promotion picker, last-move/check/turn badges
    coach-panel.js        per-move verdict UI, hint button
    review-panel.js       end-of-game review; copy-as-text
  scripts/levels-check.js statistical level check (seeded self-play)
```

Data flow: UI events → `game.js` → engine facade (sync for rules) and a **steppable search** for the reply; `search.js` exposes `createSearch(pos, budgetMs)` whose `step()` advances one root-move/depth chunk — `bestMove()` drains it synchronously (Node/tests), `game.js` drains it across `setTimeout` chunks so the page never freezes (no Worker: workers fail on `file://`, which the brief requires supporting).

## 3. Contracts

- Fixed facade (brief): `legalMoves(fen)→string[]` (all four promotions listed, e.g. `e7e8q`); `applyMove(fen,uci)→fen` (throws `Error("illegal move: …")`); `perft(fen,depth)→int` (`depth 0 → 1`); `gameStatus(fen)→"ongoing"|"checkmate"|"stalemate"|"draw"`; `bestMove(fen,{timeMs=1000})→uci` (throws on terminal positions); `reviewMove(fen,uci)→{verdict,reasons[],betterMove}`.
- `gameStatus` order: no legal moves → check? checkmate : stalemate; halfmove clock ≥ 100 → draw; insufficient material (K, K+minor, KB-vs-KB same color) → draw. **Threefold repetition is undetectable from a bare FEN** (no history in a FEN); `gameStatus` returns `"ongoing"` for it, and `app/game.js` declares repetition draws by tracking its own position-history list. This is the only place the fixed interface cannot see the app's rule.
- `createSearch(pos,budgetMs) → {step(): {done:boolean, move:uci, scoreCp:number, depth:number}}`; scores are centipawns from the side-to-move's perspective; search always returns a legal move by the deadline.
- `review.reviewMove(fen,uci)`: classification from search scores — `score(best) − score(played)` in cp: 0 & same move → best; ≤ 50 → good; ≤ 110 → inaccuracy; ≤ 250 → mistake; more, or newly allows mate → blunder (mate available before and lost → at least mistake, stated as missed mate). `reasons` come **only** from concrete feature detectors (`hangingPiece(fen)`, `mateInOne(fen,color)`, material tally) verified on the exact position — never from search internals — which is how FR-006 truthfulness is guaranteed. `betterMove` is the search's best move; `null` for best/good.
- `rng(seed) → ()=>float` shared by levels and `scripts/levels-check.js` for reproducibility.

## 4. Key decisions

1. **Own move generator** (no engine library possible — no packages). Verified by perft against known node counts plus targeted FEN suites (castling through check, e-p pins, underpromotion). Alternatives: none within constraints.
2. **Steppable search over Worker/threads.** Workers break on `file://`; sync `bestMove` also satisfies the hidden suite. Cost: search pauses are cooperative, fine at our depths.
3. **Levels weaken play honestly** (FR-003): level = {time/depth cap, chance of picking a worse root move, size of candidate pool}. Lowest: depth 1 + 60% random legal move among top-5; highest: full budget (~1.2 s cap so p95 < 2 s). Weaker search, not illegal or absurd moves; hints always use full strength (spec decision).
4. **Reasons from concrete detectors, not eval numbers** (FR-006/007): templates like "Your knight on f6 can now be captured for free by the pawn on g5."; good moves get "Good move." only.
5. **Verdict thresholds in cp** (§3) tuned so SC-002 probes (hanging pieces ≥ ~300 cp loss) land as blunder/mistake.

## 5. Cross-cutting concerns

- **Failure handling:** `applyMove` throws; UI ignores illegal clicks quietly; terminal positions refuse input; search always answers by deadline with a legal move (fallback: first legal move).
- **Security/secrets:** no secrets, no network, no storage beyond in-memory game state; nothing to commit beyond code and docs.
- **Testing:** `node --test chess-coach/tests/*.test.js`; perft vectors; ≥20 blunder probes; seeded level self-play; headless-Chrome UI smoke (`scripts/ui-smoke.sh`: page loads, board DOM present, zero console errors) for SC-006; human demo is the final proof.
- **Observability:** none at runtime beyond a clean console; `game.js` keeps the full move log that the review reuses (SC-005).

## 6. Build phases

| Phase | Outcome | Owned files | Depends | Check | Done when |
|---|---|---|---|---|---|
| **P0** Board core | FEN in/out, make/unmake, check detection | `package.json`, `engine/board.js`, `tests/board.test.js` | — | `node --test chess-coach/tests/board.test.js` | FEN round-trips on 20 FENs incl. edge (no ep, full castling rights); make/unmake restores position exactly |
| **P1** Rules | Exactly-legal movegen, castling/en-passant/promotion, `status.js`, facade `legalMoves/applyMove/perft/gameStatus` | `engine/moves.js`, `engine/status.js`, `engine/index.js`, `tests/rules.test.js` | P0 | `node --test chess-coach/tests/rules.test.js` | perft: start d4=197281, Kiwipete d3=97862, plus 4 targeted suites (castling-through-check, ep-pin, promotion, draw statuses); `applyMove` throws on illegal; `gameStatus` correct on 15 status FENs |
| **P2** Search & levels | `eval/rng/search/levels.js`, facade `bestMove` | `engine/eval.js`, `engine/rng.js`, `engine/search.js`, `engine/levels.js`, `tests/search.test.js`, `scripts/levels-check.js` | P1 | `node --test chess-coach/tests/search.test.js && node chess-coach/scripts/levels-check.js` | `bestMove` legal and ≤ timeMs+50 ms over 50 FENs; mate-in-1 found in all 10 mate FENs; seeded self-play: weak proxy wins ≥6/10 at level 1, ≤1/10 at level 4 (SC-003) |
| **P3** Coach | `review.js`, facade `reviewMove` | `engine/review.js`, `tests/review.test.js` | P2 | `node --test chess-coach/tests/review.test.js` | ≥20 blunder probes return correct verdict, a verified-true reason, legal better move; hanging-piece claims machine-verified (detector re-check); good moves → `[short ack]`, `betterMove:null` |
| **P4** Playable app | Board UI, move input, promotion picker, levels, async computer reply, per-move comments, hint | `chess-coach/index.html`, `app/app.css`, `app/main.js`, `app/game.js`, `app/board-ui.js`, `app/coach-panel.js`, `scripts/ui-smoke.sh`, `tests/ui-contract.test.js` | P3 | `node --test chess-coach/tests/ui-contract.test.js && bash chess-coach/scripts/ui-smoke.sh` | Play a full game in Chrome: legal clicks only, promotion asked, reply <2 s with page interactive, comment after each user move, hint works, check/last-move/turn visible |
| **P5** Endgame & polish | Review panel, draw/mate messages, new game, play Black, copy transcript | `app/review-panel.js`, edits to `app/main.js`/`app/game.js`/`index.html` | P4 | `node --test chess-coach/tests/*.test.js && bash chess-coach/scripts/ui-smoke.sh` + manual demo | Review lists ≤5 inaccuracy-or-worse user moves, matching in-game verdicts verbatim (SC-005); draw reasons in plain words; SC-006 demo runs clean |

## 7. Parallelism and integration

One builder runs phases sequentially (strict chain P0→P5); no two phases share files (P5 re-edits P4 files and is sequenced after it). Contracts (`engine/index.js` signatures, `createSearch`, review thresholds) freeze at end of P2; later changes go through the coordinator. Rollback: each phase is one commit; its check gates the commit, so reverting restores the prior working whole.

## 8. Traceability

| Req | Phase | Check |
|---|---|---|
| FR-001 | P1 | rules.test.js perft + targeted suites |
| FR-002 | P1/P2/P3 | facade tests; time bound in search.test.js |
| FR-003 | P2 | scripts/levels-check.js (SC-003) |
| FR-004 | P4 | ui-smoke + manual: reply <2 s, interactive page |
| FR-005 | P3 | review.test.js verdict scale + betterMove legal |
| FR-006 | P3 | probe reasons re-verified by detectors; SC-002 |
| FR-007 | P3/P4 | review.test.js wording asserts + SC-004 read-through |
| FR-008 | P4 | hint button: legal move + one sentence; never auto-plays |
| FR-009 | P5 | review-panel test + SC-005 comparison |
| FR-010 | P4 | ui-smoke DOM asserts (turn/last-move/check badges) |
| SC-001 | all | hidden suite over `engine/index.js` (facade frozen P1–P3) |
| SC-002/3/4/5/6 | P2/P3/P5 | as rows above; SC-004/006 by human-style read and demo |

## 9. Quality-bar verification

Beyond tests: (a) P3's scripted **truthfulness prober** asserts every concrete claim against the position (bar #2); (b) after P5 the owner reads one full transcript board-hidden (SC-004) and plays the demo (SC-006); (c) a novice-proxy plays level 1 and level 4 once each to feel the gap (bar #6). Findings route back as rework to P3/P4/P5.

## 10. Risks and escalation

- **Movegen bugs are the top risk** (bar #1): mitigated by perft + targeted suites in P1; any perft mismatch blocks the phase.
- **Statistical level check flaky** → fixed seed makes it deterministic; if thresholds still fail, escalate level parameters, never weaken the check.
- **file:// quirks in Chrome** (module imports): ui-smoke covers both `file://` and a static server; if `file://` fails irrecoverably, escalate (brief allows a local server).
- **Effort:** P0 0.5 d, P1 1 d, P2 1 d, P3 1 d, P4 1.5 d, P5 0.5 d; escalate any phase overrun beyond half again.
- Builders stop and escalate: any change to the frozen facade, any perft failure they can't fix in phase, any UI freeze >200 ms per chunk.
