# 초융합 개인 상담서 개선 — 검증 기록

status: done

## 변경
- 신규 한국어 초융합에 `fusion-book-v3`와 `fusion-book-budget-20261014`를 저장한다. 모둠 30장, 오마카세 44장. 초기 본문 목표 76,440~98,280자 / 98,280~126,360자.
- 질문의 답을 먼저 제시하고, 각 체계는 기본·전문·생활 적용 세 장을 독립적으로 유지한다. 강점 활용·생활 실천과 질문별 판단 전환 조건을 포함한다.
- 기존 snapshot의 챕터·본문·예산을 바꾸지 않는다. 가격·이용권·월정석·단건 결제·추가 질문 횟수·인증·DB 스키마·계산식·API 경로는 유지한다.
- 저장된 결과로만 비교·용어·실행 부록과 PDF를 만든다. PDF 저장은 생성 API나 추가 차감을 호출하지 않는다.
- 결과 화면: 부 제목이 있는 목차, 현재 위치·이어 읽기, 포함 목차·질문 원문 선택·준비 단계·재시도 안내.
- PDF: 문장 보존형 짧은 문단, 확대된 본문·행간, 핵심 표, 체계별 물상, 영냥이 표지·해설 그림, 저장된 오행 막대 도표, 연결 목차·페이지 번호. 글꼴과 공통 페이지 엔진을 재사용하고 책 전용 조판만 확장했다.
- 일반 초융합 물상 그림은 개념 설명용이며 개인의 계산 수치로 표시하지 않는다. 계산 수치는 저장된 값이 있을 때만 도표로 그린다.

## mock 검증
- `node --test __tests__/ui/fusion-book-v3.test.mjs`: 5개 통과. 챕터 수·체계 독립성·분량·기존 v2·공통 문서·문단 원문 보존 검사.
- `node --test __tests__/ui/yeongnyangi-fusion-delivery.test.mjs`: 8개 통과. 실제 결정론 계산 → mock provider → 저장 중단·재개·완료 재열람, 추가 호출 없음.
- `node --test __tests__/ui/yeongnyangi-fusion-quality.test.mjs`: 21개 통과. 근거·시기 경계·직접 답변·review 슬롯·출력 토큰 검사.
- `node scripts/verify-fusion-fortune-pdf.mjs`: 12개 장 / 36,942자 mock 구성 통과.
- `node scripts/verify-fusion-book-browser.mjs`: 360·390·430·1440px, 가로 넘침 없음, 키보드 저장 창·이어 읽기, 생성 중 저장 차단, 폰트 실패 후 재시도, API 호출 0회 통과.
- `node scripts/verify-consultation-pdf-browser.mjs build-cache/fusion-book-general`: 일반·긴 표지·기존 폰트 실패 경로 통과.
- 실제 PDF 텍스트 대조: 일반 40쪽·목차 링크 11개·이미지 9개, 영냥이 182쪽·목차 링크 48개·이미지 46개. 본문 누락 없음, 영냥이 고유 문단은 각각 한 번만 포함, 질문 원문 기본 제외, 링크 목적지 유효.
- Poppler 렌더링 표지·목차·본문·오행 도표 확인. pdfplumber 전체 페이지 문자 경계 검사: 잘림 0쪽. 페이지 수는 합성 검증 자료의 결과이며 판매 약속이 아니다.
- `npx tsc --noEmit --incremental false`: 통과.
- `npm run check:pre-push`: 통과. 959개 URL sitemap 재생성 일치.

## 전달
- 구현 커밋: `3629ba310`, `c6079dc0f`, `2168e006e`.
- `npm run check:fast`: 확대 검사 88/88 통과. 테스트 변수명 lint 오류를 수정한 뒤 최종 check:fast(lint·typecheck·sitemap 및 선택된 검사)와 해당 단위 테스트를 통과했다.
- main으로 fast-forward 전달한다. 최종 push SHA와 CI 상태는 작업 종료 보고에 남긴다. CI 완료를 기다리거나 운영 배포를 검증하지 않는다.
- 리뷰용 합성 PDF: `build-cache/fusion-book-review-20261014/` (기본 main 체크아웃의 로컬 산출물).
- 실 LLM의 상담 품질·실제 생성 대기시간·실결제·운영 DB·운영 배포는 미검증이다.

## 주요 수정 파일
- `worker/yeongnyangi/fortune/fusion-book.ts`, `consultation-budget.ts`: 새 구성과 분량 버전.
- `worker/yeongnyangi/providers/chapter.ts`, `service.ts`: 신규 구매 배선과 직접 답변·근거·예산.
- `app/yeongnyangi/_components/ReadingBook.tsx`, `FusionBookExtras.tsx`: 목차·저장·개인정보 선택.
- `lib/pdf/book-writer.ts`, `book-paragraphs.js`: 원문을 보존하는 문단과 표 조판.
- `lib/pdf/export-fusion-report-pdf.ts`, `export-yeongnyangi-report-pdf.ts`: 두 PDF 출력.
- `lib/pdf/report-art.ts`, `element-chart.ts`, `linked-contents.ts`, `yeongnyangi-report-plan.ts`: 기존 이미지·계산 도표·차례·공통 본문.
