# Run your own comparison

This guide shows how the run was set up, so you can repeat it or swap in other agents and another task. The idea is simple: **give two agents the same task under the same conditions, keep the reviewer and judges blind, then compare how they worked and what they built.**

Expect about half a day for the chess-coach task: the slower team took about 3.5 hours of agent time.

## 1. What you need

| Tool | Version used | Role |
| --- | --- | --- |
| [Orca](https://onorca.dev) | 1.4.218 | Runs every agent in its own git worktree and terminal; dispatches tasks and collects results |
| [Codex CLI](https://github.com/openai/codex) | 0.159.2 | Codex team, with GPT-5.6 Sol (the earlier run used GPT-5.5) |
| [Pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) | 0.87.1 | Pi team, with GLM-5.3 through the Z.AI GLM Coding Plan (provider `zai-coding-cn`; use the provider id for your region) |
| [Claude Code](https://claude.com/claude-code) | 2.1 | Reviewer (Claude Opus 4.6) and coordinator |
| Node.js | 20+ | Tests and the engine match |
| Google Chrome | any | Acceptance review and board measurement (headless) |

You act as the **coordinator**, or you hand that job to an agent with `team/coordinator.md`. In this run, a Claude Code session coordinated, and I approved the gates.

## 2. Set up the agents' workspace

The agents work in a separate git repository, not in this one. We recommend a fresh one, laid out the way the task messages expect:

```
your-workspace/
  projects/chess-coach/brief.md          <- copy from project/
  projects/chess-coach/quality-bar.md    <- copy from project/
  docs/run5/                             <- specs, designs, reviews and reports land here
  chess-coach/                           <- the app is built here (start empty)
```

**What we actually used:** the run's workspace was the repository we had been using for earlier experiments. Besides the layout above it held earlier-run material (a small Python demo with its tests, notes from earlier runs) and an early `docs/run5/ledger.md` that named the two agents ("Codex track", "Pi track") and announced hidden tests and an engine match. It never said which track label belonged to which agent, so the reviewer stayed blind to the mapping, and both teams started from the same commit with the same content. It also held two Orca skills under `.claude/skills/` (`orca-cli`, `orchestration`), which the Claude sessions (reviewer and Claude judges) could load for both teams alike, and a `.pi/settings.json` whose default model (gpt-5.6-luna, medium) was overridden by Pi's launch flags; the probe confirms glm-5.3 at high. A fresh workspace avoids the question entirely.

Commit it, add it to Orca (`orca repo add --path <your-workspace>`), and create one branch per team (for example `run5-t1` and `run5-t2`) from that commit.

**Keep the hidden tests out of the workspace.** Neither team may see `eval/`.

## 3. Match the conditions

Fairness is the point of the exercise. Everything except the agent itself should be the same:

| Condition | How it was matched |
| --- | --- |
| Reasoning | High on both: `-c model_reasoning_effort=high` for Codex, `--thinking high` for Pi |
| Personal setup | None. Codex ran with a fresh `CODEX_HOME` (no global AGENTS.md, skills, memories or MCP servers); Pi ran with `--no-skills` |
| Role prompt | Sent the same way to both: charter and role file at the top of every task message, never bound to the agent's config |
| Task text | Identical for both teams except the track label (also in the run note), the Run ID and the commits |
| Tools | Each agent's own built-in tools, unchanged. Pi has 4. Codex also has web search, image tools, sub-agents, goals, MCP-resource tools and bundled plugins (Google Docs, Sites and others); its logs show it used only shell commands and two web searches |
| Reviewer | The same model for both teams, a third vendor, given only the track label. Strip model names from what authors hand back: Codex's handoff notes named its model family |

A minimal clean Codex home:

```toml
# $CODEX_HOME_CLEAN/config.toml
model = "gpt-5.6-sol"
model_reasoning_effort = "high"
approval_policy = "never"
sandbox_mode = "danger-full-access"   # the worktree is the sandbox; use what you are comfortable with

[features]
js_repl = false

[projects."/path/to/your/orca/worktrees"]
trust_level = "trusted"
```

Copy `auth.json` from your normal `~/.codex` so you can sign in. In this run the clean home was `~/.codex-run5` (set `CODEX_HOME_CLEAN` to whatever you use). What still loaded, so you can match or remove it: on Codex, its bundled system skills, the task-continuity plugin (keeps task state across context compaction), and Orca's status hooks; on Pi, Orca's status extension.

**Check before you start.** Launch each agent once and send this probe. (Our Codex probe in `figures/probes.png` was retaken right after the rerun with the same setup.) Both answers are in `figures/probes.png`: Codex's status bar reads "GPT-5.6-Sol high" and Pi's "glm-5.3 • high".

> Probe for a fair-comparison setup. Do not use any tools. Reply in at most five lines: (1) the model you are running, (2) your reasoning or thinking setting if you can see it, (3) the names of every tool you can call, (4) any skills, plugins or standing instructions loaded beyond this message, (5) the word DONE.

Then confirm the model in the agent's own session log, not in what it says about itself. `scripts/agent-usage.py` prints the logged model.

## 4. Run the stages

Each team goes through the same reviewed steps:

1. **Spec**: the product designer writes `docs/run5/spec.md`. Then a spec review.
2. **Design**: the engineering designer writes `docs/run5/design.md`, splitting the build into phases. Then a design review.
3. **Build**: one builder task per phase. Each phase goes to a fresh code-review session: PASS lands it on the team's branch; REWORK sends it back to the same builder.
4. **Acceptance**: a reviewer plays full games in Chrome as a beginner would and checks the quality bar.

Every message is generated by `scripts/make-task.py` (run it with no arguments to see the kinds; it reads `ORCA_RUN` for the Run ID). The exact messages from this run are in `tasks/`.

### One task, step by step

The examples use track t1 and its branch `run5-t1`; in this run the Codex track was t3 and Pi's t2.

```sh
# <your-handle> is the Orca terminal you coordinate from: open a terminal in Orca and run
# `orca terminal list --json` to find its handle (term_...).
orca orchestration run-create --from <your-handle> --objective "Codex vs Pi: chess coach" --json   # once per run
export ORCA_RUN=<the run id it prints>

# 1. A worktree for the task, branched from the team's branch
orca worktree create --repo <repo> --name r5-t1-spec --base-branch run5-t1 --setup skip

# 2. The agent in its own terminal (prints a terminal handle)
H=$(scripts/team-launch codex <repo-id>::<worktree-path> "t1 spec")
orca terminal wait --terminal $H --for tui-idle

# 3. The task
scripts/make-task.py spec t1 <base-commit> > task.md
orca orchestration worker-start --run $ORCA_RUN --from <your-handle> \
  --terminal $H --worktree id:<repo-id>::<worktree-path> --task-title "t1 spec" --spec "$(cat task.md)"

# 4. Wait, answer questions, read the result
orca orchestration check --wait
orca orchestration reply ...            # when a worker asks a question
orca orchestration worker-show ...      # outcome and report path
```

When a review passes, cherry-pick the task's commits onto the team's branch. The next task branches from there.

`orca skills get orchestration` prints the full, version-matched guide to these commands.

### Who controls the order

Something has to make sure each stage starts only after the previous one passed review. There are three ways to do it:

| Approach | How | Enforced? |
| --- | --- | --- |
| **Instructions in a prompt** | An agent coordinator follows a written plan, such as `team/coordinator.md` ("start the next phase only after the code review passes") | No. The agent can skip or reorder steps; nothing stops it |
| **A script** | A coordinator script dispatches the next task only after a PASS, and stops on anything else. **This run used one.** | Yes, but only inside your script; Orca does not see the rules |
| **Orca task dependencies and decision gates** | Create the tasks with `--deps`, and add a gate where a person must decide | Yes, by Orca: a task whose dependencies are unfinished (`pending`) or that has an open gate (`blocked`) cannot be dispatched |

```sh
orca orchestration task-create --spec "<P1 task>" --deps '["<P0 task id>"]' --json
orca orchestration task-list --ready --json            # only tasks whose dependencies are done and gates resolved
orca orchestration gate-create --task <task id> --question "Design accepted. Start the build?" --options '["start","rework"]' --json
orca orchestration gate-resolve --id <gate id> --resolution "start" --json
```

Orca enforces the order but does not run it: a Run "does not schedule or place workers", so something (an agent or a script) still has to dispatch each ready task. We checked the enforcement directly: dispatching a task with an unfinished dependency, or with an open gate, is refused with `task_not_startable: only ready tasks can be dispatched`.

The sturdiest setup combines them: an agent coordinator handles judgment calls (answering questions, routing rework), while Orca's dependencies and gates hold the rules that must never be broken.

### Things that tripped us up

- **Pi often drops the first message after it starts.** Send it a throwaway line first ("Reply with the single word: ready"), then dispatch.
- **Codex may offer to switch to a newer model** on startup. Pass `--model` explicitly and keep the model you meant to test.
- **`orca worktree rm` also deletes the branch.** Record the branch tip first, or cherry-pick before removing.
- **Watch for questions.** A worker that asks a question waits until you answer it. In this run, one question waited 13 minutes, and that time counts against the agent.
- **Clean up as you go.** Dozens of terminals and worktrees will slow the machine down. Release finished workers.

## 5. Keep the judging blind

- **Reviewer:** sees track labels only (`t3` and `t2` here). Never put the agent's name in a branch name, file or packet it can read.
- **Your own findings stay with you.** If you spot a defect while a team is still building, write it down but do not tell the builder. Otherwise you are helping one side.
- **Judges** (`tasks/judge-*.md`): judge three things side by side, as A and B in random order: the specs, the designs and the finished apps. For documents, strip names, models, track labels, commit hashes and the author's closing handoff note, which names the model. For the apps, give the code and tests without the process documents. Each judge works in a fresh session, in a worktree that holds only the packets and the starting code, without your notes, and only scores.
- **Use strong judges and a rubric made for this product.** Use models at least as strong as the authors and none that shares an author's model; this run used Claude Opus 5.5 and GPT-6.1 Sol, with Claude Sonnet 5.5 as a weaker comparison. Split each rubric into a general half (requirements, architecture, phases, tests, code quality) and a half about what this product needs (here: correct rules, engine strength, truthful coaching, a responsive page, a clear board). Let the product judges run the apps and test them, including playing the two engines against each other. Rubrics: `eval/judging/rubrics.md`.
- **What we learned the hard way.** Our first rounds used generic criteria only (`eval/judging/earlier/`). They rewarded tidy documents and could not tell a strong engine from a weak one: the strong judges preferred Codex's design by 21 points while Codex's engine lost the match 1–19. With product-specific criteria and a scoring of the finished apps, the judges' engine-strength scores agreed with the match; their totals still split.

## 6. Measure

**How they worked:**

```sh
CODEX_HOME=$CODEX_HOME_CLEAN scripts/agent-usage.py codex <worktree-path> --since <dispatch-time>   # also: pi, claude
```

This reads each agent's own session log and prints uncached, cached and output tokens, the model, and active minutes for that worktree. Sum the author worktrees per team. To compare cost fairly when the agents run on subscriptions, price the tokens at each model's API list price.

**What they built:**

- Hidden tests: `eval/hidden-tests/acceptance.test.mjs`, run against each app's engine (see README). Record its hash before the run starts.
- Coaching: feed the same positions to both apps' `reviewMove` and compare the verdicts and explanations.
- Engine match: `eval/match/match.mjs`. Freeze both engines at a commit first; use `REFEREE=B` to swap rule referees. `eval/match/viewer.html` renders any logged game.
- Look at the apps yourself. `scripts/measure-board.mjs <url>` prints each square's size and colour; that is how the uneven rows were found after every AI reviewer had passed them.

## 7. Use your own task

Replace `project/brief.md` and `project/quality-bar.md` with your own task. A good comparison task:

- is small enough to finish in an afternoon, but needs a spec, a design and several build phases;
- has a **fixed testing interface**, so you can write hidden tests before the run;
- produces something you can compare head to head (here, two chess engines can play each other).

The role files in `team/` are generic; only the "Run 5 note" in `scripts/make-task.py` and the paths in its envelopes refer to this run.
