# Phase P4 report

## Built

- Added a 20-case calibration fixture with ten severe mistake/blunder positions and ten proportionate best/inaccuracy comments. The fixture freezes verdicts, plain-language reasons, legal improvements, replay responses, and the exact browser display copy.
- Added five release-quality tests. They generate and lint all 20 comments, replay every severe claim and fix, exercise the real Worker profiles on a stable comparison position, simulate a complete legal game through checkmate, prove recap identity, and keep the human audit sheet synchronized with the fixture.
- Added a release demo guide covering full games at all three levels, reply timing, hints, faithful and clean recaps, repeatable profile comparison, castling, en passant, all promotion choices, checkmate, reset confirmation, keyboard play, 200% zoom, and the 20-comment human language audit.

## Decisions

- The ten severe fixtures reuse simple material-loss positions whose claims can be proved directly by legal replay. This makes a false capture explanation or ineffective suggested fix fail deterministically.
- The ten remaining comments balance five short Best acknowledgements with five Inaccuracies, including promotion wording. Together with the severe cases, they give the human audit 20 exact rendered comments without speculative prose.
- Profile differentiation is checked through the actual Worker message boundary, not a duplicate profile table. A low-branching queen-and-pawn position produces three legal, distinct hints under the three shipped profiles while remaining comfortably inside two seconds.
- The complete-game evidence uses the four-ply Fool's Mate line. Every move is replayed from its recorded FEN, the final coaching claim is independently known to be checkmate, and the recap entry and review retain object identity with stored in-game feedback.
- The accepted design's literal `node --test chess-coach/tests` command is incompatible with Node 26 because Node treats the directory as a module path. The coordinator approved the equivalent explicit test glob as the phase check and `npm test --prefix chess-coach` as the full check; no out-of-scope package file was changed.

## Checks

- Base commit `af59e6f2584f2b034dd805ea32f9be493c9edf76` matched the assigned `af59e6f`; the initial worktree was clean.
- Baseline literal design command `node --test chess-coach/tests`: FAIL with `MODULE_NOT_FOUND`, matching the limitation recorded in P0. Baseline full check `npm test --prefix chess-coach`: PASS, 39/39 tests, approximately 3.78 seconds.
- Focused P4 check `node --test chess-coach/tests/quality.test.js`: PASS, 5/5 tests, approximately 1.26 seconds.
- Equivalent phase check `node --test chess-coach/tests/*.test.js`: PASS, 44/44 tests, approximately 3.22 seconds.
- Full project check `npm test --prefix chess-coach`: PASS, 44/44 tests, approximately 3.09 seconds.
- `git diff --check`: PASS with all P4 files present.

## Sample evidence

On the calibration position, the current Worker profiles return three different legal hints: Beginner suggests queen e3–e5, Club suggests queen e3–h6, and Challenging suggests king a1–a2. The deterministic complete game replays `f2f3 e7e5 g2g4 d8h4`, reaches checkmate, stores “Your opponent can checkmate by moving their queen from d8 to h4.”, and returns that same stored review in the one-entry recap.

## Files read

- `docs/run5/design.md`, `docs/run5/spec.md`, and the P0–P3 phase reports
- `projects/chess-coach/brief.md` and `projects/chess-coach/quality-bar.md`
- The shipped engine, game, Worker, UI, package, and existing test files under `chess-coach/`
- Task-continuity skill instructions and question policy

## Known limits

- Automated checks prove that profiles make distinct legal bounded choices; the subjective requirement that Beginner is winnable and Challenging is hardest still requires the three complete human games in `DEMO.md`.
- The comment set intentionally calibrates concrete captures plus concise acknowledgements/inaccuracies. The existing analysis suite separately covers a replay-proved mate explanation, and the P4 complete-game test carries that mate comment into a recap.

Task / Dispatch: task_7a006755404b / ctx_50b243db4f95
Role: builder
Base commit: af59e6f2584f2b034dd805ea32f9be493c9edf76
Output: chess-coach/tests/fixtures/coaching.json; chess-coach/tests/quality.test.js; chess-coach/DEMO.md; docs/run5/phase-P4.md
Decisions made: replay-verifiable severe fixtures; exact 20-comment display calibration; real-Worker profile comparison; four-ply complete-game recap proof; coordinator-approved equivalent Node 26 check.
Checks: focused P4 → PASS (5/5); equivalent phase → PASS (44/44); full project → PASS (44/44); `git diff --check` → PASS.
Open questions: none.
Next: code reviewer should review P4 against the accepted quality thresholds, especially replay truth, profile differentiation, recap identity, and whether the demo is sufficient for subjective acceptance.
