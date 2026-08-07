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
$branch = "wt/$Slug-$stamp"
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

# 새 워크트리는 그 자리에서 바로 빌드·검증·배포까지 되어야 한다. 그렇지 않으면 세션이
# 주 체크아웃으로 돌아와 작업하게 되고, 워크트리 격리가 이름만 남는다.
# node_modules 는 1.2GB 라 복사하면 워크트리마다 그만큼 쌓인다. 정션으로 공유한다.
$linkedModules = Join-Path $target 'node_modules'
$sourceModules = Join-Path $repoRoot 'node_modules'
if ((Test-Path -LiteralPath $sourceModules) -and -not (Test-Path -LiteralPath $linkedModules)) {
  # Junction 은 Windows 에서 관리자 권한 없이 만들 수 있다(SymbolicLink 는 필요할 수 있다).
  New-Item -ItemType Junction -Path $linkedModules -Target $sourceModules | Out-Null
  Write-Host "LINKED node_modules -> $sourceModules"
}

# 개발용 런타임 env. 배포 자격증명은 deploy-safe 가 주 워크트리에서 직접 읽으므로 없어도
# 되지만, npm run dev 나 로컬 검증은 이 파일을 본다.
# 복사하지 않고 하드링크한다 — 복사하면 시크릿 사본이 워크트리 수만큼 디스크에 늘어나고,
# 회전(rotate) 후에도 옛 값이 남는다. 하드링크는 실체가 하나라 양쪽이 항상 같은 값이다.
foreach ($envName in @('.env.local', '.env.cloudflare.local')) {
  $sourceEnv = Join-Path $repoRoot $envName
  $targetEnv = Join-Path $target $envName
  if ((Test-Path -LiteralPath $sourceEnv) -and -not (Test-Path -LiteralPath $targetEnv)) {
    try {
      New-Item -ItemType HardLink -Path $targetEnv -Target $sourceEnv -ErrorAction Stop | Out-Null
      Write-Host "LINKED $envName"
    } catch {
      # 다른 볼륨이면 하드링크가 안 된다. 그때만 복사한다.
      Copy-Item -LiteralPath $sourceEnv -Destination $targetEnv
      Write-Host "COPIED $envName (hard link unavailable)"
    }
  }
}

Write-Host "WORKTREE=$target"
Write-Host "BRANCH=$branch"
Write-Host "BASE=$baseSha"
Write-Host "Next: Set-Location -LiteralPath '$target'"
Write-Host "Deploy lock stays shared with the primary worktree, so only one worktree promotes"
Write-Host "at a time. Merge back with a plain 'git merge' - no PR."
Write-Host "To remove later, BREAK THE LINK FIRST or you may delete the shared node_modules:"
Write-Host "  (Get-Item -LiteralPath '$target\node_modules' -Force).Delete()"
Write-Host "  git worktree remove --force '$target'"
