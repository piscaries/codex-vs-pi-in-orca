# Independent engineering-design scores

Each packet is scored against the rubric and the product spec included in that packet. Repository claims were checked only in this workspace.

## Score table

| Packet | Traceability to the spec (20) | Architecture and contracts (20) | Phase ownership, dependencies, safe parallelism (20) | Proving checks and quality-bar verification (20) | Codebase grounding, risks, effort realism (20) |
| --- | --- | --- | --- | --- | --- |
| **A** | **19** — Quote: “FR-001” through “SC-002/3/4/5/6” each have a phase and check; only “SC-004/006 by human-style read and demo” stays broad. | **18** — Quote: reasons come “only from concrete feature detectors,” alongside explicit steppable-search, repetition-history, facade, verdict, and level contracts; omission: hint-reason generation is not defined. | **14** — Quote: “no two phases share files”; this conflicts with P2/P3 needing to extend P1-owned `engine/index.js`, while P5 explicitly re-edits P4 files. | **18** — Quote: “≥20 blunder probes” plus exact perft, deadline, seeded-level, UI-smoke, transcript, and demo checks; omission: the “novice-strength opponent” and an automated main-thread-stall measure are undefined. | **18** — Quote: “Greenfield,” “Node v26.0.0,” and “Chrome 154” were verified here; the 5.5-day estimate is aggressive, but the design supplies concrete risk gates and overrun triggers. |
| **B** | **15** — Quote: the strength row cites “timing/legal checks”; omission: no mapped check proves low-level wins versus high-level losses, and several other rows group requirements too broadly. | **14** — Quote: “Truth-first coaching” and “UI adds threefold repetition from history keys” are sound; omission: contracts for level differentiation, verdict thresholds, review ranking, and worker messaging. | **17** — Quote: P1 “may update `engine/index.js` after P0,” making the overlap explicit and sequential; omission: P3 owns only tests/checklist while end-review implementation ownership remains implicit. | **11** — Quote: checks cover only “sampled blunders” and “distinct beginner, intermediate, and hard behavior”; omission: outcome-calibrated strength, no-freeze, ≥20 truth probes, and an executable browser check. | **12** — Quote: “accepted spec is `docs/run5/spec.md`” and base is `d2fbfc…`; the path is absent and the SHA conflicts with the supplied `9cd229c`, while the three-day estimate is optimistic. |

## Totals and overall result

| Packet | Total |
| --- | ---: |
| **A** | **87/100** |
| **B** | **69/100** |

**Packet A is stronger overall by 18 points.**

## Better packet by rubric line

- **Traceability — A:** its one-row-per-requirement map is more precise, while B groups requirements under checks that do not prove strength or all grouped behavior.
- **Architecture and contracts — A:** its steppable search, explicit level parameters, verdict thresholds, and detector-gated prose provide implementable contracts that B leaves unspecified.
- **Phase ownership and safe parallelism — B:** it acknowledges the necessary `engine/index.js` update and sequences it, whereas A claims no overlap while omitting required facade edits from P2/P3 ownership.
- **Checks and quality bar — A:** it supplies quantitative rule, truthfulness, timing, level, and review gates; B relies heavily on samples and a manual checklist and never proves level outcomes or non-freezing behavior.
- **Grounding, risks, and realism — A:** nearly all verified facts match this workspace and its risks have blocking gates, while B names a missing spec path, a conflicting base, and a notably compressed effort estimate.

## Build choice

If I had to build from one packet, I would choose **A** because its contracts and checks give builders substantially less room to implement something plausible that still fails the chess or coaching quality bar. Before building, I would assign `engine/index.js` explicitly to the phases that add `bestMove` and `reviewMove`, define the novice proxy used by the level check, and make the responsiveness check measure main-thread stalls.

```text
Task / Dispatch: task_e9eb3f7105c1 / ctx_9c3caa105961
Role: engineering reviewer (independent scoring only)
Base commit: 9cd229c
Output: docs/run5/design-judge-2.md
Decisions made: Scored A 87/100 and B 69/100; selected A as stronger because its traceability, contracts, and checks outweigh B's cleaner phase-overlap handling. Model shown: GPT-5.
Checks: node --version -> v26.0.0; workspace path checks -> chess-coach absent, root package.json absent, docs/run5/spec.md absent; Chrome --version -> 154.0.8037.93; python3 -m unittest discover -s tests -v -> 181 passed; manual packet-to-rubric audit -> complete
Open questions: none
Next: coordinator should consume these independent scores in the design-rescore decision.
```
