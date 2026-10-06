# Independent product-spec scoring

## Score table

| Rubric line | Packet A | Packet B |
| --- | --- | --- |
| User value and clarity of the problem (20) | **19/20** — Clearly identifies the repeated-mistake problem and the outcome: “a playable full game that teaches concrete fixes in plain language.” | **20/20** — Concisely identifies the user, problem, and two essential outcomes: “a correct, playable game, and coaching that is true and understandable.” |
| Stories and acceptance scenarios that are independently testable (20) | **17/20** — Covers the core journeys and special rules, but “does not materially worsen the position” and “cannot support a claim” lack an observable test threshold. | **18/20** — Core scenarios have concrete outputs such as “worst first, at most five,” though there are no acceptance scenarios for the P2/P3 stories and the missed-mate scenario conflates missing a mate with allowing one. |
| Requirements that are complete, testable, and free of implementation detail (20) | **18/20** — FR-001 through FR-012 cover the brief, but “common draw outcomes” is deferred to an assumption and FR-011 refers to “the specified results” rather than restating the required contract. | **19/20** — FR-001 explicitly names the draw rules and FR-002 binds the exact fixed interface; the main weakness is the subjective requirement that the beginner “can win” or “rarely” wins without a measurement method in the requirement itself. |
| Quality bar turned into checkable criteria (20) | **17/20** — Maps all nine quality points, including “replies within two seconds,” but coach truth, board clarity, and level distinction mostly say they are “checked” without a sample size or pass/fail threshold. | **19/20** — Converts the bar into thresholds such as “≥20 known-mistake probes,” “one false claim fails,” and 10-game strength trials; “within seconds” and reader understanding remain partly judgment-based. |
| Scope discipline: non-goals, edge cases, assumptions (20) | **19/20** — Has a focused exclusion list plus explicit illegal-move, promotion, game-over, and unsupported-analysis behavior; “resignation is optional” leaves a small avoidable scope ambiguity. | **18/20** — Thorough non-goals and failure behavior, but unrequired stories for playing Black and copying the game add scope, and game reset/copy lack corresponding requirements or acceptance coverage. |
| **Total** | **90/100** | **94/100** |

## Overall result

**Packet B is stronger overall, 94 to 90.** It is more operational: it specifies explicit draw cases, concrete review ordering and limits, falsity as a hard failure, probe counts, and measurable strength trials. Packet A is slightly more disciplined about the release boundary, but its testing language more often leaves the evaluator to invent thresholds.

## Better packet by rubric line

- **User value and clarity — Packet B:** it reduces the goal to two plainly stated user outcomes while retaining the beginner’s repeated-mistake context.
- **Stories and acceptance scenarios — Packet B:** its core scenarios define more observable outputs and boundaries, especially for hints and the end review, despite leaving its lower-priority stories uncovered.
- **Requirements — Packet B:** it names the draw rules, binds the fixed contract directly, and expresses truthfulness, responsiveness, and review behavior more completely.
- **Quality-bar criteria — Packet B:** it supplies sample counts and hard failure conditions rather than only naming what should be checked.
- **Scope discipline — Packet A:** it stays closer to the brief and avoids Packet B’s unsupported copy-game and play-as-Black additions.

## Build choice

If I had to build from one packet, I would choose **Packet B** because its core requirements and quality checks leave fewer consequential decisions to engineering and test authors. I would first remove or defer the copy-game and play-as-Black stories unless the owner explicitly wants them, and I would correct the missed-mate acceptance scenario so it tests one concrete failure mode at a time.

## Review record

Scoring was blind and content-only. Files read: `docs/run5/spec-rescore/A.md` and `docs/run5/spec-rescore/B.md`; the supplied Chess Coach brief and quality bar were used as the reference, and no author, branch, history, other workspace, or other-track material was inspected. Model: GPT-5 Codex.

## Handoff

Task / Dispatch: task_97b95f7d3b18 / ctx_5897655962d1
Role: spec reviewer (independent scoring only)
Base commit: c64e4e5
Output: `docs/run5/spec-judge-2.md`
Decisions made: Packet B scored stronger overall because it operationalizes more of the quality bar; Packet A won scope discipline because it avoids unsupported feature expansion.
Checks: `sed -n '1,260p' docs/run5/spec-judge-2.md` → complete report reviewed; `git diff --check --cached` → passed
Open questions: none
Next: coordinator should use this blind score as one input to the product-spec selection.
