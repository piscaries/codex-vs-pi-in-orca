# Independent product-spec scores

Scoring only, against the supplied Chess Coach brief and nine-point quality bar. Each rubric line is worth 20 points; neither packet was merged, rewritten, or accepted.

| Rubric line | Packet A: score and evidence | Packet B: score and evidence |
| --- | --- | --- |
| User value and clarity of the problem | **20/20** — “truthful guidance while each decision is fresh” (§1) connects the beginner's repeated mistakes to complete, winnable games and immediate learning; the stories cover all four required outcomes. | **20/20** — “a correct, playable game, and coaching that is true and understandable” (§1) clearly states the two user outcomes; separate P1 stories cover play, feedback, hints, and review. |
| Stories and acceptance scenarios that are independently testable | **18/20** — “at most three played moves and agrees with their earlier feedback” (§3.6) gives a bounded, observable recap check, alongside illegal-move, hint, and clean-game checks; special-rule scenarios still name categories rather than concrete positions and expected results. | **14/20** — “a mate-in-one was available and missed … the opponent can now mate” (§3, P1-2) asserts an invalid implication: missing the user's own mating opportunity does not establish an opponent mating opportunity; other hint, terminal, and recap scenarios are useful, but “harsh verdict” lacks an exact expected label. |
| Requirements that are complete, testable, and free of implementation detail | **18/20** — “exactly one verdict: best, good, inaccuracy, mistake, or blunder” (FR-004) and FR-011 preserve the fixed contract without prescribing engine internals; the labels lack operational classification criteria, and “compatible reasons” (FR-009) leaves recap consistency less exact than it could be. | **16/20** — “every concrete claim … is true in the position shown” (FR-006) and FR-002 cover truthfulness and the fixed contract without engine design; that truth requirement conflicts with the missed-mate scenario, verdict boundaries remain qualitative, and FR-002's “throwing on illegal moves” does not distinguish required illegal-apply behavior from unspecified illegal-review behavior. |
| Quality bar turned into checkable criteria | **17/20** — “Across ten curated mistake/blunder positions … replay confirms every reason” (SC-003) and the nine-item checklist cover the whole bar; strength testing has no sample size or win threshold, and a legal continuation alone does not establish every claim about a forced loss or a better alternative. | **18/20** — “In 10 games … at the highest, at most one of 10” (SC-003) and “≥20 probe positions” (SC-002) make strength and coaching checks more measurable; the novice opponent is undefined, and reading comments with the “board hidden” (SC-004) cannot alone verify positional truth. |
| Scope discipline: non-goals, edge cases, assumptions | **18/20** — “Repetition uses the game's move history; FEN-only status is limited to facts encoded by that input” (§8) explicitly resolves a major interface boundary; non-goals, promotion, invalid input, and analysis limits are covered, but claimable versus automatic draw behavior and exact invalid/terminal API outcomes remain unresolved. | **15/20** — “User plays White by default; Black is P2” (§9) is explicit, and non-goals constrain the release; optional Black play expands the brief and text export has neither a demo nor an acceptance scenario, while the packet omits the FEN/history boundary, malformed-input behavior, and analysis-time-limit fallback and leaves draw-claim semantics unspecified. |

## Totals

| Packet | Total |
| --- | ---: |
| A | **91/100** |
| B | **83/100** |

**Packet A is stronger overall.** B's missed-mate scenario is a substantive correctness defect: a builder could satisfy it by producing false coaching, directly violating the quality bar. Neither score certifies acceptance or proves that an implementation would pass the owner's tests.

## Best packet by rubric line

- **User value — tie:** both identify the beginner, repeated tactical mistakes, immediate truthful feedback, and the complete-game learning loop.
- **Stories and scenarios — A:** its scenarios remain consistent with truthful coaching and cover illegal attempts and clean recaps; B includes a false tactical expectation.
- **Requirements — A:** it presents a more internally consistent contract and explicitly specifies restarting; B's truth requirement clashes with its missed-mate scenario.
- **Quality criteria — B:** numerical strength outcomes and a larger specified coaching-probe set improve measurability, despite weaknesses in the proposed verification methods.
- **Scope discipline — A:** it handles history-dependent repetition and analysis limits, keeps optional features smaller, and exposes fixed-interface uncertainties.

## Build preference

I would build from Packet A because its core learning loop, acceptance scenarios, and failure behavior form the more coherent starting point. Its remaining gaps concern how to measure strength and settle interface/draw semantics, whereas B additionally contains a coaching scenario that can require a false statement.

## Audit and handoff

- **Files read in full:** `projects/chess-coach/brief.md`, `projects/chess-coach/quality-bar.md`, `docs/run5/spec-rescore/A.md`, `docs/run5/spec-rescore/B.md`; the final report was also read back for verification.
- **Blindness:** no author identities were present in the packets; no git history, other branches, or other worktrees were inspected. An initial repository-wide filename search exposed unrelated file paths; their contents were not opened or used. All substantive reading and scoring stayed within the named brief, quality bar, and packets.
- **Model shown by session:** GPT-6 / Codex; an exact model variant is not exposed.
- **Commands and results:** `orca orchestration check --terminal term_324656d3-6d6c-47d4-88f6-30d480b82792 --json` → no follow-ups at the recorded checkpoints; `pwd` → assigned workspace; `rg --files -g AGENTS.md -g A.md -g B.md -g spec-judge-2.md -g brief.md -g quality-bar.md` → packet/brief paths and unrelated filenames, no AGENTS.md returned; `cat projects/chess-coach/brief.md projects/chess-coach/quality-bar.md` → full brief and bar read before packets; `cat docs/run5/spec-rescore/A.md docs/run5/spec-rescore/B.md` → both packets read in full; `git status --short` → clean before writing; `git rev-parse HEAD` → supplied base confirmed; `wc -w docs/run5/spec-rescore/A.md docs/run5/spec-rescore/B.md` → A 1,072 words, B 1,198 words.
- **Report verification:** `cat docs/run5/spec-judge-2.md` → report read back; a Node ES-module assertion script parsed the five score rows and verified totals A=91 and B=83. Staged-diff review and `git diff --cached --check` validate the report before its single-file commit; no product tests are applicable to the scoring task.

```text
Task / Dispatch: task_67747732bafb / ctx_f94b1b3bf201
Role: independent spec judge (scoring only)
Base commit: 71cbc9eb94f975fd312fca446b4b370eafc024cd
Output: docs/run5/spec-judge-2.md
Decisions made: Score both packets against the frozen brief and bar, without merging or accepting either; A is stronger overall; missing one's own mate does not imply allowing the opponent's mate.
Checks: Source reads and base/clean-workspace checks succeeded; report diff/whitespace and score arithmetic checked; no software tests run for this documentation-only task.
Open questions: None blocking scoring; packet-level interface, draw, verdict-boundary, and strength-test gaps remain documented above.
Next: Coordinator consumes the independent scores and combines them with the other judges' reports.
```
