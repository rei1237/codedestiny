# Implementation Plan

## 이번 작업에서 수정할 범위
- React 홈 서비스 카드 key 안정화: `app/page.js`
- 사주 가디언 결과 복사 버튼의 접근성 피드백: `app/saju-guardian/page.tsx`
- 감사 리포트와 구현 계획 문서화: `reports/code-destiny-ui-ux-bottleneck-audit-2026-06-29.md`, `reports/code-destiny-implementation-plan-2026-06-29.md`

## 이번 작업에서 건드리지 않을 범위
- Worker 결제/이용권/월정석/단건 결제 정책
- PDF 생성과 다운로드 흐름
- R2 이미지, 폰트, 음악 asset 경로
- `index.html`과 synced mirror인 `public/**/index.html`
- MongoDB schema, 사용자 데이터 구조, Cloudflare deploy 설정
- 병렬 변경 중인 파일의 원복 또는 정리

## 예상 변경 파일
- `app/page.js`
- `app/saju-guardian/page.tsx`
- `reports/code-destiny-ui-ux-bottleneck-audit-2026-06-29.md`
- `reports/code-destiny-implementation-plan-2026-06-29.md`

## 롤백이 필요한 경우 되돌릴 파일
- `app/page.js`
- `app/saju-guardian/page.tsx`
- `reports/code-destiny-ui-ux-bottleneck-audit-2026-06-29.md`
- `reports/code-destiny-implementation-plan-2026-06-29.md`

## 검증 방법
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run verify:entry-encoding -- --strict-core`
- 변경된 텍스트 파일 대상 모지바케 패턴 검색: `U+FFFD`, `\\uFFFD`, `Ã`, `Â`, `ì`, `í`, `ê`, `ë`, `ð`
- `index.html` 또는 정적 mirror 변경 시에만 `npm run sync:public`, `npm run verify:locale-main-sync`, `npm run verify:runtime-cache-sync`

# Manual QA Checklist

## 메인 화면
- [x] React 홈 서비스 카드 key 중복 리스크 제거
- [ ] 정적 메인 화면 정상 표시
- [ ] React 메인 화면 정상 표시
- [ ] 모바일 390px에서 깨짐 없음
- [ ] 주요 CTA가 명확함

## 기능 진입
- [ ] 기능 카드 이미지 정상 로딩
- [ ] 이미지 실패 시 fallback 표시
- [ ] 기능 설명과 가격 안내가 명확함

## 결제/이용권
- [ ] 이용권 보유 시 이용권 흐름 우선
- [ ] 단건 결제 버튼 정상
- [ ] 월정석 안내 정상
- [ ] 중복 클릭 방지
- [ ] 결제 실패 문구 친절함

## 생성
- [ ] 생성 중 UI가 멈춘 것처럼 보이지 않음
- [ ] 중복 생성 요청 방지
- [ ] 실패 시 재시도 안내 표시
- [ ] 실제 진행 단계와 UI가 크게 어긋나지 않음

## 결과
- [x] 사주 가디언 그림 주문 복사 성공 상태가 보조기술에 전달되는 마커 추가
- [ ] 결과가 카드형으로 읽기 쉬움
- [ ] 요약 / 근거 / 실행 전략이 분리되어 있음
- [ ] PDF 다운로드 기능이 있는 경우 정상 동작
- [ ] 모바일에서 긴 결과가 읽기 쉬움

## SEO / Footer
- [x] React 홈 metadata와 공식 SNS 링크 파일 확인
- [ ] SNS 링크 정상 클릭
- [ ] 외부 링크 새 창 열림
- [ ] title / description 확인
- [ ] OG 메타데이터 확인
