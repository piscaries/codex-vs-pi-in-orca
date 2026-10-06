# Phase P1 report

## Built

- Added a dependency-free, deadline-checked iterative-deepening negamax search with alpha-beta pruning, capture quiescence, move ordering, terminal scoring, deterministic optional noise, and an always-legal static fallback.
- Added fixed coaching thresholds and move review that compares every legal root move at the same completed depth. Severe verdicts are emitted only when a legal searched line witnesses a concrete capture, check, or mate; otherwise the coach conservatively reports an inaccuracy.
- Added legal, non-mutating hints and internal boundaries for P2: `searchPosition`, `reviewFenMove`, `reviewPositionMove`, and `hintForPosition`.
- Added eight analysis tests. They cover five timed search fixtures, a zero-time fallback, forced mate, malformed options, ten replayed capture explanations, a replayed mate explanation, legal improvements, concise positive feedback, and non-mutating hints.

## Decisions

- Scores are side-to-move centipawn values. Material dominates a small symmetric activity bonus, keeping beginner-facing classifications predictable without exposing scores in prose.
- Verdict loss thresholds are fixed at 30/90/180/350 centipawns for best/good/inaccuracy/mistake/blunder boundaries.
- Iterative deepening retains only a fully completed root iteration. If a deeper iteration times out, the result and every root comparison come from the last common depth.
- Search uses `performance.now()` at every negamax and quiescence node. Deadline expiry returns the last complete legal choice; a zero-time request uses the legal static fallback.
- Quiescence follows all legal evasions when in check and otherwise only captures/promotions, avoiding an illegal “stand pat” evaluation while bounding tactical extension depth.
- Coaching prose names pieces and squares in plain words. It does not claim that a move “wins” material; it states only a legal capture/check/mate opportunity that replay directly verifies.
- Optional search noise is deterministic by UCI move. This lets later strength profiles be observably different without making tests or demos irreproducible.

## Checks

- Base commit: `a4638add7f7a4ccd45597c2ca3d9e1e901932a1f` (expected `a4638ad`).
- Initial `node --test chess-coach/tests`: FAIL because Node 26 treats the directory as a module path, matching the known P0 report limitation; no code had been changed at that point.
- Corrected baseline `npm test --prefix chess-coach`: PASS, 19/19 tests.
- One intermediate phase-test run passed 7/8 after a new fix assertion incorrectly assumed a bishop's named reply would become illegal; the assertion was corrected to prove the destination is empty (so the reply no longer captures), then the suite passed.
- Phase check `node --test chess-coach/tests/analysis.test.js`: PASS, 8/8 tests, approximately 0.91 seconds on the final pre-report run.
- Full project check `npm test --prefix chess-coach`: PASS, 27/27 tests, approximately 0.92 seconds on the final pre-report run.
- `git diff --check`: PASS.

## Evidence and sample output

The ten capture fixtures replay the played move, independently confirm the named opponent reply is legal, apply that reply, and prove the suggested fix leaves the named capture square empty. The forced-mate fixture replays Fool's Mate through checkmate and proves the suggested fix makes the same queen reply non-mating. A representative review is:

```json
{
  "verdict": "blunder",
  "reasons": [
    "Your opponent can capture your queen on e4 with their pawn from d5."
  ],
  "betterMove": "e3c5"
}
```

On the forced-mate fixture the search returns `d8h4`, and replay reports `checkmate`. Across five search fixtures, a 40 ms request always returned a legal move with measured wall time below 200 ms; a zero-time request also returned a legal fallback.

## Files read

- `docs/run5/design.md`, `docs/run5/design-review.md`, `docs/run5/spec.md`, `docs/run5/phase-P0.md`, and `docs/run5/review-P0.md`
- `projects/chess-coach/brief.md` and `projects/chess-coach/quality-bar.md`
- `chess-coach/package.json`, `chess-coach/engine/rules.js`, and `chess-coach/tests/rules.test.js`
- Task-continuity skill instructions and question policy

## Known limits

- Evaluation is intentionally modest and tactical rather than grandmaster strength. P4 must calibrate profile budgets/noise against complete games.
- A severe numerical loss without a witnessed capture, check, or mate is downgraded to inaccuracy rather than explained speculatively.
- Browser Worker integration and the combined 1.8-second review/reply profile budgets belong to P3/P4; P1 provides synchronous deadline-bounded primitives.

Task / Dispatch: task_fdf015a5ba05 / ctx_627b5da6c50e
Role: builder
Base commit: a4638add7f7a4ccd45597c2ca3d9e1e901932a1f
Output: chess-coach/engine/search.js; chess-coach/engine/coach.js; chess-coach/tests/analysis.test.js; docs/run5/phase-P1.md
Decisions made: fixed 30/90/180/350 thresholds; complete-iteration deadline fallback; check-aware bounded quiescence; only replay-witnessed severe explanations; deterministic profile noise.
Checks: `node --test chess-coach/tests/analysis.test.js` → PASS (8/8); `npm test --prefix chess-coach` → PASS (27/27); `git diff --check` → PASS.
Open questions: none.
Next: code reviewer should review P1, especially deadline fallback legality, common-depth move comparison, and whether every severe explanation is directly supported by its returned legal line.
