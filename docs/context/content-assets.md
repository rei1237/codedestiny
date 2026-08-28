# 콘텐츠 자산(연이·음악·웹소설·관상) 규칙

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## Content Assets

- **캐릭터**: "연이(Yeon)" 마스코트 — `components/yeon/` (FloatingCharacter, SpriteFrame, TypewriterBubble 등)
- **연이 이미지 자산은 화면별로 용도가 고정되어 있다** — 이름이 비슷하다고 임의로 바꾸지 말 것:
  - 메인 홈 히어로 상단(`index.html` `.moon-hero__picture--mascot`): 연이 모드=자는 연이(`/fuctionassets/자는 연이.png`), 네오 모드=전략실 네오(R2 `DestinyWar/전략실 네오 메인-Photoroom.png`, `syncHeroMascot`가 테마 전환 시 교체)
  - 운명 찻집 타로 앨범 히어로(`src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx`의 `TarotAlbumHero`): 연이 스프라이트7(`fortuneTeaHouseAssets.yeoni.transparent.sprite7CharacterR2`)을 크롭+idle 애니메이션으로 표시 — 자는 연이 이미지로 바꾸지 않는다
  - 어떤 화면에 어떤 연이 자산이 맞는지 확실치 않으면 추측해서 교체하지 말고 반드시 먼저 사용자에게 확인한다(코딩 원칙 1번 참고)
- **음악**: `app/music/` 라우트, 실제 음원은 외부 CDN(`music.code-destiny.com`)에서 서빙 (레포에는 커버아트만 `public/music-covers/`)
- **웹소설/비주얼 노벨(브랜드 정체성)**: 텍스트 리더 `app/stories/`가 실제로 읽는 원문은 **`lib/stories/vn` 의 `STORY_EPISODES`** 다. `lib/stories/chapters/*`(32파일)와 `data.ts` 는 코드 임포터가 0이며 로그라인 집필용 산문 초고로만 보존한다(`lib/stories/vn/index.ts:7` 주석). 비주얼 노벨(VN)의 **정본은 `content/novel/episodes.source.json`**(프롤로그+EP.01~43 = 44화 8,844비트, 유일한 손편집 대상)이고, `npm run novel:build` 가 산출물 4계통을 만든다 — `public/data/novel/manifest.json`+`episodes/*.json`(44청크) · `lib/stories/vn/episodes.generated.json` · `content/novel/scene-matrix.generated.json`. `public/codedestiny-novel.html`(`/stories`에서 CTA 진입)은 **플레이어일 뿐이며 PR #1166 이후 대본을 인라인으로 갖지 않고 청크를 fetch 한다** — 🔴 대본을 여기서 직접 고치지 말 것. 정본을 고치면 sitemap 원장(45개 서명)도 어긋나니 `npm run sitemap:generate` 를 같은 커밋에 담는다. **전체 스토리 흐름은 만화 이누야샤 구조 참조**(고유명사·설정 차용 없이 구조만) — 가이드: [docs/webnovel_review/webnovel_story_guideline.md](../webnovel_review/webnovel_story_guideline.md), 결말 아크 상세: [docs/webnovel_review/webnovel_ending_arc_outline.md](../webnovel_review/webnovel_ending_arc_outline.md)
- **PDF 리포트**: 인생의 책은 `/life-book-ai`(구 `app/pdf/life-book`은 리다이렉트), PDF는 클라이언트에서 `html2canvas`+`jspdf`로 생성하며 현재 Worker 쪽 PDF 보조 로직은 `worker/lib/pdf-runtime.js`를 기준으로 본다.
- 이미지는 Next.js `<Image>` 컴포넌트 사용 (`img` 태그 금지) — 단, `next.config.mjs`에 `images.unoptimized: true` 설정됨
- **관상(동물상/얼굴 분석)**: React가 아니라 **루트의 바닐라 JS 규칙 엔진**(`AnalysisEngine.js`=얼굴 랜드마크→하드코딩 점수/템플릿, `PhysiognomyUI.js`=DOM 렌더/결제 게이트)이며 `index.html?action=openPhysiognomyApp` 모달로 구동. **LLM 미사용**. `app/physiognomy`·`app/animal/physio`는 SEO 랜딩 껍데기. ⚠️ **두 파일은 루트와 `public/`에 별도 사본으로 존재(심링크 아님) — 수정 시 반드시 `cp`로 동기화**. 리포트 섹션은 `expertReportHtml`(엔진)을 `PhysiognomyUI.js`의 `createExpertReportSections` 파서가 헤딩 키워드로 쪼개 카드로 렌더하므로, 섹션 HTML의 헤딩 문구와 파서 `headingKeywords`를 함께 맞춰야 한다. 오관·점 정밀 분석은 프리미엄(회당 5,000원, `physiognomy-ogwan-mole-deep`). 검증: `npm run verify:physiognomy-report`(jsdom 필요 — devDependency) + `verify:physiognomy-scoring`

## 콘텐츠 보이스 (2026-08-28 `AGENTS.md` 에서 이관)

- 제품 보이스는 전문적이고 신비롭되 감정적으로 자연스럽고 발이 땅에 붙어 있어야 한다. 🔴 **결정론적 공포 마케팅이나 결과 보장 표현을 쓰지 않는다.**
- UI 문구는 짧고 명확하며 행동 중심.
- 결과·리포트 문구는 풍부해도 되지만 구조가 있고 모바일에서 읽히는 형태여야 한다.
- 사주 문구는 오행 · 십신 · 일간 · 대운 · 충극을 **평이한 말로** 설명한다.
- 타로 문구는 감정의 흐름과 선택지를 서술한다 — 절대적 독심술처럼 쓰지 않는다.
- 점성술 · 베다 · 수쿠요 **체계를 섞지 않는다.**
- **연이 / 운명의 찻집**: 따뜻하고 부드러운 편지체.
- **네오 / 팩폭 전략실**: 직설적인 전략가 톤 — 다만 모욕하지 않는다.
- UI/UX 순간에 기존 비주얼이 원하는 감정·캐릭터 정체성·상담 몰입을 못 받쳐 주면, 필요한 원본 자산을 만들어 최적화된 WebP 로 넣는다. 검증된 기존 자산 재사용이 우선이지만, 자산이 없다는 이유만으로 중요한 UX 순간을 비주얼 없이 두지 않는다.
