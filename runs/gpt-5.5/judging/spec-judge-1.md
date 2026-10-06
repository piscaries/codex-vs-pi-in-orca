# Spec judge 1: blind scoring of packets A and B

Read: brief, quality bar, docs/run5/spec-rescore/A.md, B.md. Scoring only; no merge.

## 1. Scores

| Rubric line (max) | A | B |
| --- | --- | --- |
| User value and clarity of the problem (20) | **16** "learn only that they lost, not why"; clear, but stories P2/P3 are thin ("understand board state at a glance") | **17** "chess apps show a result, not a reason"; each story carries a one-line rationale and a concrete demo ("hang a piece, see a plain verdict, the threat, and a better move") |
| Independently testable stories and scenarios (20) | **14** Given/When/Then are generic ("Then the coach gives a brief positive or neutral verdict"); no scenario for hint-not-auto-played, missed mate, game-over, or Black | **17** specific scenarios: missed mate-in-one shows the mating move; "a hint never plays itself"; review "worst first, at most five"; same verdict and reason as in-game. Weaker: P2/P3 stories have no scenarios |
| Complete, testable requirements, no implementation detail (20) | **15** FR-001..012 complete, but soft ("legal better move when available", "at least three levels" with no ordering, FR-011 only restates interface); no time bound on the engine's `timeMs` | **16** FR-004 two-second and stays-interactive, FR-009 cap and ordering, FR-002 throws and answers within the requested time; FR-005 includes inaccuracy. Slightly loose on the "draw" label |
| Quality bar turned into checkable criteria (20) | **14** section 5 is a restatement ("Strength is checked by distinct beginner, intermediate, and hard behavior"); SC-004 samples only five comments; no thresholds for level strength | **18** all nine bar items mapped with measures: "≥20 known-mistake probes... one false claim fails", "at most one of 10" wins at the top level, 10 games at the lowest, transcript proportionality check, console-error and network check in SC-006 |
| Scope discipline: non-goals, edge cases, assumptions (20) | **14** non-goals are a plain list; edge cases include invalid FEN and a null `betterMove`; but "optional stop" and "resignation optional" are undecided and the white-only assumption is left implicit | **17** non-goals include "coach speaks only about the user's moves" and takebacks; edge cases cover promotion prompt, no-legal-move handling, premature input; stated overridable decisions and two non-blocking questions |
| **Total (100)** | **73** | **85** |

## 2. Overall
B is stronger (85 vs 73). Neither has a fatal problem. A's gap is that its criteria are not measurable.

## 3. Best packet per rubric line
- User value: B, because each story has a rationale and a demo tied to the learning loop.
- Stories and scenarios: B, because its scenarios are specific and testable (missed mate, hint stays a hint, review cap and ordering).
- Requirements: B, narrowly; both are complete, but B states bounds (two seconds, cap of five, worst first). A's invalid-FEN edge case is a small plus.
- Quality bar to criteria: B by a clear margin, because of its probe counts, win-rate thresholds and pass/fail rule for false claims.
- Scope discipline: B, because of its explicit decisions, coach scope and edge cases; A's "NEEDS CLARIFICATION" on draw labels is a good catch that B lacks.

## 4. If I had to build from one
B, because its acceptance and success criteria can be turned directly into tests and probes without interpretation. I would still add A's invalid-FEN and draw-label questions to it. A would need its quality-bar section rewritten with measurable thresholds before it was usable.
