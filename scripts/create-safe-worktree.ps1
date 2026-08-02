param(
  [string]$Slug = 'change',
  [string]$Base = 'origin/main',
  [string]$WorktreeRoot = '',
  [string[]]$DependencyDirectories = @('node_modules'),
  [switch]$SkipDependencyCopy
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param([string[]]$GitArgs)
  $previousErrorAction = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    $output = & git @GitArgs 2>$null
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if ($exitCode -ne 0) {
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

Invoke-Git @('fetch', 'origin', 'main') | Out-Null
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

if (-not $SkipDependencyCopy) {
  foreach ($dependencyDirectory in $DependencyDirectories) {
    if ([string]::IsNullOrWhiteSpace($dependencyDirectory)) { continue }

    $dependencySource = Join-Path $repoRoot $dependencyDirectory
    $dependencyTarget = Join-Path $target $dependencyDirectory
    if (-not (Test-Path -LiteralPath $dependencySource -PathType Container)) {
      Write-Warning "Dependency directory was not found and was skipped: $dependencySource"
      continue
    }
    if (Test-Path -LiteralPath $dependencyTarget) {
      throw "Refusing to overwrite dependency directory: $dependencyTarget"
    }

    Write-Host "Copying dependency directory: $dependencySource -> $dependencyTarget"
    Copy-Item -LiteralPath $dependencySource -Destination $dependencyTarget -Recurse -Force
    Write-Host "DEPENDENCY=$dependencyTarget"
  }
}

Write-Host "WORKTREE=$target"
Write-Host "BRANCH=$branch"
Write-Host "BASE=$baseSha"
if ($SkipDependencyCopy) {
  Write-Host "DEPENDENCY_COPY=skipped"
} else {
  Write-Host "DEPENDENCY_COPY=enabled"
}
Write-Host "Next: Set-Location -LiteralPath '$target'"
Write-Host "Then: npm run verify:worktree-policy -- --mode=edit"
