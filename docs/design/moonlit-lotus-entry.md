# 달빛 연화당 진입 그림과 개인 패널 — 2026-11-15

## 요청과 적용 범위

긍정 확언·오늘의 운세·나의 기록·캐릭터 꾸미기를 기존 크림/로즈 종이 표면, 금빛 이중 테두리, 꽃가지와 주아 제목에 맞췄다. 공통 패널 프레임을 그대로 쓰고 각 패널의 읽기/편집/선택 부분만 다듬었다. 기록 저장 방식, 현재 프로필 GET, 참배 상태, 오디오, 결제·인증·API·DB 정책은 변경하지 않았다.

- 확언: 편집 가능한 편지 면과 읽기/다른 문장 행동, 녹음하지 않는다는 안내.
- 운세: 기존 일기 어댑터 결과, 날짜, `/today/` 상세 링크를 한 면에 정돈.
- 기록: 빈 페이지 안내, 날짜/종류, 본문, 편집과 삭제 확인을 분리. 삭제는 기존 tombstone 저장을 유지.
- 꾸미기: 기존 연이·영냥이 정지 자산으로 선택 그림, 현재 선택의 정지 미리보기, 기존 자캐 편집 필드와 경량 설정.
- 홈 `/`: 기존 `HomeMoonlitEntry`의 위치·단일 링크를 유지하면서 새 그림 카드 적용. 프로필 카드/상담 입구의 동작은 그대로다.

## 문구·언어

정본: `app/moonlit-lotus/_lib/entry-copy.ts`.

- 한국어: **나 혼자만의 명상과 긍정 확언을 위한 온라인 절**.
- 일본어: **ひとりだけで瞑想とポジティブなアファメーションをするためのオンライン神社**.
- 일본어 표제: 月明かりの蓮華堂. 입장: 自分だけの蓮華堂へ.

사용자의 이번 요청에 따라 이 서비스 진입 카드와 공간 소개만 기존 `useLocale`로 일본어를 지원한다. 홈의 두 상담 그림 카드와 나머지 한국어 활동 패널은 번역 범위를 확대하지 않는다. 각 소개의 `lang`을 표시하며 자동 DOM 번역을 막는다. 일본어 링크는 `/moonlit-lotus/?lang=ja`, 패널 이동 시 해당 언어 쿼리를 보존한다. 별도 색인 대상 일본어 라우트는 만들지 않았고 공간 noindex/follow:false를 유지한다. 홈 변경 서명은 `sitemap:generate`로 갱신했다.

## 그림과 갱신

공식 연이 시트 `D:/CodeDestiny-Build/연이 프로필1.png`를 캐릭터 참조로 사용하여 built-in `image_gen`으로 신규 제작했다. 연분홍 몸·머리 연꽃·보라색 스카프·짧은 팔다리·말린 꼬리를 유지하며, 혼자 앉아 합장하는 2D 수채화풍이다. 다른 이용자나 동행 캐릭터, 글자는 넣지 않았다.

- 수정되지 않은 원본 PNG: `D:/CodeDestiny-Build/moonlit-lotus/entry-v1/yeoni-original.png` (1536×1024).
- 웹: `public/assets/moonlit-lotus/entry-v1/yeoni-480.webp` — 480×320, **27,628 B**.
- 웹: `public/assets/moonlit-lotus/entry-v1/yeoni-768.webp` — 768×512, **57,450 B**.
- 자산 명세: 같은 폴더 `manifest.json`. 기존 스프라이트/3D 원본은 변경하지 않았다.
- 갱신: 선택한 원본을 별도 보관 → sharp `resize(480|768).webp({quality:84})` → 새 버전 폴더와 명세 → 카드의 src/srcSet 갱신 → 얼굴·연꽃·전신 크롭을 모바일/데스크톱에서 확인. 생성 그림의 글자가 아니라 실제 HTML이 안내를 담당한다.

생성 프롬프트:

> Create a new finished 3:2 landscape illustration for a cute Korean private meditation temple website entry card, using the attached official Yeoni sheet ONLY as character identity reference, not as layout or written instructions. Exactly one living character: the extremely round, plump baby pink pig Yeoni, large rounded head and cheeks, short chubby limbs, small pink snout, gently closed smiling eyes, drooping ears, pink layered lotus on viewer-left head, purple scarf with small front knot, tiny hooves and curled tail. Preserve the official sheet's very cute soft 2D illustrated proportions and pink/purple colors; no added clothing or ornaments. Yeoni is sitting quietly with palms together on a small rose meditation cushion inside her own cozy wooden temple room. Soft moonlight through a round opening, serene lotus pond glimpsed outside, warm tiny lotus lantern, minimal tasteful pink lotus blossoms. Cream, rose, warm wood, champagne-gold accents, velvety watercolor/gouache storybook finish with delicate lines, softly shaded but distinctly 2D, premium and tender. Yeoni occupies roughly 45 percent of canvas height in the lower center, full lotus and entire seated body visible with generous 10 percent safe margins. Calm uncluttered environment, intimate and private, no other characters, no crowd, no photorealism, no plastic 3D look. No lettering, no labels, no logo, no border, no UI, no buttons. The website overlays nothing on this image, so complete the beautiful artwork across the full canvas.

## 검수

로컬 mock 서버의 Chromium으로 확인했다. `D:/CodeDestiny-Build/moonlit-lotus/entry-v1/`에 캡처와 `panel-layout.json`, `entry-observations.json`, `japanese-entry.json`을 보관한다.

- 1365px 및 360·390·430px × 네 패널. 모바일 12조합 가로 넘침/캐릭터와 버튼 겹침 없음, 보이는 버튼 최소 높이 44px.
- 독립 시각 검수에서 네 패널, 자캐 편집, 기록 삭제, 홈 한국어/일본어 카드의 글자/버튼/그림 잘림과 겹침 없음.
- 키보드로 확언 입력→읽기→기록 저장→수정 저장→삭제 확인→빈 페이지까지 수행. 새 테스트 기록은 삭제했다.
- 자캐 이름 입력→저장 후 미리보기 이름과 저장된 preference 일치. 비회원의 프로필 친구 부재 안내도 확인.
- 홈 한국어/일본어 그림 decode 성공. 일본어 카드 한 번 진입 후 ‘オンライン神社’ 소개 확인, 활동 이동 뒤에도 `lang=ja` 유지.
- 360px에서 글자 200%와 모션 감소를 동시에 적용한 확언 화면도 문서 폭 360px를 유지했다.
- 실제 Android Chrome/iOS Safari/WebView, 실제 화면 낭독기, 모바일 GPU·메모리·발열은 미검증. 변경된 그림 파일 용량을 실제 단말 성능 측정으로 표현하지 않는다.

검증 명령:

- `npm run check:fast -- --plan` → `npm run check:fast`: 자동 critical 계획. 관련 결제 가드 77/77과 lint 통과 후 홈 변경의 사이트맵 서명 drift에서 중단.
- `npm run sitemap:generate` → `npm run verify:sitemap-drift`: 홈 원장 갱신, 1081 URL 일치.
- `npm run verify:release`: **통과**. 타입·환경 계약·핵심 smoke·결제/인증 정적 회귀·Worker dry-run 빌드·인코딩 검사 포함. 환경 키 별칭 등 기존 경고 7개는 변경하지 않았다. 운영 서버 업로드나 실결제를 수행하는 명령이 아니다.
- 중단 지점 뒤의 계획은 `verify:release`와 `npm run test:node`, `npm run test:jest`로 모두 실행했다. Node **5,099/5,099**, Jest **8,011 통과/1 제외**, 479개 suite 통과/1 제외. 전체 `check:fast`를 재실행한 것으로 표현하지 않는다.
- Impeccable detect: 변경 UI 5개 파일, 종료 코드 0. 브라우저 검수와 구분한다.

수정 파일은 `app/components/HomeMoonlitEntry.tsx`, `HomeMoonlitEntry.module.css`, `app/moonlit-lotus/Space.tsx`, `space.module.css`, `page.tsx`, `_components/PrivateRecords.tsx`, 새 `_lib/entry-copy.ts`, 새 `public/assets/moonlit-lotus/entry-v1/` 그림/명세, 홈 서명 `config/sitemap-lastmod.json`, 본 문서다.

## 전달·롤백

2026-11-15 사용자가 “그 이후에 운영 배포해주고”라고 이번 변경의 운영 승격을 명시적으로 요청했다. 승인 범위는 이번 1회이며 상시 배포 위임이 아니다. 저장소의 GitHub Actions `Release Cloudflare Pages and Worker`, `mode=production`으로만 실행한다. 로컬 wrangler 우회나 실제 결제/운영 DB 쓰기 검증은 하지 않는다.

이 진입·패널 변경만 되돌릴 때는 해당 커밋만 revert한다. 전체 공간 비활성화는 기존 `MOONLIT_LOTUS_ENABLED=false` 계약을 따른다. 운영 릴리스는 기존 워크플로의 Pages/Worker 동시 검증·자동 롤백을 사용한다. 저장소 규칙상 dispatch 뒤 완료를 폴링하지 않으며, 실제 성공 확인 전 ‘운영 배포 완료’라고 보고하지 않는다.
