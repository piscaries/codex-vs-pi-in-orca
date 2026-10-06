# Code review — phase P3 (coach)

Verdict: PASS

Checks run:
- `node --test chess-coach/tests/review.test.js` → 18 pass, 0 fail (~23 s)
- `node --test chess-coach/tests/*.test.js` → 158 pass, 0 fail (~24 s); all P0–P2 tests intact

Blocking findings:
  (none)

Non-blocking (Nit:) suggestions:
  1. `review.js:151` — `hangingPiece` iterates `generateLegalMoves` and skips non-captures; could reuse the `legalCaptures` helper for captures-only generation. Current approach is correct and within the measured budget; pure style.
  2. `review.js:55` — `MATERIAL_EXCHANGE_DEPTH = 6` is a magic constant with a comment but no connection to the documented "stand-pat capture chains" design. A named constant in the thresholds block or near the exchange code would read slightly better. Minor.

What was done well:
  - The truthfulness architecture is the standout: concrete detectors (`mateInOne`, `hangingPiece`, `materialTally`) verify every claim on the exact position, and the test prober machine-re-verifies those claims. This cleanly separates the verdict (from search scores) from the reasons (from enumeration), making FR-006 guarantees structural rather than incidental.
  - The `hangingSentence` wording covers four distinct threat shapes (free capture, no recapture, unequal exchange, generic) with truthful single-ply-checkable claims in each case. The "for free" assertion is conservative — it checks that the victim has NO legal capture at all, not just no recapture on that square — so the claim can never be false.
  - The `scoreRootMoves` review search (depth-capped full-window, 1200 ms valve) is a sound design: exact full-window scores are directly comparable for the loss bands, and the valve prevents unbounded time on sharp middlegames while guaranteeing depth ≥3 completes. Decision 2 is well-justified.
  - Decision 3 (loss === 0 ⇒ best) is correct: two moves with the same score are equally good, and calling the second of two mate-in-ones merely "good" would be misleading. Documented transparently.
  - The `index.js` facade edit is minimal (one re-export line) and follows the same pattern accepted in P2 for `bestMove`. No existing behavior touched.
  - 21 SC-002 probes (10 hanging + 6 missed mate + 5 allowed mate + 1 stalemate-instead-of-mate) exceed the design's 20-probe threshold, and each probe's assertions are specific: correct verdict, machine-verified reasons, legal different better move.
  - The no-false-claims test set verifies that normal/good moves don't generate spurious concrete threat claims, guarding against over-firing.
  - Per-call timing (~0.7–1.25 s) is well within the hidden suite's expected budget and leaves headroom for P4's per-move comment flow.

Remaining limits:
  - The review search depth is time-valved, not fixed, on sharp middlegames (depth ≥3 completes, cap 5). Verdicts near a band edge could differ on a much slower machine. The builder documented this and the probe cases have wide margins.
  - `reviewMove` costs up to ~1.3 s per call (search-bound). Fine for the hidden suite and P4; if P4 finds the wait noticeable it can lower `REVIEW_BUDGET_MS`.
  - Non-material positional mistakes get the honest generic fix sentence rather than a concrete detector claim — true by construction, less instructive. The spec's probe classes all get concrete reasons.
  - The material-chain gate for hanging reasons uses a stand-pat capture game; in rare intermezzo positions the gate could mis-fire, but the sentences only state single-ply verifiable facts, so no false claim results.
