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

### 마스터 인연의 서

`CodexReader`의 기존 전 장 도착 판정(`sealed`)에서만 `ConsultationShare`를 연다. 저장된 각 장의 `keySentence`·`actions`·`insight` 중 첫 문장을 선택·편집하며, 개인 결과 주소 대신 `/master-love-codex/` 공개 진입을 보낸다. 부분 생성·누락된 장·미저장 상태에서는 공유하지 않는다. 질문·이름·생년월일·세션 ID는 어댑터 선택 목록에 넣지 않는다. PDF 문서 밖에 공유 UI를 배치해 소장본 캡처를 보존한다. 단위 검사 8개와 기존 리더 회귀 21개, typecheck와 `check:fast`(유료 mock 88/88, Jest 290 suites/4078 tests)가 통과했다. 개발 서버 mock 실화면은 결과 API 200 뒤에도 기존 `Unsealing` 로딩 상태에 머물러 공유 조작까지 검증하지 못했다. 실기기 카카오 수신과 함께 후속 확인이 필요하다.

### 운명의 업 리포트

`status=completed`이고 저장 식별자가 있는 결과에서만 `summaryCards.repeatingPattern`·`currentTask`와 장별 `summary`를 선택지로 사용한다. 정규화 화면의 빈 값 대체 문장, 질문·출생정보·ID는 공유 내용에 넣지 않는다. 구형 16장과 신형 15장 결과를 별도로 확인했고, 공유 영역은 PDF 캡처 영역 밖에 둔다. `scripts/verify-karma-sharing.mjs`의 개발 프리뷰에서 신형/구형 × 390/1280px의 편집·이미지 미리보기·가로 넘침·하단 버튼 접근과 생성 중/실패 숨김을 확인했다. 캡처는 `build-cache/karma-sharing/`에 있다. 실결제·유료 생성·운영 DB·실기기 카카오 전송 증거는 아니다.

### 인생의 책·연애 비책 후속

두 결과 화면의 기존 PNG 공유에 해당 상품의 공개 URL을 넣고 비공개 식별자를 파일명에서 제외했다. AbortError 취소는 실패 문구로 표시하지 않는다. 연애 비책은 로딩/진행/실패/미저장 상태에서 공유를 막으며, 상태 필드가 없던 기존 저장 결과는 계속 읽고 공유할 수 있다.

사용자의 후속 요청으로 실제 책과 비밀 편지의 UI·공유 카드 디자인도 바꿨다. 새 에셋·방향·다른 전문가 상담 계획은 docs/premium-consultation-design-20260923.md에 있다. 소유자 이름 숨김, 문구 편집, 전송 전 카드 미리보기까지 적용한 것으로 세지 않는다.

로컬 scripts/verify-book-card-sharing.mjs의 35개 시나리오가 통과했다(360/390/430/1280 light, 390 dark). 성공/legacy/실패와 연애 비책 미저장, 실제 PNG·공개 링크·취소·44px·가로 넘침을 확인했다. 기존 브랜드 폰트의 캐시 파일을 사용하는 mock 환경이며 실기기 수신/운영 성과는 미검증이다.

| 상담군 | 확인된 구현 | 다음 검증/구현 |
|---|---|---|
| 영냥이 28개 유료 상품 | 2026-09-22 공통 편집기·상품별 링크 개선, 28개 URL 단위 검사 | 운영 적용 후 실기기 수신 미리보기 |
| 영냥이 무료 FreeReading·신점·호라리 | 공통 편집기, mock UI·취소/실패 확인 | 프롬프트만 주는 무료 호라리는 별도 소개 공유 설계 |
| 기존 셸 사주·타로·점성술·숙요·자미두수 | `js/share.js` 기존 기능 존재 | 실제 호출부·결과 요약·공개 도착지·취소 전수 확인 후 개선 |
| 인생의 책·연애 비책 | 책/편지 UI와 기존 이미지 공유 링크·취소·완료 상태 개선 | 이름 숨김·문구 편집·전송 전 미리보기 확장. 이번 공용 편집기 미연결 |
| 마스터 연애 | 전 장 저장 완료 시 공용 편집기 연결, 문장·행동·통찰 선택 | mock 실화면 및 실기기 수신 확인 |
| 카르마 | 구형·신형 저장 요약의 완료 결과 편집기 연결 | 실제 저장 결과 재열람과 실기기 수신 확인 |
| 서양점성·베다 AI | 개별 결과 화면 존재, 이번 공용 편집기 미연결 | 저장 완료 계약과 스키마를 읽고 기능별 어댑터 연결 |
| 나크샤트라·작명·휴먼디자인·손금·초융합·자미두수·전문가 상담 | 개별 결과 화면 존재, 이번 개선 미검증 | `docs/handoff/conversion-sharing-20260922.md` 파일 목록 순서로 적용 |
| 수호신 공유 | 별도 스냅샷/권한 정책 존재 | 권한을 바꾸지 않고 수신 페이지·OG·새 상담 CTA 점검 |

새 공용 UI는 현재 한국어 문구다. 기존 결과 본문의 로케일 변환은 유지되며, 공유 편집기의 별도 다국어 사전 확장은 아직 하지 않았다.
