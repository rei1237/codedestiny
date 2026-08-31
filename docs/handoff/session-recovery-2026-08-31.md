---
status: active
updated: 2026-08-31
next: "§0 으로 로컬 main 을 맞춘다(🔴 §0 의 Remove-Item 목록이 3차 재측정에서 바뀌었다). §1·§2 는 §2-A 둘째 줄 하나만 남고 전부 닫혔다. §4·§5 는 2026-08-31 3차 재측정으로 갱신됐고 — 오늘 에이전트가 할 일은 없다. 가장 먼저 만기인 것은 §5 의 홈 CLS 재측정(2026-09-01~09-02)"
---

# 세션 복구 색인 (2026-08-31)

> 컴퓨터가 꺼지면서 진행 중이던 세션들이 통째로 날아갔다. 이 문서는 **그날 살아 있던 갈래를 실측으로 재구성한 색인**이다.
> 각 항목은 `이어받을 문서` + `첫 명령` + `끝났다고 볼 조건` 만 담는다. 상세는 항상 링크된 문서가 정본이다.
> 🔴 **한 세션 = 한 갈래.** 여러 개를 한 세션에 묶지 말고, 끝나면 그 갈래의 문서를 갱신하고 `/clear`.

🔴 **재측정 2026-08-31 (2차)** — 최초 작성 이후 PR #1373·#1374·#1375 가 머지되면서 §1 이 통째로 바뀌었다.
> 1-A(카카오페이)와 1-C(인증 CTA)는 **끝났다.** 지금 남은 것은 §2 의 문서 PR 3건과 §1-B 판단 하나뿐이다.

측정 시각 2026-08-31, 저장소 루트 `D:\Development\code-destiny`.
재현: `git fetch origin main && git worktree list && gh pr list --state open`

---

## 0. 모든 세션 공통 — 먼저 이것부터 (5분)

실측된 사실 셋:

- **로컬 `main` 이 `origin/main` 보다 뒤처져 있다** — 이 상태로 진단하면 **이미 머지된 수정을 미해결로 오진**한다. 🔴 뒤처진 커밋 수는 재측정할 때마다 늘어나므로 숫자를 인용하지 말고 `git fetch origin main` 후 `git rev-list --count main..origin/main` 로 직접 잰다(최초 작성 시점 28, 2차 재측정 시점에는 #1375 까지 더 벌어졌다).
- 열린 PR 은 그때그때 다르다 — `gh pr list --state open` 으로 직접 본다(최초 작성 시점 0건).
- 작업 트리에 **낡은 인수인계 사본**이 미추적으로 남아 `git merge --ff-only` 를 막는다. 🔴 **어느 파일인지는 재측정마다 바뀐다** — 아래 명령이 실제로 막는 파일을 스스로 찾는다.

```powershell
cd D:\Development\code-destiny
git fetch origin main

# 🔴 파일명을 외우지 말 것. 미추적인데 origin/main 에도 있는 것 = 낡은 사본이다.
git status --porcelain --untracked-files=all -- docs/handoff/
#   나온 파일마다: git show "origin/main:<경로>" 와 로컬 내용을 비교하고,
#   origin/main 쪽이 더 새것이면 로컬을 지운다. origin/main 에 없으면 유일본이니 지우지 말 것.

git merge --ff-only origin/main
```

🔴 **2026-08-31 3차 재측정 — 이 절의 옛 지시가 틀렸다.** 옛 판은 `reengagement-email-blocked-2026-08-28.md` 를 "origin/main 에 없는 유일본이니 지우지 말 것"으로 못 박았는데, 그 사이 `9d05ee11b` 가 **더 새 판(프론트매터 + 08-31 재실측 + 선결조건 절)을 커밋했다.** 그래서 로컬 사본은 낡은 것이 됐고, 지우지 않으면 ff-merge 가 그 파일에서 멈춘다(실제로 멈췄다). 반대로 옛 판이 "지우라"고 한 두 파일은 이미 정리돼 있었다. **파일명을 박아 두는 지시가 이 절에서 두 번 틀렸다.**

---

## 1. 머지되지 않은 코드 — 지금 이어서 끝낼 수 있는 것

### 1-A. 카카오페이 결제수단 배관 — ✅ 닫힘 (2026-08-31 재측정)

**PR #1375 로 머지됐다**(`2764a5cb3`). 워크트리 `portone-kakaopay-plumbing` 의 브랜치는 `origin/main` 과
`git diff` 가 비어 있다 — 즉 코드로 남은 일이 없다. 가드도 초록이다(`verify:checkout-pass-card` PASS ·
`verify:payment-freeze` region 4 · file 3, 2026-08-31 실측).

남은 것은 **PG 계약 → 시크릿 투입 → `enabled` 한 줄 플립** 뿐이고 전부 사용자 승인이 앞선다.
절차·함정·검증은 [kakaopay-golive-2026-08-31.md](kakaopay-golive-2026-08-31.md) 로 옮겼다.

- 워크트리 `.claude\worktrees\kakaopay-channel` 은 **자기 커밋 0건**(빈 껍데기). 정리 대상이다.

### 1-B. 간지 표면 패리티 하네스 — ✅ 닫힘 (2026-08-31, 브랜치 폐기)

**되살릴 가치가 없다고 판정하고 폐기했다** — 로컬 브랜치 `feat/ganji-surface-parity-harness`(마지막 `50f58eae4`) 삭제 + 워크트리 `worktree-korean-calendar-core` 제거. 원격에는 애초에 없었다(`git ls-remote --heads origin | grep ganji` → 0건).

판정 근거는 전부 내용 대조 실측이다. **브랜치에 main 에 없는 코드는 0줄이었다.**

| 브랜치가 갖고 있던 것 | `origin/main` 대조 |
|---|---|
| `973d8e4d0` wip — `scripts/lib/kst-clock.mjs` · `scripts/lib/shell-ganji-harness.cjs` · `scripts/lib/ziwei-engine-harness.cjs` | **세 파일 모두 바이트 동일** (`git diff origin/main <브랜치> -- <세 파일>` 출력 0) |
| `50f58eae4` stdout 절단 수정 | **이미 main 에 있다** — `verify-ganji-surface-parity.mjs:284` · `verify-shell-korean-calendar.mjs:149` 의 `await new Promise((resolve) => process.stdout.write(..., resolve))` 와 진단 문구의 `parseError` 까지 전부 |
| 미커밋 3줄 | **주석 한 문단뿐**이고, 살리면 안 되는 값이었다(아래) |

- `da383b755`(PR-B)는 #1231 로 스쿼시 머지돼 SHA 만 다르다.
- main 쪽 가드는 그 사이 더 커졌다 — 2026-08-31 실행 `npm run verify:ganji-surface-parity` → **통과 검사 66건 · 표본 1645건 · 표면 13벌 · TZ 6종**(브랜치 시절은 37건 / 1516건 / 12벌). 배선도 살아 있다: `package.json:364` + `.github/workflows/pr-ci.yml:362`.
- 🔴 **미커밋 3줄은 자식 봉투 크기를 "약 250KB"에서 "189,173 bytes"로 못 박는 주석이었다.** 오늘 실제로 재니 **323,629 bytes** 다(`CD_GANJI_SURFACE_PROBE=1 node scripts/verify-ganji-surface-parity.mjs` 의 stdout, 표본 1645건). 표본 수를 따라 움직이는 값이라 어느 쪽을 박아도 곧 틀린다 — main 의 주석은 이 PR 에서 **날짜와 재현 명령을 단 실측**으로 고쳤다. 주석이 실제로 지키는 것은 "64KB 파이프 버퍼를 훌쩍 넘는다"이고 그건 세 값 모두에서 참이다.
- 상위 맥락은 [ganji-wallclock-parts-migration.md](ganji-wallclock-parts-migration.md) 이며, 그 문서에 남은 것은 이 브랜치와 무관한 **별건-3(MongoDB 박제 간지 값 — 결제 문서라 사용자 판단 대기)** 하나뿐이다. [korean-calendar-migration-2026-08-27.md](korean-calendar-migration-2026-08-27.md) 의 `status: blocked` 는 KASI 절기 프레임 대조 갈래라 이것과 별개다.

### 1-C. 인증 CTA 재디자인 — ✅ 닫힘 (2026-08-31 재측정)

이 절의 "소실, 복구 불가" 판정은 **틀렸다.** 판정 직후 같은 워크트리에서 작업이 다시 진행돼
**PR #1374 로 머지됐다**(`c3c5fedd7`, 달빛 Primary + 꽃잎 Ghost 2세트). 워크트리
`auth-cta-luxe`·`auth-cta-redesign` 은 이제 정리 대상이다.

🔴 교훈: "워크트리에 커밋이 0건"은 **그 시각의 스냅샷일 뿐** 갈래가 죽었다는 증거가 아니다.

---

## 2. 머지되지 않은 문서 업데이트

### 2-A. 🔴 같은 파일을 고치는 미머지 문서 커밋 2건 (충돌 주의)

둘 다 `docs/handoff/human-design-report-generation-fix.md` **한 파일만** 고치는데 서로 다른 내용이다. 순서대로 처리하지 않으면 한쪽이 사라진다.

| 브랜치 | 커밋 | 내용 | origin/main 기준 |
|---|---|---|---|
| ~~`docs/db-teardown-remeasurement`~~ | `e3dfb2104` | 프로덕션 계측 판독 4값과 `clampTimeoutMs` 하한 인하 **확정 기각** | ✅ **머지됨 — PR #1379** (2026-08-31 3차 재측정) |
| `worktree-handoff-fortune-security-audit` | `70f924002` (+18/-5) | `/api/fortune` 보안 계층 판정 + **한 번도 켜진 적 없는 rate limit** 기록 | 46 커밋 뒤 (리베이스 필요, 2026-08-31 재측정) |

```powershell
# 먼저 뒤처지지 않은 쪽부터
cd D:\Development\code-destiny\.claude\worktrees\guardian-rate-limit-wiring
git log -1 --stat
gh pr create --base main --fill
# 머지된 뒤에 두 번째
cd D:\Development\code-destiny\.claude\worktrees\handoff-fortune-security-audit
git fetch origin main; git rebase origin/main   # 충돌 나면 두 판을 손으로 합친다
```

🔴 `e3dfb2104` 의 판독은 **`rttMs` n=1** 이다. "266이 정상값"으로 인용하지 말 것(인하 기각 근거로는 충분 — 예산 300 대비 여유 34ms).

### 2-B. 휴먼 디자인 / DB 병목 갈래는 사실상 닫혔다

[docs/handoff/human-design-report-generation-fix.md](human-design-report-generation-fix.md) 의 `next` 는 "teardown 을 임계 경로에서 빼는 PR" 을 가리키는데, 그건 **PR #1372 로 이미 머지됐다**. 2-A 를 올리면 이 문서는 닫힌다.

[docs/handoff/mongo-collscan-and-cache-2026-08-30.md](mongo-collscan-and-cache-2026-08-30.md) 도 마찬가지 — 마지막 미확인 항목(결제 직후 정합성)이 **PR #1369 로 머지됐다.**

🔴 **위 문단의 옛 서술("종결 커밋이 `origin/main` 에 없으니 `docs/handoff-mongo-cache-verified` 브랜치를 올려라")은 틀렸다**(2026-08-31 정정).
`aec5900e6` 의 내용은 PR #1358(`48c15fdcc`)로 이미 머지됐고, 그 뒤 PR #1365 가 결제 직후 무효화 구멍을
**새 항목으로 열면서** `status` 를 `active` 로 되돌린 것이다. 그 브랜치를 그대로 올렸으면 그 구멍의 기록이 지워졌다.
맞는 조치는 프론트매터만 다시 `done` 으로 내리는 것이고, **이 문서와 같은 PR 에서 처리했다 — 2-B 의 mongo 갈래는 닫혔다.**

### 2-C. 커밋되지 않은 유일본 1건 — ✅ 해소

[docs/handoff/reengagement-email-blocked-2026-08-28.md](reengagement-email-blocked-2026-08-28.md) 를 커밋했다(`status: blocked`). 이탈 유저 재방문 이메일이 **"안 했다"가 아니라 "지금 구조에서는 0명에게 발송된다"** 는 착수 불가 진단서다. 착수하려면 §3-B 의 메일 축 복구가 먼저다.

---

## 3. 오늘 밤~내일 아침에만 확인 가능한 것 (시각 의존)

두 갈래 모두 **2026-09-01 07:00 KST(= 08-31 22:00Z) 크론**이 판정 시점이다. 그전에는 코드를 고칠 근거가 없다.

### 3-A. 텔레그램 SNS 일일 자동 발행

- 문서: [docs/handoff/marketing-automation-2026-08-28.md](marketing-automation-2026-08-28.md) · 계획 `C:\Users\user\.claude\plans\gleaming-yawning-lynx.md`
- 확인: `GET /api/admin/sns-daily-post/status` 에 `2026-09-01 success` + `t.me/Codedestinyofficial` 새 글.
- 있으면 문서를 `status: done`. 없으면 Cloudflare 대시보드 Workers Logs 에서 `[CRON] SNS Daily Post` 사유를 읽는다.

### 3-B. 일일 운세 메일 Resend 403

- 문서: [docs/handoff/fortune-email-resend-403-2026-08-31.md](fortune-email-resend-403-2026-08-31.md)
- 판정: 텔레그램 실패 알림이 **오면** 그 사유가 곧 원인. **안 오고 발송도 0이면** 크론 이벤트가 핸들러에 도달하지 않는 것 — 조사 방향이 완전히 갈린다.

---

## 4. 사용자(사람)가 해야 진행되는 것

에이전트가 대신 못 한다. 각 항목의 문서에 절차가 있다.

> 🟢 **2026-08-31 재측정 — 이 표의 두 항목은 이미 끝나 있었다.** 프로덕션 승격도, AAB 40 빌드도
> 08-30 밤에 됐다. 아래 "실측" 열을 먼저 보고 남은 것만 하면 된다. 근거는 §4-실측 절.

| 할 일 | 문서 | 실측 (2026-08-31) |
|---|---|---|
| **Play 업로드** — versionCode 40 AAB | [android-web-sync-2026-08-29.md](android-web-sync-2026-08-29.md) | 🔴 **남음.** 빌드는 이미 끝났다 → `Desktop\CodeDestiny-Build\20260830-2147-1.0.40-40-f746f878d\`. `_전부하기.ps1` 을 **다시 돌릴 필요 없다.** 빌드로그는 "인앱 상품 가격을 먼저 내린 뒤 업로드"라고 남겼다 |
| 유명인 12명 **라이브 검수** → 문제 인물은 `reviewedAt` null 로 되돌리기 | [growth-plan-2026-08-30.md](growth-plan-2026-08-30.md) | 🔴 **남음.** 이후 AdSense 재신청은 **2026-09-14 이후** |
| 기기(1.0.38)에서 로그인 후 30분 뒤 콜드부팅이 로그아웃되지 않는지 | [app-social-login-return-path-2026-08-30.md](app-social-login-return-path-2026-08-30.md) | 🟢 **선결조건 충족** — PR #1309(`62d9e0688`)가 라이브에 있다. 기기 확인만 남음 |
| `release-signing.properties` versionCode 41 올리기 + 기기 확인 | [tea-house-perf.md](tea-house-perf.md) | ⏳ **40 이 Play 에 올라간 뒤.** 현재 값은 40(스크립트·프로퍼티 양쪽) |
| ~~프로덕션 재승격 (데스크톱 TBT)~~ | [desktop-tbt-2026-08-29.md](desktop-tbt-2026-08-29.md) | ✅ **이미 됐다.** 아래 §4-실측 |

### §4-실측 — 프로덕션은 무엇을 서빙하고 있나 (2026-08-31)

이 문서가 "미검증"으로 남겼던 항목이다. 실제로 읽었다.

```
curl -s https://code-destiny.com/version.json   → gitSha 1e747a9e5… · buildTime 2026-08-30T17:59:02.847Z
curl -s https://code-destiny.com/api/version    → gitSha 1e747a9e5… (Pages·Worker 일치)
```

- 승격은 **2026-08-30T17:53:53Z 의 `workflow_dispatch` 런 33326529095**(성공) 하나다. 그 뒤로는 수동 승격이 없다 — 최근 릴리스 런 60개 중 `workflow_dispatch` 는 이것뿐이고 나머지는 전부 `push`(머지 → 스테이징)와 `schedule`(워치독)이다.
- 라이브 `1e747a9e5` 에 **이미 들어 있는 것**(`git merge-base --is-ancestor` 로 확인): PR #1295 `f7fec876e`(데스크톱 TBT) · PR #1309 `62d9e0688`(앱 소셜 로그인 복귀) · PR #1288 `23b557904`(홈 CLS) · PR #1307 `ea8b63cae`(`home_section_click` 계측).
- 🔴 **그래서 §5 의 두 시계는 08-30T17:59Z 에 시작됐다** — 아래 §5 의 만기일이 그 계산이다.
- 프로덕션이 main HEAD(`58bdb8e41`)보다 28 커밋 뒤인 것은 정상이다(CLAUDE.md 절대규칙 3).

**PSI 판정** — `npm run perf:psi:audit` (2026-08-31, `https://code-destiny.com`, n=1):

| | 모바일 | 데스크톱 |
|---|---:|---:|
| Performance | 69 | 62 |
| TBT (ms) | 263 | **1403** |
| LCP (ms) | 4276 | 1281 |
| FCP (ms) | 3041 | 635 |
| CLS | 0.000 | 0.002 |

- 데스크톱 TBT 는 문서가 기준으로 삼은 **1,730ms → 1,403ms**. 수정은 라이브에서 실제로 먹었지만 **예산 300ms 의 4.7배**라 갈래는 안 닫힌다.
- 🔴 **n=1 랩 측정이다.** PSI 는 실행마다 흔들리므로 "327ms 개선"을 확정 수치로 인용하지 말 것. 그리고 CLS 는 랩값이라 필드 CLS 를 대체하지 못한다([[staging-cwv-hides-ad-driven-cls]]) — §5 의 재측정은 여전히 필요하다.
- 미해결로 새로 드러난 것: 모바일 LCP 4,276ms · FCP 3,041ms(양쪽 예산 초과), 미사용 JS 244KiB · CSS 73KiB.

---

## 5. 관측 대기 — 🔴 여기에 코드를 쌓지 말 것

| 갈래 | 재측정 시점 | 문서 |
|---|---|---|
| GSC "발견됨 - 미색인" CSV 재수집 | **2026-09-20 전후** — 🔴 그전까지 색인 목적의 코드 작업을 새로 쌓지 않는다(사용자 결정 2026-08-30) | [gsc-index-coverage-2026-08-30.md](gsc-index-coverage-2026-08-30.md) |
| 홈 CLS 재측정 (Cloudflare Web Analytics) | 🔴 **2026-09-01 ~ 09-02** — 승격(08-30T17:59Z) +2~3일. 가장 먼저 만기 | [home-cls-and-brand-seo-2026-08-29.md](home-cls-and-brand-seo-2026-08-29.md) |
| GA4 `home_section_click` 유입 확인 후 A/B 설계 | **2026-09-06 전후** — 계측 PR #1307 이 프로덕션에 나간 08-30T17:59Z +1주 | [home-funnel-attribution-2026-08-30.md](home-funnel-attribution-2026-08-30.md) |

만기일은 §4-실측의 배포 시각에서 계산했다. 세 갈래 모두 **오늘(2026-08-31) 할 일이 없다.**

---

## 6. 새로 착수할 수 있는 백로그 (급하지 않음)

1. **GSC 실적 갈라내기** — 노출 0인 사이트맵 340개(77.4%; /fortune 92 · /insights 84 · /stories 45)를 "색인됐는데 무검색" vs "색인 대기"로 분리. [gsc-performance-2026-08-30.md](gsc-performance-2026-08-30.md)
2. **홈 퍼널 이벤트 계측 P4** — `docs/code-destiny-audit.md` §5 P4. P1·P2 완료, P3 는 이미 끝나 있었다. [home-positioning-2026-08-30.md](home-positioning-2026-08-30.md)
3. **SEO 신규 콘텐츠 §1 I 의 P1~P3** — §2 는 2026-08-30 에 닫혔다. [seo-content-expansion-roadmap.md](seo-content-expansion-roadmap.md)

그 외 `status: active` 인 오래된 문서(로케일·INP·결제 렌더러 통일 등)는 전부 `docs/handoff/` 프론트매터의 `next:` 한 줄에 착수점이 있다. 전체 목록:

```bash
git ls-tree -r --name-only origin/main -- docs/handoff/ | grep '\.md$' | while read -r f; do
  git show "origin/main:$f" | awk 'NR==1&&/^---$/{f=1;next} f&&/^---$/{exit} f' \
    | grep -E '^(status|updated|next):' | tr '\n' ' '; echo "  <- $f"
done | sort -r
```

---

## 이 문서가 확인하지 않은 것 (미검증)

- ~~프로덕션이 현재 어느 커밋에 서 있는지~~ — 🟢 **2026-08-31 에 실측했다. §4-실측 절 참조**(라이브 `1e747a9e5`, 승격 08-30T17:53Z). 문서의 "TBT 재승격 필요"는 그 시점에 이미 틀린 진술이었다.
- 워크트리 24개 중 §1·§2 에 나오지 않은 것들은 전부 "자기 커밋이 origin/main 에 이미 있음"으로 판정했다. 판정 방법은 커밋 제목의 `origin/main` 로그 대조 + 대표 문자열 `git grep` 이며, 스쿼시 머지로 제목이 바뀐 경우 오탐 여지가 있다.
- 🔴 **2026-08-31 2차 재측정에서 그 오탐이 실제로 있었다.** 08-29 이후 브랜치 106개를 `git cherry` 로
  훑으면 41개가 미머지로 보이는데, **패치 id 는 스쿼시 머지에서 전부 깨지므로 그 41개는 거의 다 위양성이다**
  (`worktree-auth-cta-luxe`·`worktree-portone-kakaopay-plumbing` 도 머지됐는데 "+"로 나왔다).
  믿을 수 있는 판정은 **내용 대조** 하나뿐이다 — 브랜치 고유 커밋이 만진 파일을 골라
  `git show origin/main:<파일>` 과 `git show <브랜치>:<파일>` 을 문자열로 비교하고,
  `public/**`·`sitemap.xml`·`config/sitemap-lastmod.json` 은 리베이스마다 흔들리므로 제외한다.
  그 방법으로 §2 의 3건 + §1-B 만 실제 미머지로 남았고, `docs-sns-first-post-confirmed` ·
  `docs/handoff-reviewed-at-live` · `worktree-neo-method-card-detail` 은 **내용이 이미 main 에 있었다**.
  `worktree-telegram-sns-observability` 는 반대로 **브랜치 쪽이 더 낡았다**(올리면 퇴행).
