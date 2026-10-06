# Code review: phase P4

Verdict: PASS

## Checks run

- `node --test chess-coach/tests/quality.test.js` → PASS, 5/5 tests, ~1.26s
- `npm test --prefix chess-coach` → PASS, 44/44 tests, ~3.38s

## Blocking findings

None.

## Non-blocking (Nit:) suggestions

1. `quality.test.js:26` — The `PIECE_NAMES` map duplicates the one in `coach.js`. If a future phase adds a piece name, both must stay in sync. Consider importing from `coach.js` if it were exported, but this is a test-only convenience and not worth a contract change now.

2. `quality.test.js:94–100` — The replay proof asserts `afterBetter.board[responseTarget] === null`, which confirms the better move avoids the capture square. This is a sound but indirect proof; a direct check that the opponent's response is no longer legal after the better move would be marginally stronger. The current approach is valid and the tests pass deterministically.

## What was done well

- The 20-case fixture is well-designed: ten severe cases use simple material-loss positions where claims are mechanically verifiable by replay, and ten ordinary cases cover the full verdict vocabulary including promotion wording.
- The replay verification test (test 3) is rigorous — it independently confirms that the captured piece exists on the named square, the response is legal, the capture occurs, and the better move avoids the target square.
- Worker profile differentiation uses the real Worker message handler rather than duplicating profile tables, which catches integration issues that a unit mock would miss.
- The complete-game test uses the four-ply Fool's Mate, making it fully deterministic while still exercising the full game lifecycle including recap identity.
- The DEMO.md guide is thorough and actionable for human acceptance, covering all subjective quality-bar items that automated tests cannot judge (difficulty feel, language clarity, accessibility at 200% zoom).
- Ownership is clean: only the four P4 files were created, and no existing files were modified.

## Remaining limits

- Automated tests prove profiles make distinct legal choices; subjective difficulty ordering (beginner is winnable, challenging is hardest) requires the human games described in DEMO.md.
- The `queen-edge-inaccuracy` fixture's engine-selected better move (`e3c3` rather than the capturing `e3d4`) reflects the engine's evaluation at depth 3, not optimal chess. This is correct behavior — the fixture calibrates to what the engine actually produces — but acceptance reviewers should be aware that engine recommendations reflect bounded search, not grandmaster analysis.

---

Task / Dispatch: task_331cf6f00cd8 / ctx_6095f04b6bc7
Role: code reviewer
Base commit: bcbecb4
Output: docs/run5/review-P4.md
Decisions made: PASS — the change delivers all P4 requirements (20-comment calibration, replay-verified severe cases, profile differentiation, complete-game recap identity, comprehensive demo guide) with clean ownership and no blocking issues.
Checks: `node --test chess-coach/tests/quality.test.js` → PASS (5/5); `npm test --prefix chess-coach` → PASS (44/44).
Open questions: none.
Next: coordinator should record PASS and proceed to acceptance review.
