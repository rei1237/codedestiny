# 구현·제작 검증

## 완료한 로컬 확인

- `node --test __tests__/ui/consultation-discovery.test.mjs __tests__/ui/consultation-samples.test.mjs __tests__/ui/feature-detail-preview.test.mjs __tests__/ui/feature-detail-panels-legacy-output.test.mjs __tests__/ui/purchase-analytics.test.mjs`: 33/33 통과. 예시 노출 기준 50%와 추적값에서 질문 제외를 포함한다.
- `node scripts/qa/verify-consultation-conversion.mjs`: 360·390·430·1280px에서 실제 CodexLanding과 공통 고민 선택 마크업 확인. 가로 넘침 없음, 개인·궁합 상세 펼치기와 정본 가격 표시 통과.
- `node scripts/verify-neo-consultation-ui.mjs`: 네 가지 폭에서 실제 컴포넌트의 mock 상담 흐름 통과. mock 결제·mock 메일만 사용했다.
- `node scripts/verify-master-love-codex-payment-recovery.mjs`: 네 가지 폭에서 503 복구·저장 완료·새로고침 재열람 통과. 추가 checkout 호출 0.
- `npm run sync:public`, `npm run sitemap:generate`: 소스에서 공개 미러·사이트맵 생성.
- `git diff --check`: 공백 오류 없음.
- 녹음 화면·썸네일을 로컬 HTML에서 1280×720 PNG로 캡처하고 육안 확인. 30초 WebM은 무음 구성 시안으로 표시했다.

## 공식 게이트

`check:fast -- --plan`은 공유 계측 파일 때문에 전체 critical 검사로 승격했다. 로컬 실행 결과와 커밋 뒤 `check:pre-push`, main CI 상태는 STATUS.md에 기록한다. 로컬 검사나 스크린샷은 운영 배포의 증거가 아니다.

최초 제한 환경에서 브라우저 localhost 접근이 거부되어 브라우저 검사는 승인된 로컬 실행 환경에서 다시 수행했다. 실 LLM·실결제·운영 DB·외부 메일로 폴백하지 않았다.

## 변경 경계

가격은 기존 서버 pricing registry·PriceBadge를 사용한다. 이용권·월정석·단건 결제와 제공 범위를 바꾸지 않았다. 인증, 주문 처리, 공개 API와 DB 스키마는 수정하지 않았다. 계측은 기존 sample_view 및 동의 정책, 캠페인 허용 목록을 재사용했다.

개인판·궁합판은 자신의 패턴과 두 사람 비교를 구분했다. 네오 이메일은 직접 검수와 이메일 전달, 네오 전략실은 AI 상담으로 표시했다. 기존 대표 상담과 실제 결과 발췌를 사용하며 가상 프로필 결과임을 표시했다.

홈·인연의 서의 설명과 내부 링크를 확인했다. 새 공개 URL은 추가하지 않았다. 기존 canonical 및 네오 접수 화면의 noindex/nofollow를 유지했다. 기존 결과·구매 기록의 재열람 경로를 변경하지 않았다.

## 아직 검증하지 않은 것

- 사용자 목소리와 입 전환, 표정 사이 픽셀 정합, 휴대전화에서의 실제 녹음 재생
- VTube Studio 웹캠 추적과 이 컴퓨터에서의 실시간 녹화 성능
- 실제 구매 증가, GA4·YouTube 관측값, 운영 이메일 전달
- 블로그·YouTube 외부 게시와 운영 배포

예시 열람은 화면별 이벤트이므로 전환 분석에서 상품별 고유 세션으로 중복 제거한다. 소량 데이터로 채널의 승자를 확정하지 않는다.
