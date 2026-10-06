# Blind design judgment

**Verdict: B, 61/100; A, 53/100.** B provides the more credible implementation path because it isolates all analysis from the page, budgets coaching and reply together, and explicitly gates disjoint phases on code review. Neither plan fully establishes engine strength or truthful, actionable coaching.

I scored all ten lines for A before opening B, using each packet's attached spec, then compared the scores. References below are line numbers in `design-rescore/A.md` and `design-rescore/B.md`; no author identities, other designs, branches, or history were consulted. These are design scores: proposed tests are evidence of a verification plan, not evidence that a product already passes.

## Score table

Band labels: **top** = nothing substantive missing; **second** = sound with one or two gaps; **third** = several gaps or vague; **bottom** = missing or wrong. Scores are chosen within the corresponding quarter of each line's maximum.

| Rubric line | A: score, band, evidence | B: score, band, evidence |
| --- | --- | --- |
| **1. Traceability /10** | **7, second.** A:76–89 maps every FR and SC to phases/checks, including hints, wording, review identity, and the demo. However, the own-spec missed-mate scenario (A:131) has no matching check, and the referenced “review-panel test” (A:86) is neither an owned test nor explicitly in a phase's check. P5's done-when also omits the spec's worst-first ordering and clean-game case (A:68,138,151). | **8, top.** B:57–67 maps all FR-001–011 and SC-001–005 to phases and proof, including reset confirmation, unchanged-position hints, timing, and recap identity. The additional quality-bar audit includes complete games, specials, promotion, board clarity, and comments (B:71). The weakness of some proofs is scored under checks and levels; the requirement-to-phase/check mapping itself is substantially complete. |
| **2. Architecture and contracts /15** | **9, second.** A:38–42 gives all six API signatures, verdict thresholds, score perspective, terminal behavior, and a steppable-search return shape; repetition is correctly assigned to the session. But the mailbox position and make/unmake contracts are unspecified, and the review score comparison never says how best/played lines share perspective, depth, or budget (A:16,40–41). The facade must change in P2/P3 despite not being owned there (A:65–66). | **10, second.** B:20–24 precisely defines six-field FEN, internal positions/moves, game records, repetition keys, worker envelopes, stale responses, and immutable boundaries; the six fixed exports are explicitly preserved. However, “Thresholds are fixed in coach.js” supplies neither thresholds nor scoring perspective, and the rules/search/coach callable contracts are largely descriptions rather than buildable function signatures (B:16,22). |
| **3. Phases, ownership, parallelism /10** | **4, third.** P0→P5 is dependency-ordered with phase checks and done-whens (A:63–68). But P5 reowns P4 files; P2/P3 promise facade additions without owning `engine/index.js`; “no two phases share files” contradicts the table (A:65–68,72). Sequential execution prevents concurrent collisions, but does not satisfy the instruction that owned files never overlap. No explicit code-review gate before the next phase is stated. | **9, top.** B:45–49 assigns disjoint files to five dependent phases, each with check/done-when. B:53 explicitly requires “code review after each,” ordered integration, and returning fixes to the earlier owner through review. The rules→analysis→facade/session→UI→acceptance dependency chain is credible, with no speculative parallelism. |
| **4. Checks that prove behaviour /10** | **6, second.** A:63–68 specifies restoration, named perft counts, illegal-move rejection, legal/timed search, mate fixtures, coaching probes, self-play thresholds, and a full-game demo. Gaps: detector re-checking can repeat the detector's own mistake instead of independently establishing truth (A:66,83); the smoke script is initially only page/DOM/console checks (A:56); no check measures combined coaching-plus-reply time, and review ordering/clean-game behavior lacks an explicit assertion. | **5, third.** B:45–48 includes perft, replayed reasons/fixes, atomic moves, session behavior, and real Chrome interaction. But P4's `node --test chess-coach/tests` passes a directory and fails in this Node environment rather than running the suite (probe below). “Profiles differ” has no failure threshold, and legal-line replay alone cannot prove every claimed material loss or improvement against alternatives (B:46,49,62). |
| **5. Grounding, risks, realism /5** | **3, second.** Greenfield, Node 26, no root package, Python tests, and Chrome 154 are confirmed below (A:5–7). Move-generation risk, seeded calibration, file-URL trouble, overruns, and a roughly 5.5-day estimate have responses (A:97–101). However, Node 26 can detect ES-module syntax without a package, so the blanket CommonJS claim is incomplete; A:34/47 also treats file-URL support as mandatory even though the brief permits a static server. The supposed cooperative-search safety is asserted rather than established. | **3, second.** B:4–6 matches the verified environment; B:75 identifies move generation and hardware-sensitive strength, preserves deadlines, and budgets 22–30 hours plus reviews. However, building rules plus useful search/coaching in two 6–8-hour phases is optimistic given the omitted evaluation/tactical details. The invalid release check is an additional concrete environment mismatch, chiefly charged under line 4. |
| **6. Rules engine and its proof /10** | **8, top.** A:16–18,38–39 covers castling, en passant, all four promotions, check/mate/stalemate, halfmove draws, insufficient material, and history-owned repetition. A:64 gives start depth 4 = 197281 and Kiwipete depth 3 = 97862, plus castling-through-check, en-passant-pin, promotion, and draw/status fixtures. This substantially meets the specified move-generator/perft proof bar; history cannot be reconstructed from FEN alone. | **7, second.** B:16 uses generate-and-reject-own-check; B:20,23 specifies promotions, FEN clocks/rights, common draws, and normalized repetition keys. B:45 requires start/Kiwipete perft through depth 3 and specials/status tests. However, reference counts/FENs and the precise special-rule adversarial cases are not stated, and “standard insufficient-material cases” leaves the implementation boundary vague. |
| **7. Engine strength /15** | **6, third.** A:19–22 names iterative-deepening alpha-beta, quiescence, material plus piece-square evaluation, and deadline-driven search; A:48 gives weakening parameters and a high-level time cap. A:65 proposes seeded win-rate bounds. Missing are search move ordering, concrete additional pruning, completed-iteration/deadline details, and measured depth or nodes/sec; the novice proxy is undefined, and the depth-1 top-five policy is not demonstrated to be beatable. | **3, bottom.** B:16,37 names iterative-deepening alpha-beta, per-node deadline checks, a legal fallback, and the last completed choice. B:24 promises depth/noise profiles. But there is no evaluation design at all, no quiescence, move ordering, pruning detail, concrete profile parameters, depth/nodes/sec measurement, or measurable strength target. “Profiles differ” and tuning depth/noise (B:49,75) cannot establish the top level's promised challenge. |
| **8. Truthful coaching /10** | **4, third.** A:41/49 restricts reasons to concrete detectors/templates, states verdict thresholds, and gives a named-piece example; A:84/93 plans wording checks and transcript reading. But `hangingPiece` has no exchange/pin/defender semantics, a material tally does not prove future loss, and there is no reason-producing path for search-classified strategic mistakes. Reusing the detectors is not an independent truth guarantee. The own-spec missed-mate acceptance sentence is also false in general (fatal issue below). | **5, third.** B:16,22,29,37 ties claims to replayable legal continuations, translates better moves, caps sentences, lints unexplained scores, and audits twenty comments (B:63,71). This is more concrete than unsupported prose. However, witnessing one legal line proves that line is possible, not that material loss is forced or the recommendation is better; evaluation/thresholds and explanation extraction remain unspecified. “Unsupported explanations are omitted” (B:37) also leaves the mandatory concrete reason for every mistake/blunder unfulfilled unless a fallback is designed. |
| **9. Responsiveness under search /10** | **3, third.** A:34/40/47 yields only between “one root-move/depth chunk,” which can contain an entire expensive subtree; there is no bounded slice or resumable-node stack. The UI's coaching path is not explicitly steppable, even though `reviewMove` compares search scores. A:48's approximately 1.2-second reply cap is not a combined coaching/reply budget, and the >200ms-freeze escalation (A:101) does not prevent freezes. `setTimeout` between long chunks does not establish this requirement. | **9, top.** B:16/30 sends **all coaching/search** to a worker. B:24 divides one sub-1.8-second budget between review and reply; B:37 checks deadlines at every node and retains a completed legal choice. B:48/67/71 requires real-page responsiveness and <2-second replies. Worker isolation, a total analysis budget, fallback, and stale-response rejection substantially satisfy the responsiveness design bar; localhost is allowed by the brief. |
| **10. Levels and board clarity /5** | **3, second.** A:48/65 supplies concrete low/high policies and ≥6/10 versus ≤1/10 novice-proxy win thresholds. A:28/67/87 checks last move, check, and turn, with first-viewer/demo review (own spec A:163). The proxy is undefined, intermediate levels are not calibrated, and equal-square geometry/distinguishable pieces are not measured or explicitly asserted in a browser check. | **2, third.** B:24 names three profiles but gives no parameters; B:49/71 calls for profile difference and games at each level without win-rate bounds or a beginner benchmark. The board checks include destinations, last move, check, turn, labels, keyboard use, and 200% zoom (B:61,71), but do not measure equal squares or piece distinguishability. |

## Totals

| Packet | General /50 | Chess coach /50 | Total /100 |
| --- | ---: | ---: | ---: |
| A | 29 | 24 | **53** |
| B | 35 | 26 | **61** |

## Comparison, one sentence per line

1. **B:** its full requirement/success-criterion mapping is more complete, whereas A references an unowned review test and leaves its missed-mate acceptance behavior unchecked.
2. **B:** explicit position, move, session-record, repetition-key, and worker-message structures give builders more usable contracts.
3. **B:** it has disjoint ownership and explicit review gates, while A contradicts its ownership claim and never establishes the required review gate.
4. **A:** named perft counts, time assertions, tactical fixtures, and calibration thresholds provide stronger checks despite weak UI/truth verification, while B's final suite command demonstrably fails.
5. **Tie:** both correctly ground the environment and name important risks, but each has substantive realism or environment-interpretation gaps.
6. **A:** its deeper start-position perft, explicit counts, and named castling/en-passant adversarial suites give a stronger rules proof plan.
7. **A:** quiescence, an evaluation beyond material, and concrete level parameters are substantially more developed than B's bare timed alpha-beta plan.
8. **B:** replayable consequences and specified sentence/score checks provide a slightly stronger coaching discipline, though neither establishes all claims or every mandatory explanation.
9. **B:** a worker plus one combined sub-1.8-second budget addresses both page blocking and total latency, unlike A's unbounded root chunks and unbudgeted coaching.
10. **A:** numeric low/high win-rate criteria provide more meaningful calibration than B's unspecified profile difference, although neither measures board geometry.

## Verification evidence and limits

Only environment/repository claims and a test-command assumption were exercised; there is no chess implementation to run. Repository probes found `chess-coach: absent`, `package.json: absent`, `AGENTS.md: absent`, and 22 Python test files; `git status --short` was initially empty. Runtime probes returned:

```text
$ node --version
v26.0.0
$ /Applications/Google Chrome.app/Contents/MacOS/Google Chrome --version
Google Chrome 154.0.8037.93
```

For B's P4 command, a temporary directory **inside this repository** held `tests/probe.test.js` containing an ES-module import of `node:test` and one passing test. The temporary directory was automatically removed after these runs:

```text
$ node --test <repository temporary directory>/tests
exit: 1
Error: Cannot find module '<repository temporary directory>/tests'
code: 'MODULE_NOT_FOUND'
tests 1; pass 0; fail 1

$ node --test <repository temporary directory>/tests/probe.test.js
exit: 0
[MODULE_TYPELESS_PACKAGE_JSON] ... Reparsing as ES module because module syntax was detected.
tests 1; pass 1; fail 0
```

The directory placeholders above abbreviate the generated temporary path; the commands were actually run with that real path. This demonstrates the directory-argument failure and, separately, Node 26's automatic ES-module syntax detection; it does not simulate any chess behavior. An explicit `type: module` package is still a sound choice in both designs.

## Fatal problems and release blockers

- **A has an impossible own-spec acceptance scenario on its ordinary reading.** A:131 says that when a mate-in-one was available and missed, the coach says “the opponent can now mate” and shows that mating move, while A:148 requires every mate claim to be true. Consider `7k/8/6K1/6Q1/8/8/8/8 w - - 0 1`: White can play `g5g7` for mate, but can instead legally play `g5g4`; Black has only a king and cannot checkmate White. This is a spec contradiction, not a rule that missing one's own mate creates an enemy mate; the design's “stated as missed mate” (A:41) avoids the false statement but does not satisfy that acceptance sentence literally.
- **A's responsiveness remains a P1 release blocker.** An entire root subtree can occupy one main-thread call, and the coaching searches have no stated asynchronous path or shared time budget; the prescribed mechanism does not establish the never-freezes/under-two-seconds promise. This is a design deficiency, rather than a proof that every possible implementation of A must freeze.
- **B has no demonstrated intrinsically impossible P1 requirement, but its coaching guarantee is incomplete.** Omitting unsupported explanations at the deadline conflicts with the unconditional concrete-reason requirement unless a verified fallback exists, and its engine-strength promise has no evaluation or credible calibration mechanism. These are substantive release blockers, not proof that the product is impossible to build.
- **B's final check cannot complete as written.** Its owned files do not provide a test-directory entry module, and the Node 26 probe above confirms the P4 command fails; this blocks the planned final acceptance gate rather than making chess itself incorrect.

## Shipping verdict

I would choose **B** because its worker architecture, combined analysis budget, session contracts, and explicit review/ownership discipline make the required browser experience more credible. A offers a better search and rules-test outline, but its responsiveness mechanism and contradictory missed-mate acceptance scenario make it the riskier plan to execute. B still needs its weak strength/coaching proof and broken final check resolved before release; this judgment does not certify either unchanged plan as ready to ship.
