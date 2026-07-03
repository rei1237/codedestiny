# Codex GitHub MCP 설정 가이드 (Windows PowerShell)

## 1) 목표
- `.env.local`의 `codex_gitmcp`를 `GITHUB_PAT_TOKEN`으로 옮겨 등록하고, 토큰 원문은 모든 출력에서 감춥니다.
- `github` MCP를 Codex에서 사용할 수 있게 구성합니다.

## 2) 현재 환경 확인
```powershell
codex --version
codex mcp --help
node -v
npm.cmd -v
npx.cmd -v
git --version
```

## 3) `.env.local`에서 토큰 읽기 및 환경변수 등록
```powershell
if (-not (Test-Path ".env.local")) {
  Write-Error ".env.local 파일을 찾을 수 없습니다. 프로젝트 루트에서 실행 중인지 확인하세요."
  exit 1
}

$line = Get-Content ".env.local" | Where-Object { $_ -match '^\s*codex_gitmcp\s*=' } | Select-Object -First 1
if (-not $line) {
  Write-Error ".env.local 안에서 codex_gitmcp 변수를 찾지 못했습니다."
  exit 1
}

$token = ($line -replace '^\s*codex_gitmcp\s*=\s*', '').Trim().Trim('"').Trim("'")
if (-not $token -or $token.Length -lt 20) {
  Write-Error "codex_gitmcp 값이 비어 있거나 너무 짧습니다. GitHub PAT가 맞는지 확인하세요."
  exit 1
}

Write-Host "codex_gitmcp 값을 찾았습니다. 토큰 길이만 확인: $($token.Length)"
[Environment]::SetEnvironmentVariable('GITHUB_PAT_TOKEN', $token, 'User')
$env:GITHUB_PAT_TOKEN = $token
Remove-Variable token
Write-Host 'GITHUB_PAT_TOKEN 환경변수 등록 완료(현재 세션 + 사용자)'
```

## 4) GitHub MCP 등록
새로 등록
```powershell
codex mcp add github --url https://api.githubcopilot.com/mcp/ --bearer-token-env-var GITHUB_PAT_TOKEN
```

이미 등록되어 있거나 실패할 때
- `~/.codex/config.toml`에서 `[mcp_servers.github]` 항목 확인
- 값은 아래 형식이어야 함
```toml
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_PAT_TOKEN"
```
- `bearer_token = "..."`(토큰 원문) 형태가 있으면 제거하고 위 형식으로 수정

`~/.codex/config.toml` 예시
```toml
[mcp_servers.github]
url = "https://api.githubcopilot.com/mcp/"
bearer_token_env_var = "GITHUB_PAT_TOKEN"
```

## 5) `.gitignore` 보안 항목 확인
다음 항목이 포함되어야 합니다.
```gitignore
.env
.env.*
!.env.example
!.env.*.example
*.jks
*.keystore
release-signing.properties
key.properties
local.properties
```

## 6) `/mcp` 확인
Codex 실행 후 입력:
```text
/mcp
```
`github`가 목록에 노출되어야 합니다.

확인용 테스트 프롬프트
```text
GitHub MCP로 현재 Code Destiny 저장소의 최근 커밋, 열린 이슈, 열린 PR, 실패한 Actions가 있는지 확인해줘. 단, 아무 파일도 수정하지 말고 읽기만 해줘.
```

## 7) 새 PC에서 재설정
1. `.env.local` 준비
2. 위 3번 스크립트로 `GITHUB_PAT_TOKEN` 등록
3. 4번 MCP 등록 명령 실행
4. Codex에서 `/mcp`로 `github` 표시 확인

## 8) 민감정보 보안 규칙
- 토큰은 `.env.local`/셸/터미널/문서/로그/`config.toml`에 그대로 출력하거나 저장하지 않습니다.
- 토큰이 노출된 것으로 판단되면 GitHub에서 즉시 `Revoke` 후 새 PAT를 발급해 교체합니다.
- `git status` 기준으로 `.env.local`, `.env*`, `release-signing.properties`, `local.properties`, `*.jks`, `*.keystore` 추적 여부를 정기 점검하세요.

## 9) Git 추적 해제(필요 시)
`git rm --cached .env.local`

## 10) `/mcp`에 github가 안 보일 때(핵심 원인 해결)

원인 후보:

- Codex가 긴 시간 실행 중이라 기존 캐시/환경을 새로 못 읽음
- `codex` 기본 경로(`WindowsApps`)가 현재 쉘에서 직접 실행 거부되어 다른 경로의 CLI를 쓰면 설치 상태가 달라져 보일 수 있음

조치:

1) 모든 Codex 프로세스를 종료한 뒤 앱을 완전 재시작
```powershell
Get-Process -Name Codex,codex -ErrorAction SilentlyContinue | Stop-Process -Force
```

2) 새 프로세스에서 `/mcp` 실행

- `codex`가 실행되지 않거나 동일하게 거부되면 아래 CLI로 검증
```powershell
$env:GITHUB_PAT_TOKEN = [Environment]::GetEnvironmentVariable('GITHUB_PAT_TOKEN','User')
C:\Users\user\AppData\Local\OpenAI\Codex\bin\ea1c60319a1dcb19\codex.exe mcp list
```

3) 출력에서 `github`가 보이면 설정은 정상. `No output` 또는 누락이면 아래 명령을 다시 1회 실행 후 재확인
```powershell
C:\Users\user\AppData\Local\OpenAI\Codex\bin\ea1c60319a1dcb19\codex.exe mcp add github --url https://api.githubcopilot.com/mcp/ --bearer-token-env-var GITHUB_PAT_TOKEN
```
