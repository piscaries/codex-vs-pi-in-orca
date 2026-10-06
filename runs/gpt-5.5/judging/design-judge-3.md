# Design rescoring — independent judge (run 5)

Scope: blind scoring only of `docs/run5/design-rescore/A.md` and `B.md`, each against the rubric (5 × 20). No merging, no acceptance verdict. Each packet is scored against its own bundled spec.

## 1. Score table

| Rubric line (/20) | A | B |
| --- | --- | --- |
| Traceability to the spec | **19** — every FR-001..010 and SC-001..006 maps to a phase and a named check ("FR-003 \| P2 \| scripts/levels-check.js (SC-003)"), with human-judged SC-004/006 honestly labeled. | **17** — all 12 FRs and 7 SCs appear, but rows bundle 2–3 phases under generic checks ("FR-003, FR-004, SC-003, SC-006 \| P1, P2, P3 \| … UI/integration full-game checks"), not a per-requirement check. |
| Soundness of architecture and contracts | **19** — exact facade signatures, five-verdict classification defined in cp thresholds, and the steppable search is justified by a verified environment fact (workers fail on `file://`), with fallback "search always answers by deadline… first legal move." | **15** — clean module split and honest threefold handling, but no verdict-classification scheme is ever defined, `bestMove` returns `null` on game over (brief says "a legal UCI move"), and responsiveness rests on `app/worker.js` with no `file://` fallback (see §2). |
| Phase ownership, dependencies, safe parallelism | **18** — strict P0→P5 chain, disjoint owned-file lists, contracts freeze at P2, per-phase commit/rollback ("reverting restores the prior working whole"). | **16** — clear owned files and a P0 contract freeze, but conditional parallelism ("P1 and a UI skeleton from P2 can run concurrently") is muddied because P1 "may update `engine/index.js`" while that skeleton imports it. |
| Checks that actually prove behavior + quality-bar verification | **19** — falsifiable, numeric gates: "perft: start d4=197281, Kiwipete d3=97862", "≥20 blunder probes … hanging-piece claims machine-verified", seeded self-play "wins ≥6/10 at level 1, ≤1/10 at level 4", "≤ timeMs+50 ms over 50 FENs". | **14** — right kinds of checks but under-specified: perft "match known leaf counts" without naming counts/depths, "sampled blunders include true reason" (its SC-004 samples only five, no truthfulness automation), level difference asserted ("distinct beginner, intermediate, and hard behavior") but never measured, timing bound unspecified. |
| Grounding in the real codebase, risks, effort realism | **18** — every checked fact reproduces (Chrome 154, no root `package.json`, Python `tests/` unrelated); risks ranked with escalation triggers; 5.5 d total with an overrun rule. One stale claim: "`.js` defaults to CommonJS" — Node 26 auto-detects ESM syntax (verified below). | **15** — most facts reproduce ("181 tests OK" exact, Chrome path, Node v26); two facts are track-worktree-local (`docs/run5/spec.md`, HEAD `d2fbfc2`) and unverifiable here; misses the `file://` worker failure its architecture depends on; 3 d total is optimistic for rules + coach + UI + review. |
| **Total** | **93** | **77** |

## 2. Verified facts and errors (claims checked against this machine, base 9cd229c)

- `chess-coach/` absent, Node `v26.0.0`, no root `package.json`, `tests/` are Python, Chrome `154.0.8037.93` — **A and B's environment claims all reproduce** (`ls`, `node --version`, `--version`, directory listing).
- B: `python3 -m unittest discover -s tests` → **"Ran 181 tests … OK"** — B's claim is exact.
- B: `projects/chess-coach/brief.md` and `quality-bar.md` exist ✓. B's `docs/run5/spec.md` and HEAD `d2fbfc2` do not exist in this worktree/history — consistent with the two-track setup (own worktree), so recorded as unverifiable here, **not** scored as an error.
- A's perft constants are the standard published values (startpos d4 = 197,281; Kiwipete d3 = 97,862) ✓.
- **A's `file://` worker claim verified empirically**: in headless Chrome 154, `new Worker('app/worker.js')` on a `file://` page throws ("cannot be accessed from origin 'null'"); the same page over a local HTTP server works. B's architecture routes computer moves through `app/worker.js` and never mentions this or a fallback — a real, reproducible failure mode on one of the two brief-sanctioned ways to open the app.
- **Correction to A's stated rationale** (harmless): A says no root `package.json` makes `.js` default to CommonJS; on Node 26, a `.js` file with ESM syntax imports fine without any `package.json` (verified with a scratch project). So B's lack of a `package.json` is **not** a functional bug here; A's `{"type":"module"}` is still sound belt-and-braces.

## 3. Per-rubric-line verdict

- **Traceability:** A — complete coverage with per-requirement named checks; B covers everything but bundles phases behind generic check names.
- **Soundness:** A — defined verdict thresholds and a scheduler choice grounded in a verified browser fact; B leaves the classification scheme undefined and leans on a worker that demonstrably throws on `file://`.
- **Ownership/parallelism:** A — unambiguous sequential chain with frozen contracts; B's conditional concurrency conflicts with P1 editing the very interface the parallel skeleton imports.
- **Checks:** A — numeric, falsifiable gates (perft counts, ≥20 probes, 6/10 vs 1/10 self-play, ≤ timeMs+50 ms); B's equivalents lack counts, sample sizes, or any measurement at all.
- **Grounding:** A — all facts reproduce and the one stale nuance is immaterial; B reproduces most facts but misses the environment fact its own architecture hinges on and under-budgets effort.

## 4. If I had to build from one packet

Build from **A**: its plan is executable phase by phase with checks that can actually fail, and its two hardest problems — never-false coaching (position-verified reason detectors) and a never-freezing page (steppable search instead of workers) — are solved by mechanisms rather than intentions. B is structurally sound and pleasantly simple, but its worker-based reply loop is empirically broken on `file://`, its verdict scale is never defined, and its strength/timing gates are unmeasurable as written; adopting B's leaner four-phase shape would require fixing all three first.

---
*Judge: independent scoring only; no merge performed. Blindness kept: packets scored as labeled, no authorship sought; two worktree-local claims in B noted as unverifiable rather than chased.*
