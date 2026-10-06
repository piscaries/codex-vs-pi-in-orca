# Product judge 9: Chess Coach, packets A and B

Scripts are in `judging/work/` (rules.mjs, match.mjs, coach.mjs, play.mjs, geom.mjs, depth.mjs, cdp.mjs). Both apps were served on localhost and driven in headless Chrome over the DevTools protocol.

## 1. Score table

| Line | A | B |
| --- | --- | --- |
| 1. Meets the brief (10) | **7.** Works end to end: 3 levels, hint, per-move verdict, recap, promotion dialog. Needs `node server.mjs` (a `file://` open gives 0 squares, same for B). Board rows are unequal. Reasons are often generic. | **8.** Works end to end: 4 levels, side choice, hint, per-move verdict, recap with transcript, promotion picker. Board colours are inverted and rows are unequal (line 8). |
| 2. Code quality (10) | **7.** `engine/{rules,search,coach,index}.js` plus `app/{game,main,worker}.js` is a clear split. `rules.js` is a 503-line monolith. Search profiles are hard-coded in `worker.js`. | **8.** Nine focused engine modules (board, moves, status, eval, search, levels, review, rng) and four UI modules. Small docs-in-code drift (the `index.js` header says bestMove arrived "in phase P2"). A test-only error collector sits in `index.html`. |
| 3. Tests (10) | **7.** `node --test`: 44/44 pass in 3.7 s. Includes perft depth 3, castling, en passant, a real-browser test, and a coaching fixture of 20 comments. Fewer behaviour cases than B. | **9.** `node --test`: 201/201 pass in 14 s. Covers game flow, hint, promotion cancel, repetition, 50-move rule, mate-in-1 on 10 positions, level ordering, and true-blunder-reason integration. |
| 4. Robustness (10) | **7.** Bad FEN or UCI throws a clear `TypeError`/`Illegal move`. `bestMove` on a terminal position throws (`Cannot search a terminal position`). Worker error shows an in-page message. Mid-game reset asks for confirmation. | **7.** Same clear throws (`invalid FEN…`, `no move to find: position is checkmate`). Illegal clicks are ignored, input is locked during the reply, promotion can be cancelled. Main thread blocks up to 742 ms during a search. |
| 5. Rules correctness (10) | **10.** Perft matches the published numbers on start (d1–5: 20/400/8902/197281/4865609), Kiwipete d1–4, positions 3, 4, 5, 6 (d1–4/5). The `gameStatus` checks match: mate, stalemate, 50-move, K v K and K+B v K are draws, K+N+N v K is ongoing. En passant, castling through check (throws), promotion without suffix (throws), and junk FEN (throws) all behave. | **10.** Identical results on every perft and every special-move check above (same table, no discrepancy). The two engines disagreed on `gameStatus` at no point in the 16 games. |
| 6. Engine strength (15) | **6.** `bestMove` is capped by default `DEFAULT_MAX_DEPTH = 4`, so extra time is never used. With 1000 ms: start position depth 4 at about 46k nps; Kiwipete only depth 1 in the full second (24k nodes). No transposition table; `gameStatusForPosition` is called at every node. **Lost 1 win / 2 draws / 13 losses** against B. | **13.** With 1000 ms: start depth 5, Kiwipete depth 4, K+P endgame depth 9, returning early in 450–640 ms. **Won 13 / drew 2 / lost 1** against A, with 200 ms/move, 8 openings, colours swapped, 16 games, no illegal moves, max move time 215 ms. |
| 7. Coaching quality (15) | **6.** Real tactical reasons: "Your opponent can checkmate by moving their queen from h5 to f7" (true). But `a2a3`, `f2f3` and `g1h3` from the start are all "best: That was the strongest move" (false claim). Missing a free queen is explained as "your opponent can capture your queen on d1" (true but the actual problem is the missed capture; the king protects d1). `a7a8n` is "inaccuracy" with `betterMove: a1a2` (wrong; `a7a8q` is the fix). Stalemate blunder: "misses a chance to checkmate" (true, never mentions the stalemate). Inaccuracies often say only "A stronger move was available." | **12.** Reasons are concrete and verified in the cases I tried: "Your bishop on a6 can now be captured for free by the pawn on b7", "You missed checkmate… Your move leaves Black without a single legal move: that is stalemate", "A stronger move was capturing the queen on d5 with your queen from d1". Quiet good moves get "Good move." only. `f2f3` is "inaccuracy" with `b1c3`. Weak spots: `a7a8n` is "blunder" (harsh), betterMove sometimes does not address the hanging piece, and wording like "moving your knight from b1 to c3" is wordy. |
| 8. Responsiveness and board (15) | **9.** Search runs in a Web Worker: page gap max 3–9 ms during play. Level "Challenging" replied in 1.72–1.76 s on every move (14 moves), under 2 s but near the limit (review 620 + reply 1050 ms). Board: a1 dark and a8 light (correct), check/turn/last move shown in text. **Squares are not equal:** widths 88 px, heights 122.4 px (ranks with pieces) vs 53.6 px (empty ranks) at 1200×900, and also at 800×700 and 390×844. | **5.** Replies 1.09–1.78 s at level 4 (8 moves), under 2 s. Search runs on the main thread in chunks: **page gaps of 668–742 ms** (a visible freeze). Board: **colours inverted:** a1 = `rgb(240,217,181)` (light), a8 = `rgb(181,136,99)` (dark), measured with `getComputedStyle`. **Squares are not equal:** 69 × 94.2 px vs 69 × 43.8 px at 1200×900 and 800×700, and 43.8 × 59.9/27.6 at 390 px. Check and last move are shown ("Your move — you are in check!"). |
| 9. End-of-game review (5) | **4.** Game over after move 14: recap listed Moves 6, 8, 14 with the exact text shown during the game. Played moves only. Wording "move from a2 to a4" is plain but without piece names. | **5.** Recap after the mate lists only worst moves actually played (moves 5, 7, 8), text identical to the in-game comments. Includes a transcript. |

## 2. Totals

| | General (40) | Task-specific (60) | Total (100) |
| --- | --- | --- | --- |
| **A** | 28 | 35 | **63** |
| **B** | 32 | 45 | **77** |

## 3. Per line: which is better

1. Meets the brief: B, more of the brief works (side choice, 4 levels, transcript); both have board defects.
2. Code quality: B, smaller single-purpose engine modules.
3. Tests: B, 201 vs 44 tests with behaviour coverage that would catch regressions.
4. Robustness: tie, both throw clear errors and keep the UI usable; B's input lock is better, A's responsiveness is better.
5. Rules correctness: tie, every perft and special-move check matched in both.
6. Engine strength: B, won 13–1 with 2 draws and searches 1–5 plies deeper.
7. Coaching quality: B, reasons are true and concrete, and A tells beginners that weak opening moves are "the strongest move".
8. Responsiveness and board: A, B freezes the page for up to 742 ms and has inverted square colours; both have unequal squares.
9. End-of-game review: tie in substance (both match the game); B marginally more complete.

## 4. Fatal problems

- **B:** the board colours are wrong (a1 is light), which breaks the "a1 dark" requirement. Not fatal to play, but the board is plainly wrong to anyone who knows chess. The main thread freezes for about 0.7 s while it thinks, against "the page never freezes".
- **A:** the engine is capped at depth 4 and loses clearly to B. Coach labels weak opening moves "best" and gives a wrong better move for an underpromotion.
- **Both:** the board squares are not equal (rows with pieces are about 2.2× taller than empty rows), and neither app opens from `file://` without a server.
- No P1 requirement is impossible in either. Neither engine allowed an illegal move or rejected a legal one.

## 5. Verdict

Ship B. Its rules are equal to A's, its engine beats A 13–1–2, and its coach gives true, concrete reasons where A gives generic or false "best" labels. B's board colours and main-thread stalls need fixing first, and A's worker-based UI is the better foundation for responsiveness, but B is the stronger coach.
