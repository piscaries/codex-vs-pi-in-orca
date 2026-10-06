# Engineering design and build plan
## 1. Codebase facts
- Language/runtime verified: existing repo is Python stdlib, but Chess Coach must be plain browser JavaScript plus ES modules; `node --version` returned `v26.0.0`, so tests can use `node --test`.
- Test commands verified: existing regression suite is `python3 -m unittest discover -s tests -v`; it ran 181 tests OK. New chess tests should live under `chess-coach/tests/*.test.mjs` and run with `node --test chess-coach/tests`.
- Existing app facts verified: `find chess-coach` found no product files, so this track starts from zero chess implementation. No `package.json` or build config was found.
- Docs verified: accepted spec is `docs/run5/spec.md`; brief and quality bar are `projects/chess-coach/brief.md` and `projects/chess-coach/quality-bar.md`.
- Browser verified: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome` exists for headless demo checks.
- Branch/base verified: `git branch --show-current` is `r5-t1-design`; `git rev-parse HEAD` is `d2fbfc2167e3718108f71425684e0764b6a3a795`.

## 2. Architecture
Use a small dependency-free `chess-coach/` static app.

`index.html` loads `app/app.js`. The app keeps `GameState`: `{ fen, history, userMoves, lastMove, level, selectedSquare, gameOver }`. UI calls the public engine from `engine/index.js`, never mutates board state directly.

Engine modules:
- `fen.js`: parse/serialize/validate FEN.
- `board.js`: square, piece, move, attack, material helpers.
- `movegen.js`: pseudo-legal generation plus king-safety filtering.
- `status.js`: checkmate, stalemate, insufficient material, fifty-move draw; UI adds threefold repetition from history keys.
- `search.js` and `evaluate.js`: legal computer move selection with time-bounded negamax.
- `coach.js`: move review, hint reasons, end-review ranking data.

Data flow: UI drag/click UCI -> `applyMove` -> `reviewMove(previousFen, uci)` -> append user review -> `chooseComputerMove(fen, level)` -> `applyMove` -> render status/review.

## 3. Contracts
Public fixed interface in `chess-coach/engine/index.js`:
- `legalMoves(fen): string[]` returns legal UCI moves including promotion suffixes.
- `applyMove(fen, uci): string` validates FEN and move; throws `Error("Illegal move: <uci>")` without changing caller state.
- `perft(fen, depth): number` recursively counts legal leaves; throws on invalid FEN/depth.
- `gameStatus(fen): "ongoing"|"checkmate"|"stalemate"|"draw"` returns draw for insufficient material or halfmove clock >= 100. Threefold is exposed to UI as `isThreefold(history)`, because a lone FEN cannot prove repetition history.
- `bestMove(fen, { timeMs } = {}): string|null` returns a legal UCI move or `null` when game is over; respects `timeMs` by iterative deepening with a deadline.
- `reviewMove(fen, uci): { verdict, reasons, betterMove }`. Verdict is one of the five required strings. `reasons` is short plain English, never engine numbers; `betterMove` is legal or `null`.

Internal board contract: parsed FEN becomes `{ board: Array<64>, turn: "w"|"b", castling: {K,Q,k,q}, ep: number|null, halfmove, fullmove }`, with index `0=a1`.

## 4. Key decisions
- Write a custom legal engine, not a bundled library: no third-party packages are allowed, and fixed hidden tests import local ES modules.
- Keep evaluation simple but deterministic: material, king safety, hanging pieces, mate threats, mobility. This is enough for beginner coaching and fast replies.
- Truth-first coaching: tactical reasons are emitted only when verified by legal follow-up search, attack maps, or material delta. Otherwise the review gives a verdict plus better move without inventing a claim.
- User plays White for this release: the spec allows that assumption, shrinking UI and game-state complexity.
- Use click-to-move with optional drag later: click is robust in local static HTML and easy to test.

## 5. Cross-cutting concerns
- Failure handling: invalid FEN and illegal UCI throw in engine; UI catches and leaves `GameState.fen` unchanged, showing a brief invalid-move message.
- Security/secrets: no network calls, accounts, storage, or secrets. Static files only.
- Responsiveness: UI computer moves run in `app/worker.js`; hard level caps search at <= 1500 ms, lower levels at <= 500 ms.
- Testing: perft and rule tests prove correctness; coach tests assert only legal better moves and truthful tactical claims; UI tests use headless Chrome screenshot/state checks.
- Observability: no telemetry; console debug is limited to caught errors in development.

## 6. Build phases
| Phase | Outcome | Owned files | Depends on | Check command | Done-when |
| --- | --- | --- | --- | --- | --- |
| P0 | Legal engine and fixed interface for rules/status/perft | `chess-coach/engine/{fen.js,board.js,movegen.js,status.js,index.js}`, `chess-coach/tests/engine-rules.test.mjs` | none | `node --test chess-coach/tests/engine-rules.test.mjs` | Startpos, Kiwipete, castling, en passant, promotion, checkmate, stalemate, halfmove and insufficient-material draws pass; illegal move throws. |
| P1 | Search, strength helpers, review/hint logic | `chess-coach/engine/{evaluate.js,search.js,coach.js}`, `chess-coach/tests/coach-search.test.mjs`; may update `engine/index.js` after P0 | P0 | `node --test chess-coach/tests/coach-search.test.mjs` | `bestMove` returns legal moves within time; review verdict shape is exact; sampled blunders include true reason and legal better move. |
| P2 | Playable browser game UI | `chess-coach/{index.html,styles.css}`, `chess-coach/app/{app.js,render.js,worker.js}`, `chess-coach/tests/ui-state.test.mjs` | P0, P1 contracts | `node --test chess-coach/tests/ui-state.test.mjs` | User can start level, move legally, see last move/check/turn/status, get hint, and computer only applies legal replies. |
| P3 | End review, demo, and acceptance checks | `chess-coach/tests/{integration.test.mjs,quality.test.mjs}`, `chess-coach/demo-checklist.md` | P0-P2 | `node --test chess-coach/tests && python3 -m unittest discover -s tests -v` | Full local game demo recorded; worst-move review matches stored move reviews; legacy tests remain green. |

## 7. Parallelism and integration
P0 must land first because it freezes FEN/UCI and rule contracts. After P0, P1 and a UI skeleton from P2 can run concurrently only if P2 does not edit `engine/**`; otherwise run phases sequentially P0 -> P1 -> P2 -> P3. Merge order is contract, analysis, UI, demo. Rollback is per phase by reverting only its owned files; if `engine/index.js` integration fails after P1, revert P1 and keep P0's rule interface.

## 8. Traceability
| FR/SC | Phase | Check |
| --- | --- | --- |
| FR-001, FR-002, FR-011, SC-001, SC-002 | P0 | `engine-rules.test.mjs` perft/rule/status/illegal-move tests plus hidden owner imports |
| FR-003, FR-004, SC-003, SC-006 | P1, P2, P3 | `coach-search.test.mjs` timing/legal checks; UI/integration full-game checks |
| FR-005, P3 user story, SC-003 | P2, P3 | `ui-state.test.mjs`; Chrome demo checklist |
| FR-006, FR-007, FR-008, SC-004, SC-005 | P1, P3 | coach fixture tests and human review of five comments |
| FR-009 | P1, P2 | hint test asserts legal move and short reason |
| FR-010, SC-007 | P2, P3 | integration test compares end review entries to stored user reviews |
| FR-012 | P2, P3 | static-file/manual Chrome check; no network or env use |

## 9. Quality-bar verification
Builders run the named tests in each phase. The P3 builder opens the app in Chrome, plays a short full game at easy level, captures that comments appear after user moves, and records the checklist in `demo-checklist.md`. The code reviewer verifies rule tests, review truth tests, timing checks, and that comments are one or two beginner-readable sentences. Acceptance reviewer repeats a browser game and spot-checks five tactical comments against board state.

## 10. Risks and escalation
- Highest risk: full legal move correctness. Escalate if standard perft counts disagree after isolating FEN parsing and attack detection.
- Coaching risk: false tactical prose. Escalate if a requested reason cannot be proven by legal search/material predicates; prefer omitting the claim.
- Draw risk: threefold cannot be determined from one FEN. Engine stays honest; UI tracks history. Escalate only if owner requires fixed `gameStatus(fen)` to infer unseen history.
- Effort: P0 1 focused day, P1 0.75 day, P2 0.75 day, P3 0.5 day.

```
Task / Dispatch: task_b037fad3395e / ctx_89e09f88d42d
Role: engineering designer
Base commit: d2fbfc2167e3718108f71425684e0764b6a3a795
Output: docs/run5/design.md
Decisions made: Custom ES-module engine because no third-party packages are allowed; stateless `gameStatus(fen)` handles only FEN-observable draws while UI handles threefold; truth-first coach comments emit concrete reasons only when verified; user plays White to keep the first release small.
Checks: `orca orchestration check --terminal term_7bc719e3-12e1-4bc6-934f-e3de4246eccc --json` -> no messages; `git status --short && git rev-parse HEAD && rg --files` -> clean at d2fbfc2 and no chess code; `sed` spec/brief/quality-bar -> read; `find` package/build config -> none; `node --version` -> v26.0.0; Chrome path test -> present; `python3 -m unittest discover -s tests -v` -> 181 tests OK; `wc -w docs/run5/design.md` -> 1340; `git diff --check` -> pass.
Open questions: Whether the owner expects threefold repetition in the fixed `gameStatus(fen)` despite FEN lacking repetition history.
Next: engineering reviewer should review `docs/run5/design.md` for ACCEPT or REWORK.
```
