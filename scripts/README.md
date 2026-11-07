# `scripts/` 색인

빌드, 공개 미러 동기화, 사이트맵, 검증 게이트, 데이터 생성, DB 마이그레이션을 맡는 Node 스크립트 모음이다. 대부분은 `package.json`의 npm 명령, `.github/workflows/`, `scripts/check-changed.mjs`가 부른다. 어디서도 부르지 않는 일회성·브라우저 QA 스크립트는 2026-11-08 정리에서 지웠다. 같은 정리에서 지운 페이지와 301 목록은 [docs/seo/2026-11-08-legacy-cleanup-redirects.md](../docs/seo/2026-11-08-legacy-cleanup-redirects.md)에 있다.

## 먼저 쓰는 명령

| 명령 | 하는 일 |
|---|---|
| `node scripts/check-changed.mjs --base=origin/main --committed-head` | 바뀐 파일에 맞는 검증 묶음을 고른다. 결제는 `npm run check:payment` |
| `npm run check:pre-push` | 홈 서비스 레지스트리, 공개 미러, 사이트맵 드리프트, llms.txt, SEO 엔티티, 저장소 위생 |
| `npm run sync:public` | 루트 정적 셸(`index.html`, `js/`, `css/`)을 `public/`로 복사하고 캐시 키를 다시 붙인다. 미러가 낡았다는 실패는 이것을 돌리고 결과를 커밋한다 |
| `npm run sitemap:generate` | `sitemap*.xml`과 `config/sitemap-lastmod.json` 원장을 다시 만든다. 드리프트 실패는 이것을 돌리고 같은 커밋에 담는다 |
| `npm run audit:payment-p0-inventory` | `docs/payments/payment-p0-inventory.json`을 다시 만든다 |
| `npm run smoke:core` | 결제 모드·접근 상태 핵심 Jest |

## 파일 이름 규칙

맨 위 폴더의 파일은 접두사로 역할을 나눈다(2026-11-08 기준 624개).

| 접두사 | 수 | 역할 |
|---|---|---|
| `verify-` | 354 | 통과/실패로 끝나는 검증 게이트. 영역은 이름 둘째 마디로 안다(`verify-payment-*`, `verify-ziwei-*`, `verify-mobile-*` …) |
| `build-` | 28 | 데이터·자산·번들 생성 |
| `audit-` | 24 | 현황을 세어 보고서나 원장을 쓴다 |
| `measure-` | 22 | 성능·크기 측정 |
| `i18n-` | 14 | 다국어 사전 점검과 생성 |
| `report-` | 13 | 운영 데이터 보고서 |
| `sync-`, `generate-` | 16 | 생성 사본 동기화, 사이트맵·llms.txt 생성 |
| `migrate-`, `seed-`, `recover-` | 17 | 데이터 이전·초기값·복구. 운영 DB를 건드리므로 실행 전 문서를 읽는다 |

## 하위 폴더

| 폴더 | 내용 |
|---|---|
| `lib/` | 여러 스크립트가 같이 쓰는 모듈(캐시 키, 결제 증거, 사이트맵 규칙 등) |
| `migrations/` | 날짜가 붙은 DB 인덱스·스키마 마이그레이션. 직접 실행하지 않는다 |
| `seo/` | 크롤러 경계·운세 날짜 계약 같은 SEO 계약 테스트와 엣지 점검 |
| `design/` | 홈·히어로·융합 도감 같은 디자인 산출물 생성기 |
| `fixtures/` | 검증기가 읽는 고정 입력과 기준값 |
| `naming/` | 작명 데이터 추출·생성 |
| `og/` | OG 카드 렌더와 캐시 키 |
| `qa/` | 영냥이 표본 재확인·결제 점검 |
| `dev/` | 인수인계 문서 생성, 스테이징 감시 |
| `git/` | 캐시 키 병합 드라이버 |
| `data/`, `idol-chemi/` | 폰트 목록, 레거시 프리셋 내보내기 |

## 새 스크립트를 둘 때

- 게이트는 `verify-<영역>-<대상>.mjs`로 맨 위에 둔다. CI·결제 게이트가 `scripts/verify-*.mjs` 글롭과 고정 경로로 부르므로 기존 검증기를 하위 폴더로 옮기지 않는다.
- 여러 스크립트가 쓰는 함수는 `lib/`에 둔다.
- 한 번 돌리고 끝나는 확인은 저장소에 넣지 않고 작업 폴더에서 돌린다. 넣는다면 npm 명령이나 `check-changed` 프로필에 연결한다. 어디서도 부르지 않는 스크립트는 다음 정리 때 지운다.
- 저장소 루트를 `path.resolve(dirname, '..')`로 계산하는 스크립트가 많다. 하위 폴더에 둘 때는 깊이를 맞춘다.

배포·CI 계약은 [docs/context/delivery-and-ci.md](../docs/context/delivery-and-ci.md), 로컬 명령은 [docs/dev-environment-baseline.md](../docs/dev-environment-baseline.md)에 있다.
