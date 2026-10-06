# Engineering design and build plan
## 1. Codebase facts

- This is a greenfield subproject: `chess-coach/` and root `package.json` are absent (`find`/`test`, 2026-10-04). Existing Python writer code is unrelated and will not be reused.
- Node is `v26.0.0`; `node --test` succeeds with zero JavaScript tests. Chrome `154.0.8037.93` is installed at the standard macOS path. The brief fixes plain HTML/CSS/JavaScript, no dependencies, build, or runtime network.
- New files use browser-compatible ES modules and `chess-coach/package.json` with `"type":"module"`. Tests use `node:test`; names are kebab-case, exported functions camelCase, and state is immutable at public boundaries.

## 2. Architecture

```text
DOM/main.js -> game.js -> engine/index.js -> rules.js
     |                         |-> search.js -> rules.js
     `-> Web Worker -----------|-> coach.js  -> search/rules
```

`rules.js` parses FEN, generates legal moves by generate-then-reject-if-own-king-in-check, applies moves, and detects terminal states. `search.js` uses deadline-checked iterative-deepening alpha-beta with a legal fallback. `coach.js` compares the played move with the best legal continuation and only describes consequences witnessed in legal lines. `game.js` owns turn sequencing, repetition counts, stored feedback, and recap selection. `main.js` renders an accessible board and sends all coaching/search to `worker.js`, keeping the main thread responsive.

## 3. Contracts

- Public `engine/index.js` exports exactly the six brief functions. FEN output has all six fields and updated castling, en-passant, halfmove, and fullmove values. UCI promotion suffix is `q|r|b|n`. Invalid FEN/UCI/options or negative/non-integer depth throws `TypeError`; illegal `applyMove`/`reviewMove` throws `Error`; terminal `bestMove` throws `RangeError`.
- `parseFen(fen)` returns `{board:Array(64), turn, castling:Set, epSquare, halfmove, fullmove}`; callers receive fresh values. Internal moves are `{from,to,promotion,flags}` and convert losslessly to UCI.
- `reviewMove(fen,uci)` returns `{verdict,reasons,betterMove}`. Thresholds are fixed in `coach.js`; mistake/blunder always has one concrete, replayable reason and a legal `betterMove`. Best/good have no reason or one short acknowledgement and `betterMove:null`. UI renders at most the verdict/reason plus one translated “Try …” sentence.
- `GameState` contains `{fen,level,status,busy,positionCounts,moves,feedback,hint}`. Each `MoveRecord` is `{ply,side,fenBefore,uci,fenAfter,review}`; only user records have `review`. Repetition keys omit clocks and normalize an unusable en-passant square. Three occurrences end the app game as draw; FEN-only `gameStatus` cannot infer history and handles stalemate, standard insufficient-material cases, and halfmove clock ≥100.
- Worker requests are `{id,type:"coachAndReply",fenBefore,userUci,fenAfter,profile}` or `{id,type:"hint",fen,profile}`; replies are `{id,ok,review,uci,hint,error}`. Profiles `beginner|club|challenging` divide one sub-1.8-second budget between bounded review and reply search, set depth/noise, and always preserve a legal fallback. Results are revalidated before application; stale IDs are ignored.

## 4. Key decisions

- **Own rules engine, not embedded third-party code:** dependencies/network are forbidden; exhaustive perft provides a stronger correctness gate than scattered examples.
- **Conservative coaching:** prefer a shorter verified capture/mate consequence over speculative strategy. Alternatives—free-form evaluation prose or engine scores—risk falsehood and confuse beginners.
- **Worker only in the UI:** the fixed API remains synchronous and directly testable; browser thinking is isolated so input/rendering never freezes.
- **Store, never recompute, reviews:** recap entries are selected from original `MoveRecord.review`, guaranteeing agreement. Severity chooses at most three, then display returns to game order.
- **Freeze silent edge cases:** malformed input and terminal search throw typed errors, while repetition stays session-owned; the coordinator delegated behavior not fixed by the accepted interface, and tests will lock it.
- **Sequential phases:** the envelope requires one builder and review before the next; parallel execution would add no time benefit. File ownership is disjoint, and P0 freezes internal contracts before consumers are written.

## 5. Cross-cutting concerns

Search checks `performance.now()` at every node and returns its last completed legal choice; unsupported explanations are omitted, never guessed. The local server binds loopback, accepts only GET/HEAD, and serves only `chess-coach/`; there are no credentials, storage, telemetry, `eval`, or HTML injection (feedback uses `textContent`). Unit tests cover perft, specials, malformed input, deadlines, legal recommendations, and stored-review identity. Chrome smoke tests drive the real page over localhost and assert responsive busy/turn/result states. Errors keep the board unchanged and show a recoverable message.

## 6. Build phases

Owned paths in this table are relative to `chess-coach/`.

| Phase | Outcome | Owned files | Depends on | Check command | Done-when |
|---|---|---|---|---|---|
| P0 (6–8h) | Correct rules and frozen internal contracts | `package.json`, `engine/rules.js`, `tests/rules.test.js` | — | `node --test chess-coach/tests/rules.test.js` | start/kiwipete perft through depth 3, specials, status, clocks, and invalid inputs pass |
| P1 (6–8h) | Timed opponent and truthful coach | `engine/search.js`, `engine/coach.js`, `tests/analysis.test.js` | P0 | `node --test chess-coach/tests/analysis.test.js` | every fixture returns legal/timely moves; 10 coaching lines replay and prove reason/fix |
| P2 (3–4h) | Stable public API and game lifecycle | `engine/index.js`, `app/game.js`, `tests/api-session.test.js` | P0,P1 | `node --test chess-coach/tests/api-session.test.js` | six exports match shapes/errors; illegal moves are atomic; hints, repetition, reset, recap pass |
| P3 (5–7h) | Playable nonblocking browser app | `index.html`, `styles.css`, `app/main.js`, `app/worker.js`, `server.mjs`, `tests/browser-smoke.test.js` | P2 | `node --test chess-coach/tests/browser-smoke.test.js` | Chrome plays moves, shows destinations/last move/check/feedback, promotes, resets, and stays responsive while worker searches |
| P4 (2–3h) | Calibrated release/demo evidence | `tests/fixtures/coaching.json`, `tests/quality.test.js`, `DEMO.md` | P3 | `node --test chess-coach/tests` | full suite passes; profiles differ; curated comments and full-game/recap script meet spec |

## 7. Parallelism and integration

Run P0→P1→P2→P3→P4, with code review after each. No phase shares owned files; later fixes to an earlier owner stop and return through its review rather than being hidden in another phase. Merge in phase order. Rollback is a revert of that phase commit; P0 rollback invalidates all later phases, P1 invalidates P2–P4, and UI/P4 rollback leaves the tested engine intact.

## 8. Traceability

| Requirement | Phase | Proof |
|---|---|---|
| FR-001, FR-008 | P1,P3,P4 | timed legal search tests; Chrome worker responsiveness; profile comparison/demo |
| FR-002, FR-011; SC-001 | P0,P2 | perft/special/status tests and exact public API tests plus owner suite |
| FR-003 | P3 | Chrome assertions for turn, destinations, last move, check/result, labels |
| FR-004, FR-005; SC-003 | P1,P4 | verdict vocabulary/threshold tests and 10 replayed reasons/improvements |
| FR-006; SC-004 | P1,P3,P4 | sentence/score lint and 20-comment human review |
| FR-007 | P2,P3 | session/Chrome tests prove legal hint and unchanged FEN |
| FR-009; SC-005 | P2,P4 | identity-based recap test and completed-game audit |
| FR-010 | P2,P3 | confirm/cancel/reset state and Chrome tests |
| SC-002 | P3,P4 | full Chrome game log checks feedback, legality, and <2s replies |

## 9. Quality-bar verification

The builder attaches full-suite timing plus perft/replay evidence. The acceptance reviewer follows `DEMO.md` in Chrome: plays a complete game at each level, inspects special positions, tests active reset and promotion, checks board clarity with keyboard and 200% zoom, audits 20 comments for plain/proportionate truth, and compares every recap entry byte-for-byte with stored feedback. Any false coaching claim, legality mismatch, frozen UI, or ≥2s reply fails acceptance even when tests pass.

## 10. Risks and escalation

Highest risk is legal generation (especially pins, en passant, castling); stop on any standard perft mismatch. Escalate if owner tests contradict the coordinator-approved edge contract or if a concrete coaching claim cannot be proved by replay. Search strength is hardware-sensitive; preserve the legal deadline fallback and tune depth/noise, not the two-second ceiling. Estimated implementation is 22–30 hours plus reviews; P0/P1 dominate.

Task / Dispatch: task_20b40a9707ed / ctx_5cb6acf437bb
Role: engineering designer
Model: Codex (GPT-5)
Base commit: 0f8711c2d41921718b3d7f8b7bcb4993c30b4563
Output: docs/run5/design.md
Decisions made: greenfield ES modules; conservative replay-backed coaching; repetition held in session history; synchronous fixed API plus UI worker; sequential disjoint phases.
Checks: `node --version` → v26.0.0; `node --test` → 0 tests, pass; Chrome version → 154.0.8037.93; 10 required headings and all 16 FR/SC IDs present; word count and `git diff --check` verified before commit.
Open questions: none; coordinator approved freezing unspecified public-API edge behavior in this design.
Next: engineering reviewer should review this design against the accepted spec and rubric.
