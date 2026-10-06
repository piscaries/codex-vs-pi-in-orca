# Spec judge 1: blind scoring of packets A and B

Read: project brief and quality bar (from task), docs/run5/spec-rescore/A.md, B.md. No other files, branches, or history. Model shown: Sonnet 5.5. Neither packet names an author.

## 1. Scores (each /20)

| Rubric line | A | B |
| --- | --- | --- |
| User value and problem clarity | **17**: "recognizing how to avoid costly mistakes"; success defined, but stories are terse and lack concrete demo moments | **17**: "loses the same way every time: chess apps show a result, not a reason"; demos are concrete ("hang a piece, see a plain verdict") |
| Independently testable stories and scenarios | **17**: 7 Given/When/Then scenarios incl. hint and clean recap ("invents no criticism"); but numbered globally, not tied to stories, and no scenario for restart (P2) | **16**: scenarios grouped per story, concrete ("mate-in-one was available and missed"); P2-1, P2-2, P3-1 have no scenarios; no illegal-move or draw scenario |
| Complete, testable requirements, no implementation detail | **18**: FR-011 pins the interface; FR-002 lists all draw rules; FR-008 "at most two seconds"; hint unavailable off-turn is covered | **16**: FR-001 and FR-002 are broad; "novice-strength opponent" (FR-003) is undefined; Black (P2-2) has no FR; "when one exists" for inaccuracy better-move is loose |
| Quality bar to checkable criteria | **17**: "legal continuation verifies every coaching claim"; SC-003 "ten curated positions"; lowest-level win criterion has no number | **18**: "≥20 known-mistake probes… one false claim fails"; SC-003 "at most one of 10" at highest level; SC-006 "no console errors or network" |
| Scope discipline (non-goals, edge cases, assumptions) | **19**: non-goals list is full; "FEN-only status is limited to facts encoded by that input" (repetition from move history); time-limit fallback; open question that interface leaves malformed FEN and terminal `bestMove` undefined | **16**: non-goals are good ("coach speaks only about the user's moves"); but adds Black and copy-as-text beyond the brief without scenarios; misses FEN-only repetition and invalid input handling |

## 2. Totals

- **A: 88/100**
- **B: 83/100**
- A is stronger overall, narrowly.

## 3. Best packet per rubric line

- **User value:** tie. B's demos are more vivid; A's problem statement is just as clear.
- **Stories and scenarios:** A, slightly. Its scenarios cover hint, clean recap, and faithful recap and are all testable. B's per-story layout is nicer but leaves P2/P3 untested.
- **Requirements:** A. Complete draw rules, explicit interface requirement, and no undefined terms like B's "novice-strength opponent".
- **Quality bar to criteria:** B. It gives numeric thresholds (≥20 probes, ≤1 of 10 wins) where A is vaguer on level strength.
- **Scope discipline:** A. It spots the FEN-only repetition limit and the interface gaps; B adds unscenarioed scope.

## 4. If I had to build from one

Build from A. It is tighter, has no unscoped extras, and surfaces the real interface ambiguities (repetition from FEN, terminal `bestMove`) before engineers hit them. I would borrow B's numeric success thresholds and per-story scenario layout, but that is a merge decision for a later step.
