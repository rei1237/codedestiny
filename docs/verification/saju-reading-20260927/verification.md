# 정적 사주 읽기 검증 — 2026-09-27

## 범위

무료 사주·정적 대운/종합 구매 안내·/ggulggul/ 영냥이 진입점. LLM 서비스의 컨셉·프롬프트·생성·결과·상세 라우트 변경 없음. 결제/인증/API/DB 구현 변경 없음. 가격 resolver를 읽는 빌드 단계와 오래된 정적 진입 표시만 정본(각 3,000원)에 맞췄다.

## 실행 증거

- `node --test __tests__/ui/saju-reading-personas.test.mjs __tests__/ui/yeongnyangi-assets.test.mjs __tests__/ui/yeongnyangi-free-fortune.test.mjs`: 조건별 표시 모델·불변성·가격 정본·모바일 에셋 검사.
- `node scripts/verify-saju-reading-personas.mjs`: 360/390/430/1440px, 실제 입력·계산·모드 전환·팝업·샘플·미해금 본문 비노출. 입력값/포커스 유지, 새로고침 모드 복원, 430px 실제 시간 미상 입력, 360px 200% 글자 크기. 외부 호스트 요청은 차단하고 영냥이 가격만 로컬 fixture로 공급.
- `node scripts/verify-saju-unlock-entitlement-regression.mjs`: 통과. 기존 로그인/프로필별 해금·취소·복귀·중복 결제 방지 mock 계약.
- `npm run check:fast -- --plan`, `npm run check:fast`: 실행. Jest 300 suites / 4,250 tests 통과, paid gate 개별 87개 통과. Node 검사에서 새 모드 이벤트 연결과 기존 사이트맵 주간 날짜 2건 실패. 모드 이벤트는 기존 컨트롤러 직접 연결로 수정 후 custom-event-wiring 5개 통과. 사이트맵은 정적 셸·번역 서명 변경 후 원장이 낡은 것이 원인이었다. main 통합 후 `npm run sitemap:generate`로 원장을 갱신했고 해당 5개 검사와 `npm run verify:sitemap-drift`가 통과했다.
- `npm run sync:public`: 최종 완료. Windows의 일시적 파일 열기 오류가 있었으나 재생성 뒤 관련 미러를 확인했다.
- `git diff --check`: 통과.

## 화면·성능

before/after에 같은 너비의 실제 브라우저 캡처와 metrics.json. 이전 소개 이미지가 로드된 상태의 높이는 360px 1250.84px, 390px 1177.39px, 430px 1150.97px. 새 카드는 세 너비 모두 114px, 1440px에서는 122px. 소개는 원래 인라인 위치이며 새 고정 요소는 없다.

최종 로컬 자동화에서 모드 전환 동기 처리 약 57~105ms, 첫 프레임 약 143~175ms. 기기 실측/운영 성능 보장은 아니다. 계산값·표시 가격이 전환 전후 동일하며 결제·AI 요청은 0. 카드를 기준으로 읽던 위치를 복원했으며 검사 중 약 2~34px 잔여 이동이 있었다. 새 이미지 두 개의 160px WebP 총 16,982바이트; 원래 영냥이 대형 배경 요청 제거. 전체 페이지 전송량·CLS의 배포 전후 비교는 아직 미측정이다.

## 제한

- 새 문구는 한국어·영어 작성. 나머지 10개 로케일은 영어 공통본이며 현지어 번역 완료가 아니다. 한국어 누출 방지는 검사했다.
- 로그인/저장 프로필 전환 및 유료 복구는 기존 mock 회귀 검사로 확인했다. 이번 새 UI의 로그인→저장 프로필 재계산 전체 브라우저 시나리오는 별도 미검증이다.
- 실제 모바일 키보드와 실기기 안전 영역, 실결제·실 LLM·운영 DB는 검사하지 않았다.
- 전환율 개선은 입증하지 않았으며 추가 이벤트는 모드·화면·상품키만 기록한다.
- 공식 CI·최종 스테이징 결과는 main 통합 후 기록한다. 운영 승격은 이번 작업 범위가 아니다.
