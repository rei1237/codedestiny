---
status: active
updated: 2026-09-09
next: "기존 워크트리에서 PR #1862의 최신 CI와 활성 sitemap 중첩을 확인한 뒤 나머지 93편 품질 감사를 이어간다."
---

# AdSense 승인 준비 인수인계

2026-09-09 KST. **전체 작업 미완료 / NOT READY**. 원고 편집·PR 검증 완료와 사이트 승인 준비 완료는 다르다.

## 위치와 전달 상태

- 작업 디렉터리: `D:\Development\cd-adsense-readiness`
- 브랜치: `codex/adsense-core-editorial-20260909`
- 활성 PR: https://github.com/rei1237/codedestiny/pull/1862 — Ready/open, 작성 시 GitHub 충돌 없음.
- 마지막 검증·푸시된 구현 SHA: `c4efc780b63b55c80e4fe72c55b78961af7c91ea`
- 구현 기준 main: `1f37e3634fa27c0fb7739f917af14e03eb643f9f`
- 이전 https://github.com/rei1237/codedestiny/pull/1859 는 다른 작업에서 머지됐다. 후속 PR의 base에 포함돼 있다.
- 이 문서 후속 커밋은 같은 PR에 푸시한다. 문서 커밋 SHA는 `git log -1 --format=%H -- docs/handoff/adsense-readiness-20260909.md`, 원격 HEAD는 `git ls-remote origin refs/heads/codex/adsense-core-editorial-20260909`로 확인한다. 이전 구현 CI를 새 문서 커밋의 CI라고 보고하지 않는다.

## 사용자 결정과 경계

- 승인 가능성·공개 페이지 평균 품질이 KPI이며 색인 수 확대가 아니다.
- 사용자는 인간 검수 글이 별도로 선별되지 않았다고 확인한 뒤 AI에게 20편 검토를 요청했다. **20편 AI 검토는 완료**했으므로 같은 일을 사용자에게 다시 떠넘기지 않는다.
- AI 편집을 박병하의 실제 검수라고 표시하지 않는다. `CONTENT_REVIEWS`는 0건. AI 검토만으로 광고 허용을 자동 등록하지 않는다.
- 커밋·푸시·PR·인수인계는 승인됐다. #1862 머지·운영 배포·AdSense 제출·계정 변경은 승인되지 않았다.
- 실 LLM·실결제·운영 DB를 테스트에 사용하지 않는다. mock·외부 네트워크 차단만 사용했다.

## 완료된 내용

1. #1859: HTML 형식과 인간 검수 분리, 임의 조회수·날짜 제거, 광고 허용 별도 판정, 허브 20편 읽기 경로, 홈·공통 신뢰 문구 정정. 글자 수 합격 기준을 진단값으로 바꾸고 빈 본문·허위 표시 검사는 유지했다.
2. #1862: **20편 AI 검토, 8편 재구성·12편 부분 수정**. 야자시·절입·시간 미상, 십성·용신, 숙요 날짜표, 자미두수 등급, 상승점·하우스, 타로 재회 해석의 오류·과장·반복을 정정했다.
3. 원고별 실제 수정일 2026-09-09, 발견·수정·출처·한계·본문 해시 기록. 본문이 바뀌면 고정 해시 검사가 재검토를 요구한다.
4. 검색 제목·설명과 본문 정합성, 영어 편집팀 Organization schema, 제목 표시 폭 사전 검사 추가.
5. sitemap **488 URL 유지**, 근거 없는 **14개 lastmod 생략**. 새 URL·대량 noindex·공개 글 삭제 없음. 생성 숙요 읽기 JSON 5개 해시 교체는 기사 URL 삭제가 아니다.
6. 결제·가격·이용권·월정석·인증·API·DB 스키마·계산 로직은 변경하지 않았다.

주요 파일: `app/insights/{methodology-articles,articles,adsense-ready-articles,seo-growth-articles,seo-titles,seo-descriptions}.js`, `lib/structured-data.ts`, `scripts/{generate-sitemap,build-editorial-review-packet,verify-editorial-manuscripts,verify-publisher-browser}.mjs`, `__tests__/ui/publisher-integrity.test.mjs` 및 생성 미러.

## SHA별 검증 근거

구현 SHA `c4efc780b63b`에서:

- `check:fast -- --plan`, `check:fast` 통과. 초기 Node 991개; 최종 main 통합 후 `ci:preflight`에서 **Node 998개, Jest 221 suites/2442개** 통과.
- `ci:preflight` **PASS**: mock 프로덕션 빌드·AdSense 산출물 검사·정적 검사·추가 paid-gate-suite **86/86** 포함.
- `ci:preflight -- --verify-receipt`: 당시 committed tree/main 일치. **문서 후속 커밋은 tree를 바꾸므로 이전 receipt를 최신 증거로 쓰지 않는다. 병합 전 stale이면 다시 실행한다.**
- `node --test __tests__/ui/publisher-integrity.test.mjs`: **11/11**.
- `node scripts/verify-editorial-manuscripts.mjs`: **20편** 해시·schema·검수/광고 미승격·14 날짜 생략·검색 제목 검사 통과.
- `node scripts/verify-publisher-browser.mjs`: **30 화면 조합** 통과. 390px 전체 20편+허브, 360/430/1280px 대표 3페이지. 외부 요청 차단, 광고 요청 없음.
- mock 실제 화면의 전체 본문·H1과 원고 소스 대조 **20/20**. 실기기 결제 검증은 아니다.
- `sync:public`, `sitemap:generate`, clean snapshot 미러 검사 통과.
- GitHub **10개 check runs 전부 success**, `CI required`, Pages/Worker 빌드, paid-flow-gates 포함. mergeable_state **clean**.
- [CI 실행](https://github.com/rei1237/codedestiny/actions/runs/34284059560), [유료 기능 CI](https://github.com/rei1237/codedestiny/actions/runs/34284059595).

로컬 로그: `build-cache/editorial-preflight-titles.log`, `build-cache/editorial-admission-final.log` (ignored, 원격 미포함). 원격 근거는 위 CI와 아래 보고서다. 문서 후속 HEAD의 검사는 PR에서 별도로 확인한다.

## 남은 일과 우선순위

1. **병합 게이트:** `delivery:admit -- --pr=1862`는 최신 preflight 영수증 stale 및 활성 작업 중첩으로 BLOCK이다. 2026-09-09 재조회에서 `origin/main`은 `feef3039345a`로 전진했고, `git merge-tree --name-only origin/main HEAD`는 `config/sitemap-lastmod.json`의 실제 병합 충돌을 확인했다. 관찰 브랜치 `codex/사주분석화면css문제`는 같은 lastmod와 `public/sitemap.xml`, `sitemap.xml`을 미커밋 변경 중이다. 다른 작업을 삭제/덮어쓰거나 게이트를 우회하지 않는다. 상대 작업 정리 후 최신 main 통합→생성기→검증을 순서대로 수행한다. GitHub 충돌 없음과 로컬 admission 통과는 별개다.
2. **남은 콘텐츠 감사:** 113 씨드 중 직접 검토한 것은 20편. 나머지 93편과 유명인·가이드·도구·다국어 품질 심사는 미완료. 기존 원장의 미확인 B를 저품질 확정으로 해석하지 않는다. GSC 클릭·노출·외부 링크·내부 의존성을 확인한 뒤 A/B/C/D를 결정한다. 데이터 미확인은 0이 아니다. 본문 존재만으로 A 승격하지 않는다.
   - 2026-09-09 1차 선별 감사는 `docs/adsense/review/AI-EDITORIAL-AUDIT-20260909-BATCH-01.md`에 기록했다. 숙요 2편·베다 1편·타로 1편에서 결과 보장처럼 읽히는 전통 해석, 출처 없는 비교·빈도·도상 주장, 성별 일반화 위험을 발견했다. 수정·해시·AI 편집 완료는 아직 아니므로 직접 검토 완료 수는 **20편**, 남은 편집 감사 대상은 **93편**으로 유지한다.
3. **광고 적합 심사:** 충분한 publisher content와 정책 적합성을 확인한 경로만 별도 판정. AI 편집·인간 검수·광고 허용은 각각 구분한다. 개인화·결제·입력·오류 화면에 광고를 자동 허용하지 않는다.
4. **ads.txt 불일치:** 공개 200·게시자 ID 일치에도 계정은 찾을 수 없음. 원인 미확정. 접근·리다이렉트·크롤/계정 재확인 상태를 조사한다. 200만으로 해결됐다고 보고하거나 재심사 버튼을 누르지 않는다.
5. **승인된 배포 이후:** 머지와 운영 승격 권한을 각각 확인한다. Pages `/version.json`과 Worker `/api/version` 같은 SHA, 전체 공개 URL·본문 렌더링·모바일·광고 경로를 재감사한다. 로컬/스테이징 결과를 운영 완료 증거로 대체하지 않는다.
6. **최종 점수:** 최초/운영 잠정 **67/100**, 전체 질적 심사 전 수치다. 20편 편집만으로 90점을 부여하지 않았다. 총점 ≥90, 콘텐츠 ≥27/30, 신뢰 ≥18/20, Index ≥14/15, Policy ≥9/10, Critical 0을 모두 충족해야 READY. 지금은 Critical 0을 선언할 수 없다.

## 계정·운영 관찰값 (재개 시 갱신)

- AdSense: 주의 필요 / 가치가 별로 없는 콘텐츠. 목록 갱신 2026-08-29 21:07 KST는 마지막 심사일로 확정하지 않았다.
- 게시자 `pub-9863227498729828`. 공개 파일 `google.com, pub-9863227498729828, DIRECT, f08c47fec0942fa0`. root/HTTP/www 최종 200 확인, 계정 인식 미해결.
- GSC 2026-06-07~09-06: 31클릭·391노출, 색인 276. 홈 21클릭·만세력 5클릭·숙요 유입 URL 보호. 외부 링크 관찰 2건 모두 홈. 페이지별 전체 데이터는 미확인.
- `ziwei-star-brightness` GSC 저장 crawl 2026-09-07 18:34:35 KST: smartphone, fetch/index 허용, self canonical, 실제 본문/H2 확인. 과거 빈 스니펫을 현재 장애로 단정하지 않는다.
- 기존 이동: `daewoon-vs-sewoon` → `daewoon-sewoon-reading-complete-guide`; `sukuyo-compatibility-rhythm-guide` → `sukuyo-compatibility-guide`. 정상 이동을 재삭제하지 않는다.
- 최초 URL 원장 599개, sitemap 488개 모두 HTTP 200. 전 원고 질적 심사 완료의 의미는 아니다.
- 마지막 프로덕션 Pages 관찰 SHA `8422192d9b7f15dd9bd4e2118d3bbdde3a7a85fb`. #1862 반영 확인 없음. 직전 main 스테이징 Pages/Worker는 모두 `1f37e3634fa27c0fb7739f917af14e03eb643f9f`였다. 최신 상태는 다시 조회한다.

## 보고서와 재개 명령

- [14개 항목 보고서](../adsense/README.md)
- [20편 수정 근거](../adsense/review/AI-EDITORIAL-REVIEW.md), [검토 화면](../adsense/review/index.html), [고정 AI 원장](../adsense/review/ai-editorial-reviews.json)
- [URL CSV](../adsense/baseline/urls.csv), [감사 요약](../adsense/baseline/summary.md), [모바일 검증](../adsense/browser-verification.json), [GSC 관찰](../adsense/search-console-observations.json)

워크트리는 자체 `node_modules`를 잠금 파일대로 설치했다. 공유 체크아웃 변경은 보존했다. 옛 mock 포트 24930/24931이 살아 있다고 가정하지 않는다. 필요하면 `node scripts/dev-with-local-auth.mjs`로 확인/재기동하고 실서비스로 폴백하지 않는다.

미머지 PR은 기존 워크트리에서 재개한다. `session:start`로 새 작업을 시작하거나 이 폴더를 제거하지 않는다. 머지·스테이징 성공 뒤 새로운 구현을 시작할 때만 해당 계약을 따른다.

```powershell
Set-Location 'D:\Development\cd-adsense-readiness'
Get-Content 'D:\Development\cd-adsense-readiness\docs\handoff\adsense-readiness-20260909.md'
git status --short
git branch --show-current
git log -1 --format=%H
npm run worktree:status
npm run delivery:admit -- --pr=1862
```

재개 지시: 위 디렉터리에서 이 문서를 읽고 `codex/adsense-core-editorial-20260909 / PR #1862`의 최신 HEAD·CI·활성 중첩을 확인한다. admission 차단 원인을 먼저 확정하고, 승인 없는 머지·배포 없이 나머지 93편 및 공개 유형별 품질 감사부터 이어간다. 병합 게이트 때문에 독립적인 콘텐츠 감사까지 멈추지 않는다.
