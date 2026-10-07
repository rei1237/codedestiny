# 서비스·저장소 정리 기록

status: in_progress
updated: 2026-10-07

## 처리 결과

- App Router 페이지 소스 279개를 대조해 중복 안내·별칭 12개를 삭제했다. 공개 URL 수와 페이지 소스 수는 구분한다.
- 최종 소스 목록 267개, 정적 HTML 진입점 20개, 기존 정적 리다이렉트 94개와 새 edge 리다이렉트 12개를 조사 목록에 기록했다.
- 공개 사이트맵 955개 URL은 동적 템플릿과 분리해 기록했다. 개별 URL의 Google 유입은 미확인이다.
- 조사 정본: `output/service-repository-cleanup/inventory-final.json`. 변경 전 목록은 같은 폴더의 `inventory.json`.
- 모든 파일의 기본 유지/보류 사유를 목록에 남겼다. 이 목록은 자동 분류와 참조 조사이며 모든 페이지의 육안 검수가 완료됐다는 뜻은 아니다.

## 삭제·통합

| 이전 경로 | 단일 301 목적지 | 이유 |
|---|---|---|
| /premium/, /premium-reports/ | /consultations/ | 서로 안내하던 CTA 루프 제거, 결과·이용·재열람 안내는 상담 허브로 이동 |
| /premium/saju-lifebook/, /saju/lifebook/, /pdf/life-book/ | /life-book-ai/ | 동일 실행 기능 앞의 안내·별칭 제거 |
| /premium/saju-love-bible/, /saju/love-bible/ | /love-secret-ai/ | 동일 실행 기능 앞의 안내·별칭 제거 |
| /landing/ | /ggulggul/ | 기존 홈 진입 별칭 |
| /fortune-planner/, /luck-sync-diary/ | /diary/ | 기존 이동 화면 제거 |
| /face-reading/ | /physiognomy/ | 관상 별칭 |
| /sukyo/ | /sukuyo/ | 숙요 철자 별칭 |

`public/_worker.js`에서 정확히 일치하는 주소만 처리하고 query를 보존한다. 결제·결과·공유 하위 주소는 포괄 리다이렉트하지 않는다. 사이트맵에 이전 주소가 남지 않는 테스트를 추가했다. robots·noindex·광고 차단 목록의 이전 주소는 호환 안전장치로 유지한다. 별도 계산 엔진과 구매 결과는 삭제하지 않았다.

폐지 페이지의 소개 데이터·SEO 등록·아이콘·다국어 태그도 제거했다. 운영에서 열리던 네오 자산 데모는 개발용으로 유지하되 production에서는 404로 차단했다. 찻집 debug 3개는 기존 production 404, dev-status는 production 렌더 차단을 확인했다.

## UI/UX

- 기능 목록: 카드의 주 행동은 실제 기능 시작, 상세 안내는 별도 보조 링크. 검색·분류 범위 유지.
- 홈 독립 상담 카드: 중간 마케팅 시트를 생략한다. data-action·잠금·차감 속성이 있는 기존 결제 게이트는 유지.
- 상담 허브: 준비·결과·이용 조건·기록·지원 안내를 접을 수 있는 공통 영역으로 통합했다.
- 목록의 잘못된 배경/문자 대비를 토큰으로 교정했다. 첫 검수에서 낮은 대비를 발견했고, 수정 후 본문 대비 14.84:1을 확인했다.
- 실제 검수 범위는 features·consultations 360/390/430/1440px 8개 화면과 상담 안내 펼침 1개다. 가로 넘침 0, 브라우저 오류 0, 검색 결과/빈 상태 확인.
- 홈에서 찻집으로 직접 이동과 뒤로 가기를 브라우저로 확인했다. 결제·인증·기록 회귀는 mock 검사로 구분한다.
- 프롬프트 도구: 기존 복사와 상담 연결을 유지한다. 임의의 입력 query 계약을 추가하지 않았다.
- 검색 랜딩·가이드·비교·브랜드 콘텐츠: 고유 설명과 기존 직접 시작/관련 기능 링크를 유지한다. 다른 세션의 홈·랜딩 개선은 통합 시 보존한다.

## 파일 정리

루트 문서 5개를 기존 문서 영역으로 이동하고 실행 검증기·문서 링크·CI 경로 트리거를 맞췄다.

- SEO-AUDIT.md → docs/seo/audit-20260917.md
- SEO-LOCALE-AUDIT.md → docs/seo/locale-audit-20260917.md
- MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md → docs/design/mobile-feature-detail-contract.md
- MOBILE_FEATURE_REGISTRY.md → docs/design/mobile-feature-registry.md
- MOBILE_FINAL_COMPLETION_AUDIT.md → docs/verification/mobile-final-completion-audit.md

검토한 루트 중간 로그 9개, 2,836,747 bytes를 실제 삭제했다. `reviewed-root-cleanup.json`에 크기·수정시각·SHA256과 명시적 경로가 있고, `root-cleanup-applied.json`이 적용 결과다. 해당 검사 명령으로 다시 생성 가능한 중간 출력이며 최종 로그는 보존했다.

정리 도구는 기본 읽기 전용이다. 적용에는 검토한 manifest가 필수이며 파일 변경·경로 이탈·정션·추적 파일·비밀/운영 상태·최종본이면 중단한다. 재귀 삭제는 제공하지 않는다. Windows 대소문자 우회도 차단했다.

기존 미사용 감사 도구의 워크트리·산출물 오탐을 줄이고 동적 스크립트 로딩 참조를 추가했다. 참조 후보 907개와 중복 그룹 337개는 삭제 목록으로 쓰지 않았다. astral-soul·dream library·physiognomy 도구·locale HTML 도구는 실제 호출부를 확인해 유지했다. public의 원본과 생성 미러는 유지하며 이번에 삭제한 App Router 페이지에는 public 원본 미러가 없다.

## 보류·유지 정책

- Android output: 버전 49/50 제작·복구·기기 증빙과 다른 세션 작업이 있어 보존.
- 이미지 원본·제작 마스터·배포 최종본: 중복 해시만으로 삭제하지 않음.
- 과거 인수인계: 고유 결정·복구 이력이 있어 보존. 완료 표시만으로 폐기하지 않음.
- .env·키·DB 백업·마이그레이션·운영 상태·다른 세션 워크트리는 제외.
- 이용권/월정석/단건 결제, 가격, 계산 엔진, 인증/API/DB 계약 유지.
- 꿀꿀운세와 영냥이 보관함 분리, 유료 원본 재열람 유지.

## 검증과 전달

- cleanup 안전성 5개, 통합 리다이렉트/결제게이트 3개, diary 기존 회귀 11개 통과.
- 문서 신선도·모바일 진입(104행/90경로/32행동)·모바일 최종 검증·CI 선택기 self-test22 통과.
- sitemap 무결성 955 URLs, redirects 94/95 예산과 sitemap 교집합 0 통과.
- `npm run check:fast -- --plan`과 `npm run check:fast` 실행. 첫 실행의 테스트 실행기 위치·삭제 스테이징·클릭 조건 검사 실패를 수정했다. 최종 결과는 아래 전달 기록에 갱신한다.
- 생성 미러는 `npm run sync:public`, 사이트맵은 `node scripts/generate-sitemap.mjs`로 재생성한다.
- 실제 LLM·결제·운영 DB 검증은 실행하지 않았다.

## Google 제출

Search Console에서 `https://code-destiny.com/sitemap-index.xml`의 기존 제출이 2026-10-07 성공, 발견 페이지 701로 표시됨을 확인했다. 이는 로컬 955 URL의 현재 색인 수가 아니다. 변경본은 운영에 반영된 뒤 같은 sitemap-index.xml을 재제출해야 한다. 운영 승격은 CLAUDE.md의 별도 1회 승인 대상이며 아직 실행하지 않았다. Google 노출·순위는 제출 성공과 별도로 측정해야 한다.

## 전달 기록

검증 및 main 통합 진행 중.

