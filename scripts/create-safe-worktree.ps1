param(
  [string]$Slug = 'change',
  [string]$Base = 'origin/main',
  [string]$WorktreeRoot = ''
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param([string[]]$GitArgs)
  $output = & git @GitArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($GitArgs -join ' ')"
  }
  return ($output -join [Environment]::NewLine).Trim()
}

$repoRoot = Invoke-Git @('rev-parse', '--show-toplevel')
$repoRoot = (Resolve-Path -LiteralPath $repoRoot).Path
$Slug = ($Slug.ToLowerInvariant() -replace '[^a-z0-9-]+', '-') -replace '(^-+|-+$)', ''
if (-not $Slug) { $Slug = 'change' }

if (-not $WorktreeRoot) {
  $WorktreeRoot = Join-Path (Split-Path -Parent $repoRoot) 'codedestiny-worktrees'
}
$WorktreeRoot = [IO.Path]::GetFullPath($WorktreeRoot)
if (-not (Test-Path -LiteralPath $WorktreeRoot)) {
  New-Item -ItemType Directory -Path $WorktreeRoot | Out-Null
}

Invoke-Git @('fetch', 'origin', 'refs/heads/main:refs/remotes/origin/main', '--no-tags') | Out-Null
$baseSha = Invoke-Git @('rev-parse', '--verify', $Base)
if (-not $baseSha) { throw "Base ref is unavailable: $Base" }

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$branch = "codex/$Slug-$stamp"
$target = Join-Path $WorktreeRoot "$Slug-$stamp"
if (Test-Path -LiteralPath $target) { throw "Refusing to overwrite existing path: $target" }
$null = & git show-ref --verify --quiet "refs/heads/$branch"
if ($LASTEXITCODE -eq 0) {
  throw "Branch already exists: $branch"
}

Invoke-Git @('worktree', 'add', '-b', $branch, $target, $Base) | Write-Host

# 캐시버스트 해시 merge driver 는 .git/config 에만 살고 clone 으로 따라오지 않는다.
# worktree 는 .git/config 를 본체와 공유하므로 여기서 한 번 등록해 두면 전부에 적용된다.
& node (Join-Path $repoRoot 'scripts/setup-git-merge-drivers.mjs') | Write-Host

Write-Host "WORKTREE=$target"
Write-Host "BRANCH=$branch"
Write-Host "BASE=$baseSha"
Write-Host "Next: Set-Location -LiteralPath '$target'"
Write-Host "Then: npm run verify:worktree-policy -- --mode=edit"
