# 콘텐츠 검수 절차와 체크리스트

작성일 2026-11-14. 검수자: 박병하(운영자).

## 정한 것 (2026-11-14 사용자 결정)

- 검수 범위는 **핵심 허브만**이다.
- **실제로 읽은 뒤에만** 검수 표시를 단다. 읽지 않은 페이지에는 표시하지 않는다.
- 검수 원장(`lib/content/editorial-review.mjs`의 `CONTENT_REVIEWS`)은 지금 비어 있다. 운영자가 "URL · 확인한 날짜"를 알려 주면 그때 항목을 넣는다.

## 화면에 어떻게 보이나

페이지 아래 "제작·검수 안내" 칸에 한 줄이 있다.

- 원장에 항목이 없을 때: "전문가 개별 검수 확인 전"
- 원장에 항목이 있을 때: "검수 박병하 · 검수일 2026-11-20"

기존 고지 문구(제작 방식, AI 활용 범위, 정책 링크)는 그대로 남는다. 검수 줄만 바뀐다.

## 핵심 허브 목록

아래 12개는 원장에 항목을 넣으면 바로 검수 표시가 뜬다(테스트 `__tests__/ui/publisher-integrity.test.mjs`가 연결을 확인한다).

| 번호 | 주제 | 운영 URL | 원장에 쓰는 경로 |
|---|---|---|---|
| 1 | 사주 | https://code-destiny.com/saju/ | `/saju` |
| 2 | 만세력 | https://code-destiny.com/manse/ | `/manse` |
| 3 | 자미두수 | https://code-destiny.com/ziwei/ | `/ziwei` |
| 4 | 궁합 | https://code-destiny.com/compatibility/ | `/compatibility` |
| 5 | 사주 궁합 | https://code-destiny.com/saju/compatibility/ | `/saju/compatibility` |
| 6 | 타로 | https://code-destiny.com/tarot/ | `/tarot` |
| 7 | 오늘의 운세 | https://code-destiny.com/today/ | `/today` |
| 8 | 서양 점성술 | https://code-destiny.com/astrology/ | `/astrology` |
| 9 | 숙요점 | https://code-destiny.com/sukuyo/ | `/sukuyo` |
| 10 | 베다 점성 | https://code-destiny.com/vedic/ | `/vedic` |
| 11 | 꿈해몽 | https://code-destiny.com/dream/ | `/dream` |
| 12 | 연애운 | https://code-destiny.com/love/ | `/love` |

참고

- **토정비결 전용 허브는 지금 없다.** 신년운세는 `https://code-destiny.com/new-year-ai-consultation/`(원장 경로 `/new-year-ai-consultation`)가 가장 가깝고, 이 페이지도 원장에 넣으면 표시된다. 2027 신년운세 허브는 묶음 2-4에서 다룬다.
- 인사이트 글(`/insights/<글>/`)도 같은 방식으로 표시되지만 이번 범위(핵심 허브)에는 넣지 않았다.
- `/saju/guide/` 같은 가이드 페이지와 `/guides/<글>/`은 아직 원장과 연결돼 있지 않다. 범위를 넓히기로 하면 그때 연결한다.

## 페이지마다 확인할 것

페이지를 처음부터 끝까지 읽으면서 아래를 본다. 하나라도 걸리면 표시하지 말고 고칠 곳을 알려 준다.

1. **용어와 해석이 맞는가.** 명리·자미두수·타로 등 그 분야의 용어, 계산 설명, 예시가 틀리지 않았는지.
2. **단정하는 말이 없는가.** "반드시 ~한다", "~하면 이혼한다"처럼 결과를 못 박는 문장, 건강·법률·투자를 대신 판단하는 문장이 없는지.
3. **가격과 무료 범위가 지금과 같은가.** 무료라고 쓴 것이 실제로 무료인지, 가격·이용권 이름이 결제 화면과 같은지.
4. **로그인 안내가 사실인가.** "가입 없이"라고 쓴 기능이 실제로 로그인 없이 되는지.
5. **이름이 맞는가.** 서비스 이름은 "꿀꿀 운세", 상담 이름은 "영냥이 상담", 명리학자 소개가 사실과 같은지.
6. **자주 묻는 질문의 답이 본문과 어긋나지 않는가.**
7. **링크와 버튼이 설명한 곳으로 가는가.** 눌러서 확인한다.
8. **날짜가 들어간 말이 지금도 맞는가.** 연도, "올해", 기간 한정 문구.

## 확인한 뒤 알려 줄 것

아래 두 가지만 알려 주면 된다. 여러 개를 한 번에 보내도 된다.

```
https://code-destiny.com/saju/ · 2026-11-20
https://code-destiny.com/manse/ · 2026-11-20
```

- 날짜는 **실제로 읽은 날**이다.
- 읽은 뒤에 페이지 본문이 크게 바뀌면 다시 읽고 날짜를 새로 알려 준다.

## 원장에 넣는 항목 형식 (작업자용)

`lib/content/editorial-review.mjs`의 `CONTENT_REVIEWS`에 경로를 키로 넣는다. 경로 끝에 `/`를 붙이지 않는다.

```js
export const CONTENT_REVIEWS = Object.freeze({
  "/saju": {
    status: "verified",
    reviewer: "박병하",
    reviewedAt: "2026-11-20",
    evidence: "2026-11-20 운영자 박병하가 운영 페이지를 읽고 확인했다고 알려 옴(대화 기록)",
  },
});
```

- 네 값(`status: "verified"`, `reviewer`, `reviewedAt`, `evidence`)이 모두 있어야 표시된다. 하나라도 비거나 날짜가 실제 날짜가 아니면 "확인 전"으로 남는다.
- `adsAllowed`는 넣지 않는다. 광고 허용은 검수와 별개의 결정이다.
- 운영자가 알려 준 URL과 날짜만 넣는다. 알려 주지 않은 페이지를 미리 넣지 않는다.
- 넣은 뒤 `node --test __tests__/ui/publisher-integrity.test.mjs`와 `node scripts/verify-editorial-manuscripts.mjs`를 돌린다. 원장이 비어 있다고 가정한 검사가 있으면 그 검사가 무엇을 지키는지 읽고 맞춘다.
