param(
  [string]$Base = 'main',
  [string]$Head = '',
  [switch]$SkipPush,
  [switch]$StatusOnly,
  [switch]$Web
)

$ErrorActionPreference = 'Stop'

function Invoke-Gh {
  param([string[]]$Args)
  & gh @Args
  if ($LASTEXITCODE -ne 0) {
    throw "GitHub CLI command failed: gh $($Args -join ' ')"
  }
}

if ($Base -ne 'main') {
  throw 'PRs must target main.'
}

$currentBranch = (git branch --show-current).Trim()
if (-not $currentBranch) { throw 'Detached HEAD is not allowed for PR creation.' }
if ($Head -and $Head -ne $currentBranch) { throw "Head must match the current worktree branch: $currentBranch" }
$Head = $currentBranch

if ($StatusOnly) {
  Invoke-Gh @('pr', 'list', '--base', $Base, '--head', $Head, '--state', 'all')
  exit 0
}

npm.cmd run verify:worktree-policy -- --mode=pr
$status = (git status --porcelain | Out-String).Trim()
if ($status) {
  throw 'The worktree must be committed and clean before push/PR creation.'
}

& gh auth status
if ($LASTEXITCODE -ne 0) {
  throw 'GitHub CLI authentication is unavailable. Re-authenticate before continuing.'
}

if (-not $SkipPush) {
  git push -u origin $Head
  if ($LASTEXITCODE -ne 0) { throw "Failed to push feature branch: $Head" }
}

$title = ($Head -replace '^codex/', '' -replace '^agent/', '') -replace '[-_]+', ' '
$title = "chore: enforce safe worktree PR flow - $title"
$body = @'
## What Changed
- Enforce secondary-worktree-only edits and PR-first delivery.

## Validation
- npm run verify:worktree-policy -- --self-test
- npm run verify:pages-pr-contract-test
- npm run verify:deploy-base-guard

## Risk
- This changes local editing, PR, and deployment guardrails only.

## No-regression Scope
- Payment, authentication, LLM provider calls, production DB writes, and production deployment behavior remain approval-gated.

## Rollback
- Revert this PR and remove the corresponding main branch ruleset if the guard blocks an approved workflow unexpectedly.
'@

if ($Web) {
  Invoke-Gh @('pr', 'create', '--web', '--base', $Base, '--head', $Head, '--title', $title, '--body', $body)
} else {
  Invoke-Gh @('pr', 'create', '--base', $Base, '--head', $Head, '--title', $title, '--body', $body)
}
