# Spec review — Chess Coach (track t2)

## Verdict

**ACCEPT.** The spec is complete, testable, and faithful to the brief and quality bar. No fatal problems. Two optional suggestions below.

## Scores

| Rubric line | Score | Evidence |
| --- | --- | --- |
| **User value and clarity of the problem (20)** | 18 | Section 1 states the problem in one paragraph: "chess apps show a result, not a reason." Names the user (adult beginner, under ~1200) and the two outcomes that matter: a correct game and coaching that is true and understandable. Closely mirrors the brief without copying it. Minor deduction: does not mention that the user wants to "learn from each mistake while it is fresh" — the immediacy angle the brief emphasizes. |
| **Stories and acceptance scenarios that are independently testable (20)** | 16 | Seven stories with clear priority tiers (P1–P3). Four groups of acceptance scenarios cover all P1 stories with concrete given/when/then phrasing (e.g., "Given a move leaves a piece capturable for free, Then the coach shows a harsh verdict, names the piece and threat, and offers a better move"). Deduction: P2-1 (new game without reloading) and P2-2 (play as Black) have no acceptance scenarios; P3-1 (copy game as text) has none either. These are lower priority but still testable features that need scenarios before engineering. |
| **Requirements that are complete, testable, and free of implementation detail (20)** | 18 | FR-001 through FR-010 cover every brief requirement. FR-002 explicitly names the fixed testing interface. Requirements are testable ("two seconds," "five-step scale," "capped at five") and free of implementation prescription. All draw types enumerated. Deduction: FR-003 says "at least three ordered levels" and "the described beginner can win at the lowest, rarely at the highest" — testable but "rarely" is imprecise; SC-003 later quantifies this ("at most one of 10"), which rescues it. |
| **Quality bar turned into checkable criteria (20)** | 18 | Section 5 maps each of the nine quality-bar items to a checkable criterion. Section 6 adds six success criteria with quantitative thresholds: "≥20 known-mistake probes" (SC-002), "10 games at lowest level a novice wins most; at highest, at most one of 10" (SC-003), "a person reading one full game's comments finds every comment true" (SC-004). The "one false claim fails" threshold in §5.2 is appropriately strict. Deduction: SC-004 is "judged by reading" — reasonable for subjective quality, but the spec could name who judges (owner, reviewer, or any team member). |
| **Scope discipline (non-goals, edge cases, assumptions) (20)** | 17 | Non-goals (§7) clearly exclude online play, teaching content, clocks, coaching computer moves, and takebacks. Edge cases (§8) cover seven specific scenarios including promotion choice, draw endings, and game-over behavior. Assumptions (§9) separate overridable decisions from open questions and mark both open questions as non-blocking. Deduction: the spec does not address what happens if the engine cannot find a move within `timeMs` (e.g., does `bestMove` return the best move found so far, or throw?). The brief says "chosen within roughly `timeMs`" — the spec should state the expectation. |

**Total: 87 / 100**

## Fatal problems

None. The spec covers every brief requirement, correctly incorporates the fixed testing interface, maps all nine quality-bar items to checkable criteria, and avoids implementation prescription. No requirement contradicts the brief or the quality bar.

## Required changes

None. The score meets the acceptance threshold and no fatal problems were found.

## Optional suggestions

1. **Add acceptance scenarios for P2 and P3 stories.** P2-1 (new game without reloading), P2-2 (play as Black), and P3-1 (copy game as text) currently lack given/when/then scenarios. Engineering designers will need these to know when the feature is done. Even a single scenario per story would close the gap.

2. **State the `bestMove` timeout behavior.** The brief says "chosen within roughly `timeMs`" but the spec's edge-case section does not say what happens if the engine runs over time. A one-line decision — e.g., "returns the best move found so far" — would prevent builder ambiguity and a possible correctness issue at low time budgets.

---

```
Task / Dispatch: task_1b6d6dda899a / ctx_9f06b5542f74
Role: spec reviewer (track t2)
Base commit: d1a0a26
Output: docs/run5/spec-review.md
Decisions made:
  - ACCEPT verdict: the spec is complete, testable, and faithful to the brief; no fatal problems found
  - Score 87/100: deductions for missing P2/P3 acceptance scenarios (-4), minor imprecision in level difficulty wording (-2), no SC-004 judge named (-2), missing bestMove timeout behavior (-3), immediacy angle understated (-2)
Checks: read brief.md, quality-bar.md, spec.md in full; verified all nine quality-bar items have corresponding spec criteria; verified all six brief "must get back" items have corresponding requirements; verified fixed interface functions match between brief and spec
Open questions: none (the spec's own open questions — takebacks, review cap — are correctly marked non-blocking)
Next: coordinator → owner approves spec → engineering designers (track t2)
```
