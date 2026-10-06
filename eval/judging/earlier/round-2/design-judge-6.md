# Design judge 6: blind scoring of A and B

Design portions: A about 1,170 words, B about 1,505 (a trivial overshoot, so no deduction). Both say the repo has no chess code and no root `package.json`. I did not check this against the repo.

## 1. Score table

| Line | A | B |
| --- | --- | --- |
| 1. Traceability | **16.** Every FR and SC maps to phases and proofs, e.g. "FR-009; SC-005 \| P2,P4 \| identity-based recap test and completed-game audit". Weak spots: SC-003 and SC-004 rest on a fixtures file and a human read, and "profiles differ" (FR-008) has no measure. | **15.** Every FR and SC has a row, but several are thin. "FR-002 \| P1/P2/P3 \| facade tests; time bound". "SC-002/3/4/5/6 \| P2/P3/P5 \| as rows above" is hand-waved. FR-003 and SC-003 do get a real check (seeded self-play). |
| 2. Architecture and contracts | **15.** The six-function facade is honoured, with typed errors and a `MoveRecord`/`GameState` shape. Loose spots: "Thresholds are fixed in `coach.js`" never says what they are or how a reason is produced. Level parameters are left as "set depth/noise". A Web Worker is the main-thread design, and Workers do not run from `file://`, which the brief allows. A's own `server.mjs` partly covers this, but the risk is not named. | **16.** Contracts are more precise: cp thresholds (≤50 good, ≤110 inaccuracy, ≤250 mistake), a `createSearch/step` contract, and `gameStatus` ordering. Reasons come only from `hangingPiece`/`mateInOne`/material detectors, which gives a mechanism for truthfulness. A steppable search with `setTimeout` works on `file://`. Weaknesses: the tree listing is misindented (engine files drawn as siblings), and "newly allows mate" is not given a detector. |
| 3. Phases, ownership, parallelism | **16.** Five sequential phases, each owning disjoint files, and no shared edits ("No phase shares owned files"). P0 bundles rules, FEN and status, which is large, at 6–8h. Phase P3 owns the whole UI, worker and server, so it is big. | **14.** Six phases, small and ordered by real dependency (board, rules, search, coach, UI, polish). Ownership overlaps: P1 owns `engine/index.js` but P2 and P3 add `bestMove` and `reviewMove` to it. P5 edits P4's files ("edits to `app/main.js`/`app/game.js`/`index.html`"). The overlap is sequential and so safe, but it is not the disjoint ownership the task asks for. |
| 4. Checks and quality-bar verification | **14.** Checks include perft, a 10-line coaching replay and a Chrome smoke test that asserts busy, turn and result states. The acceptance procedure is concrete: full games at each level, a 200% zoom check, a 20-comment audit and a byte-for-byte recap compare. Gaps: strength is only "profiles differ", with no statistical or self-play check (quality bar 6). Perft is only to depth 3. | **16.** Perft start d4=197281 and Kiwipete d3=97862 (both standard values). It also has targeted suites, ≥20 blunder probes with detector re-check, and a deadline test over 50 FENs. Seeded self-play gives "weak proxy wins ≥6/10 at level 1, ≤1/10 at level 4". Weaker on UI and coaching quality: `ui-smoke.sh` is "page loads, board DOM present, zero console errors", and the review/plainness checks are manual. |
| 5. Grounding, risks, realism | **15.** Node 26 and Chrome 154 are correct. Risks name movegen and hardware-dependent strength. Effort is 22–30h with a reason for the P0/P1 weight. The `file://` plus Worker failure is not mentioned. | **16.** Names `file://` limits for both Workers and module imports, with a fallback to a local server. Also names the flaky level check and movegen. Per-phase estimates are given with an overrun rule. Slight overreach: the claim of "p95 < 2 s" is untested on slower hardware. |

## 2. Totals

- **A: 76 / 100**
- **B: 77 / 100**

## 3. Per line

1. Traceability: A, since its map is tighter and ties each requirement to a named proof, while B hand-waves its SC rows.
2. Architecture and contracts: B, for the precise thresholds, a detector-based truthfulness mechanism and a `file://`-safe search design, against A's vague coach contract.
3. Phases and ownership: A, for fully disjoint ownership against B's repeated edits to `index.js` and P4 files.
4. Checks: B, for statistical level verification and truthfulness probes that would fail if behaviour broke. A is better only on UI acceptance.
5. Grounding and risks: B, for catching the `file://` limits and giving a per-phase estimate.

## 4. Fatal problems

None. Neither design breaks the fixed interface.

- A's Worker-based browser app will not start from `file://`. A ships `server.mjs`, so it still opens through a local server, but the brief's "local file" path fails unless the builder notices.
- B's ES-module scripts also fail on `file://`. B lists this as a risk and a check, so it is more likely to be caught.

## 5. Verdict

I would build from B. It has more build-ready contracts (thresholds, detectors, the steppable search), real level-strength and truthfulness checks, and it names the `file://` risk. Its ownership overlap is sequential and harmless. A is cleaner on ownership and traceability, but its coach contract is under-specified, its level check is weak, and its Worker design misses the `file://` limit. The totals are close (77 vs 76), so the call is a narrow one.
