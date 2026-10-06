# Blind product judgment: A and B

**A: 63/100. B: 62/100. Forced choice: A, narrowly. Neither packet meets the frozen quality bar.**

I inspected only the supplied A and B packets and this task's scratch work; I did not inspect authorship, branches, or history. I completed A's independent assessment before opening B, completed B's independent assessment before comparing them, and then finalized the engine scores using equal-budget games. The supplied packets contain neither a spec nor a design: A supplies `DEMO.md`; B supplies no Markdown document. This is a delivery omission, not a claim about documents outside the judged packets.

All commands ran on Node **v26.0.0**. Browser checks used `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`, headless Chrome over its DevTools protocol, and localhost static servers. I clicked the rendered squares and controls, measured their bounding boxes and computed colours, and sampled a 20 ms page timer while the apps worked. A's supplied query seam and B's exported `boot({fen, level})` initialized special positions; ordinary full games started from the standard board and used the actual coach and computer. Neither product was edited.

Bands in the table: **Q1** = top quarter; **Q2** = second quarter; **Q3** = third quarter; **Q4** = bottom quarter. Evidence labels refer to commands and outputs reproduced below, not to an author's claim.

## Score table

| Rubric line | A: score, band, evidence | B: score, band, evidence |
| --- | --- | --- |
| 1. Meets the brief /10 | **6, Q2.** Exactly six exports; legal browser play, three strengths, hints, promotion, mate and review work (E1, E3). But the delivered spec/design are absent, the board is distorted, and a user-ending repetition draw cannot complete coaching or show its recap (E4). | **5, Q2.** Exactly six exports; four strengths, hints, promotion and a full game/review work (E1, E3). Missing spec/design, page freezes, unequal squares, light a1, delayed repetition, and coaching with an incorrect square or no actual improvement prevent full compliance (E4–E5). |
| 2. Code quality /10 | **8, Q1.** `engine/index.js:12–33` is a small facade over distinct rules, search and coach modules; `app/game.js` separates state from DOM/worker code and validates a complete reply before updating it (`completeCoachAndReply`, lines 134–180). Clear names and focused helpers make it easy to follow. | **7, Q2.** Rules, evaluation, search, levels, controller and panels have useful boundaries, and time/randomness/scheduling are injected in `app/game.js`. However, move wording is duplicated in `engine/review.js:185–213` and `app/game.js:72–100`, including the same wrong en passant wording; board creation and rendering use inconsistent parity formulas (`app/board-ui.js:32,51`). |
| 3. Tests /10 | **7, Q2.** The initial `node --test` run passed **43/44**, failing the exact coaching suggestion assertion at `tests/quality.test.js:69`; a rerun passed **44/44**, and isolated quality tests passed **5/5** (E2). It has a real CDP interaction test and meaningful rules/session/replay assertions, but deadline-dependent golden suggestions are flaky, and tests miss actual worker integration on repetition and measured geometry. | **7, Q2.** `node --test` passed **201/201**, covering six standard perft positions, tactics, legality, exchange claims, scheduling, disposal, and stored review identity; its own smoke script also passed (E2). Important gaps remain: smoke asserts boot/piece counts, simulated scheduler tests do not establish page responsiveness, and tests explicitly expect the incorrect en passant sentence (`tests/ui-contract.test.js`, test “moveWords”). They miss board parity/geometry and a blunder's same-move fix. |
| 4. Robustness /10 | **6, Q2.** Public malformed FEN, illegal moves, bad depth and bad search options throw cleanly; session updates are atomic, stale requests are ignored, and New game replaces a failed worker. But the real repetition result leaves `busy: true`; the UI's error path clears the request without completing or rolling back the pending turn (`app/main.js`, `handleWorkerMessage`; E4). | **6, Q2.** Illegal clicks leave play unchanged, bad computer moves have a legal fallback, and disposal prevents stale work in a new game (`app/game.js`, `finishReply` and `dispose`; own tests). Boundary handling is weaker: a kingless FEN returns `[]`, and `timeMs: -1` silently becomes a roughly one-second search (E1; `engine/index.js:59`); scheduled coaching/reply callbacks have no exception recovery (`app/game.js:214–232`). |
| 5. Rules correctness /10 | **9, Q1.** All five independent perfts, special moves and status probes pass (E1). Its repetition key correctly normalizes unusable en passant and detects the true third occurrence; the session correctly refuses a move after the draw (E4). The worker/coaching completion failure is assessed under brief, robustness and review. | **7, Q2.** The same independent rules probes pass (E1), and ordinary repetitions finish successfully. However, `app/game.js:127` retains an unusable en passant target in position identity, missing the true third occurrence and allowing an extra computer move (E4). |
| 6. Engine strength /15 | **6, Q3.** Legal and timely, but **0 wins, 1 draw, 3 losses** at the same 250 ms budget (E6). At 500 ms it completes depths **3/0/4** on start/Kiwipete/rook endgame; Kiwipete returns the static fallback `f3f6` without completing depth one. Default search is capped at four, and its purported weakening noise barely separates ordinary moves (E6). | **13, Q1.** **3 wins, 1 draw, 0 losses**, winning with both colours; all match moves are legal in both engines (E6). At 500 ms it completes depths **4/3/6**, with check extensions, quiescence and more useful positional evaluation. Measured search calls respect their budget. This is strong evidence against A, not an independently established rating or proof of strength against other engines. |
| 7. Coaching quality /15 | **9, Q2.** Hanging queen, missed free queen and Fool's Mate receive true, concrete capture/mate explanations and legal alternatives; a stalemating queen move gets a mating fix (E1, E5). Responses are brief. Calibration is weak: a3 and e4 both get “That was the strongest move”; a delayed mate also gets that claim despite mate in one being available. A late-game blunder names an available pawn capture rather than the more consequential mating problem. | **7, Q3.** Normal tactical examples explain pieces, squares and remedies well, and missed mate/stalemate detectors are useful (E1, E5). Several substantial gaps: en passant describes a pawn on empty d6; a best-scored move is called a blunder and recommended again; browser move 7 gets only “A stronger move was…” without a concrete problem. Two reasons plus the panel's repeated Better sentence produce three sentences (E3, E5). |
| 8. Responsiveness and board /15 | **9, Q2.** Measured level replies **102/966/1686 ms**, full-game maximum **1713 ms**, timer gap maximum **23.8 ms**: genuine background-worker responsiveness. Correct dark a1, turn text, two last-move squares and checked king are present. But square heights vary dramatically while widths are equal, on both viewports (E3). | **5, Q3.** Replies **564/558/868/1201 ms**, full-game maximum **1708 ms**, and last move/check/turn are shown. Yet measured page timer gaps are **508–834 ms** across levels; synchronously scheduling a 500 ms coach is still a freeze. Both viewports have unequal row heights, and rendered a1 is light (E3). |
| 9. End-of-game review /5 | **3, Q2.** Normal complete game lists played moves **5, 7, 11**, with their original comments; a one-move mate review also matches (E3). The user-ending repetition draw never finishes its pending review and leaves the recap unavailable (E4), so this requirement is not reliable across endings. | **5, Q1.** The full game's five selected entries are played user moves **7, 11, 1, 3, 4** in severity order; verdicts, reasons and recommendations match their in-game comments verbatim. The one-move mate review also matches, and the supplied tests verify selection and identity (E2–E3). Existing coaching errors are faithfully repeated, not invented by the review. |

| Packet | General /40 | Chess coach /60 | Total /100 |
| --- | ---: | ---: | ---: |
| A | **27** | **36** | **63** |
| B | **25** | **37** | **62** |

## Run evidence

### E1 — Fixed interface and independent engine checks

Command: `node judging/work/engine-probe.mjs A`, then the same command with `B`. Both exported exactly `applyMove, bestMove, gameStatus, legalMoves, perft, reviewMove`.

| Position | Depth | Expected | A | B |
| --- | ---: | ---: | ---: | ---: |
| Standard start | 4 | 197281 | 197281 | 197281 |
| Kiwipete | 3 | 97862 | 97862 | 97862 |
| Rook/en passant: `8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1` | 4 | 43238 | 43238 | 43238 |
| Promotion/castling: `r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1` | 3 | 9467 | 9467 | 9467 |
| Check/promotion: `rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8` | 3 | 62379 | 62379 | 62379 |

Both forbid `e1g1` through the bishop's attack in `r3k2r/8/8/8/2b5/8/8/R3K2R w KQkq - 0 1`, allow `e1c1`, forbid horizontally pinned en passant `g5f6` in `8/8/8/r4pPK/8/8/8/7k w - f6 0 1`, and correctly apply knight underpromotion and removal of a captured rook's castling right. Mate overrides the fifty-move clock; stalemate, fifty-move draw, same-colour bishop draw, opposite-colour bishops and two knights all return the expected statuses. This is substantial coverage, not an exhaustive proof of chess correctness.

Malformed-input outputs included:

```text
A legalMoves(kingless FEN): TypeError: FEN must contain exactly one king of each color
B legalMoves(kingless FEN): []
A bestMove(start, {timeMs:-1}): TypeError: timeMs must be a non-negative finite number
B bestMove(start, {timeMs:-1}): b1c3 (default budget, not rejection)
Both applyMove(start, 'e2e5'): throws illegal move
Both perft(start, -1): throws bad depth
```

### E2 — Authors' tests

Commands: `(cd judging/product/A && node --test)` and `(cd judging/product/B && node --test)`.

```text
A initial: tests 44; pass 43; fail 1
  twenty curated comments stay concise, plain, and calibrated
  AssertionError: queen-pawn-white; actual e3c5; expected a1a2
  tests/quality.test.js:69
A rerun: tests 44; pass 44; fail 0
A node --test tests/quality.test.js: tests 5; pass 5; fail 0
B: tests 201; pass 201; fail 0
```

A's first failure is a deadline-sensitive expected-move mismatch, not evidence that `e3c5` is illegal. That distinction matters: the suite is flaky, while its replay assertions still establish many true capture claims. B's additional command `(cd judging/product/B && bash scripts/ui-smoke.sh)` returned `ui-smoke: PASS` for both file access with Chrome's module flag and localhost; it checks startup, not a full game.

### E3 — Measured product checks and full games

Commands: `node judging/work/browser-A.mjs` and `node judging/work/browser-B.mjs`. Geometry was read with `getBoundingClientRect()` from all 64 actual `.square` elements after startup rendering.

| Packet / viewport width | Square widths, px | Square heights, px | Maximum width/height difference |
| --- | --- | --- | ---: |
| A / 1280 | 88.953–88.969 | 54.563–123.375 | 34.422 |
| A / 390 | 44.750 | 31.141–58.359 | 13.609 |
| B / 1280 | 69.000 | 43.797–94.203 | 25.203 |
| B / 390 | 43.750 | 27.641–59.859 | 16.109 |

A's a1 computed background is `rgb(168, 185, 159)` (dark sage) and a2 is `rgb(233, 221, 191)` (light cream). B's a1 is `square light`, `rgb(240, 217, 181)`, while a2 is dark brown `rgb(181, 136, 99)`. Both CSS boards define eight equal columns and an overall aspect ratio but omit equal row tracks; content determines row heights. B's render parity at `app/board-ui.js:51` uses the character code of `a` instead of its zero-based file index.

| Packet | Levels tested | Click-to-reply times, ms | Maximum 20 ms timer gaps during those replies, ms |
| --- | --- | --- | --- |
| A | Beginner / Club / Challenging | 102 / 966 / 1686 | 22.2 / 21.9 / 22.8 |
| B | 1 / 2 / 3 / 4 | 564 / 558 / 868 / 1201 | 507.8 / 509.1 / 833.5 / 546.4 |

Hints were legal and did not play a move. Both underpromoted via their actual picker to a knight and completed an insufficient-material draw. Both displayed two last-move squares, a check highlight, whose turn it was, and a mate result. These timing samples show B's event loop blocking; they do not establish a guarantee that either app always replies within two seconds on every position.

I also completed one standard-start game in each page at its highest level, choosing legal weak user moves with a deterministic random stream. A ended in checkmate after **24 plies**; B after **22 plies**. A's maximum reply was **1713 ms** and timer gap **23.8 ms**; B's were **1708 ms** and **673.2 ms**. No runtime exceptions occurred in these ordinary games. A's recap used the stored comments for moves 5, 7 and 11; B's used moves 7, 11, 1, 3 and 4, all matching the corresponding in-game comments.

B's Fool's Mate comment in the rendered page was:

```text
After this move, Black can deliver checkmate: moving their queen from d8 to h4 would end the game.
A stronger move was moving your knight from b1 to c3.
Better: moving your knight from b1 to c3.
```

The second and third sentences repeat the same fix. Its full-game move 7 (`f2f4`) was labelled a blunder with only `A stronger move was moving your pawn from f2 to f3.` as its reason, leaving the beginner without the concrete cause.

### E4 — Common draw failures

I replayed this legal sequence through each app's game core with scripted legal black replies: `e2e4 b8c6 g1f3 c6b8 f3g1 b8c6 g1f3 c6b8 f3g1`. After the ninth ply the black-to-move position has occurred three times: the initial `e3` en passant target after e4 permits no capture and must not distinguish the position.

For A I then passed the actual pending move through the **actual worker handler**, using its Beginner profile, and fed that result to `completeCoachAndReply`:

```text
pending status: draw; busy: true
worker: ok: true; uci: d7d5; review.verdict: best
ERROR A terminal position cannot accept a computer move
busy remains true
```

The worker uses `gameStatusForPosition(after)` without history (`app/worker.js:63–65`); the session knows the repetition and refuses any reply (`app/game.js:150–151`). `renderRecap` requires `!game.busy`, so the actual UI integration cannot show the recap for this ending. A's supplied repetition test uses a manually correct reply instead of exercising this bridge.

B's raw first-four-FEN-fields repetition key treats that unusable `e3` as different. Its controller remained able to accept the scripted tenth ply `b8c6` and only then returned:

```text
phase: over
over: { status: 'draw', winner: null, reason: 'threefold repetition' }
history: 10 plies (should stop at 9)
```

Neither engine's inability to infer repetition from a bare FEN is penalized; the defects are in the history-aware application flow.

### E5 — Chosen coaching positions

Direct public calls, reproduced by `engine-probe.mjs`, included:

| FEN and played move | A output | B output |
| --- | --- | --- |
| `7k/8/8/3p4/8/4Q3/8/K7 w - - 0 1`, `e3e4` | Blunder; opponent pawn d5 can capture queen e4; better `a1a2`. | Blunder; queen e4 can be captured for free by pawn d5; better `e3d4`. |
| `7k/8/8/8/4q3/8/4R3/K7 w - - 0 1`, `a1a2` | Blunder; queen e4 can capture rook e2; better `e2e4`. | Blunder; queen e4 can capture rook e2 for free; better `e2e4`, described as capturing the queen. |
| Fool's Mate precursor `rnbqkbnr/pppp1ppp/8/4p3/8/5P2/PPPPP1PP/RNBQKBNR w KQkq e6 0 2`, `g2g4` | Blunder; concrete `d8h4` mate threat; better `a2a4`. | Blunder; concrete `d8h4` mate threat; better `b1c3`. |
| `7k/8/5KQ1/8/8/8/8/8 w - - 0 1`, `g6f7` | Blunder; missed mate by `g6g7`. | Blunder; missed mate by `g6g7` and accurately explains stalemate. |

The captures, mates and alternatives in these examples replay legally. A calls both opening `e2e4` and `a2a3` “That was the strongest move.” Its 30-centipawn best band conflates near-equal evaluation with actually strongest (`engine/coach.js:13–18,135–136`); `g6h6` in the last FEN also gets “best,” despite missing the immediate `g6g7` mate. B instead returns a brief “Good move” for both opening examples and correctly names the immediate missed mate.

Two additional direct B calls expose substantial coaching problems:

```js
reviewMove('7k/8/8/3pP3/8/8/8/K7 w - d6 0 1', 'a1a2')
// verdict: blunder; betterMove: e5d6
// reasons: ['A stronger move was capturing the pawn on d6 en passant with your pawn from e5.']
```

The black pawn is on **d5**; **d6 is empty**. This is a false square claim in the coach's explanation, and the sentence supplies an alternative rather than explaining why the played move was a blunder.

```js
reviewMove('r3k2r/ppp2ppp/2nb3q/3p4/4n1b1/1PPPK2N/P5PP/RNBQ1B1R w kq - 3 11', 'h3f4')
// verdict: blunder; betterMove: h3f4
// reasons name Bxf4 checkmate and a capture of the queen on d1
```

This position arose in B's actual full game; legal moves are `h3f4` and `h3g5`. B's mate override raises even its best-scored move to a blunder while leaving `betterMove` unchanged (`engine/review.js:265–272,304`). Advising the beginner to play exactly the move just criticized is no fix. I do not claim this was the only legal move.

### E6 — Search measurements and equal-budget games

Command: `node judging/work/search-metrics.mjs`. Supplemental depth reporting uses each packet's own search entry point with the public defaults and **500 ms**; match play itself uses only the fixed testing interface.

| Position | A completed depth / elapsed / counted nodes | B completed depth / elapsed |
| --- | --- | --- |
| Start | 3 / 500 ms / 25030 (~50041 nodes/s) | 4 / 501 ms |
| Kiwipete | 0 / 500 ms / 12450 (~24894 nodes/s) | 3 / 500 ms |
| Rook/en passant endgame | 4 / 184 ms / 14034 (~76165 nodes/s) | 6 / 476 ms |

B does not expose a node counter, so I do not invent a directly comparable nodes/second value. Its depth uses check extensions, so raw depth numbers alone are not a strength verdict. A's default depth cap is four (`engine/search.js:13`), with full-window searches of every root move and expensive repeated legal/status generation; on Kiwipete its static fallback survives an incomplete first iteration. B reuses a root alpha bound, makes/unmakes moves, and uses piece-square/king evaluation. These implementation differences agree with the game results.

A's weakening noise is also nearly constant: applying `deterministicNoise` from `engine/search.js:189–192` to `a7a5,b7b5,d7d5,h7h5,b8c6,g8f6` produces a total spread of only **0.0311 centipawns** after multiplying by its Beginner noise 320. Depth/time profiles produce observable differences, but that noise does not provide the intended substantial ordinary-move weakening.

Command: `node judging/work/matches.mjs`. Both engines received `bestMove(fen, {timeMs:250})`; colours were swapped for each opening, and every move and resulting FEN was checked through **both** engines. Games ran sequentially, after browser runs, with a 160-ply cap; none reached that cap. Repetition adjudication normalized unusable en passant.

| Opening | White | Black | Result | Plies | Largest move time |
| --- | --- | --- | --- | ---: | ---: |
| Standard | A | B | B checkmates | 44 | 251 ms |
| Standard | B | A | B checkmates | 81 | 251 ms |
| After e4 e5 | A | B | Threefold draw | 74 | 251 ms |
| After e4 e5 | B | A | B checkmates | 45 | 262 ms |

**B scores 3.5/4; A scores 0.5/4.** Four games establish a clear advantage here, with a small sample and no external rating claim.

## Per-line comparison

1. **A:** More of the delivered beginner experience works without freezing or false en passant wording, though both have core omissions.
2. **A:** Its state/worker/engine boundaries are clear, while B duplicates wording and board parity logic with inconsistent results.
3. **Tie:** B has broader passing unit coverage, while A adds actual browser interaction coverage; both miss important product failures, and A also has a flaky golden assertion.
4. **Tie:** A validates inputs more strictly but can strand a pending game, while B handles ordinary clicks/disposal well but has loose boundaries and no callback error recovery.
5. **A:** Both pass the independent move-generation suite, but A detects the correct third repetition and forbids another move, while B counts the draw late.
6. **B:** Deeper completed searches and three wins plus a draw at equal time budgets are decisive evidence.
7. **A:** Its conservative, short concrete explanations avoid B's false en passant square, same-move remedy and duplicated coaching, despite A's weak best/good calibration.
8. **A:** Its worker keeps page timer gaps near normal and a1 dark, while B freezes and reverses colours; neither has equal squares.
9. **B:** It consistently reproduces stored comments in completed reviews, whereas A's user-ending repetition draw cannot reach a review.

## Fatal problems

“Fatal” here means a broken core requirement in a reproducible case, not that the app cannot start.

- **A:** A repetition draw reached on a user move strands coaching and prevents the end review, breaking complete after-every-move feedback and the required review for that ending.
- **B:** The actual page freezes during coaching at every tested level, contrary to the responsiveness requirement; a1 is light, and the coach states the wrong captured-pawn square for en passant and can recommend the criticized move again.
- **Both:** Measured squares are not equal squares on desktop or mobile; their repetition endings also have different failures, with A unable to finish coaching and B allowing an extra move before declaring the draw.

## Verdict

If forced to ship one finished packet, I would choose **A narrowly**, because its responsive worker, correct board colours and more conservative coaching make the beginner experience more usable. B has the clearly stronger engine and more reliable completed-game review, keeping the scores almost tied. Neither meets the frozen brief as delivered: A's distorted squares and repetition-ending coaching failure remain release-blocking problems.
