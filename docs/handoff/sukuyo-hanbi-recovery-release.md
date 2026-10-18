---
status: done
updated: 2026-10-18
next: "운영 배포·양쪽 SHA·무료 화면 반영 확인 완료. 881px 화면의 기존 여부 미확인 가로 잘림은 별도 UI 작업으로 조사한다. 중복 배포하지 않는다."
---

# 숙요점 서한비·궁합 복구 운영 승격 완료

## 2026-10-18 재개 실측

- 재개 시 로컬 HEAD: `55e700588279161440b6b391303227e191c6f17c` (인수인계 문서만 추가, 아직 원격 미전달).
- 원격 main과 CI `39120446145`의 SHA: `ed7d5c2243dfa96ae41555b448b7d2c7280f56da`. CI completed/success, `CI required` 포함 전체 필수 lane 성공.
- 기존 승인으로 `gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production` 실행: https://github.com/rei1237/codedestiny/actions/runs/39123545114
- 릴리스 고정 SHA: `ed7d5c2243dfa96ae41555b448b7d2c7280f56da`. 배포 전 운영 Pages·Worker 모두 `1ec16191abfc0b45bdf6ff1b4e02da26d23a0d2b`.
- `npm run check:pre-push`: exit 0 (home registry, public mirror, sitemap 1022 URLs, llms.txt, SEO entity 62 profiles).
- 공식 production 릴리스 `39123545114`: completed/success. `release` 잡 성공.
- `npm run verify:deployed-sha -- --sha=ed7d5c2243dfa96ae41555b448b7d2c7280f56da --origin=https://code-destiny.com --attempts=1`: exit 0. `/version.json`과 `/api/version` 모두 전체 SHA `ed7d5c2243dfa96ae41555b448b7d2c7280f56da` 일치.
- 공개 서한비 이미지 HTTP 200, image/webp, SHA-256 `DACB1796AFFAB3DAAF8AEA5D91CE829CEA36917AB5C713B1C61F729B429E6C21`로 로컬 원본과 일치.
- 실제 화면이 로드한 `/js/saju-engine-tarot-sukuyo-quantum.js?v=build-32c8496999de`: HTTP 200, 신규 이미지 경로와 서한비 안내 문구 확인. 버전 없는 URL은 구 응답이어서 실제 DOM의 script src를 기준으로 재검증했다.
- 사용자 로그인 후 `/ggulggul/?action=cdHomeSukuyoEntry`를 새로고침해 무료 본명숙·성격 해설, 신규 서한비 이미지, “서한비입니다. 달이 머문 자리에서 당신의 성향을 읽어 드릴게요.”를 확인했다. 이미지 naturalWidth/Height 1200×800, complete=true.
- 화면 증거: `C:\Users\user\.codex\visualizations\2026\10\18\01a14ec6-8f0b-7e32-b229-c26e577b4ccc\sukuyo-production.png`.
- 별도 확인 사항: 실제 viewport 881px에서 본명숙 카드 left=120/right=1080/width=960으로 오른쪽이 잘린다. 배포 전부터 있던 현상인지는 미확인. 이번 배포 검증 범위에서 UI 코드는 수정하지 않았다.
- 실결제·유료 LLM·이용권 차감·운영 DB 수선은 수행하지 않았다. 다른 세션의 `.claude/skills/fire-your-seo-agency/`는 보존했다.

아래는 최초 인수인계 당시 기록이다. CI 대기 상태는 위 재개 실측으로 대체한다.

## 재개 위치와 게이트

- 작업 디렉터리: `D:\Development\code-destiny`
- 이 문서: `D:\Development\code-destiny\docs\handoff\sukuyo-hanbi-recovery-release.md`
- 코드 마지막 커밋 / push 완료 SHA: `ed7d5c2243dfa96ae41555b448b7d2c7280f56da`
- 필수 CI: https://github.com/rei1237/codedestiny/actions/runs/39120446145
- 마지막 확인: Risk tier 성공. Typecheck and lint, Static guards, Build Pages and Worker, Critical checks 실행 중. 실패 확인 없음. 필수 CI 통과를 아직 증명할 수 없어 production 미실행.
- AGENTS.md의 CI 반복 대기 금지 규칙에 따라 최종 상태를 기록했다. CI를 우회하지 않는다.
- 사용자가 이번 변경의 운영 배포를 이미 승인했다. 재승인 질문은 필요 없다. 실제 결제·실 사용자 이용권 사용·유료 LLM 호출·운영 DB 수선은 승인되지 않았다.
- 작업 워크트리와 wt 브랜치는 main 통합·push 후 배수 완료. node_modules 정션을 먼저 제거했다. 다른 세션의 `.claude/skills/fire-your-seo-agency/` 미추적 폴더와 다른 워크트리는 보존했다.

## 완료한 변경

- `ad4b5f147`: 중첩 이용권 증빙의 accessMethod와 원래 requestId 전달, 모바일 복귀가 실제 결과 완료를 기다리도록 변경, 같은 결제 재시도, 아카이브 상대 변경 409.
- `d2e0abf1b`: 무료 본명숙 카드에 신규 서한비·달 이미지, 기존 달 SVG 장식, 서한비 안내 및 기본 AI의 기존 HANBI_PERSONA_KO 연결. 정식 생성 미러 포함.
- `7b30c1827`: 중복 실행과 계정 전환 후 늦은 응답 회귀 검사.
- `592bb4736`: 결과 요청이 45초 이상 걸려도 결제 게이트를 다시 열지 않는 진입 차단.
- `ed7d5c224`: mock 검증과 후속 마스터 배정 기록.
- main의 다른 세션 타로 홈 커밋 `7573c79cf`, `aa8232b29`를 보존해 통합했다. 이번 수정과 별도 커밋이다.

원인은 mock으로 재현한 코드 결함이다. 실제 사용자 거래는 조회하지 않았으므로 그 거래의 확정 원인으로 단정하지 않는다. 최신 유료 궁합 본문은 `/api/saju/section`에서 증빙을 확인하고 계산한다. 서버의 계정·상품·프로필·조합 검증을 유지했고, 가격·이용권 한도·월정석·단건 정책·인증 구조·DB 스키마는 바꾸지 않았다.

핵심 파일: `js/saju-engine-tarot-sukuyo-quantum.js`, `js/core/saju/basicFortunePresentation.js`, `js/core/fortune-consultation-ui.js`, `worker/routes/sukuyo-archive.js`, `worker/lib/sukuyo-ai-prompt.js`, 관련 테스트 및 public 생성 미러. 신규 이미지: `public/images/master-profiles/hanbi-sukuyo-reading.webp`. 전체 구현·후속 범위: `docs/design/sukuyo-hanbi-reading.md`.

## 검증 증거

- `npm run check:fast -- --plan`: critical/deep 검사 계획 확인.
- `npm run check:fast`: 최초 샌드박스 실행은 localhost EACCES, Chromium 부재, 임시 Git 권한 때문에 실패. Jest 420 suites / 6674 tests 자체는 통과했다. mock 네트워크 차단을 해제하지 않았다.
- `npm run check:fast -- --base=7573c79cfcc4a756e2aa5522ec241cf6449db160`: 정상 로컬 권한 재실행 exit 0. 결제 가드 90/90, Node 3395/3395, Jest 420 suites / 6674 tests, lint, typecheck, Worker dry-run 빌드 및 후속 가드 통과.
- `node --test __tests__/ui/sukuyo-legacy-delivery.behavior.test.js`: 6/6 통과. 원래 requestId, nested pass, 계정/프로필 격리, 연속 클릭, 지연 응답 계정 전환, 402 후 재시도, 모바일 복귀 완료 시점.
- `npm run test:jest -- --runInBand __tests__/worker/sukuyo-result-archive.test.js __tests__/worker/saju-section.test.js`: 430/430.
- `npm run test:jest -- --runInBand __tests__/worker/sukuyo-ai-prompt-domain-templates.test.js`: 6/6.
- `node --require ./scripts/lib/mock-network-guard.cjs scripts/verify-sukuyo-legacy-delivery-browser.mjs`: 성공. 360/390/430/1280px, 겹침·가로 넘침 없음. 실제 레거시 DOM·section client, mock gate 1회, 동일 원래 requestId로 section 요청 5회, 저장 오류 후 archive 요청 2회. 외부 네트워크와 WebSocket 차단. 실 차감 횟수를 측정한 것은 아니다.
- `node --require ./scripts/lib/mock-network-guard.cjs --test __tests__/ui/home-card-motion.test.mjs`: 후속 main 통합 테스트 6/6.
- `npm run sync:public`: 정식 생성 완료. `npm run check:pre-push`: 워크트리와 최종 main 모두 통과.
- 실 사용자 이용권·PG·유료 LLM 결과는 미검증. 실제 무료 화면은 로컬 mock 서버에서 확인했으며 운영 반영 검증은 남았다.

## 다음 명령과 완료 조건

```powershell
Set-Location 'D:\Development\code-destiny'
Get-Content 'D:\Development\code-destiny\docs\handoff\sukuyo-hanbi-recovery-release.md'
git status --short
git merge-base --is-ancestor ed7d5c2243dfa96ae41555b448b7d2c7280f56da main
gh run view 39120446145 --json status,conclusion,headSha,url
```

실패면 `gh run view 39120446145 --log-failed`로 실패 검사와 원인 SHA를 기록하고 우회하지 않는다. 성공이면 인수인계 문서의 로컬 커밋을 전달할 때도 check:pre-push와 해당 main CI를 확인한다. 이후 승인된 공식 릴리스만 실행한다:

```powershell
gh workflow run "Release Cloudflare Pages and Worker" --ref main -f mode=production
```

릴리스 대상 SHA와 실행 URL을 기록하고 성공 결과, `https://code-destiny.com/version.json` 및 `https://code-destiny.com/api/version`의 gitSha가 모두 일치하는지 확인한다. 신규 이미지와 배포 JS, 실제 무료 숙요점 화면을 확인한다. 배포 명령 실행만으로 완료 처리하지 않는다. 완료 후 이 문서를 `status: done`으로 닫는다.

배포 전 읽기 전용 확인에서 Pages·Worker는 모두 `1ec16191abfc0b45bdf6ff1b4e02da26d23a0d2b`였다. 이 값은 이번 수정의 배포 증거가 아니다. 배포 시점의 최신 운영 버전도 기록한다. 회귀는 이번 수정 커밋만 revert하고, 운영 장애는 공식 rollback 모드의 pages_deployment_id / worker_version_id로 직전 양쪽 버전을 복원한다. 로컬 wrangler나 pages_only로 게이트를 우회하지 않는다.
