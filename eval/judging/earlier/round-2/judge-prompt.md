# Judge prompt

The template for the judge messages in `tasks/judge-*.md`. One message per judge session. The spec judges and the design judges get the same text except where marked **[spec]** or **[design]**. All three judges (Claude Opus 5.5, GPT-6.1 Sol, and Claude Sonnet 5.5 as a weaker comparison) get byte-identical messages apart from the output file name. Nothing else is sent: no team charter, no reviewer role file, no run notes.

---

# Task: blind scoring of two [spec: product specs] [design: engineering designs and build plans]

You are an independent judge. Your only job is to score two documents, A and B, and say which is better. Do not rewrite, merge, or fix either one.

**The documents:** `docs/run5/[spec|design]-rescore/A.md` and `B.md` in this repository.
**[design]** Each packet holds a design followed by the product spec it was written for. Judge each design against its own spec, not against the other packet's spec.

**What the authors were given.** Two authors received the same task: the project brief and quality bar below, plus these instructions:

- **[spec]** Write a product spec in under 1,200 words. The "Fixed testing interface" in the brief is an owner constraint the spec may refer to.
- **[design]** Write an engineering design and build plan in under 1,500 words, from your own accepted spec. Split the build into phases (P0, P1, ...), each with owned files, a check command and a done-when. One builder builds every phase, one at a time, and each phase is code-reviewed before the next starts. Phases may run in parallel only if they own disjoint files.

Judge the documents as answers to that task.

## Rules

1. **Stay blind.** Do not try to find out who wrote either document. Do not read other branches, other folders, git history, or anything outside this repository.
2. **[design]** You may read the repository to check a design's claims about it. Both authors started from this same commit; the chess code did not exist yet. A wrong claim about the codebase or environment counts against the design.
3. **Score each document on its own first.** Go through the rubric for A, then for B, using the anchors below. Compare only after both are scored.
4. **Evidence for every score.** Quote the line that earns the score, or name what is missing.
5. **Substance over style.** Do not reward length, formatting, headings, or confident tone. A shorter document that covers the same ground scores the same or higher. Going over the word limit counts only under the scope or realism line.
6. **Use the whole scale.** A 20 means nothing of substance is missing on that line. Do not cluster every score between 15 and 18.

## Rubric (100 points: five lines, 20 each)

For each line, pick the band that fits, then a number inside it.

**[spec] Product spec**

| Line | 17–20 | 12–16 | 6–11 | 0–5 |
| --- | --- | --- | --- | --- |
| **1. User value and problem** | Names the user, their problem and the outcome that matters, all specific to this brief | Clear, but partly generic or missing one of the three | Vague; reads like any chess app | Missing or wrong user |
| **2. Stories and acceptance scenarios** | Every must-have outcome in the brief has a story with given/when/then scenarios that a tester could run independently | Most outcomes covered; some scenarios vague or not independently testable | Few scenarios, or not testable | None |
| **3. Requirements** | Complete against the brief, each one testable, no implementation choices (except the fixed interface) | One or two gaps, untestable items, or design leaking in | Several gaps, or mostly design rather than requirements | Missing |
| **4. Quality bar as checkable criteria** | All 9 quality-bar items become criteria someone could check, each with how | Most items covered; some still subjective | A few items covered, or only restated | Ignored |
| **5. Scope discipline** | Explicit non-goals, real edge cases (special moves, draws, illegal input, game end), and assumptions stated as such | Some of the three, or edge cases only listed by name | Thin | None |

**[design] Engineering design and build plan**

| Line | 17–20 | 12–16 | 6–11 | 0–5 |
| --- | --- | --- | --- | --- |
| **1. Traceability to the spec** | Every requirement and success criterion maps to a phase and a check | Most map; a few gaps | Partial or hand-waved | None |
| **2. Architecture and contracts** | Sound structure for the brief; internal contracts precise enough to build against; the fixed interface honoured exactly | Sound, with some loose contracts | Gaps that would cause rework or a wrong product | Unsound, or breaks the fixed interface |
| **3. Phases, ownership and parallelism** | Phases are small and ordered by real dependencies, owned files never overlap, and any parallelism is safe | Workable, with minor overlap or ordering issues | Phases too big, overlapping, or mis-ordered | No usable plan |
| **4. Checks and quality-bar verification** | Each phase check would fail if the behaviour broke; every quality-bar item has a way to be verified, including UI and coaching quality | Most checks meaningful; some quality-bar items unverified | Checks mostly smoke tests | None |
| **5. Grounding, risks and realism** | Claims about the codebase and environment are correct; main risks named with a response; effort estimate believable | Mostly grounded; some risks or estimates weak | Wrong claims, or risks ignored | Detached from the repository |

## Output: `docs/run5/[spec|design]-judge-N.md`

1. **Score table:** packet × rubric line. Each cell holds the score and its evidence (one quote or one named omission).
2. **Totals** for A and B.
3. **Per line:** which packet is better and why, one sentence each. Say "tie" when neither is better.
4. **Fatal problems,** if any: anything that would make a P1 requirement impossible or the product wrong.
5. **Verdict:** if you had to build from one packet, which one, in two or three sentences.

Commit only that file. Send `worker_done` with `--report-path` set to it. Budget: about 20 minutes.

[Project brief: Chess Coach, inserted verbatim]

[Quality bar: Chess Coach, inserted verbatim]
