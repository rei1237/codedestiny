# 진입 웹툰 콘티 「연이의 찻집에서, 당신의 흐름을」 · 2026-11-07

- 대본 정본은 `lib/brand/entry-webtoon.mjs`이고 이 문서는 콘티와 그림 프롬프트 초안이다. 대사가 바뀌면 모듈을 먼저 고치고 이 표를 맞춘다.
- 원안: 승인 계획 「웹툰 대본·콘티」 1~24번, 설계 `docs/superpowers/specs/2026-11-07-webtoon-entry-funnel-design.md`. 말투는 `docs/context/design-canon.md` §2를 따른다(인간 연이는 부드러운 존댓말로 "당신", 네오는 짧은 존댓말, 꽃돼지 연이는 밝고 짧게).
- 25컷: 그림 14컷과 HTML 11컷. 그림에는 글자와 말풍선을 넣지 않고 대사는 HTML로 그린다.
- 기록·반응·후기·언론·가격은 이 문서와 대본 모듈에 다시 쓰지 않는다. 렌더할 때 `lib/brand/trust-stories.mjs`, `lib/brand/customer-reviews.mjs`, `app/components/PressCoverage.jsx`, `worker/lib/paid-feature-registry.js`, `lib/brand/founder.ts`에서 읽는다.

## 그림 규칙 (Task 3)

- 화풍: 따뜻한 밤 찻집, 반실사 웹툰, 등불의 호박색과 남색 밤. 와이드 1080×720, 세로 1024×1536.
- 모든 프롬프트 끝에 `no text, no letters, no speech bubbles`를 붙인다.
- 네오는 은발에 회청색 눈을 가진 인간 남성이다. 사자 시트(`네오프로필1.png`, `네오프로필2.png`)는 참조하지 않는다. 혼자 팔을 벌리거나 고개를 젖히는 과시 포즈는 금지하고, 헌신은 연이를 향하게 그린다.
- 영냥이는 원본 크기로 귀가 2개인지 센다. 연이는 연꽃 머리핀과 스카프를 확인하고, 꽃돼지 연이는 꼬리까지 확인한다.

### 참조 시트 약어

| 약어 | 파일 |
|---|---|
| Y | `public/images/master-profiles/yeoni-teahouse-portrait.webp`, `D:\CodeDestiny-Build\여_연이 프로필 사복버전.webp` |
| N | `D:\CodeDestiny-Build\네오 인간 프로필1.png`(종족 칸 무시), `public/images/master-profiles/neo-strategy-portrait.webp` |
| P | `D:\CodeDestiny-Build\연이 프로필1.png`, `D:\CodeDestiny-Build\연이 프로필2.png`, `docs/design/character-references/yeoni-profile-v1.png` |
| C | `D:\CodeDestiny-Build\양냥이 프로필 시트.webp` |
| - | 인물 없음(배경·소품 컷) |

## 컷 표

| # | id | 장 | 종류 | 크기 | 대사 | 프롬프트 초안 | 참조 |
|---|---|---|---|---|---|---|---|
| 1 | imagine-night | imagine | 그림 | 1080×720 | 연이: 한번 상상해 볼까요? / 당신 앞날의 흐름을 미리 알 수 있다면. | Starry night over a quiet Korean alley; at the end a small traditional teahouse with warm paper lanterns glowing under the eaves; deep navy sky, amber light, gentle mist, inviting and calm | - |
| 2 | imagine-phone | imagine | 그림 | 1080×720 | 연이: 기다려야 할지, 먼저 연락해야 할지 알고 | Close-up of a hand holding a smartphone in a dim bedroom at night, the screen glow shows an unread message notification as a blank light shape, hesitant thumb hovering; soft blue light | - |
| 3 | imagine-desk | imagine | 그림 | 1080×720 | 연이: 움직일 때와 버틸 때를 알고 | Desk under a warm desk lamp at night: a sealed white envelope (resignation letter) and a closed bank passbook side by side, a cooling cup of tea; quiet, thoughtful mood | - |
| 4 | imagine-calendar | imagine | 그림 | 1080×720 | 연이: 올해 어디에 힘을 실어야 할지 안다면. | A wall calendar opened to a fresh new-year first page with blank grid, a single flower tucked into its binding, morning light from a window | - |
| 5 | imagine-yeoni | imagine | 그림 | 1024×1536 | 연이: 그 흐름을 미리 읽는 사람이 있어요. | Close-up portrait of human Yeoni in a pastel floral hanbok with lotus hairpin and scarf, standing under the teahouse lantern, soft knowing smile toward the viewer, warm rim light | Y |
| 6 | record-study | record | 그림 | 1080×720 | 캡션: 2024년 5월, 어느 밤의 서재. / 명리학자 네오, 박병하 | Side view of human Neo (silver-white hair, grey-blue eyes) writing a manuscript by hand at a wooden desk in a book-lined study on a spring night, desk lamp, stacked paper; calm and focused | N |
| 7 | record-first | record | HTML 기록 카드 | - | 캡션: 그해 봄, 네오는 다음 해의 흐름을 글로 남겼어요. | 카드: trust-stories 공개 기록 배열 인덱스 1(2024-05-12). 날짜·제목·인용·원글 링크·이후의 기록 | - |
| 8 | record-second | record | HTML 기록 카드 | - | 캡션: 보름 뒤, 또 하나의 기록. | 카드: 인덱스 2(2024-05-27). "시기에 관한 기록이며 모든 과정의 일치를 뜻하지 않아요"를 붙인다 | - |
| 9 | record-reactions | record | HTML 반응 카드 | - | 캡션: 시간이 흐른 뒤, 독자들이 그 글을 다시 찾아왔어요. | 카드: trust-stories 공개 반응과 `reactionsNote`(구매 후기가 아니라는 고지) | - |
| 10 | record-neo-tea | record | 그림 | 1080×720 | 네오: 운은 맞히려고 보는 게 아닙니다. / 대비하려고 봅니다. | Human Neo seated at a teahouse table, quietly setting down a celadon teacup, composed gaze slightly past the viewer, hands relaxed; lantern light, steam rising | N |
| 11 | decade-table | decade | 그림 | 1080×720 | 캡션: 10년, 한 사람씩. / 마주 앉아 한 사람의 흐름을 풀던 1:1 상담이었어요. | A consultation table for two with two teacups facing each other, notebook and brush, a window behind showing seasons blending from spring blossoms to snow | - |
| 12 | decade-reviews | decade | HTML 후기 카드 | - | (없음) | 카드: customer-reviews 3장과 "네오 1:1 상담·강의 이용자 후기" 고지. 이력 금액은 founder.ts에서 읽는다 | - |
| 13 | decade-handover | decade | 그림 | 1024×1536 | 네오: 더 많은 사람이 먼저 알 수 있게, 부탁합니다. | Human Neo holding out a bundled manuscript with both hands toward human Yeoni, slight respectful bow toward her; Yeoni receives it with both hands; warm lantern light between them, focus on the handover | N, Y |
| 14 | decade-sign | decade | 그림 | 1080×720 | 캡션: 그렇게 꿀꿀 운세가 문을 열었어요. / 계산은 규칙대로, 해설은 AI가. | Night street, a wooden teahouse signboard (blank, no lettering) just lighting up with lanterns, a small flower-pig motif carved on the corner, first visitors' shadows | - |
| 15 | decade-press | decade | HTML 언론 카드 | - | (없음) | 카드: PressCoverage(스타트업데일리) | - |
| 16 | question-door | question | 그림 | 1024×1536 | 연이: 오늘은 어떤 이야기가 궁금하세요? | A guest seen from behind, shoulders a little heavy, opening the teahouse sliding door; inside human Yeoni turns with a warm welcoming smile, lantern glow spilling out | Y |
| 17 | question-concern | question | HTML 고민 칩 | - | (없음) | 칩: `HOME_CONCERNS`(연애·재회·돈·이직·올해 흐름). 고른 값을 CTA 링크에 싣는다 | - |
| 18 | offer-pig | offer | 그림 | 1080×720 | 꽃돼지 연이: 제가 안내할게요! | Flower-pig Yeoni mascot with lotus ornament and scarf standing on the teahouse counter, waving cheerfully, curly tail visible, teacups and lantern behind | P |
| 19 | offer-manseryeok | offer | HTML 제안 카드 | - | 꽃돼지 연이: 01 무료 만세력! 당신의 사주 8글자와 한 줄 성향을 바로 보여 드려요. | 예시 카드에 "예시" 라벨 | - |
| 20 | offer-answer | offer | HTML 제안 카드 | - | 꽃돼지 연이: 02 무료 고민 답! 고른 고민에 두세 줄로 먼저 답해 드려요. | 고른 고민의 예시 답 | - |
| 21 | offer-deeper | offer | HTML 제안 카드 | - | 꽃돼지 연이: 03 더 깊게! 고민별 상담, 사주 평생 소장 묶음, 대표 상담 3종이 있어요. | 가격은 레지스트리에서 읽고 잠금 미리보기에 "지금은 일부만 보여요" | - |
| 22 | offer-safety | offer | HTML 안심 박스 | - | 대사 없음(안심 박스가 결제 전 예시 확인·자동 환불 문구를 한 번만 보여 줌) | 환불 정책 링크 `REFUND_POLICY_HREF`(`/refund-policy/`) | - |
| 23 | invite-tea | invite | 그림 | 1024×1536 | 연이: 당신의 흐름, 무료로 먼저 확인해 보세요. | Human Yeoni holding out a steaming teacup with both hands toward the viewer, gentle smile, teahouse interior softly blurred, lantern bokeh | Y |
| 24 | invite-cta | invite | HTML CTA | - | (없음, 버튼 `ctaLabel` "무료로 내 운세 보기") | `freeEntryHref(concern, 'entry_webtoon')`. 앵커 `#entry-invite` | - |
| 25 | invite-yeongnyangi | invite | 그림 | 1080×720 | 연이: 고양이에게 털어놓고 싶은 밤이라면, 영냥이도 기다리고 있어요. | Yeongnyangi, a fluffy white cat with exactly two ears, navy wizard hat with gold crescent, curled on a cushion by the teahouse window at night, looking up with half-lidded eyes | C |

보조 입구(`sideLinks`): "고양이에게 털어놓고 싶다면" → `/yeongnyangi/`, "꿀꿀 운세 둘러보기" → `/ggulggul/`. 마지막에 trust-stories `fine` 고지와 기존 푸터를 둔다.

## 화면 고정 요소

- 첫 화면 상단: `skipLabel` "건너뛰기 →"(`#entry-invite`).
- 두 번째 그림 컷(imagine-phone)이 화면 위로 지나가면 `stickyLabel` "바로 무료 운세 보기" 바를 보인다.
