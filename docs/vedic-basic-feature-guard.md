# 베다점 기본 기능 보호 가이드 (재발 방지)

> 무료 **기본 베다점** 도구가 유료 **AI 베다점 상담** 이관 작업에 휩쓸려 사라졌던 사건의 기록과, 같은 실수를 반복하지 않기 위한 규칙.
> 최종 갱신: 2026-07-11

## 1. 무슨 일이 있었나

- **원래 상태**: 메인 화면의 **프로필 카드**와 **코즈믹 & 별자리 컬렉션** 카드에서 진입하는 무료 **기본 베다점**은, 브라우저 안에서 Swiss ephemeris(WASM)로 명반을 직접 계산하는 독립 도구 `vedic-astrology.html`(루트 + `public/`, ~6,552줄)이었다. (무료 기본 명반 + 궁합 5,000원)
- **사고**: 커밋 **`09c3f774`(2026-06-27) "Migrate premium reports to AI consultations"** 가 여러 **유료 프리미엄** 리포트를 AI 상담으로 이관하면서, 이관 대상이 아니었던 **무료 기본 도구 `vedic-astrology.html`까지 `/vedic-ai`로 튕기는 리다이렉트 스텁으로 덮어썼다.**
- **결과**: 파일 자체가 스텁이 되어, 이 파일로 향하던 **모든 기본 진입점**(프로필 카드, `/vedic/jyotish` 랜딩 CTA, 코즈믹 컬렉션 카드)이 전부 유료 AI 상담(`/vedic-ai`)으로 새어나갔다. 사용자 입장에서는 "기본 베다점이 사라지고 AI 상담으로 바뀐" 것.
- **복원(2026-07-11)**: `vedic-astrology.html`(루트+public)을 `09c3f774^` 시점 원본으로 되살리고, 진입 배선(액션 폴백·상세/프리뷰 레지스트리)을 basic으로 정정. **AI 상담(`/vedic-ai`)은 VVIP 프리미엄 카드 전용으로 그대로 유지**(두 기능 공존).

## 2. 근본 원인

**"대체"가 아니라 "추가"였어야 했다.** 무료 기본 기능과 유료 프리미엄 기능은 별개다. 프리미엄(유료 AI) 기능을 추가·이관하면서 기존 무료 기능의 진입 파일을 삭제·리다이렉트한 것이 사고의 본질이다.

## 3. 보호 규칙 (반드시 지킬 것)

1. **`vedic-astrology.html`(루트 + `public/` 2개 사본)은 무료 기본 베다점 클라이언트 도구다.** 스텁·리다이렉트로 바꾸지 말 것. 두 사본은 심링크가 아니므로 항상 함께 수정한다.
2. **`/vedic-ai`(React 라우트 + `/api/vedic-ai`)는 유료 AI 베다점 상담 전용이다.** 기본 진입점(프로필 카드/코즈믹 카드/랜딩 CTA)을 여기로 돌리지 말 것. AI 상담은 오직 **VVIP 프리미엄 카드**(`index.html`의 `tarot-tile--vedic-premium`, `data-feature-key="vedic-ai-consultation"`, `data-vedic-ai-card-marker`)에서만 진입한다.
3. **기본 베다점은 무료다.** 결제 게이트(이용권/월정석/단건결제) 대상이 아니다. basic 진입 액션에 유료 프리뷰/결제 로직을 붙이지 말 것.

## 4. 기본 베다점 진입 배선 지도

| 진입점 | 위치 | 도착 |
|---|---|---|
| 프로필 카드(베다점) | `public/js/destiny-profile.js` `_dpOpenFortuneType('vedic')` (`FORTUNE_APP_VEDIC_PAYLOAD` 구성 후) | `/vedic-astrology.html?vp=...` |
| 코즈믹 컬렉션 카드 | `index.html` `tarot-tile--vedic-fc` (앵커) | `/vedic/jyotish` 랜딩 → CTA |
| `/vedic/jyotish` 랜딩 CTA | `app/components/FeatureLandingPage.tsx` `ACTION_MAP['/vedic/jyotish']='navigateToVedic'` → `/index.html?action=navigateToVedic` | `navigateToVedic` 액션 |
| `navigateToVedic` 액션 | `index.html` (+ 5개 미러) 액션 핸들러 | destiny-profile 경유 → `/vedic-astrology.html` (폴백도 동일) |
| **VVIP 프리미엄 카드(AI)** | `index.html` `tarot-tile--vedic-premium` + 클릭 가드 | `/vedic-ai` (유료, **이것만 AI**) |

> `index.html`은 6개 셸 미러(`index.html`, `public/index.html`, `public/{en,ja,zh,static}/index.html`)로 존재한다. 위 배선을 고칠 때는 **6개 전부** 동일하게 반영한다.
>
> 상세/프리뷰 안내 레지스트리에서 `navigateToVedic` 키는 **무료 기본(`ct:'free'`)** 을 뜻한다. AI 카드용 프리뷰는 별도 키 `'vedic-ai-consultation'`(독립 객체)로 둔다 — `{inherit:'navigateToVedic'}`로 상속시키면 basic 복원 시 AI 카피가 깨지므로 금지.

## 5. 검증

- 무료 경로: 프로필 선택 → 베다점 진입 → `/vedic-astrology.html`에서 "베다 차트 계산하기"로 브라우저 내 명반 계산(무료)이 뜨는지.
- 랜딩/코즈믹: `/vedic/jyotish` CTA·코즈믹 카드 → 기본 도구 도달.
- 유료 경로 회귀 없음: VVIP 프리미엄 카드 → `/vedic-ai` 정상, `npm run verify:vedic-ai-flow` 통과.

## 6. 일반 작업 원칙 (요청받은 것만 정확히)

- **시킨 범위만 정확히 수행한다.** 인접 기능을 "정리"하거나 기존 동작을 삭제·대체하지 않는다.
- **기존 동작 제거/대체는 명시적 지시가 있을 때만 한다.** 이관/리팩터 작업의 영향 범위에 무료 기본 기능이 포함되면 반드시 분리한다.
- **불확실하면 항상 먼저 확인한다.** 해석이 여럿이거나 회귀 위험이 있으면 임의로 진행하지 말고 사용자에게 질문한다.

(프로젝트 코딩 원칙 `CLAUDE.md` #1 단순성·가정 명시, #6 회귀 위험 상시 점검과 연결. #3 수술적 변경은 2026-09-04 폐기)
