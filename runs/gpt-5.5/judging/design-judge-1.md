# Design judge 1: scoring of packets A and B

Scope: scoring only. I read `docs/run5/design-rescore/A.md` and `B.md`, each design with its spec. I ran no commands against the codebase and did not check any packet's claims independently. Scores rest on the text of the packets and the brief and quality bar supplied in the task.

## 1. Score table

| Rubric line | A | B |
|---|---|---|
| Traceability (20) | **18**. FR-001..FR-010 and SC-001..006 each map to a phase and a check. Quote: "FR-006 \| P3 \| probe reasons re-verified by detectors; SC-002". Small loss: SC-002..006 are grouped in one row. | **12**. Rows are grouped and mislabeled against its own spec. "FR-005, P3 user story, SC-003" puts the verdict (FR-006) and board (FR-005) under the wrong ids. "FR-010, SC-007 \| P2, P3" is the review, but FR-009 is mapped to hint. FR-003 (levels) has no named check. |
| Soundness of architecture and contracts (20) | **17**. Steppable search because "workers fail on `file://`", which the brief requires. Reasons "come only from concrete feature detectors". `createSearch`, thresholds and the threefold gap are all stated. Loss: the tree shows engine files outside `engine/`, and the cp thresholds are untested guesses. | **11**. Puts the search in `app/worker.js`, but the brief says the app opens from a local file, where Chrome blocks module workers. `bestMove` returns `null` on terminal positions, and the contract is thinner. Review reasons come from "legal follow-up search, attack maps, or material delta" with no detector list. Threefold is handled in the UI, like A. |
| Phase ownership, dependencies, safe parallelism (20) | **16**. "strict chain P0→P5"; owned files are disjoint. P5 re-edits P4 files, but it is sequenced after P4. Contract freeze at end of P2 and per-phase commit rollback. It does not use parallelism. | **12**. P1 and P2 may run concurrently "only if P2 does not edit `engine/**`", but P1 also "may update `engine/index.js`" (shared file, hedged). P3 mixes tests, the demo checklist and the review feature, with no UI file ownership for the end review. Four phases are coarse. |
| Checks that prove behavior, plus quality-bar verification (20) | **17**. Perft with numbers: "start d4=197281, Kiwipete d3=97862". Seeded level self-play: "≤1/10 at level 4". "≥20 blunder probes" with a detector re-check. `ui-smoke.sh` runs headless Chrome. A transcript read and a novice-proxy play. Loss: there is no automated assertion that the review matches in-game comments beyond a panel test. | **10**. Perft is named but no counts are given. No check of level strength differences (SC-003 is mapped to a demo). UI check is `ui-state.test.mjs` under node only, with no headless Chrome automation. "full game demo recorded" is a manual checklist. Quality-bar verification is mostly done by reviewers' spot checks of five comments. |
| Grounding, risks, effort realism (20) | **17**. Verified Node 26, Chrome 154, no root `package.json`, and a `{"type":"module"}` fix. Risks are specific: movegen, flaky level check, `file://`. Effort per phase is stated with an escalation rule. Loss: the effort total (about 5.5 days) is optimistic for a hand-written engine plus a coach. | **14**. Verified the Python suite (181 tests OK), Node 26, the Chrome path and the base commit. Good fact-finding on the repo. Gaps: no `package.json` for ES modules (`.mjs` tests are used instead, which the brief's `index.js` import may not cover), and the worker risk is absent. Effort is 3 days total, which is unrealistic. |

## 2. Totals

| Packet | Total |
|---|---|
| A | **85** |
| B | **59** |

A is stronger overall by a wide margin.

## 3. Better packet per rubric line

- **Traceability:** A. Its FR/SC rows are correct and each has a named check, while B's ids are mismatched against its own spec.
- **Architecture and contracts:** A. It addresses the `file://` limit that B's worker design ignores, and its detector-based reasons guard truthfulness.
- **Phase ownership:** A. Its chain is strict and every file has an owner, whereas B's parallel option shares `engine/index.js`.
- **Checks:** A. It gives perft counts, seeded level statistics, probe counts and a headless-Chrome smoke test. B's checks cannot fail on level strength and its UI test is node-only.
- **Grounding and risks:** A. Its risks and escalation triggers are sharper, though B's repo verification (the 181 Python tests) is a small plus.

## 4. If I had to build from one packet

I would build from A. It has the phases with checks that can fail (perft vectors, seeded level self-play, a truthfulness prober), and it avoids the `file://` worker trap. I would fix its tree layout (engine files listed outside `engine/`) and treat its effort estimate as optimistic.

## Handoff

```
Task / Dispatch: task_c03e6eeaa239 / ctx_d14dfdbc0534
Role: engineering reviewer (scoring only, independent judge)
Base commit: 9cd229c
Output: docs/run5/design-judge-1.md
Decisions made: A scored 85, B scored 59 on the project rubric, from the packet text only; no authors sought, no other folders read
Checks: read A.md and B.md in full -> done; no commands run against the codebase, so packet fact claims were not independently verified
Open questions: none
Next: coordinator compares with the other judge's scores
```
