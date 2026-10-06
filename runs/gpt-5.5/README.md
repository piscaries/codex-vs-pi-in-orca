# Earlier run: Codex on GPT-5.5 vs Pi on GLM-5.3

The first run of this comparison paired Pi (GLM-5.3) with Codex on **GPT-5.5**. GPT-5.5 was carried over from earlier experiments without re-checking; it was two generations behind OpenAI's current models and older than GPT-5.6 Sol, the model Z.ai benchmarks GLM-5.3 against. We therefore reran only the Codex team with GPT-5.6 Sol (the main results in this repository). Pi's team is the same in both runs: `apps/pi/` and the t2 messages in `tasks/`.

Everything else was the same as in the main run: start commit, task messages (track label t1 here), reviewer (Claude Code with Claude Opus 4.6) and hidden tests. The judges were different, and so was their prompt: Claude Sonnet 5.5, GPT-5.6 Sol and GLM-5.3, given the reviewer role prompt. In the main run they were replaced, because of a mid-tier Claude judge, a judge sharing Pi's model, and a prompt that mixed scoring with merge instructions.

| | Codex (GPT-5.5) | Pi (GLM-5.3) |
| --- | --- | --- |
| Judges, spec (Sonnet 5.5 / GPT-5.6 Sol / GLM-5.3) | 73 / 90 / 82 | 85 / 94 / 90 |
| Judges, design | 59 / 69 / 77 | 85 / 87 / 93 |
| Author working time (spec / design / build) | 58 min (3 / 3 / 51) | 217 min (7 / 4 / 207) |
| Author tokens (output) | 11.4M (109,000) | 32.0M (541,000) |
| Cost at API list prices (GPT-5.5: $5 / $0.50 / $30 per M input / cached / output; GLM-5.3 as logged by Pi) | $11.90 | $11.42 |
| Hidden tests | 43 / 43 | 43 / 43 |
| Engine match, 200 ms, Codex's rules as referee | 0 | 20 |
| Engine match, 1 s, Pi's rules as referee | 0.5 | 19.5 |

The judge scores are not comparable with the main run's: different judges and a different prompt.

| Folder | Contents |
| --- | --- |
| `apps/codex-gpt-5.5/` | Codex's app from this run, with its `process/` documents |
| `tasks/` | The t1 messages and this run's judge messages |
| `judging/` | This run's judge score sheets (spec A = Codex, B = Pi; design A = Pi, B = Codex) |
| `results/` | Results, metrics and match logs (their links to REPRODUCE.md now point at the guide for the main run, which used the same procedure), including a later rerun of the 200 ms match (19.5–0.5) |
| `figures/` | The figures from the first draft of the post |

Replay this run's match:

```sh
node eval/match/match.mjs runs/gpt-5.5/apps/codex-gpt-5.5/engine/index.js apps/pi/engine/index.js 200
```
