# Task: blind scoring of two engineering designs and build plans

You are an independent judge. Your only job is to score A and B and say which is better. Do not rewrite, merge, or fix either one.

**What to judge:** `docs/run5/design-rescore/A.md` and `B.md`. Each packet holds a design followed by the product spec it was written for; judge each design against its own spec.

**What the authors were given.** Two teams received the same task: the project brief and quality bar below, plus these instructions:

- Write an engineering design and build plan in under 1,500 words, from your own accepted spec. Split the build into phases (P0, P1, ...), each with owned files, a check command and a done-when. One builder builds every phase, one at a time, and each phase is code-reviewed before the next starts. Phases may run in parallel only if they own disjoint files.

Judge the work as an answer to that task. The rubric has a general half (engineering practice that applies to any project) and a task-specific half (what makes this product, a chess coach for beginners, good).

## Rules

1. **Stay blind.** Do not try to find out who wrote either packet. Do not read other branches, other folders, git history, or anything outside this repository.
2. **You may read the repository** to check a design's claims about it. Both authors started from this same commit; the chess code did not exist yet. A wrong claim about the codebase or environment counts against the design.
3. **Score each packet on its own first.** Go through the whole rubric for A, then for B. Compare only after both are scored.
4. **Evidence for every score.** Quote the line, name the omission, or (for the product) show the command and its output.
5. **Substance over style.** Do not reward length, formatting, headings or confident tone.
6. **Use the whole scale.** Full marks mean nothing of substance is missing on that line. Do not cluster scores near the top.

## Rubric (100 points)

For each line, pick a band, then a number inside it. Bands are scaled to the line's points: **top quarter** = nothing of substance missing (the "full marks when" column); **second quarter** = sound with one or two gaps; **third quarter** = several gaps, or vague; **bottom quarter** = missing or wrong.

**General (50)**

| Line | Points | Full marks when |
| --- | --- | --- |
| 1. Traceability | 10 | Every requirement and success criterion maps to a phase and a check |
| 2. Architecture and contracts | 15 | Sound structure; internal contracts precise enough to build against; the fixed interface honoured exactly |
| 3. Phases, ownership, parallelism | 10 | Small phases ordered by real dependencies; owned files never overlap |
| 4. Checks that prove behaviour | 10 | Each phase check would fail if the behaviour broke |
| 5. Grounding, risks, realism | 5 | Correct claims about the codebase and environment; main risks named with a response; believable estimate |

**Task-specific: chess coach (50)**

| Line | Points | Full marks when |
| --- | --- | --- |
| 6. Rules engine and its proof | 10 | A move generator design that handles every special rule, verified by perft on standard positions to a stated depth |
| 7. Engine strength | 15 | Names the search (for example alpha-beta with iterative deepening and quiescence), the pruning and move ordering that make it fast, an evaluation beyond material, how it uses the whole time budget, and how its strength and speed (depth or nodes per second) will be measured |
| 8. Truthful coaching | 10 | A mechanism that makes every claim true by construction (for example derived from search or from verified tactics), plus how plain language is enforced and tested |
| 9. Responsiveness under search | 10 | Search never blocks the page (worker or time slicing); time budgets add up to under two seconds for the reply plus the coach comment |
| 10. Levels and board clarity | 5 | How levels are calibrated and checked to differ; how board clarity (equal squares, last move, check, turn) is verified, ideally by measuring the page |

## Output: `docs/run5/design-judge-9.md`

1. **Score table:** packet × rubric line. Each cell holds the score and its evidence.
2. **Totals** for A and B, and the subtotals for the general and the task-specific halves.
3. **Per line:** which packet is better and why, one sentence each. Say "tie" when neither is better.
4. **Fatal problems,** if any: anything that makes a P1 requirement impossible or the product wrong.
5. **Verdict:** if you had to ship one, which and why, in two or three sentences.

Commit only that file. Send `worker_done` with `--report-path` set to it. Budget: about 20 minutes.

# Project brief: Chess Coach

**Owner:** Kevin Zhao · **Status:** frozen for the run once the coordinator records its commit

## Goal
Beginners who want to get better at chess lose games to the same mistakes: leaving pieces unprotected, missing a capture, walking into a mate. A normal chess app beats them but rarely tells them why. Build a local chess coach that plays against the user and, after every move the user makes, says in plain words whether it was good and what was better.

## Primary user
An adult beginner, roughly under 1200 rating. They know how the pieces move but not much strategy. They want to play real games, at a strength they can sometimes beat, and learn from each mistake while it is fresh.

## What the user must get back
- A game against the computer in the browser, at a strength they choose, with every chess rule handled correctly (castling, en passant, promotion, check, checkmate, stalemate, and the common draw rules).
- After each of their moves: a short verdict (for example "good" or "blunder") and, when the move was a mistake, a reason a beginner understands and a better move.
- A hint on request.
- At the end of the game, a short review of their worst moves.

## Fixed testing interface
An automated test suite owned by the human owner will be run against the finished product. Builders do not see it. It imports the engine as an ES module from `chess-coach/engine/index.js` and calls only these functions. Positions are FEN strings and moves are UCI strings such as `e2e4` or `e7e8q`.

| Function | Returns |
| --- | --- |
| `legalMoves(fen)` | array of UCI strings, any order |
| `applyMove(fen, uci)` | the FEN after the move; throws on an illegal move |
| `perft(fen, depth)` | number of leaf nodes at that depth |
| `gameStatus(fen)` | one of `"ongoing"`, `"checkmate"`, `"stalemate"`, `"draw"` |
| `bestMove(fen, { timeMs })` | a legal UCI move, chosen within roughly `timeMs` |
| `reviewMove(fen, uci)` | `{ verdict, reasons, betterMove }`; `verdict` is one of `"best"`, `"good"`, `"inaccuracy"`, `"mistake"`, `"blunder"`; `reasons` is an array of strings; `betterMove` is a UCI string or `null` |

Everything else, including how the engine works and what the browser app looks like, is for the team to decide.

## Environment (verified 2026-10-01)
- macOS, Node 26 (`node --test` is available), and Google Chrome (usable headless).
- No third-party packages: plain HTML, CSS, and JavaScript with no build step and no network access at runtime.
- The app opens from a local file or a local static server.

## Constraints
- Local only: no accounts, no deployment, no publishing.
- Small enough to build in this repository in a few focused phases.
- Never commit secrets.

## Demonstration
A full game played in Chrome against the computer, with the coach's comments visible after each move and the end-of-game review shown.

# Quality bar: Chess Coach

Every role applies this. Passing tests is not enough; a beginner must be able to use the coach and learn from it.

## Correct
1. **The rules are never wrong.** The app never allows an illegal move, never rejects a legal one, and always detects checkmate and stalemate.
2. **The coach never says something false.** A comment that says a piece is unprotected, or that a move loses material, must be true in the position. A wrong comment is worse than no comment.

## Useful
3. **Mistakes come with a reason and a fix.** When a move is a mistake or blunder, the coach names the concrete problem (which piece, which square, what the opponent can now do) and suggests a better move.
4. **Plain words.** Comments use language a beginner understands. No engine numbers or notation without an explanation. One or two sentences per move.
5. **Proportionate.** The coach does not nag. Good moves get a short acknowledgement, not a lecture.

## Playable
6. **Strength the user can choose.** At the lowest level a beginner can win; at the highest level a beginner should rarely win. Levels are clearly different.
7. **Responsive.** The computer replies within two seconds at every level, and the page never freezes while it thinks.
8. **Clear board.** The board shows the last move, check, and whose turn it is. Pieces are easy to tell apart.

## Honest
9. **The end-of-game review matches the game.** Every move it lists was actually played, and its comments agree with the comments shown during the game.
