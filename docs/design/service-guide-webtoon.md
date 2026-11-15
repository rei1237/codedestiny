# 서비스 설명 이용 안내 웹툰

2026-11-15. `/entry-webtoon/`을 운세·상담 선택을 돕는 이야기 목차로 확장한다. URL, 계산 엔진, 상담 입력, 이용권·월정석·단건 결제 및 결과 보관 동작은 유지한다.

## 대본과 화면

- `lib/brand/entry-webtoon.mjs`: 찻집 프롤로그와 기존 브랜드 이야기. 기존 CMS 대사 키를 유지한다.
- `lib/brand/service-guide-webtoon.mjs`: 사주 입문·오늘의 운세·타로·숙요·영냥이의 3컷 안내 5편, 대표 상담 6종·전문가 상담 7종의 목차. 원화 메타데이터는 기존 대본에서 참조한다.
- `lib/brand/consultation-webtoons.mjs`: 기존 13편의 원화·컷 순서를 유지하고 `episode` 제목과 대사를 편집한다. 흑월의 경고에서는 확정 미래 표현을 경고와 선택의 언어로 바꾼다.
- `app/_entry/ServiceGuide.tsx`: 서버 HTML 목차와 기본 `details`로 선택해 읽는다. 결제·상담 생성 호출은 하지 않는다.
- `app/consultations/[slug]/page.tsx`: 서비스명과 에피소드 제목을 구분하고, 창작 예시임을 첫 컷 전에 알린다. 기존 `PriceBadge`와 서비스 레지스트리 링크를 사용한다. 기존 noindex와 canonical을 유지한다.

전체 제목은 `SERVICE_GUIDE_LABEL`에 둔다. 정적 홈은 `templates/home-funnel.html`과 `public/i18n/*.json`의 기존 번역 키를 사용하며 `npm run sync:public`으로 셸을 생성한다. CMS 메뉴의 이름만 변경하고 네임스페이스·저장 키는 바꾸지 않는다. 새 안내 5편과 개별 상담 대사는 코드 관리 대상이며 기존 CMS 대사 편집 목록에는 포함되지 않는다.

## 이야기의 기준

각 편은 생활 속 고민 → 해당 서비스가 읽는 근거 → 등장인물이 고르는 작은 행동으로 끝난다. 인물에게 가상의 개인 명식 수치를 부여하거나 실제 구매 후기처럼 쓰지 않는다. 시기 예시는 개인 결과와 구분한다.

| 안내 | 확인한 구현·정본 | 편집 기준 |
|---|---|---|
| 기본 사주·라이트 풀이 | `lib/marketing/home-concerns.mjs`, `lib/marketing/free-promo.mjs`, `worker/lib/paid-feature-registry.js` | 무료 만세력과 별도 이용 조건이 있는 라이트·대운 풀이 구분 |
| 오늘·내일의 운세 | `app/fortune/[period]/page.tsx` | 띠·별자리 공통 해석과 개인 상담 구분 |
| 연애 비책 | `worker/lib/love-secret-ai-prompt.js` | 일간·오행과 실제 질문으로 관계의 표현 방식 설명 |
| 네오 | `src/features/neo-war-room/data/method-registry.ts` | 네 체계 중 선택한 근거와 현실의 확인 조건 구분 |
| 운명의 찻집 | `src/features/fortune-tea-house/lib/buildFortuneTeaPrompt.ts`, `app/consultations/story-masters.ts` | 선택한 명식·카드와 질문, 실행 조언 연결 |
| 자미두수 | `worker/lib/ziwei-ai-prompt.js` | 궁·별·사화를 생활 영역으로 풀이 |
| 베다점 | `worker/lib/vedic-ai-prompt.js` | 라그나·나크샤트라·다샤 구분 |
| 서양 점성술 | `worker/lib/astrology-ai-prompt.js` | 태양·달·상승궁, 하우스·애스펙트 설명; 출생 시각의 영향 유지 |
| 초융합 | `worker/lib/fusion-fortune-prompt.js` | 여섯 체계의 일치와 차이를 함께 제시 |
| 나머지 대표·전문 상담 | `lib/brand/consultation-stories.mjs`, `app/consultations/story-masters.ts`, `lib/records/service-registry.js` | 서비스별 기존 해석 범위·담당·진입 경로 유지 |

## 원화와 읽기 화면

새 이미지 생성 없이 기존 달빛 예화 원화를 재사용한다. 출처는 `docs/design/entry-webtoon-assets.json`과 `docs/design/consultation-webtoon-assets.json`이다. 안내편은 기존 컷의 인물·장면과 맞는 대사로 각색한다. 그림 안에 글자를 굽지 않고 HTML 대사로 제공한다.

기존 진입 웹툰의 밤색·등불·한지 토큰을 상담 웹툰에도 적용한다. `CutReader`의 `lantern` 톤만 추가하며 다른 읽기 화면의 기본 톤은 유지한다. 새 대사는 17px, 넉넉한 행간으로 표시한다. 제목에는 기존 주아체 토큰, 설명에는 본문 글꼴을 사용한다.

고민 선택기는 `data-entry-cta`의 주소를 무료 사주 경로로 갱신한다. 따라서 안내 목차 링크에는 이 속성을 붙이지 않으며 기존 상단 고정 무료 사주 버튼과 마지막 CTA는 원래 연결을 유지한다.

## 화면 검수

mock 환경에서 안내·연애 비책·베다점 화면을 360·390·430·1280px로 확인했다. 가로 넘침과 로드 완료된 이미지의 깨짐은 없었다. 안내 5편의 펼침·접힘, 각 3컷과 서비스 링크, 대표 6종·전문가 7종의 목차 연결을 확인했다.

말풍선은 17px, 행간 1.85, 먹색과 종이 배경의 대비 13.06:1이다. 목차 링크는 48px, 안내 펼침 영역은 최소 104px, 개별 상담 내비게이션은 44px 이상이다. 검수 중 발견한 안내문 색의 말풍선 침범은 상위 문단 스타일의 적용 범위를 좁혀 해결했다. 그림 재생성·자르기·보정은 하지 않았다.
