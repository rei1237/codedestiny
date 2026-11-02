# 고객 결론 우선 결과 화면

status: done
updated: 2026-11-02

## 요청과 구현 범위

“자미두수뿐 아니라 다른 운세 결과도 고객이 궁금한 결론과 구체적인 해석부터”, “계산 근거나 읽는 법은 최소화하거나 접힘 기본” 요청을 반영했다. 새 해석을 만들거나 기존 원문을 고치지 않고 표시 순서와 기본 펼침 상태만 바꾼다. 유료 결과 원본·권한·이용권/월정석/단건 결제 정책은 그대로다.

| 화면/공통 경로 | 적용 |
|---|---|
| 자미 상담 | 저장된 `core_answer`와 해석 본문을 먼저 표시. `reading_guide`, 명반, 계산 근거는 기본 접힘. 원문 유지 |
| 베다 신규 결과·저장 결과 | 공용 `StructuredReadingResult`에서 본문을 차트보다 먼저 표시. 별도 신규 화면의 지표·차트·이미지 안내도 본문 뒤로 이동. 명시적인 guide/basis 키만 접으며 알 수 없는 섹션을 삭제하지 않음 |
| 서양점성술 저장 결과 | 상담 본문 옆 차트·시그니처·계산 근거를 접음. 출생시간 미상 안내와 오류는 계속 표시 |
| 숙요궁합 | 상세 해석 기본 펼침, 수치 비교·근거는 뒤쪽 접힘. 별도 PDF 전문은 유지 |
| 신년운세 | 질문 답변·분야별 상담을 먼저 표시하고 원국 프로필은 접음. 상담 편지·기간별 해석 보존 |
| 운명의 나침반 | 결론마다 붙던 계산 근거 전체를 접음. 결론·행동 제안 유지 |
| 초융합 | 체계 간 교차 근거를 접음. 카드 결과와 각 분야 해석 유지. PDF의 기존 exporting 신호는 따름 |
| 띠·별자리 기간별 운세 | 계산 세부·읽는 법을 접음. 총운·관계·분야별 해석, 원래 주의 안내 유지 |
| 공통 `AnalysisBasisPanel` | 사용하는 모든 결과 화면에서 기본 접힘. 계산 중 로딩 컴포넌트는 별도이며 변경하지 않음 |
| 공통 `PaidResultImageGuide` | 모든 호출부에서 이미지 제작/읽는 법 안내 기본 접힘. 후기 안내는 밖에 유지 |
| 레거시 `CDPaidEditorialReport` | 사주 등 기존 유료 결과에 덧붙이는 안내 전체를 접음. 읽는 법/자료/복사 도구와 저장된 문장은 펼쳐 확인 가능. 루트/public 두 파일 쌍 동일 |
| 영냥이 사주·타로·자미·베다·숙요·점성술/융합 | 기존 `ReadingBook`은 첫 답변·구체적 조언 우선, `ReadingCharts`와 `SummaryReport`는 이미 기본 접힘. 재변경 없이 기존 원문 보존 회귀 실행 |

읽는 법이 본문과 섞인 임의의 구버전 평문을 정규식으로 잘라 숨기지 않는다. 별도 키/컴포넌트로 구분되는 안내만 접는다. 원래 구체적 해석이 없는 결과에 임의의 결론을 추가하지 않는다. 교육·방법론·SEO 안내 전용 문서는 결과 화면과 구분하여 유지했다. 공개 URL·메타데이터·색인 정책·가격·960px 기준은 변경하지 않았다.

## 파일과 PDF

`components/fortune/ResultReference.tsx`는 네이티브 details/summary를 제공한다. 새 문자열은 `lib/i18n/result-reference-copy.ts`의 12개 locale 키와 기존 공통 키를 사용한다. 색·폰트·구조는 기존 화면을 따른다.

`lib/pdf/with-open-result-references.ts`와 공용 `export-result-pdf.ts`는 캡처 중에만 표시용 근거를 열고, 성공/실패 모두 사용자의 원래 열림 상태를 복원한다. `normalize-capture-colors.ts`는 자미/베다에서 선택적으로 PDF 복제본의 modern CSS 색을 브라우저 sRGB 값으로 바꾼다. 원본 화면이나 다른 소비자의 색상은 수정하지 않는다. 기존 html2canvas가 `color()`를 읽지 못하던 실제 다운로드 오류를 해결했으며, 브라우저 픽셀 비교로 변환색 일치를 확인했다.

## 검증 증거와 한계

- 전체 Next/Chrome에서 자미 개선 ON 신규 계산→mock PG 복귀→생성→새로고침/보관함→PDF 통과. PDF 12쪽/1,839,399 bytes. 원격 글꼴은 차단하여 기존 raster 표지 폴백을 사용했다.
- 최종 고객 화면에서 rollback-partial, ON concurrent/legacy, OFF normal 통과. 이전 엔진 전달 12개 시나리오와 구분해 기록한다.
- `node tools/oracle/next-delivery/verify-references.mjs`: 6개 domain 공통 결과 컴포넌트의 원문 표시·기본 접힘·키보드·390/960px·PDF 원상 복원 통과. PDF 79,951 bytes. 오류/외부 요청 0. Next 링크/이미지만 DOM shim이며 전체 서비스 경로 E2E를 의미하지 않는다.
- `node scripts/verify-paid-editorial-report.mjs docs/engine-audit/results/next-enabled-delivery-20261102/legacy-reference`: 360/390/430/1280px, 미결제/미완료 거부, 기본 접힘, 복사·실패 시 수동 복사, 외부 요청 0 통과. 완료 안내 모듈은 명시적 mock이다.
- `node node_modules/typescript/bin/tsc --noEmit --incremental --tsBuildInfoFile .tmp/engine-audit-typecheck/tsconfig.tsbuildinfo`: exit 0.
- 결과 표시 관련 단위 5건 통과. 여러 화면의 기존 named 결제·저장·파싱 함수와 레거시 미러 비교를 포함한다. 전체 허용 회귀 최종 집계는 17번 보고서/verification.json에 기록한다.
- 데스크톱/모바일 실제 결과 화면을 확인했다. 기본 접힘 상태와 결과 우선 순서가 보인다. 공통 컴포넌트 검사로 모든 개별 서비스 URL의 완전한 E2E를 주장하지 않는다. Swiss 연결 서비스의 계산/생성 경로는 실행하지 않았다.

디자인 검사에서 이번 새 공통 패널 경고는 없었다. 기존 신년 화면의 width transition/배경 패턴 2개 진단은 변경 밖이다. Impeccable 문서/설정의 오래된 상태는 별도 정리 대상이며 이번 작업에서 자동 수정하지 않았다.

로컬 구현 커밋은 `025d10112`다. 실 PG·실 LLM·운영 DB·외부 서비스 호출, 엔진 업데이트 활성화, push·배포는 수행하지 않았다. 실제 구매자 전달 확인과 운영 활성화는 17번 보고서의 승인/전달 순서를 따른다. 기존 저장 결과를 재계산하거나 덮어쓰는 전환은 포함하지 않는다.
