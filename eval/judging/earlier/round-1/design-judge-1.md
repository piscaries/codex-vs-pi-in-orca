# Design judge 1: blind scoring of packets A and B

Scoring only. Read: docs/run5/design-rescore/A.md and B.md (each includes its own spec). Commands run: `cat`, `wc` on those two files. I did not check the codebase beyond the packets' own claims. Model shown: Sonnet 5.5.

## 1. Scores (packet × rubric line)

| Rubric line | A | B |
| --- | --- | --- |
| Traceability (20) | **17**. Every FR/SC has a phase and proof ("FR-007; SC-003 … session/Chrome tests prove legal hint and unchanged FEN"). Rows are grouped, and some proofs are human review ("20-comment human review"). | **16**. Every FR/SC is mapped one-to-one ("FR-006 … probe reasons re-verified by detectors"). SC-002..006 are collapsed into one row, and SC-004/006 are "by human-style read and demo". |
| Architecture and contracts (20) | **16**. Typed errors, `GameState`/`MoveRecord`, worker message schema, stored-review identity. "Thresholds are fixed in `coach.js`" gives no numbers. A module Worker has a `file://` problem that is never discussed, and the brief says the app opens from a local file. | **15**. Concrete cp thresholds (≤50/≤110/≤250), detector-based reasons, `createSearch` step contract. Explicitly avoids Workers for `file://`. The file tree is muddled (`engine/` listing mixes app files). Chunk granularity ("one root-move/depth chunk") may still freeze the page. Hint is said to use full strength with no time budget. |
| Phase ownership and parallelism (20) | **15**. Strict chain, disjoint owned files, rollback dependencies spelled out. P1 bundles search and coach (6–8h), so it is large. | **14**. Six small phases and a frozen facade after P2. P5 "edits to `app/main.js`/`app/game.js`/`index.html`" re-edits P4's files, which contradicts "no two phases share files". It is sequenced, so it is safe but untidy. |
| Checks that prove behavior and quality bar (20) | **16**. Chrome smoke drives the real page and asserts busy/turn/result states. Replay-based reason proof. Recap compared byte-for-byte with stored feedback. Perft goes only to depth 3. No seeded strength check, only "profiles differ". | **15**. Perft d4=197281 and Kiwipete d3=97862 with targeted suites. ≥20 truthfulness probes. Seeded self-play level check, but the "weak proxy" opponent is undefined. `ui-smoke.sh` only checks page load, DOM present and no console errors, so it cannot fail on freezes or reply time. |
| Grounding, risks, effort (20) | **16**. Checked Node and Chrome versions. Risks named (movegen, hardware-sensitive strength). 22–30h estimate. Misses the `file://` risk. | **17**. Checked the ESM `type:module` and `file://` behavior. Per-phase effort, risk list with escalation triggers, flaky-check mitigation via fixed seed. |
| **Total** | **80** | **77** |

## 2. Stronger overall
**A, narrowly (80 vs 77).** The gap is small and the two packets win different lines.

## 3. Better packet per rubric line
- **Traceability:** A, by a slight margin. Its proofs are mostly executable and tied to quality-bar item 9, where B leans on human reading more.
- **Architecture:** A, narrowly. Its session/record contracts make the recap-matches-game guarantee structural. B's `file://` awareness and explicit thresholds partly offset this.
- **Phase ownership:** A. Its ownership is cleaner and has no re-edited files. B's P5 overlaps P4's files.
- **Checks:** A, narrowly, for the real-page Chrome test. B has the stronger rules and strength checks (deeper perft, seeded self-play).
- **Grounding:** B. It has per-phase effort, a `file://` risk and verified module behavior.

## 4. If I had to build from one packet
I would build from A. Its real-Chrome smoke tests and its design for the recap (store reviews, never recompute them) give the strongest guard on the quality-bar items that tests miss. Before building I would borrow three things from B: avoid a `file://`-breaking Worker (or serve over localhost only), take its numeric verdict thresholds, and take its seeded self-play level check with perft to depth 4.

Task / Dispatch: task_beab8199eaaf / ctx_8bc7f5c157f2
Role: engineering reviewer (scoring only)
Base commit: 813e663
Output: docs/run5/design-judge-1.md
Decisions made: A scored above B by 3 points; judged on packet text only.
Checks: cat/wc on the two packets → read in full
Open questions: none
Next: coordinator compares with the other judges' scores.
