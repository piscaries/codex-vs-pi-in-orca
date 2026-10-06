# Spec review

## Verdict

**ACCEPT**

The spec faithfully covers every requirement in the brief, addresses all nine quality-bar items, and maintains good scope discipline. No fatal problems were found. Optional suggestions follow.

## Scores

| Rubric line | Score | Evidence |
| --- | --- | --- |
| User value and clarity of the problem (20) | 17 | Section 1 clearly states the problem ("learn only that they lost, not why") and the outcome ("teaches concrete fixes in plain language"). Aligns with the brief's goal. Could be slightly more specific about the measurable learning outcome. |
| Stories and acceptance scenarios that are independently testable (20) | 16 | Five prioritized user stories with demo descriptions; eight Given/When/Then scenarios covering legal play, special rules, illegal moves, good moves, mistakes, truthfulness, hints, and end review. Minor gap: no explicit scenario for draw detection (insufficient material, threefold repetition, fifty-move rule) — these are covered by FR-001 but not independently testable from the scenarios alone. |
| Requirements that are complete, testable, and free of implementation detail (20) | 17 | Twelve functional requirements (FR-001–FR-012) cover every brief deliverable: legal play, illegal rejection, strength levels, computer play, board display, verdicts, mistake feedback, plain language, hints, end review, testing interface, and local-only constraint. All are stated as "what" not "how." FR-011 is vague — it says "must accept FEN positions and UCI moves and return the specified results" without naming the six functions, their signatures, or the module path `chess-coach/engine/index.js`. The information exists in the brief (a shared source of truth), so this is not blocking, but the spec would be stronger if it enumerated the interface or explicitly cross-referenced the brief's table. |
| Quality bar turned into checkable criteria (20) | 15 | Section 5 addresses all nine quality-bar items: rules via perft/status tests, coach truth via position matching, mistake feedback via named-problem checks, plain words via vocabulary audit, proportion via brief acknowledgements, strength via distinct behavior, responsiveness via 2-second threshold, board clarity via visual inspection, and end-review consistency via move-history matching. Deducted because the section is a single dense paragraph rather than a checklist — harder to audit during acceptance. Some criteria lack explicit pass/fail thresholds (e.g., "distinct beginner, intermediate, and hard behavior" — how distinct?). |
| Scope discipline (non-goals, edge cases, assumptions) (20) | 17 | Non-goals list twelve excluded features (accounts, online play, puzzles, clocks, etc.). Edge cases cover invalid FEN, illegal UCI, promotion inference, null betterMove, game-over controls, and limited analysis. Assumptions are stated and the open question about draw-type labels is well-flagged. The assumption that "playing as White is sufficient for the core demo" is reasonable and properly qualified ("unless later approved otherwise"). |
| **Total** | **82** | |

## Fatal problems

None. The spec covers all brief requirements, all quality-bar items, and does not contain anything untestable or contradictory to the brief.

## Required changes

None.

## Optional suggestions

1. **FR-011 should be more explicit about the fixed testing interface.** The current wording ("must accept FEN positions and UCI moves and return the specified results") does not name the six functions (`legalMoves`, `applyMove`, `perft`, `gameStatus`, `bestMove`, `reviewMove`), their exact parameter and return shapes, or the module path `chess-coach/engine/index.js`. Engineering designers building from this spec alone would need to consult the brief for the contract. Adding a cross-reference ("as defined in the brief's Fixed testing interface table") or listing the function names would close this gap.

2. **Quality bar section (§5) would benefit from a checklist format.** The current single-paragraph format covers all nine items but is harder to audit during acceptance review. A numbered list mirroring the quality-bar headings would make it straightforward to check off each item.

3. **Add an acceptance scenario for draw detection.** The scenarios cover checkmate, stalemate, illegal moves, and game completion, but no scenario explicitly tests draw detection via insufficient material, threefold repetition, or the fifty-move rule. FR-001 requires "common draw outcomes," so a scenario like "Given a position with only two kings, When the game continues, Then the status is draw" would make this independently testable.

4. **Strength-level differentiation could be more specific.** The quality bar says "levels are clearly different" and the spec says "distinct beginner, intermediate, and hard behavior," but neither defines a measurable threshold. A suggestion like "at the lowest level, the engine occasionally makes random legal moves; at the highest, it plays the best move it can find within the time budget" would help engineering designers calibrate.

---

```
Task / Dispatch: task_1a6df150ff7b / ctx_6462a82889cb
Role: spec reviewer
Base commit: ee0363a
Output: docs/run5/spec-review.md
Decisions made: ACCEPT — the spec covers all brief requirements and quality-bar items with no fatal gaps; the four optional suggestions improve precision but are not blocking.
Checks: read docs/run5/spec.md (full, 94 lines), projects/chess-coach/brief.md (full, 43 lines), projects/chess-coach/quality-bar.md (full, 21 lines); scored against rubric with evidence for each line.
Open questions: none (the spec's open question about draw-type labels is well-flagged and correctly deferred to the owner).
Next: coordinator routes the accepted spec to engineering designers.
```
