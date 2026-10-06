# Independent engineering design scores

Run: `run_370854e5aac1`. Base supplied in the envelope: `813e663`. Each packet is scored against **its own included spec**, the shared brief, and the shared quality bar; different requirement numbering and recap caps are not treated as errors. This is scoring only, with no merge or acceptance verdict.

## Score table

Every rubric line is worth 20 points. Evidence references the numbered design sections in the named packet; omissions describe missing commitments in the plan, not failures in nonexistent implementation.

| Packet | Traceability | Architecture and contracts | Ownership, dependencies, parallelism | Behavioral checks and quality bar | Codebase grounding, risks, effort | Total |
| --- | --- | --- | --- | --- | --- | --- |
| **A** | **18/20** — §8 maps every FR-001–011 and SC-001–005; clean-recap and lowest/highest strength outcomes lack distinct, measurable gates. | **16/20** — §3 provides worker IDs, stored move reviews, normalized repetition keys, and a shared budget; evaluation, verdict thresholds, and proof criteria for a genuinely better move remain unspecified. | **19/20** — §6 assigns disjoint files and §7 requires “P0→P1→P2→P3→P4, with code review after each”; full consumer contracts are promised frozen before their implementations establish them. | **15/20** — §9 requires replay, a 20-comment audit, keyboard/zoom checks, and recap equality; §6 P4's `node --test chess-coach/tests` fails on installed Node, and level calibration has no numerical criterion. | **15/20** — §1's greenfield/Node/Chrome facts match checks and §10 identifies rule/search risks; the release command is wrong, delegation provenance is unverified, and 22–30 hours is optimistic for rules, coaching, and browser automation. | **83/100** |
| **B** | **17/20** — §8 covers FR-001–010 and SC-001–006, and §6 includes Black/new-game/copy features; P5 omits the spec's “worst first” ordering check and its review-panel test has no assigned test file. | **12/20** — §3 specifies score thresholds and search contracts, but §2 yields only between root/depth chunks, with no bounded inner slice or asynchronous coaching contract; §4 incorrectly says the brief requires `file://`. | **14/20** — §7 gives a safe serial chain, but §6 P2/P3 add facade functions without owning `engine/index.js`; P5 acknowledges re-editing P4 files but does not assign the promised review-panel test. | **13/20** — §6 names perft counts, 50 timed search FENs, and seeded win rates; §5's smoke proves only load/DOM/errors, §6 reuses the hanging-piece detector as its oracle, and a legal alternative alone does not prove a fix. | **16/20** — §6/§10 provide a 5.5-day estimate, explicit vectors, seeded risks, and a 200 ms escalation trigger; §1 overstates default CommonJS behavior on Node 26 and §4 misreads the allowed launch modes. | **72/100** |

**A is stronger overall by 11 points.** Neither total is an acceptance decision.

## Comparison by rubric line

- **Traceability — A:** its complete FR/SC table and explicit reset/recap contracts leave fewer ambiguities; B's different IDs and five-entry recap are valid for B's own spec.
- **Architecture — A:** its worker isolates both coaching and reply search, and its budget spans both; B does not establish bounded main-thread work for either inner search chunks or coaching.
- **Ownership — A:** every facade edit has an owner and phase dependencies are explicit; B's P2/P3 facade edits fall outside their owned-file lists.
- **Checks and quality — A:** independent line replay and broad human usability checks are stronger than detector re-checks and load-only smoke, despite A's broken final test invocation.
- **Grounding, risks, effort — B:** its longer estimate, concrete test vectors, reproducible strength targets, and overrun triggers are more actionable; both packets contain verified or unsupported grounding claims that need correction.

## Build choice

If required to build from one packet, I would choose A because its worker, session ledger, and sequential ownership form the more coherent implementation path, and its checks cover more of the beginner-facing quality bar. Before building, its failing suite command and underspecified coaching/evaluation and strength gates need concrete correction; choosing A does not establish readiness or approval.

## Evidence behind deductions

1. **A's final gate is demonstrably broken.** In a temporary project with `chess-coach/package.json` set to `type: module` and one passing `node:test` file, `node --test chess-coach/tests/smoke.test.js` passed, but the exact P4 command `node --test chess-coach/tests` exited 1 with `MODULE_NOT_FOUND`. This is a command error, not an engine failure. B's shell-expanded `node --test chess-coach/tests/*.test.js` passed in an equivalent probe.
2. **B's responsiveness mechanism is incomplete.** Yielding after a root-move/depth chunk does not bound that chunk's recursive work; a deadline-driven chunk can consume much of the stated 1.2-second budget before returning. The design also does not route `reviewMove` through a bounded asynchronous path or budget review and reply together. The 200 ms escalation rule diagnoses a problem but does not supply a mechanism that prevents it.
3. **Launch-mode reasoning differs from the brief.** The brief permits a local file **or** a static server. A owns a loopback server. B rejects workers on the premise that file launch is required, while also acknowledging external-module file failures and allowing escalation to a server. In installed headless Chrome, a temporary external ES module left the file-loaded page at `not-run`, while the identical localhost page changed to `module-ran`. This probe tested module loading, not worker loading or either finished application.
4. **B's facade ownership is missing at the actual mutation points.** P1 owns `engine/index.js`; P2 and P3 explicitly add `bestMove` and `reviewMove` to it without listing it. Serial execution avoids concurrent writes, but the plan still leaves builders without ownership for necessary changes. P5's reuse of P4 app files is explicitly sequenced and is not a parallel-write collision.
5. **Truthfulness and improvement need independent evidence.** A calls for replay to prove the reason and fix, but does not define an evaluation function or numeric verdict boundaries. B defines boundaries, but checking a hanging-piece claim by rerunning its generating detector can repeat the same bug; its P3 done-when proves the suggested move is legal rather than demonstrably better. Neither finite fixture set establishes universal correctness, and the scores credit planned checks rather than claiming those checks ran.
6. **Own-spec inconsistencies remain visible.** B's included acceptance scenario says missing an available mate means the opponent can now mate; this implication is false in general. The design instead says “missed mate,” which is safer, but leaves the scenario conflict unresolved. B's P5 gate checks matching verdicts but does not explicitly check the required severity ordering. A's traceability covers clean recaps through FR-009, but its gate does not explicitly exercise that branch.
7. **Node grounding has a nuance.** Node 26 successfully imported a temporary `.js` containing `export` with no `package.json`; B's statement that `.js` simply defaults to CommonJS omits syntax detection. Both plans' explicit `type: module` decision is still sound. A's claimed coordinator delegation and either packet's claimed earlier scratch checks were not independently authenticated.

## Audit and checks actually performed

**Read in full:** `docs/run5/design-rescore/A.md` and `docs/run5/design-rescore/B.md`, including both product specs; the brief, quality bar, rubric, and task envelope supplied in the dispatch. No implementation exists at the required `chess-coach/` path to inspect or test.

**Commands and outcomes:**

- `pwd` → confirmed the assigned workspace.
- `orca orchestration check --terminal … --json` → no coordinator follow-ups at investigation/report-writing checkpoints; heartbeat sent while reviewing.
- Initial `rg --files` filename discovery → found the two packets and incidentally listed unrelated document paths; none of those unrelated files were opened. `rg --files chess-coach` → directory absent. `cat AGENTS.md` → no workspace-root file.
- `git status --short` → initially clean. No branch, history, author, or other-worktree inspection performed.
- `test ! -e chess-coach && test ! -e package.json` → succeeded; both target paths absent.
- `node --version` → `v26.0.0`. Chrome executable `--version` → `154.0.8037.93`.
- Temporary `node --input-type=module` verification scripts → explicit ES-module test file passed; directory-form test command failed; shell-expanded glob passed; bare `node --test` in an empty temporary directory passed with **zero tests**; untyped `.js` module import succeeded. The zero-test probe does not verify A's claim about historical discovery in the repository root.
- Temporary Node HTTP server plus Chrome `--headless=new --dump-dom --virtual-time-budget=1000` → external module did not execute from `file://`; it executed over loopback HTTP. All temporary fixtures, servers, and browser profiles were removed.
- Report-only `git add`, `git diff --cached --check`, `git diff --cached --stat`, and `git diff --cached -- docs/run5/design-judge-2.md` → reviewed the sole output; removed Markdown hard-break trailing spaces after the first whitespace check flagged them, then rechecked successfully.

No hidden owner suite, chess perft, coaching fixture suite, strength comparison, full-game demo, or application responsiveness test was run: there is no application yet. No authors were identified or sought. No packet attribution leak was observed; the initial filename-discovery scope exposure is recorded above. Model shown by session instructions: Codex based on GPT-6; exact serving variant is not exposed.

## Handoff

```text
Task / Dispatch: task_c1b860f249ae / ctx_1f92aa099e50
Role: independent engineering scoring judge
Base commit: 813e663 (dispatch envelope)
Output: docs/run5/design-judge-2.md
Decisions made: score against each packet's own spec; prefer A overall for coherent architecture/ownership/verification; award B the grounding/effort advantage for quantitative planning; provide no merge or acceptance verdict.
Checks: environment, isolated Node command/module probes, and Chrome module-launch probes as recorded above; report-only diff checked before commit.
Open questions: none needed to complete scoring; packet gaps remain findings for the coordinator.
Next: coordinator consumes the independent scores and decides subsequent work.
```
