# Chess Coach release demo

This script verifies the release as a beginner sees it and records the evidence that automated legality checks cannot judge. Use Chrome on the machine named in the project brief.

## Start and preflight

From the repository root, run:

```sh
npm test --prefix chess-coach
node chess-coach/server.mjs
```

Open the printed loopback URL. The page should show 64 squares, three named levels, “Your turn,” a hint button, and an empty coaching panel. Keep a simple move log with columns for level, user move, displayed verdict/comment, computer move, and approximate reply time.

## Complete-game and recap run

Play a game to a terminal result at each of Beginner, Club, and Challenging. For every turn, verify that the attempted move is legal, the board stays usable while the coach thinks, a legal computer reply arrives within two seconds, and the verdict is one of Best, Good, Inaccuracy, Mistake, or Blunder. Use Hint at least once per game and confirm that the suggested move is legal and the board does not change.

At each ending, compare the recap with the move log. It must contain no more than three user moves, each listed move must have been played, and its verdict, reason, and suggestion must agree with the feedback originally recorded for that move. If the game had no mistake or blunder, the recap must instead say that the user avoided major mistakes.

Record the three results and how difficult each game felt. Beginner should offer realistic winning chances, while Challenging should be the hardest; any illegal reply, two-second miss, frozen input, or reversed difficulty is a release failure.

## Repeatable profile comparison

Open the following path three times, changing `LEVEL` to `beginner`, `club`, and `challenging`:

```text
/?test=1&level=LEVEL&fen=7k%2F8%2F8%2F3p4%2F8%2F4Q3%2F8%2FK7%20w%20-%20-%200%201
```

Press Hint once on each page. Each hint must be legal and the three choices must differ; the calibrated build chooses queen e3–e5, queen e3–h6, and king a1–a2 respectively. The automated quality test exercises the actual Worker profiles against this same position.

## Rules, controls, and presentation

Use the same `?test=1&fen=...` seam for these focused checks:

| Check | FEN | Action and expected result |
| --- | --- | --- |
| Castling | `r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1` | Move e1–g1; the rook must also move to f1. |
| En passant | `7k/8/8/3pP3/8/8/8/K7 w - d6 0 1` | Move e5–d6; the black pawn on d5 must disappear. |
| Promotion | `7k/P7/8/8/8/8/8/K7 w - - 0 1` | Move a7–a8, choose each offered piece in separate runs, and confirm the choice appears. |
| Checkmate | `7k/8/5KQ1/8/8/8/8/8 w - - 0 1` | Move g6–g7; play stops, h8 is highlighted, the result says the user won, and the recap opens. |

In a normal active game, choose New game, cancel the confirmation, and verify nothing changes. Repeat and confirm; the standard position must return with prior feedback, hint, highlights, and recap cleared.

Use only the keyboard to select a piece and destination, then inspect the page at 200% browser zoom. Every square must retain a useful accessible name; pieces, last move, legal destinations, check, turn, controls, feedback, and result must remain distinguishable without clipping that prevents play.

## Twenty-comment language audit

Read these frozen, test-generated display strings aloud as if explaining them to a beginner. Every row must be understandable, contain at most two sentences, avoid engine scores, and stay proportionate. Each Mistake or Blunder must name a concrete piece and square, the opponent's capture, and a legal improvement; `quality.test.js` replays all ten severe cases to prove those claims and fixes.

| Case | Verdict | Displayed comment |
| --- | --- | --- |
| queen-pawn-white | Blunder | Your opponent can capture your queen on e4 with their pawn from d5. Try move from a1 to a2. |
| rook-pawn-white | Blunder | Your opponent can capture your rook on e4 with their pawn from d5. Try move from e3 to d3. |
| bishop-pawn-white | Mistake | Your opponent can capture your bishop on e4 with their pawn from d5. Try move from a1 to a2. |
| knight-pawn-white | Mistake | Your opponent can capture your knight on e4 with their pawn from d5. Try move from a1 to a2. |
| queen-pawn-black | Blunder | Your opponent can capture your queen on e5 with their pawn from d4. Try move from a8 to a7. |
| rook-pawn-black | Blunder | Your opponent can capture your rook on e5 with their pawn from d4. Try move from e6 to d6. |
| bishop-pawn-black | Mistake | Your opponent can capture your bishop on e5 with their pawn from d4. Try move from a8 to a7. |
| knight-pawn-black | Mistake | Your opponent can capture your knight on e5 with their pawn from d4. Try move from a8 to a7. |
| queen-rook-file | Blunder | Your opponent can capture your queen on d4 with their rook from d8. Try move from e4 to e5. |
| queen-bishop-diagonal | Blunder | Your opponent can capture your queen on d4 with their bishop from g7. Try move from a1 to a2. |
| take-hanging-rook | Best | That was the strongest move. |
| take-hanging-pawn | Best | That was the strongest move. |
| save-rook | Best | That was the strongest move. |
| trade-rook | Best | That was the strongest move. |
| promote-queen | Best | That was the strongest move. |
| queen-edge-inaccuracy | Inaccuracy | A stronger move was available. Try move from e3 to c3. |
| queen-corner-inaccuracy | Inaccuracy | A stronger move was available. Try move from a1 to a2. |
| rook-forward-inaccuracy | Inaccuracy | A stronger move was available. Try move from e3 to d3. |
| underpromote-rook | Inaccuracy | A stronger move was available. Try move from a7 to a8 and promote to a queen. |
| underpromote-knight | Inaccuracy | A stronger move was available. Try move from a7 to a8 and promote to a queen. |

Fail the release for any false or unclear sentence, even if the tests pass. Record the failing case ID and the exact concern so it can be reproduced from `tests/fixtures/coaching.json`.
