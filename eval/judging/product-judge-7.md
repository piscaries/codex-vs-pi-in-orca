# Run 5: blind product judgement 7 (A vs B)

The judge drove both packets on 2026-10-04 with Node 26 and headless Chrome over CDP. The scripts are in `judging/work/`:
- `rules.mjs`: perft, special moves, status, and bad input through the fixed interface.
- `depth.mjs`: search depth and timing.
- `match.mjs`: 8-game engine match.
- `coach.mjs`: chosen coaching positions.
- `cdp.mjs`: the browser driver, which clicks real squares, times replies, and records the longest gap between animation frames.
- `replay.mjs`: replays logged games to recheck the coach's comments.

A was served by its own `server.mjs`. B was served by `python3 -m http.server`.

## Shared evidence

**The projects' own tests**
- A: `node --test` reported 44 pass, 0 fail, in 4.3 s. This includes a real-Chrome smoke test.
- B: `node --test` reported 201 pass, 0 fail, in 13.2 s.

**Perft (`rules.mjs`).** Both packets matched the known counts:

| Position | Depth | Nodes |
| --- | --- | --- |
| start | 4 | 197,281 |
| kiwipete | 3 | 97,862 |
| CPW position 3 | 5 | 674,624 |
| CPW position 4 | 4 | 422,333 |
| CPW position 5 | 3 | 62,379 |

My "position 6" FEN gave 48 / 2,166 / 97,403 on both engines. I counted 48 legal moves for it by hand, so both engines are right and my expected value was wrong. Both also returned identical legal moves for en-passant-with-check and pinned-en-passant positions.

**Special moves and status.** Both packets passed all of these:
- Castling on both sides moves the rook. Castling through an attacked f1 is rejected.
- En passant removes the pawn.
- `a7a8` without a promotion piece throws. `a7a8n` works.
- Stalemate, checkmate, K v K, KB v K, KN v K, and the 50-move rule at halfmove 100 (but not 99) are detected. A checkmate on halfmove 100 still reports `checkmate`.

**Search depth with a 1,000 ms budget (`depth.mjs`)**

| Position | A depth (time used) | B depth (time used) |
| --- | --- | --- |
| start | 4 (747 ms), plays `a2a4` | 5 (530 ms), plays `b1c3` |
| Italian | 2, plays `a2a4` | 4 |
| kiwipete | 1 | 4 |
| rook endgame | 3 | 5 |

A's `bestMove` also has a built-in `DEFAULT_MAX_DEPTH = 4` (`A/engine/search.js`).

**Engine match (`match.mjs`).** Each move got 500 ms. There were 4 openings, each played twice with colours swapped:

- B scored 6.5 to A's 1.5: five B wins by checkmate, three draws, no A wins.
- In one of the draws, B repeated moves while a pawn up in a rook ending (game 2).
- No illegal moves, no errors, and no status disagreements over 588 plies.

## 1. Score table

| Line | A | B |
| --- | --- | --- |
| **1. Meets the brief (10)** | **8.** Everything works in Chrome: play, three levels, a verdict and comment after every move, a hint that leaves the board unchanged ("board unchanged: true"), and a recap at the end. Full games ended in checkmate with the recap shown (cdpA.log, cdpA2.log). One gap: the coaching is shallow (see line 7). | **7.** Everything works: four levels, comments, a hint, and a review. Two quality-bar breaches: the page freezes on every move (line 8), and the board colours are inverted (line 8). |
| **2. Code quality (10)** | **7.** Clear three-file engine (`rules.js` 503 lines, `search.js`, `coach.js`) and a Worker for the app. Some logic is duplicated: `capturedSquare` in coach.js and `captureSquare` in search.js, and two `validate*Options` functions. The root search re-searches every move with a full window (`negamax(..., -INFINITY, INFINITY ...)`). `terminalScore` runs a full `gameStatusForPosition` (all legal moves) at every node, which helps explain why A only reaches depth 1–2. | **7.** Small, focused modules (board, moves, status, eval, search, levels, review, rng) with clear comments. However, `board-ui.js` colours squares with two different formulas: `(file + rank) % 2` at creation and `(charCode + rank) % 2` at render. That duplication causes the a1 bug. The search drain loop is copied in `engine/index.js` and `levels.js`. |
| **3. Tests (10)** | **6.** 44 passing tests, including a real-browser test and legal replay of the 10 severe coaching lines. Gaps: perft is only tested to depth 3 on two positions; nothing measures board geometry; nothing checks engine quality (the engine plays `a2a4` as its first move); no draw-repetition test in search. | **7.** 201 passing tests, the full six-position perft suite, and detector tests for the reviewer and UI. Three real defects still got through: the a1 colour bug, the main-thread freeze (the test "reply drains the search in more than one scheduler chunk" covers the search but not the 500 ms coach call), and the "blunder, better move is the move you played" contradiction. |
| **4. Robustness (10)** | **8.** Bad input throws typed errors: `legalMoves("garbage")` gives `TypeError: FEN must contain exactly six fields`, `applyMove(fen, null)` gives `TypeError: Invalid UCI move`, and `bestMove` on a mated position gives `RangeError`. The Worker reports errors to an error panel. The app showed no console errors in 3 games. It rejects a 5-field FEN, which is strict but correct. | **8.** Bad input throws clear errors (`invalid FEN: expected 4-6 fields, got 1`, `illegal move: null`), and `bestMove` on a terminal position throws `no move to find: position is checkmate`. It accepts 4- and 5-field FENs leniently. The app showed no console errors in 2 games. Clicks during the reply are ignored (`onSquareClick` checks `phase`). |
| **5. Rules correctness (10)** | **10.** Every perft count, special move and status check above passed. Threefold repetition is handled in the app session (test "three occurrences end the session as a repetition draw"). | **10.** The same checks all passed. Threefold repetition is tracked in `app/game.js` (`seen` map). |
| **6. Engine strength (15)** | **4.** Reaches depth 1–2 in middlegames at 1 s and opens with `a2a4`. Lost the match 1.5 to 6.5 without a win. The interface caps the depth at 4 even when given more time. | **12.** Reaches depth 4–5 and won the match 6.5 to 1.5. Gaps: it stops when the next depth is not expected to fit, so it uses about half the budget (530 ms of 1,000 at the start), and it drew a rook ending a pawn up by repetition (game 2). |
| **7. Coaching quality (15)** | **8.** Every claim I checked was true. A move with no concrete reason is downgraded to "inaccuracy" rather than given a vague blunder (`if (!reason) verdict = "inaccuracy"`). In forced-mate positions it correctly says "best". Good moves get one line. Weaknesses: <ul><li>The shallow engine calls `a2a4` (start position) and `h2h4` "best".</li><li>Reasons name a minor capture instead of the real threat. After g4f5 the reason was "capture your pawn on c2", but the threat was Nxc2+ forking the king and rook. Elsewhere it said "pawn on g2" when the threat was Bxg2+ winning the rook.</li><li>After d2d3 in the Scholar's mate position it says "capture your queen on h5" and never mentions the missed Qxf7#.</li><li>Its better moves are odd (`a7a5`, `a1a2`).</li><li>The wording "Try move from c2 to c4" does not name the piece.</li></ul> | **10.** Concrete, plain and checked: "Your knight on g4 can now be captured for free by the queen on d1"; "You missed checkmate: capturing the pawn on f7 with your queen from h5 would have won the game at once"; and it explains the stalemate trap ("that is stalemate, a draw, even though you hold more material"). Weaknesses: <ul><li>Blunder and mistake verdicts often have no reason, only "A stronger move was moving your pawn from c2 to c4" (game cdpB2 move 19 blunder, move 12 mistake, move 6 of cdpB). This breaks quality bar 3.</li><li>When every legal move allows mate, it says "Blunder … Better: moving your king from c4 to d5", and that is the move just played. `replay.mjs` shows this for position `r3k3/p1p2p2/p4p2/2P2b2/q1K3n1/2P1p3/4N3/1N5r w q - 0 27` (only 1 legal move) and for move 15 of cdpA, where no legal move avoids mate.</li><li>The "Better:" line repeats the sentence above it.</li></ul> |
| **8. Responsiveness and board (15)** | **9.** At Challenging the reply takes at most 1,736 ms, and at Beginner at most 385 ms. The longest frame gap during thinking was 19 ms, so the page never froze (Worker). a1 is dark (`rgb(168,185,159)` against b1 `rgb(233,221,191)`). Last move, check (`.in-check` on e1/c3) and turn ("Your turn" / "Coach and computer are thinking…") are all shown. **Squares are not equal:** measured heights are 123.4 px and 54.6 px with widths of 89 px, because `.board` has no `grid-template-rows` (shot-A-start.png). | **5.** Replies take at most 1,772 ms at level 4 and 606 ms at level 1. **The page freezes:** the longest frame gap was 836 ms at level 4 and 503 ms on *every* move at level 1, because `reviewMove` (500 ms budget) runs synchronously on the main thread (`schedule(() => { ... coach(fenBefore, uci) ...})`). **The colours are wrong:** a1 is light (`rgb(240,217,181)`) and b1/h1 are dark after the first render (`board-ui.js` render formula). The bottom-left corner label shows "a" with no rank "1" (shot-B-start.png). **Squares are not equal:** heights are 94.2 px and 43.8 px. Last move, check (`.check`) and turn ("Your move — you are in check!") are shown. |
| **9. End-of-game review (5)** | **5.** The recap listed moves 4, 7 and 11 (cdpA) and 3, 6 and 8 (cdpA2). Each one was played, and its text was word-for-word the comment shown during the game. | **4.** The review lists only moves that were played, and the text matches the in-game comments (moves 2, 13 and 18 in cdpB2 are identical). It repeats the contradictory "better move = the move you played" entry, and it lists every mistake (5+ entries), which is long rather than short. |

## 2. Totals

| | General (40) | Task-specific (60) | Total (100) |
| --- | --- | --- | --- |
| A | 8 + 7 + 6 + 8 = **29** | 10 + 4 + 8 + 9 + 5 = **36** | **65** |
| B | 7 + 7 + 7 + 8 = **29** | 10 + 12 + 10 + 5 + 4 = **41** | **70** |

## 3. Per line

1. **Meets the brief: A.** Both have every feature, but B's main-thread freeze and inverted colours break explicit quality-bar items.
2. **Code quality: tie.** A has larger files with duplicated helpers; B has smaller modules, but its duplicated colour formula caused a visible bug.
3. **Tests: B.** B's perft and coach tests are far broader, though neither suite caught its own most visible UI defect.
4. **Robustness: tie.** Both reject bad input with clear errors and stay usable.
5. **Rules correctness: tie.** No rules error found in either engine.
6. **Engine strength: B.** B searches 2–3 plies deeper in the same time and won the match 6.5 to 1.5.
7. **Coaching quality: B.** B names the real threat, missed mates and stalemate traps in plain words. A is more careful about vague severe verdicts, but its reasons often miss the main point.
8. **Responsiveness and board: A.** A never freezes and has correct colours; B freezes for 0.5–0.8 s on every move and has a1 light. Both have unequal squares.
9. **End-of-game review: A.** Both are honest; B's is longer and repeats one self-contradictory entry.

## 4. Fatal problems

Neither packet has a problem that makes a P1 requirement impossible. Both play full legal games with coaching, hints and a review.

- **B's most serious defects:**
  - The board colours are inverted (a1 light). The board is still playable, but it shows a wrong chessboard to a learner.
  - The page freezes for 500–836 ms on every user move, which breaks quality bar 7 ("the page never freezes").
- **A's most serious defects:**
  - The engine is very weak at every level (depth 1–2 in the middlegame). The Challenging level may not be hard enough, and its "best" verdicts on moves like `a2a4` are unreliable.
  - The squares are unequal.

## 5. Verdict

If I had to ship one, I would ship **B**, by a small margin. A beginner comes for the coaching and an opponent worth playing:
- B explains the real threat, missed mates and stalemate traps in plain words.
- B's engine is clearly stronger.
- B's two biggest flaws are in the presentation (inverted colours and the freeze while it thinks); its rules and its engine are sound.

A is smoother and never freezes. But its shallow engine praises weak moves as "best", and its comments often name a minor capture while missing the real problem, so it teaches less.
