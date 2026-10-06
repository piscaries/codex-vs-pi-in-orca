# Codex vs Pi in Orca: two coding-agent teams build the same chess coach

This repository holds everything behind the blog post [*I had Codex and Pi build the same app in Orca, then compared them side by side*](https://piscaries.github.io/posts/codex-and-pi-build-the-same-app-in-orca/): the team prompts, the task given to both agents, the exact messages they received, the two finished apps, and the tests and scripts used to compare them. You can check every number in the post, or rerun the comparison with your own agents.

Discussion on [Hacker News](https://news.ycombinator.com/item?id=49979636).

## The experiment in one paragraph

Two teams, each made of one coding agent playing three roles (product designer, engineering designer, builder), built the same product: a chess coach for beginners that plays against you and explains your mistakes. One team ran **Codex CLI with GPT-5.6 Sol**, the other **Pi with GLM-5.3**, the model Z.ai itself benchmarks against GPT-5.6 Sol. Both ran at high reasoning, with matched prompts, tools and context. One reviewer, **Claude Code with Claude Opus 4.6**, reviewed every spec, design and build phase on both teams, given only a track label (Codex's handoff notes did name its model family; see the Limits in the results). Two strong blind judges, **Claude Opus 5.5** and **GPT-6.1 Sol**, scored the specs, the designs and the finished apps side by side, on criteria split between general engineering practice and what a chess coach needs. Everything ran in [Orca](https://onorca.dev), each task in its own git worktree and terminal.

## Results

| | Codex (GPT-5.6 Sol) | Pi (GLM-5.3) |
| --- | --- | --- |
| Blind judges, spec (Opus 5.5 / GPT-6.1 Sol) | 75 / **77** | **82** / 66 |
| Blind judges, design (Opus 5.5 / GPT-6.1 Sol) | 58 / **61** | **65** / 53 |
| Blind judges, finished app (Opus 5.5 / GPT-6.1 Sol) | 65 / **63** | **70** / 62 |
| Judges' score for engine strength, finished app (of 15) | 4 / 6 | **12 / 13** |
| Author working time (spec / design / build) | **48 min** (4 / 5 / 40) | 217 min (7 / 4 / 207) |
| Author tokens (output) | **10.8M (150,000)** | 32.0M (541,000) |
| Cost at API list prices | **$9.24** | $11.42 |
| Hidden tests passed | 43 / 43 | 43 / 43 |
| Engine match, 20 games at 200 ms per move | 1 | **19** |
| Engine match, 20 games at 1 s per move, Pi's rules as referee | 3.5 | **16.5** |

Codex finished in under a quarter of the time, at a similar cost. Pi built the much stronger chess engine; Codex built the more responsive page. The judges split on the overall scores and on coaching, but agreed on engine strength and responsiveness, and the product judges found what single reviews had passed: Pi's page stalls while the computer thinks, and Codex's level-weakening noise has no effect. Both boards draw rows of unequal height, and Pi's swaps the light and dark squares. Full results: [`results/results.md`](results/results.md). Per-session tokens and time: [`results/metrics.md`](results/metrics.md).

**One project, one run per team.** Treat this as one data point and a method, not a benchmark.

**An earlier run** paired the same Pi team with Codex on GPT-5.5, an older model carried over from earlier experiments by mistake. We reran the Codex team with GPT-5.6 Sol for a like-for-like comparison. The earlier run is kept, complete, in [`runs/gpt-5.5/`](runs/gpt-5.5/).

## What is here

| Folder | Contents |
| --- | --- |
| `project/` | The task both teams received: product brief (with the fixed testing interface) and the 9-item quality bar |
| `team/` | Team charter, one prompt file per role, the roster used in the run |
| `tasks/` | The exact message sent for every task (t3 = Codex, t2 = Pi), and the judges' messages |
| `apps/codex/`, `apps/pi/` | Each team's finished app, plus `process/`: its spec, design, phase reports, every review and the acceptance review with screenshots |
| `eval/hidden-tests/` | 43 acceptance tests, written before the run and never shown to the agents |
| `eval/match/` | Engine match runner, a board viewer for the logged games, and `SNAPSHOT.txt` (which engine commits played) |
| `eval/coaching.mjs` | Feeds the same positions to both coaches |
| `eval/judging/` | Judge rubrics, blind score sheets for the specs, designs and finished apps, a line-by-line summary, and two superseded earlier rounds |
| `results/` | Results, metrics, coaching outputs, and the full logs of both matches |
| `runs/gpt-5.5/` | The earlier run with Codex on GPT-5.5: its app, tasks, judging, results and figures |
| `scripts/` | Agent launcher, task generator, token and time counter, board measurement |
| `figures/` | Figures used in the post |

## Check the results yourself

Requirements: Node.js 20 or later. No dependencies, no build step.

Run the hidden tests against either app:

```sh
CHESS_ENGINE=$PWD/apps/pi/engine/index.js node --test eval/hidden-tests/acceptance.test.mjs
CHESS_ENGINE=$PWD/apps/codex/engine/index.js node --test eval/hidden-tests/acceptance.test.mjs
```

The test file's SHA-256 was recorded before either team started:
`2ffe111c8722e644f4f26f0739be786789fcaa394db6e3358bdfad1d11aa598e`.

Replay the engine matches (20 games each, a few minutes; the 1 s match takes longer). Engine A is Codex, B is Pi. A's rules referee every move unless you set `REFEREE=B`.

```sh
node eval/match/match.mjs apps/codex/engine/index.js apps/pi/engine/index.js 200 > match-200ms.json
REFEREE=B node eval/match/match.mjs apps/codex/engine/index.js apps/pi/engine/index.js 1000 > match-1s.json
```

The logged results are in `results/`: at 200 ms Pi won 18 and drew 2, or 19–1 on points with a draw worth half (`match-200ms.json`); at 1 s with Pi's rules as referee, Pi won 13 and drew 7, or 16.5–3.5 (`match-1000ms-refB.json`). Both engines search against the clock, so individual games vary from run to run.

To watch a logged game, serve the repository root and open the viewer, for example `python3 -m http.server 8002`, then http://localhost:8002/eval/match/viewer.html?file=../../results/match-200ms.json&game=0&ply=end (games are numbered from 0).

Compare the coaches on the same positions:

```sh
node eval/coaching.mjs apps/codex/engine/index.js
node eval/coaching.mjs apps/pi/engine/index.js
```

Play either app. Both need a local web server; opened directly as a file, both show an empty board.

```sh
node apps/codex/server.mjs                          # Codex's own server; open the URL it prints
python3 -m http.server 8000 --directory apps/pi     # then open http://localhost:8000
```

## Run your own comparison

[`REPRODUCE.md`](REPRODUCE.md) walks through setting up both teams in Orca, matching the conditions, running the stages, and measuring the result. The same steps work with any two coding agents and any task of your own.
