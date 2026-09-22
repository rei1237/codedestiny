---
status: active
updated: 2026-09-22
next: "운명의 찻집·네오 완료 결과의 공유 요약 어댑터부터 구현하고, 상담군별 검증 표를 채운다."
---

# 경쟁사 대비 전환·신뢰·SEO·상담 공유 후속 작업

## 사용자 지시와 완료 경계

경쟁 서비스 포스텔러·청월당·점신과 비교해 부족한 구매 전환·SEO·UI/UX를 계속 보완한다. 10년 경력 상담사·명리학자 **네오**가 만든 서비스와 대통령 예측 기록을 적극 활용한다. 모든 상담 결과를 공유에 특화하되 영냥이를 우선한다. 너무 길어지면 다른 세션이 바로 이어갈 수 있는 문서를 남긴다. 전체 목표는 아직 완료가 아니다.

상담사 이름·원문 링크·게시일을 사용자에게 다시 묻지 않는다. 이미 정본 `lib/brand/prediction-records.json`에 있으며 세 글 모두 이번에 모바일 네이버 블로그에서 직접 읽었다. 사용자의 명시 요청으로 `C:\Users\user\.codex\memories\extensions\ad_hoc\notes\20260922-231700-neo-founder-prediction-records.md`에 기록했다. 승인된 개선 범위는 재확인하지 않는다. 실결제·유료 LLM·운영 DB 쓰기·메시지 발송·운영 승격은 이번 승인에 포함하지 않는다.

## 현재 작업 위치와 전달 상태

- 원본: `D:\Development\code-destiny` · main.
- 동시 세션의 `marketing/**` 미커밋 변경 때문에 `scripts/create-safe-worktree.ps1`로 격리했다. 원본 마케팅 변경은 수정·stage·commit하지 않았다.
- 이번 코드: `8adca602b` 신뢰/SEO, `9d15a1ded` 영냥이 공유.
- 계획 포함 main push: **`74413af4c3bf1228f4b86f10ae5c1a9ce2e6f6d2`**. 원본 main에 ff 병합하고 push 완료.
- 공식 코드 CI: [35739650623](https://github.com/rei1237/codedestiny/actions/runs/35739650623). 아래 전달 결과 절을 우선 확인한다.
- 이후 다른 세션의 가격 작업 `346557ba1`이 병합된 main `4da547fce131435c4becea53962ac40752c644c5`를 ff로 수용했다. 이번 개선에서 가격 정책을 바꾼 것으로 혼동하지 말고 다른 세션의 커밋을 보존한다.
- 전략과 상세 근거: `D:\Development\code-destiny\docs\conversion-sharing-plan-20260922.md`.

## 구현된 내용

1. `lib/brand/founder.ts`, `app/components/FounderTrust.tsx`, 대응 CSS: 경력·공개 예측 게시일·원문·AI 해설과 제작자의 역할을 한곳에서 관리한다.
2. `app/yeongnyangi/_original/FortuneHome.tsx`, `app/page.js`: 첫 화면 경력과 가격, 공개 기록 링크, 구매 전 상담 예시 링크, SEO 설명을 개선했다. 현재 실제 루트는 영냥이 React 홈이다. ARCHITECTURE/SEO 상세 문서의 오래된 ‘루트는 index.html’ 문장을 그대로 따르지 말고 최신 CLAUDE와 실제 빌드 경계를 확인한다.
3. `app/yeongnyangi/1000-won-fortune/page.tsx`: 신뢰 자료와 영냥이 OG 이미지, 본문과 일치하는 설명. URL·canonical·색인 정책·가격 registry 유지. sitemap lastmod 2개 경로 갱신.
4. `app/yeongnyangi/_lib/result-share.ts`: 28개 상품·신점·호라리의 공개 재진입 URL, 허용값만 들어가는 공유 UTM, 무료 요약 어댑터, 짧은 문구 1080×1080 큰 글씨 이미지.
5. `ResultSharing.tsx`, `FreeFortune.tsx`, `Result.tsx`, `SpiritResult.tsx`: 무료·유료·질문형 결과에 공유 편집기. 질문 기본 제외, 문구 편집·180자 줄이기, 카카오·네이티브·문구 복사·이미지 공유/저장, 취소/실패 안내, 기존 익명 소개에 공개 링크 추가.
6. `fortune_share_action`: 기존 동의 기반 `trackEvent`를 통해 채널/상태만 전달. 결과 본문·질문·주문 ID·프로필 미포함. `opened/shared`는 수신자 전달 증거가 아니다.

## 실제 검증과 한계

- `node --test __tests__/ui/yeongnyangi-result-share.test.mjs`: 8/8. 28개 상품마다 URL 검사. 모든 상품의 실제 기기 전송을 28회 했다는 뜻은 아니다.
- `YEONGNYANGI_TEST_BASE=http://127.0.0.1:14122 node scripts/verify-conversion-sharing.mjs`: 390·1280 × 홈/SEO·무료·신점·호라리 = 8 시나리오. 외부 네트워크/API fail-closed mock.
- 같은 base로 `node scripts/verify-yeongnyangi-result-sharing.mjs`: 360·390·430·1280 모두 통과. 이미지·문구·카카오 mock·취소·클립보드 거부·불완전 결과 숨김.
- 실제 화면을 배치로 확인하고 짧은 카드 글씨/편집기 여백을 한 번 수정한 뒤 재확인. 추가 무한 폴리싱 금지.
- 스크린샷·검사 로그는 `D:\Development\code-destiny\build-cache\conversion-sharing-20260922\`에 복사해 보존했다. `conversion-sharing/home-390.png`, `home-1280.png`, `daily-390.png`, `trust-390.png`와 유료 공유 크기별 이미지가 있다. 이 경로는 이번 작업의 명시적 검증 산출물이며 전체 reports/archive 검색과 무관하다.
- `check:fast` 자동 승격 paid suite 88/88, lint 통과. TypeScript의 `navigator.share` 존재 조건에서 중단했으며 `typeof ... === 'function'`로 수정하고 `npm run typecheck` 재실행 통과. 원래 check:fast 전체 실행을 성공으로 적지 않는다.
- `npm run test:node`: 1,587/1,587. `verify:doc-freshness`, 최종 `verify:sitemap-drift` 통과.
- Impeccable 변경 UI 기계 탐지 결과 `[]`. 사이트 전체 WCAG 점수나 성능 실측은 아님.
- 실제 고객 전환율·검색 순위·매출·수신자 반응·카카오 실기기 전송은 미측정. 운영 반영 전 코드 전달이며 실결제·LLM·운영 쓰기·SNS 게시 0회.

## 다음 구현 순서: 기존 상담군 공유

첫 단위는 **운명의 찻집 + 네오의 요약 공유**로 잡는다. 기존 결과/결제 상태는 건드리지 말고 완료된 결과 표시 위치에 얇은 공유 어댑터를 붙인다. `js/share-service.mjs`의 채널·취소·실패 동작을 재사용한다. 개인 결과 주소를 `ShareWidget`에 넘겨 noindex를 풀지 않는다.

| 대상 | 확인한 위치·상태 | 다음 행동 |
|---|---|---|
| 찻집 전체 모드 | `src/features/fortune-tea-house/components/TeaHouseResultSheet.tsx` 634 근처 텍스트 저장, 하단 resultActions. `synthesis.summary`, `closingLine`, 선택 찻잔의 구조가 있음 | 선택한 한 줄+현실 조언+연이 이미지. `questionSummary`는 자동 포함하지 말 것. `FortuneTeaHousePage.tsx`의 완료·저장 상태에서만 공유 노출 확인. |
| 네오 | `src/features/neo-war-room/NeoOperationRoomResultPage.tsx`: `isGenerating`, `isFailed`, `session.status`, `ResultSummaryCover`, 하단 actionBar | `frontlineSummary` 또는 refined verdict/첫 실행을 사용자가 선택·수정. 완료 전/실패 공유 숨김. 로컬 `?neoPreview=briefing|refined|loading` 미리보기 재사용. 네오 인물과 영냥이/연이 자산을 혼용하지 말 것. |
| 기존 셸 사주·타로·점성술·숙요·자미두수 | `js/share.js`에 개별 `share*Kakao`, `cdBuildShareUrl`, `cdShareFortuneKakao`, `cdShareResultCardImage` 있음 | 실제 호출부와 공개 진입부터 테스트. `cdShareFortuneKakao`는 공용 선언 외 사용 범위가 제한적. 공유 보상/리퍼럴 정책이나 인증 API를 임의 변경하지 말 것. |
| 운명 나침반 | `app/destiny-compass/_components/ReportActions.tsx`는 `DeferredShareWidget` 사용 | 소개 링크와 실제 결과 요약의 차이를 확인하고 어댑터 적용. |
| 개별 AI 결과 | 아래 목록 | 저장된 결과 스키마와 완료 상태를 읽은 뒤 모듈별 어댑터·회귀 케이스 작성. 일괄 DOM 텍스트 캡처 금지. |

개별 AI 결과 확인 대상(파일 존재 확인, 공유 동작 미검증):

- `app/life-book-ai/result/LifeBookAiResultClient.tsx`, `_components/ResultActionDock.tsx`
- `app/love-secret-ai/result/LoveSecretAiResultClient.tsx`
- `app/master-love-codex/result/MasterLoveCodexResultClient.tsx`
- `app/karma-destiny-ai/result/KarmaDestinyAiResultClient.tsx`
- `app/astrology-ai/result/AstrologyAiResultClient.tsx`
- `app/vedic-ai/result/VedicAiResultClient.tsx`
- `app/nakshatra/result/NakshatraResultClient.tsx`, `lord-report/LordReportClient.tsx`, `compat/CompatResultView.tsx`
- `app/naming-ai/result/NamingAiResultClient.tsx`
- `app/human-design/report/HumanDesignReportClient.tsx`
- `app/palm-reading/PalmReadingRouteClient.tsx`
- `app/fusion-fortune/FusionResultDock.tsx`, `FusionResultThread.tsx`
- `app/components/ziwei/ZiweiConsultation.tsx`, `app/components/expert-consulting/ExpertConsultationFrame.tsx`
- 수호신 `app/fortune-chat/GuardianShareButton.tsx`와 기존 결과 스냅샷 공유는 별도 권한 계약이 있으므로 그대로 보존하고 먼저 검사한다.

기능 키별 체크 표를 만들고 ‘문구·이미지·공개 URL·취소·실패·개인정보·완료 상태’를 통과한 것만 완료로 표시한다. 모든 상담 적용은 아직 완료하지 않았다. 무료 호라리는 결과 대신 프롬프트를 주는 별도 흐름이라 이번 무료 결과 공유 적용 대상으로 세지 않는다.

## 구매·SEO 후속

- 고민별 홈 진입 → 상품 구성/예시 → 가격 → 결과 재열람을 실제 첫 방문자로 검증한다. 기존 고민 버튼·상품·pricing registry를 재사용하며 새 혜택이나 후기를 만들지 않는다.
- `docs/handoff/google-seo-rebuild-20260921.md`의 12개 핵심 랜딩·동일 URL 28일 측정을 이어간다. 색인 확대/삭제, 얇은 페이지 양산, 공유 결과의 공개 색인을 임의 시행하지 않는다.
- 편집 원칙과 재사용 가능한 마케팅 문구는 계획 문서에 있다. 외부 게시 승인으로 해석하지 않는다.

## 전달 결과

코드 `74413af4c3bf1228f4b86f10ae5c1a9ce2e6f6d2`의 main push와 공식 `CI required` 통과를 확인했다(35739650623). Risk tier·Static guards·Critical checks·Build Pages and Worker·Typecheck and lint 모두 성공이다. 이후 다른 세션 main 변경을 보존하고 이 인수인계만 별도 커밋한다. 운영 승격은 하지 않았다.

로컬 QA 서버는 종료했고 스크린샷·검사 로그는 원본의 `build-cache/conversion-sharing-20260922/`에 보존했다. 다음 세션은 원본 main에서 시작하고, 동시 세션이 있으면 새로운 safe worktree를 만든다. 기존 작업용 워크트리나 실행 중인 서버가 남아 있다고 가정하지 않는다.

## 복사해서 재개

```text
D:\Development\code-destiny에서 D:\Development\code-destiny\docs\handoff\conversion-sharing-20260922.md와 D:\Development\code-destiny\docs\conversion-sharing-plan-20260922.md를 읽어라. main의 74413af4c3bf1228f4b86f10ae5c1a9ce2e6f6d2 포함 여부와 다른 세션의 미커밋 변경을 확인하고 보존하라. 찻집·네오 완료 결과의 요약 공유 어댑터 구현부터 이어가라. 네오 활동명·기존 대통령 예측 링크·게시일은 다시 묻지 말고 정본과 원문을 읽어라. 실결제·유료 LLM·운영 DB 쓰기·메시지 발송·운영 승격 없이 mock 검증하고, 작은 커밋 단위로 main push와 CI까지 진행하라.
```
