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
