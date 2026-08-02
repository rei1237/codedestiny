# Safe Worktree -> PR -> Merge -> Deploy Workflow

## Start every task

1. Leave the primary repository worktree untouched.
2. Run `git fetch origin main` from a repository checkout.
3. Create a new secondary worktree from `origin/main`:
   `powershell -File scripts/create-safe-worktree.ps1 -Slug <short-feature-name>`
4. In the new worktree, register the session in `WORKING_ON.md` and `.work-locks/<session-id>.md`.
5. Run `npm run verify:worktree-policy -- --mode=edit` before editing.

## Before opening a PR

1. Run the relevant mock, unit, type, and feature verification commands.
2. Run `git fetch origin main` and confirm `origin/main` is an ancestor of the feature branch.
3. Run `npm run verify:worktree-policy -- --mode=pr`.
4. Inspect `git status --short --branch`, `git diff --check`, and the final scoped diff.
5. Push only the feature branch and create or update a PR targeting `main`.
6. The PR body must include:
   - `## Validation`
   - `## Risk`
   - `## No-regression Scope`
   - `## Rollback`

## Merge and deployment

1. Wait for all required CI checks and review approvals.
2. Confirm no blocking review, conflict, or scope drift remains.
3. Ask for and receive the user's explicit merge approval for the current task.
4. Merge the PR without force-merging or bypassing required checks. Do not delete a branch while another worktree still references it.
5. Pages deployment may run from the merged `main` push. Worker and other production deployment workflows are manual CI workflows restricted to `main` and still require explicit user approval.
6. Verify the deployed commit/version and relevant live routes after an approved deployment.

## Prohibited shortcuts

- Editing or committing in the primary worktree, `main`, `master`, or detached HEAD.
- Pushing directly to `main`.
- Deploying from a feature branch, stale worktree, or local shell.
- Running real LLM, payment, production DB, or production deployment actions without the exact user approval required by `AGENTS.md`.
