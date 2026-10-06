# Judging

Blind, side-by-side scoring by judges outside both teams. The main results use the third round.

| Round | Judges | What they scored | Prompt | Status |
| --- | --- | --- | --- | --- |
| **3 (main)** | Claude Opus 5.5 (7), GPT-6.1 Sol (8), Claude Sonnet 5.5 as a weaker comparison (9) | Specs, designs and the finished apps | [`rubrics.md`](rubrics.md): a general half and a chess-coach half | Used in the results |
| 2 | Claude Opus 5.5 (4), GPT-6.1 Sol (5), Claude Sonnet 5.5 (6) | Specs and designs | [`earlier/round-2/judge-prompt.md`](earlier/round-2/judge-prompt.md): general engineering criteria only | Superseded |
| 1 | Claude Sonnet 5.5 (1), GPT-6.1 Sol (2), GLM-5.3 (3) | Specs and designs | The reviewer's role prompt | Superseded |

**Why round 3.** Round 1 used a mid-tier Claude judge, a judge running Pi's own model, and a prompt that mixed scoring with merge instructions. Round 2 fixed that, but its rubric was generic: it rewarded tidy documents and could not tell a strong engine from a weak one, so its design scores contradicted the engine match. Round 3 added criteria specific to a chess coach and a scoring of the finished apps, which the judges ran, tested and played against each other.

**Packets.** For specs and designs, each team's document with names, models, track labels, commit hashes and the author's closing handoff note removed (the design packet also carries the spec it was written for). For the product, each team's app code and tests, without its process documents. A and B were drawn at random for each scoring; the round-3 mapping is in [`SUMMARY.md`](SUMMARY.md). In rounds 1 and 2, A = Codex and B = Pi for both the spec and the design packets.

**When the rubric was written.** Round 3's rubric was written after rounds 1–2 had contradicted the engine match and after the board defects were known; its product line names "colours correct (a1 dark)". Both teams were scored against the same rubric, and the judges did not see the match results.

Line-by-line scores and findings: [`SUMMARY.md`](SUMMARY.md). Score sheets: `spec-judge-*.md`, `design-judge-*.md`, `product-judge-*.md`.
