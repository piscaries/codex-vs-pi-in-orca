# Phase P0 report

## Built

- Added the dependency-free ES module package shell for `chess-coach/`.
- Implemented immutable FEN parsing/serialization, square and UCI conversion, pseudo-legal generation plus own-king safety filtering, move application, attack/check detection, perft, terminal status, insufficient-material detection, and normalized repetition keys in `engine/rules.js`.
- Implemented castling, en passant (including the discovered-check edge), all four promotion choices, castling-right revocation, and halfmove/fullmove clock updates.
- Added 19 focused rules tests. The perft fixtures cover the initial position and the published Kiwipete position through depth 3; special-rule, status, clock, atomic illegal-move, and malformed-input behavior are also locked.

## Decisions

- Board indices run from `a8 = 0` through `h1 = 63`, matching FEN traversal order and keeping parsing direct.
- Internal move flags are an exported integer bit mask. Internal moves retain the design's `{from,to,promotion,flags}` shape and convert losslessly to/from UCI.
- Legal generation uses generate/apply/reject-if-own-king-is-attacked. Castling also checks the start and transit squares before the ordinary destination safety filter.
- `gameStatusForPosition` checks no-legal-move outcomes before clock/material draws so checkmate is not obscured by a halfmove clock of 100.
- Standard insufficient-material handling covers king versus king, a single bishop or knight, and bishop-only positions where every bishop occupies the same square color. Two knights are not automatically declared drawn.
- Repetition identity retains en passant only when the side to move has a legal en-passant capture, and always omits both clocks.
- The package test script uses Node's automatic test discovery. On the verified Node 26 runtime, passing a directory directly (`node --test chess-coach/tests`) is treated as a module path and fails; this should be considered when P4's aggregate check is introduced.

## Checks

- Baseline `node --test` before implementation: PASS, 0 tests.
- Phase check `node --test chess-coach/tests/rules.test.js`: PASS, 19/19 tests, approximately 0.27 seconds on the final run.
- Full project check `npm test --prefix chess-coach`: PASS, 19/19 tests, approximately 0.21 seconds on the final run.
- Root JavaScript suite `node --test`: PASS, 19/19 tests, approximately 0.29 seconds on the final run.
- Supplemental published perft positions 3–6 through depth 3: PASS (`14/191/2,812`, `6/264/9,467`, `44/1,486/62,379`, and `46/2,079/89,890`).
- `git diff --cached --check`: PASS.

## Sample output

| Position | Depth 1 | Depth 2 | Depth 3 |
| --- | ---: | ---: | ---: |
| Initial position | 20 | 400 | 8,902 |
| Kiwipete | 48 | 2,039 | 97,862 |

Kiwipete FEN and reference counts were taken from the published [Grand Chess Tree Kiwipete reference](https://grandchesstree.com/kiwipete), as directed by the coordinator after an initially incorrect fixture was identified.

## Known limits

- P0 intentionally does not add the six-function public `engine/index.js`; that belongs to P2.
- Threefold repetition cannot be inferred from one FEN. P0 supplies the normalized key; session-level occurrence counting belongs to P2.
- P0 validates FEN syntax, counters, piece limits, king counts, pawn ranks, en-passant backing pawns, and that the side that just moved is not in check. It does not attempt to prove that every otherwise well-formed FEN could have arisen from a legal game history.

Task / Dispatch: task_139320b8ec8c / ctx_62c1ece6af8f
Role: builder
Base commit: ad35a32f0df4220709f69e766b5f9529c66174b0
Output: chess-coach/package.json; chess-coach/engine/rules.js; chess-coach/tests/rules.test.js; docs/run5/phase-P0.md
Decisions made: a8-first board indexing; bit-mask move flags; generate/apply/check legality; terminal no-move precedence; standard conservative insufficient-material set; legal-capture-aware en-passant repetition normalization; Node automatic test discovery.
Checks: `node --test chess-coach/tests/rules.test.js` → PASS (19/19); `npm test --prefix chess-coach` → PASS (19/19); `node --test` → PASS (19/19); supplemental perft positions 3–6 through depth 3 → PASS; `git diff --cached --check` → PASS.
Open questions: none.
Next: code reviewer should review P0 against the accepted design, especially FEN boundary behavior, special-move state updates, and the published perft counts.
