# 콘텐츠 자산(연이·음악·웹소설·관상) 규칙

> 이 파일은 필요할 때만 읽는 참조 문서입니다. 항상 로드되는 규약 요약은 루트 [CLAUDE.md](../../CLAUDE.md)에 있습니다.

## 캐릭터 삽화 제작 원본

표지·웹툰·홈 삽화를 제작할 때 아래에서 등장인물 전원의 시트를 골라 이미지 입력으로 첨부한다. 원본 폴더는 `D:\CodeDestiny-Build`다.

| 인물과 형태 | 참조 파일 | 확인할 특징 |
|---|---|---|
| 연이 · 인간형 | 여_연이 프로필 사복버전.webp | 장밋빛 긴 머리와 꽃장식 |
| 연이 · 꽃돼지 | 연이 프로필1.png, 연이 프로필2.png | 분홍 연꽃, 보라색 스카프, 둥근 주둥이 |
| 네오 · 인간형 | 네오 인간 프로필1.png | 은발과 푸른 눈 |
| 네오 · 사자 | 네오프로필1.png, 네오프로필2.png | 주황 갈기와 붉은 스카프 |
| 영냥이 | 양냥이 프로필 시트.webp | 흰 장모, 초승달 모자와 남색 망토 |
| 무성 | 무성 프로필 시트.png | 까마귀 부리 후드와 보라색 술 |
| 서한비 | 서한비 프로필 시트.png | 긴 흑발, 검은 레이스와 붉은 보석 |
| 윤달 | 윤달 프로필 시트.png | 낮게 묶은 머리와 원형 펜던트 |
| 흑월 | 흑월 프로필 시트.png | 인간형의 붉은 꽃과 검은 일식 형상을 장면에 맞춰 구분 |

인간형 상담 본편과 마스코트 이용 안내의 형태를 구분한다. 원고 대사·도표, 컷마다 등장하는 인물 수와 장신구를 시트와 대조하고, 홈 표지·목록 미리보기·본편에서 각각 확인한다.

## Content Assets

- **캐릭터**: 상담가 셋 — 영냥이(주인공, `app/yeongnyangi/`, 마스터 이미지 `public/assets/yeongnyangi/original/hero-800.webp`)·연이(꽃돼지, `components/yeon/` YeonSpriteFrame 등)·네오. 정체성·목소리 정본은 [design-canon](design-canon.md)
- **연이 이미지 자산은 화면별로 용도가 고정되어 있다** — 이름이 비슷하다고 임의로 바꾸지 말 것:
  - 꽃돼지 홈(`/ggulggul/`, 정적 셸 `index.html`) 히어로 상단(`.moon-hero__picture--mascot`): 연이 모드=자는 연이(`/fuctionassets/자는 연이.png`), 네오 모드=전략실 네오(R2 `DestinyWar/전략실 네오 메인-Photoroom.png`, `syncHeroMascot`가 테마 전환 시 교체)
  - 운명 찻집 타로 앨범 히어로(`src/features/fortune-tea-house/components/DestinyCafeTarotAlbum.tsx`의 `TarotAlbumHero`): 연이 스프라이트7(`fortuneTeaHouseAssets.yeoni.transparent.sprite7CharacterR2`)을 크롭+idle 애니메이션으로 표시 — 자는 연이 이미지로 바꾸지 않는다
  - 어떤 화면에 어떤 연이 자산이 맞는지 확실치 않으면 추측해서 교체하지 말고 반드시 먼저 사용자에게 확인한다(코딩 원칙 1번 참고)
- **음악**: `app/music/` 라우트, 실제 음원은 외부 CDN(`music.code-destiny.com`)에서 서빙 (레포에는 커버아트만 `public/music-covers/`)
- **웹소설/비주얼 노벨(브랜드 정체성)**: 텍스트 리더 `app/stories/`가 실제로 읽는 원문은 **`lib/stories/vn` 의 `STORY_EPISODES`** 다. 구 소설 산문 코드(`lib/stories/chapters/*`, `data.ts`, `types.ts`, `metrics.ts`)는 사용자 요청으로 2026-09-15 삭제했다. 라이트 노벨과 그 텍스트 리더는 유지한다. 비주얼 노벨(VN)의 **정본은 `content/novel/episodes.source.json`**(프롤로그+EP.01~53 = 70화 7,693비트, 유일한 손편집 대상)이고, `npm run novel:build` 가 산출물 4계통을 만든다 — `public/data/novel/manifest.json`+`episodes/*.json`(70청크) · `lib/stories/vn/episodes.generated.json` · `content/novel/scene-matrix.generated.json`. `public/codedestiny-novel.html`(`/stories`에서 CTA 진입)은 **플레이어일 뿐이며 PR #1166 이후 대본을 인라인으로 갖지 않고 청크를 fetch 한다** — 🔴 대본을 여기서 직접 고치지 말 것. 정본을 고치면 sitemap 원장(화별 서명)도 어긋나니 `npm run sitemap:generate` 를 같은 커밋에 담는다. **전체 스토리 흐름은 만화 이누야샤 구조 참조**(고유명사·설정 차용 없이 구조만) — 가이드: [docs/webnovel_review/webnovel_story_guideline.md](../webnovel_review/webnovel_story_guideline.md), 결말 아크 상세: [docs/webnovel_review/webnovel_ending_arc_outline.md](../webnovel_review/webnovel_ending_arc_outline.md)
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
- **영냥이 / 달빛 점술방**: 반말, 직설적이지만 결국 다정한 전문 상담가(핵심 판단 먼저 → 이해 → 작은 행동, 응원은 한마디에). 세 상담가의 말투 정본은 상담 프롬프트다([design-canon](design-canon.md) §2).
- UI/UX 순간에 기존 비주얼이 원하는 감정·캐릭터 정체성·상담 몰입을 못 받쳐 주면, 필요한 원본 자산을 만들어 최적화된 WebP 로 넣는다. 검증된 기존 자산 재사용이 우선이지만, 자산이 없다는 이유만으로 중요한 UX 순간을 비주얼 없이 두지 않는다.
