# Spec judge report — run 5 rescore (independent scoring only)

Packets: `docs/run5/spec-rescore/A.md`, `docs/run5/spec-rescore/B.md`. Scored independently against the project rubric (5 × 20 = 100). No merging or rewriting; no authorship sought.

## 1. Score table

| Rubric line (max) | A | B |
| --- | --- | --- |
| User value and clarity of the problem (20) | **17** | **18** |
| Stories and acceptance scenarios independently testable (20) | **16** | **18** |
| Requirements complete, testable, free of implementation detail (20) | **17** | **18** |
| Quality bar turned into checkable criteria (20) | **15** | **18** |
| Scope discipline (non-goals, edge cases, assumptions) (20) | **17** | **18** |
| **Total (100)** | **82** | **90** |

### Cell evidence

**User value and clarity of the problem**
- **A = 17.** Clear problem and outcome — "learn only that they lost, not why" and "a playable full game that teaches concrete fixes in plain language" — but the user is generic ("Adult beginners who know the moves but not strategy") without the brief's ~1200 anchor.
- **B = 18.** Pins the user and the gap sharply — "An adult beginner (under ~1200 rating)… chess apps show a result, not a reason" — and states two measurable outcomes: "a correct, playable game, and coaching that is true and understandable."

**Stories and acceptance scenarios that are independently testable**
- **A = 16.** Eight Given/When/Then scenarios covering play, special rules, illegal rejection, hints, and review, but triggers are soft ("Given a user move does not materially worsen the position") and no scenario is keyed to a story ID.
- **B = 18.** Scenarios grouped by story ID with concrete, probe-ready triggers ("a mate-in-one was available and missed", "Given a hint was shown, When they play a different move, Then it is accepted and coached"); P2/P3 stories carry only one-line demos, not scenarios.

**Requirements that are complete, testable, and free of implementation detail**
- **A = 17.** FR-001–FR-012 are testable "must" statements with no implementation detail, but responsiveness ("replies within two seconds") and low-level winnability appear only in sections 5–6, not as functional requirements.
- **B = 18.** FR-002–FR-010 encode the fixed interface, strength calibration ("the described beginner can win at the lowest, rarely at the highest"), and the two-second reply as directly testable requirements, still free of implementation detail.

**Quality bar turned into checkable criteria**
- **A = 15.** All nine bar items map to a check and SC-002/SC-004/SC-006 are concrete (perft counts, five sampled comments, two seconds), but strength calibration is only "distinct beginner, intermediate, and hard behavior" — no measurement protocol.
- **B = 18.** Thresholds are countable: "on ≥20 known-mistake probes, every concrete claim checks out; one false claim fails", "In 10 games at the lowest level a novice-strength opponent wins most; at the highest, at most one of 10", review "capped at five".

**Scope discipline (non-goals, edge cases, assumptions)**
- **A = 17.** Full non-goal list and useful edge cases ("Invalid FEN input should fail clearly rather than returning a fabricated result"), but its NEEDS CLARIFICATION on draw labels is largely answered already by the brief's fixed `gameStatus` values (`"draw"`).
- **B = 18.** Richer edge-case coverage ("never silently defaulted" promotion, "premature input is ignored", "a clean game gets one line") and explicit scope decisions ("the coach speaks only about the user's moves"; verdict-scale semantics; review cap five).

## 2. Totals and overall verdict

- **A: 82 / 100. B: 90 / 100.**
- **B is stronger overall.** It converts the same brief into measurably checkable criteria and keeps calibration, responsiveness, and honesty as first-class requirements; A is coherent and complete but checks several bar items by description rather than by count.

## 3. Per-line comparison

| Rubric line | Better | Why (one line) |
| --- | --- | --- |
| User value and clarity | B | Names the ~1200 user, the competitor gap ("a result, not a reason"), and two outcomes, while A's user statement is generic. |
| Stories / acceptance scenarios | B | Story-keyed scenarios with concrete triggers (hanging piece, missed mate-in-one, hint-then-other-move) are directly testable; A's GWT triggers are vaguer and unkeyed. |
| Requirements | B | B makes the two-second reply and winnable-at-lowest calibration FRs; A leaves both to quality/success sections. |
| Quality bar → checkable criteria | B | B quantifies probes (≥20), games (10), review cap (5), and time (2 s); A's only unquantified check — "distinct beginner, intermediate, and hard behavior" — is exactly the hardest one to verify. |
| Scope discipline | B (narrowly) | Both have full non-goals and assumptions; B adds sharper edge-case behavior (promotion choice, premature input, clean-game review) and a decision on coach scope A never states. |

## 4. If I had to build from one packet

Build from **B**. Its acceptance scenarios and success criteria name countable thresholds (≥20 mistake probes, 10-game calibration, five-move review cap), so an engineering designer can trace every requirement to a test without inventing measurement protocols. A's few unique strengths — the invalid-FEN edge case, explicit resignation assumption, and numbered FR format — are small and easy to carry over as reviewer-suggested additions.

---

```
Task / Dispatch: task_b65f74e9cf6d / ctx_7b189d7b3bce
Role: spec judge (independent scoring, run 5 rescore)
Base commit: c64e4e5
Output: docs/run5/spec-judge-3.md
Decisions made: scored A and B independently with the project rubric; treated A's draw-label open question as mostly pre-answered by the brief's fixed gameStatus values; counted B's P2/P3 demo-only stories as a minor testability gap rather than a line-2 failure.
Checks: read docs/run5/spec-rescore/A.md and B.md in full; `git commit docs/run5/spec-judge-3.md` → committed.
Open questions: none
Next: the coordinator aggregates this judge report with the other rescore judges and decides the accepted-spec path.
```
