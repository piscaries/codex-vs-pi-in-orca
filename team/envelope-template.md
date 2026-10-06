# Dispatch envelope (filled in by the coordinator)

- **Role:** <role name>
- **Candidate label:** <A/B/C, for competing rounds only; otherwise omit>
- **Run:** <run id>. Task and dispatch IDs are in your Orca preamble.
- **Workspace:** your own Orca worktree on branch <branch>, base commit <sha>
- **Inputs to read:** <paths: brief, quality bar, accepted spec/design, contracts, phase reports>
- **Owned files / output path:** <exact paths; write nothing else>
- **Checks to run:** <commands>
- **Rubric:** <inline, or a path, for candidates and reviewers>
- **Budget:** <time and length limits>
- **Phase notes:** <only facts the coordinator has verified in the code>
- **When finished:** commit only your owned files, write your report to <path>, send `worker_done` with `--files-modified` and `--report-path`, and end with the handoff block from the team charter.
