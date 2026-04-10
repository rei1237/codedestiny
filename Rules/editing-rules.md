# Coding Rules

이 문서는 CODE-DESTINY-main에서 코드를 수정할 때 반드시 지켜야 하는 규칙을 기록한다.

## Rule 1
특정 구역(섹션/컴포넌트/페이지)의 내용을 수정할 때는, 해당 구역의 기존 톤앤매너를 반드시 유지한다.

적용 범위:
- 내용의 어투와 문체
- 글꼴/타이포그래피 방향성
- 색감과 시각적 분위기
- UI 구조와 상호작용의 디자인 맥락

실행 원칙:
- 새로 추가하는 문구도 기존 문맥과 어색하지 않게 맞춘다.
- 스타일 수정 시 해당 구역의 기존 디자인 언어를 우선한다.
- 동일 페이지 내 다른 구역과 충돌하지 않도록 일관성을 점검한다.

## Rule 2
신규 기능 카드(이미지 + 클릭 이동)를 추가/수정할 때는 "자산 배포 경로 + JS 실패 폴백 + 캐시 최신화"를 반드시 함께 처리한다.

적용 범위:
- `index.html` 및 `public/*/index.html`에 노출되는 신규/변경 카드
- `/fuctionassets/*`를 참조하는 이미지 자산
- `data-action` 기반 클릭 이동 기능

실행 원칙:
- 이미지 파일은 반드시 `fuctionassets/`와 `public/fuctionassets/` 두 경로에 동일 파일명으로 반영한다.
- 클릭 가능한 카드는 `button` 단독 의존을 피하고, `a[href]` 또는 동등한 네이티브 이동 폴백을 함께 둔다.
- `data-action` 라우팅을 쓰는 경우에도 `data-fallback-href`(또는 동등한 폴백 URL)를 설정한다.
- 배포 전 실제 URL(예: `/fuctionassets/<name>.webp`)과 페이지 이동 URL(예: `/neville-meditation.html`)을 직접 점검한다.
- 정적 파일/런타임 JS를 수정한 경우 캐시 고착을 피하도록 버전 쿼리 또는 캐시 무효화 절차를 함께 적용한다.

## Rule 3
동물 & 관상 컬렉션의 `사주 가디언 아트` 카드는 핵심 기능으로 간주하며, 사용자 명시 요청 없이 제거/비노출 처리하지 않는다.

적용 범위:
- `index.html` 및 `public/*/index.html`의 `animalCollection` 카드 그리드
- `data-action="openSajuAnimalPage"`로 연결되는 진입 카드

실행 원칙:
- UI 개편/리팩터링 시에도 카드 존재를 유지하고, 비활성화가 필요하면 대체 동작/안내를 먼저 제공한다.
- 카드 문구만 남기고 버튼을 삭제하는 형태의 반쪽 변경을 금지한다.
- 배포 전 `사주 가디언 아트` 카드 노출 여부와 클릭 이동(`/saju-picture`)을 수동 점검한다.

## Rule 4
`public/static/index.html`에 메인 UX 관련 기능(UI 블록, 상호작용 스크립트, 핵심 스타일)을 추가/수정할 때는 다국어 정적 엔트리(`public/{en-us,ja-jp,zh-cn,hi-in,es-es,fr-fr,de-de,nl-nl,ms-my}/index.html`)에 동일 구조를 같은 작업에서 자동 반영한다.

적용 범위:
- 메인 화면에서 직접 보이는 신규 UI(배지, 버튼, 모달, 카드 등)
- 해당 UI를 구동하는 인라인 스크립트/이벤트 핸들러
- 화면 표시/동작에 필요한 핵심 CSS 블록

실행 원칙:
- static 엔트리만 수정하고 로케일 엔트리를 누락하는 단독 배포를 금지한다.
- 반영 후 로케일 파일 전체에서 핵심 마커(예: 루트 id, data-action, 모달 루트) 검색으로 누락 여부를 검증한다.
- 반영 후 `npm run verify:locale-main-sync`를 실행해 프리미엄 메인 핵심 마커(액션, 이미지, 클릭 스루 CSS) 누락 여부를 자동 검증한다.
- `npm run build` 및 `npm run build:cf`에는 위 검증이 포함되어야 하며, 검증 실패 상태에서 배포를 진행하지 않는다.
- 커밋 시에는 기능과 직접 관련된 로케일 파일만 포함하고 임시/진단 파일은 제외한다.

## Rule 5
실서비스에서 구 스크립트가 남아 기능 업데이트(특히 사주 엔진/신살/십이운성)가 누락되지 않도록, 런타임 및 코어 스크립트의 캐시 무효화 버전을 항상 동기화하고 자동 검증을 통과해야 한다.

적용 범위:
- `js/core/index-inline-runtime.js`, `public/js/core/index-inline-runtime.js`의 `/js/saju-engine.js?v=...` 로더
- `index.html`, `public/index.html`, `public/static/index.html`, `public/{locale}/index.html`의 `index-inline-runtime.js?v=...`
- Cloudflare Pages 배포 전 빌드 검증 단계

실행 원칙:
- 사주 코어(`js/saju-engine*.js`, `js/core/saju/*.js`) 수정 시 `saju-engine.js?v=...` 쿼리를 반드시 갱신한다.
- 런타임 엔트리 쿼리(`index-inline-runtime.js?v=...`)는 루트/정적/로케일 HTML 전체에서 동일 값으로 유지한다.
- 배포 전 `npm run verify:runtime-cache-sync`를 통과하지 못하면 커밋/배포를 진행하지 않는다.
- `build`, `build:cf` 스크립트에 위 검증을 포함해 자동으로 차단되게 유지한다.

## Rule 6
잘못된 파일/파트 편집을 방지하기 위해, 실제 편집(파일 쓰기/패치) 전에 대상 파일과 수정 파트를 사용자에게 명시적으로 확인받는다.

적용 범위:
- 모든 코드/문서 편집 작업(신규 파일 생성 제외)
- 단일 파일 수정, 다중 파일 수정, 특정 블록/함수/섹션 수정 요청

실행 원칙:
- 편집 시작 전 "수정 대상 파일 경로 + 수정할 파트(함수/섹션)"를 1회 이상 사용자에게 확인한다.
- 사용자가 파일만 지정한 경우, 수정 파트가 모호하면 파트 범위를 추가로 확인한 뒤 편집한다.
- 사용자가 파트만 지정한 경우, 후보 파일이 2개 이상이면 편집 전에 대상 파일을 확정받는다.
- 사용자 확인 없이 임의 파일에 선반영 후 정정하는 방식(사후 확인)을 금지한다.

## Rule 7
한글(UTF-8) 텍스트가 포함된 파일은 PowerShell `Set-Content` / `Out-File` / 파이프 리다이렉션으로 절대 수정하지 않는다. 이 방법들은 CP949 또는 UTF-16으로 인코딩을 바꿔 한글을 깨뜨린다.

적용 범위:
- 한글, 한자, 이모지가 포함된 모든 파일 (`.html`, `.js`, `.css`, `.json`, `.md` 등)
- 다중 파일 일괄 치환이 필요한 버전 범프, 문자열 치환 작업

실행 원칙:
- 텍스트 파일 수정은 반드시 `replace_string_in_file` 또는 `multi_replace_string_in_file` 도구만 사용한다.
- 여러 파일에 동일 치환이 필요할 때는 `multi_replace_string_in_file`로 한 번에 적용한다.
- PowerShell을 경유한 텍스트 치환(`-replace`, `Set-Content`, `Out-File`, `>` 리다이렉션)을 사용하지 않는다.
- 불가피하게 PowerShell을 써야 할 경우 반드시 `-Encoding UTF8` 옵션과 `-NoNewline` 플래그를 모두 붙이고, 적용 직후 `git diff`로 인코딩 훼손 여부를 확인한다.
- 편집 후 `git diff --stat`으로 변경 라인 수가 예상치와 크게 다르면(한글 파일에서 수백~수천 라인 증가) 인코딩 손상을 의심하고 `git checkout -- <file>`로 즉시 복원한다.
