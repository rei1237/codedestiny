---
status: active
updated: 2026-09-02
next: PR #1460(PR-2) 머지 확인 후, 새 세션·새 워크트리에서 W1 나머지 중 하나(PR-3 권장)를 시작
---

# 전문가 상담 품질·진입 UX·PDF 전면 제공 (13 PR 계획)

## 왜

전문가 상담들의 (1) AI 콘텐츠+화면 품질 개선, (2) 진입 UI/UX 개선, (3) 유료 상담 전부에 결과 화면 [PDF 저장] 버튼(클라이언트 생성, 구매자 무료 부가 기능) 제공.

## 지금 상태

- 확정 계획 정본: `C:\Users\user\.claude\plans\goofy-leaping-curry.md` (13 PR + 후속 3, 축1 PDF / 축2 진입 UX / 축3 AI 품질). 사용자 승인 완료.
- **PR-1(nakshatra-ai ₩30,000 PDF) = PR #1451 머지 완료.**
- **PR-2(island-consult ₩20,000+₩5,000 PDF) = PR #1460 생성·CI 5/5 통과.** 머지는 사용자.
- 나머지 11 PR 전부 미착수.

## 남은 작업

- [ ] W1 잔여 4개: PR-3(tea-house 3 SKU) · PR-4(FPTI, 잠금 지뢰) · PR-A(랩 등록+드리프트) · E1(카피 추출 파이프라인)
- [ ] W2: E2(모달 전환, 대형) · E4(fusion 정본화) · PR-C(중복 검출) · PR-B(클램프 배선)
- [ ] W3: 축4 PR-6(문안 저작, 축4 소유) · E5(PaidValueSection+nakshatra) → E6(island)
- [ ] W4: PR-5(셸 saju AI PDF, i18n 11파일) → E3(잔재 키 청소, 백로그)
- [ ] W5(후속): PR-F(pdf.save→deliverPdf 앱 분기, 실기기 검증 필수) · PR-B2
- [ ] PR-1 브라우저 실측(실제 PDF 저장 1회) — 머지 후 스테이징에서. 판정: 커버+21섹션이 각자 새 페이지로 실리고 접힘 상태가 복원되면 끝.
- [ ] PR-2 브라우저 실측 — 리포트는 **'한 장씩' 모드로 둔 채** 저장해 13장(안내+12궁)이 전부 실리는지, 상담은 히어로 이미지가 안 실리는지. `PalaceBadge` 스프라이트가 캔버스에 비면 그건 알려진 허용 결함.
- 판정 기준: 각 PR 은 계획 문서의 해당 절 검증 목록 전부 통과 + 사용자 머지.

## 직렬 제약 (이것만 지키면 순서 자유)

1. PR-1 → E5 (같은 파일 `app/nakshatra/ai/NakshatraAiClient.tsx`)
2. PR-2 → E6 (같은 파일 `app/island-consult/IslandConsultClient.tsx`)
3. {PR-5, E3, 축4 PR-6} 상호 비병행 (`public/i18n` 11파일 공유)

## 정본 예시

배선 관용구: `app/destiny-compass/_components/ReportActions.tsx:38` · PDF 유틸: `lib/pdf/export-result-pdf.ts:146`

## 함정

- 전 검증 mock/정적 — 과금 LLM 실호출 0. PR-4 는 잠금 챕터 캡처 금지 3중 방어(계획 문서 PR-4 절).
- 축4 진행분(`docs/handoff/home-ux-audit-2026-09-01.md`)과 PR-5·PR-6·E1 이 겹친다 — 그 문서 먼저 읽을 것.
- copy.ts·NakshatraAiClient.tsx 등 nakshatra 파일과 `IslandConsultClient.tsx` 는 순수 CRLF — node 패치 스크립트로만 수정(2세션 연속 실전 확인).
- 🔴 **PR 마다 가드 자리를 실측할 것.** 계획서가 지목한 `verify:*` 가 (a) 소스를 안 읽거나 (b) `verify-guard-wiring` 에 미배선으로 선언돼 있으면 거기 얹은 단언은 CI 에서 영영 안 돈다. PR-2 가 그 경우여서(`verify:ziwei-island` = 엔진 전용 + 미배선) `__tests__/ui/*.static.test.js` 로 돌렸다 — `test:node` 가 글로브로 집어 pr-ci fast 잡(상시)에서 문다.
- 캡처 대상에 `sticky`/`backdrop-filter`/`transform` 이 있으면 `[data-export]` CSS 스위치가 필요하고(PR-1), 없으면 불필요하다(PR-2). 조상에 있는 건 상관없다 — html2canvas 는 캡처 노드의 서브트리만 그린다.

## 검증

```
npm run verify:nakshatra-ai-flow   # PR-1 가드(섹션 D 9단언 추가됨)
npm run test:node                  # PR-2 가드 포함(island-consult-pdf-export.static.test.js 9단언)
```

## 모르는 것

- 셸 PDF 미제공 잔여(sibyl-dominator·프롬프트 생성기류·vedic-astrology.html·pet-saju.html)는 사용자 확정으로 범위 제외 — 재론 시 사용자에게 물을 것.
