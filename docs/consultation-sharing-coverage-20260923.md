---
status: active
updated: 2026-09-23
next: "기존 셸 공유와 개별 AI 결과의 요약 어댑터를 실제 결과 경로별로 확장한다."
---

# 상담 결과 공유 적용 현황

전체 목표는 모든 상담 결과의 공유 개선이다. 공용 컴포넌트가 있다는 이유만으로 미연결 결과를 완료로 세지 않는다. 아래 상태는 코드·mock 검증 범위이며 실기기 카카오 전송, 운영 적용, 바이럴·구매 성과는 별도다.

## 2026-09-23 찻집·네오 적용

`components/fortune/ConsultationShare.tsx`가 요약 선택·360자 편집·180자 줄이기·카카오·네이티브·복사·이미지 공유/저장을 제공한다. `lib/consultation-sharing.ts`가 저장된 결과의 허용 필드만 선택하고, 브랜드별 기존 자산과 공개 진입 URL을 정한다. 결과 원문·출생정보·질문·세션 ID를 URL/분석 이벤트에 넣지 않는다. 요약 문장 자체에 개인적인 내용이 있을 수 있어 전송 전 확인·편집을 안내한다.

| 기능 키 | 결과 변형 | 소스 연결 | 상태 |
|---|---|---|---|
| `fortune-tea-house-tarot-consultation` | 타로 3카드 | `TeaHouseResultSheet` → `teaHouseShareChoices` | 저장된 요약·행동·마지막 말 공유 |
| `fortune-tea-house-tarot-five-consultation` | 타로 5카드 | 동일 결과 시트, 별도 mock 스프레드 | 저장된 요약·행동·마지막 말 공유 |
| `fortune-tea-house-saju-consultation` | 사주 | 동일 결과 시트 | 저장된 요약·행동·마지막 말 공유 |
| `fortune-tea-house-saju-compatibility-consultation` | 사주 궁합 | 동일 결과 시트 | 원문 질문·상대 프로필 자동 첨부 없음 |
| `fortune-tea-house-sukuyo-compatibility-consultation` | 숙요점 궁합 | 동일 결과 시트 | 원문 질문·상대 프로필 자동 첨부 없음 |
| `neo-operation-room-consultation` | 사주·베다·자미두수·점성술 | `NeoOperationRoomResultPage` → `neoShareChoices` | 완료 브리핑·저장된 최종 명령서 공유. 생성 중/실패/진행 중 수정본 숨김 |

기능 키 정본: `src/features/fortune-tea-house/data/consultPricing.ts`, `src/features/neo-war-room/NeoOperationRoomPage.tsx`의 `FEATURE_KEY`. 가격은 공유 UI에 새로 하드코딩하지 않는다.

찻집은 기존 완료/재열람 경로에 도달한 `TeaHouseResultSheet`에서 `resultId`가 있는 원본 필드만 사용한다. 부분 저장 섹션에는 붙이지 않았고 sanitize가 만든 빈 내용 대체문을 공유하지 않는다. 네오는 `status=completed`, 실제 저장된 `refinedOrder`만 사용한다. `pendingRefinedOrder`와 질문·realityCheck 입력은 선택 목록에서 제외한다. PDF·꿀방울·사자 휘장 권한과 결과 생성/저장/재열람은 그대로다.

## 검증 명령과 범위

- `node --test __tests__/ui/consultation-sharing.test.mjs`: 7개 테스트. 찻집 정본 5개 상품, 네오 4개 체계, 완료/실패/진행 상태, 비공개 필드 제외, URL 허용값, Unicode 길이 제한.
- 로컬 Next 서버를 `NEXT_PUBLIC_API_BASE_URL=https://yeongnyangi-qa.example.invalid`, `ALLOW_LIVE_LLM=false`, `PAYMENTS_ENABLED=false`로 실행한 뒤 `node scripts/verify-consultation-sharing.mjs`. 기본 주소는 `http://127.0.0.1:14123`, 변경 시 `CONSULTATION_TEST_BASE` 사용.
- 실제 결과 시트의 저장 기록/API 경로를 mock으로 열고 390·1280px에서 검사한다. 채널 호출은 가짜 카카오·브라우저 API이며 외부 호스트와 미등록 API는 차단한다. 실결제·LLM·메시지 발송으로 폴백하지 않는다.
- 최종 로컬 UI 검사 22/22 통과: 각 화면 폭에서 찻집 5개 상품, 네오 4개 체계의 브리핑, 점성술의 저장된 최종 명령서, 생성 중/실패 숨김. 카카오·문구·이미지·저장·취소·클립보드 거부와 44px 이상 터치 영역·가로 넘침도 확인했다. 최종 명령서의 나머지 3개 체계는 같은 어댑터를 쓰지만 별도 실화면 fixture로 세지 않는다.
- 변경 코드 lint·typecheck, `verify:hero-contrast`, `verify:mobile-detail-nonintrusive` 통과. `check:fast` 자동 승격 paid gate 88/88 후 새 검사 스크립트의 `module` 변수명 lint 오류에서 멈췄다. 변수명을 바꾸고 변경 파일 lint·typecheck를 다시 통과했다. 첫 `check:fast` 전체를 통과로 기록하지 않는다.
- Impeccable에서 주요 오류는 없고 4개 폰트 크기 advisory가 나왔다. 기존 `--cd-t-card/body` 토큰을 사용하도록 정리했다. 디자인 탐지와 부분 화면 확인은 사이트 전체 접근성·성능 인증이 아니다.
- 스크린샷/결과 JSON: `build-cache/consultation-sharing/`. 최종 판정은 이 변경이 포함된 main의 GitHub `CI required`를 확인한다.

## 앞선 적용과 남은 범위

| 상담군 | 확인된 구현 | 다음 검증/구현 |
|---|---|---|
| 영냥이 28개 유료 상품 | 2026-09-22 공통 편집기·상품별 링크 개선, 28개 URL 단위 검사 | 운영 적용 후 실기기 수신 미리보기 |
| 영냥이 무료 FreeReading·신점·호라리 | 공통 편집기, mock UI·취소/실패 확인 | 프롬프트만 주는 무료 호라리는 별도 소개 공유 설계 |
| 기존 셸 사주·타로·점성술·숙요·자미두수 | `js/share.js` 기존 기능 존재 | 실제 호출부·결과 요약·공개 도착지·취소 전수 확인 후 개선 |
| 인생 총운·연애 비책·마스터 연애·카르마·서양점성·베다 AI | 개별 결과 화면 존재, 이번 공용 편집기 미연결 | 저장 완료 계약과 스키마를 읽고 기능별 어댑터 연결 |
| 나크샤트라·작명·휴먼디자인·손금·초융합·자미두수·전문가 상담 | 개별 결과 화면 존재, 이번 개선 미검증 | `docs/handoff/conversion-sharing-20260922.md` 파일 목록 순서로 적용 |
| 수호신 공유 | 별도 스냅샷/권한 정책 존재 | 권한을 바꾸지 않고 수신 페이지·OG·새 상담 CTA 점검 |

새 공용 UI는 현재 한국어 문구다. 기존 결과 본문의 로케일 변환은 유지되며, 공유 편집기의 별도 다국어 사전 확장은 아직 하지 않았다.
