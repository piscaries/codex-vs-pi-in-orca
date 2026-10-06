# Task: blind scoring of two product specs

You are an independent judge. Your only job is to score two documents, A and B, and say which is better. Do not rewrite, merge, or fix either one.

**The documents:** `docs/run5/spec-rescore/A.md` and `B.md` in this repository.

**What the authors were given.** Two authors received the same task: the project brief and quality bar below, plus these instructions:

- Write a product spec in under 1,200 words. The "Fixed testing interface" in the brief is an owner constraint the spec may refer to.

Judge the documents as answers to that task.

## Rules

1. **Stay blind.** Do not try to find out who wrote either document. Do not read other branches, other folders, git history, or anything outside this repository.
2. **Score each document on its own first.** Go through the rubric for A, then for B, using the anchors below. Compare only after both are scored.
3. **Evidence for every score.** Quote the line that earns the score, or name what is missing.
4. **Substance over style.** Do not reward length, formatting, headings, or confident tone. A shorter document that covers the same ground scores the same or higher. Going over the word limit counts only under the scope or realism line.
5. **Use the whole scale.** A 20 means nothing of substance is missing on that line. Do not cluster every score between 15 and 18.

## Rubric (100 points: five lines, 20 each)

For each line, pick the band that fits, then a number inside it.

**Product spec**

| Line | 17–20 | 12–16 | 6–11 | 0–5 |
| --- | --- | --- | --- | --- |
| **1. User value and problem** | Names the user, their problem and the outcome that matters, all specific to this brief | Clear, but partly generic or missing one of the three | Vague; reads like any chess app | Missing or wrong user |
| **2. Stories and acceptance scenarios** | Every must-have outcome in the brief has a story with given/when/then scenarios that a tester could run independently | Most outcomes covered; some scenarios vague or not independently testable | Few scenarios, or not testable | None |
| **3. Requirements** | Complete against the brief, each one testable, no implementation choices (except the fixed interface) | One or two gaps, untestable items, or design leaking in | Several gaps, or mostly design rather than requirements | Missing |
| **4. Quality bar as checkable criteria** | All 9 quality-bar items become criteria someone could check, each with how | Most items covered; some still subjective | A few items covered, or only restated | Ignored |
| **5. Scope discipline** | Explicit non-goals, real edge cases (special moves, draws, illegal input, game end), and assumptions stated as such | Some of the three, or edge cases only listed by name | Thin | None |

## Output: `docs/run5/spec-judge-6.md`

1. **Score table:** packet × rubric line. Each cell holds the score and its evidence (one quote or one named omission).
2. **Totals** for A and B.
3. **Per line:** which packet is better and why, one sentence each. Say "tie" when neither is better.
4. **Fatal problems,** if any: anything that would make a P1 requirement impossible or the product wrong.
5. **Verdict:** if you had to build from one packet, which one, in two or three sentences.

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
