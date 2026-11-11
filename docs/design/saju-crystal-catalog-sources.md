# 사주 원석 카탈로그 출처와 판단 (crystal-catalog-v1)

코드: `lib/saju/crystal-catalog.mjs` · 검토일 2026-11-11 · 테스트: `__tests__/ui/saju-crystal-catalog.test.mjs`

## 출처

| URL | 확인한 내용 |
|---|---|
| https://qiyicrystal.com/kr/wuxing | 원석을 **색**으로 오행에 나눈 목록(목·화·토·금·수) |
| https://qiyicrystal.com/kr/guide | 원석별 상징 의미(오행 표기 없음) |
| https://qiyicrystal.com/kr/crystals | 판매 목록(오행 표기 없음, 타이거아이는 금갈색 하나) |

참고 사이트의 문장·이미지는 옮기지 않았다. URL만 `sourceUrls`에 남기고, 설명(`description`)은 새로 썼다. 가격·판매 정보는 넣지 않는다(테스트로 막음).

## 판단

- **오행 근거는 색이다.** `element`와 `elementBasis`가 오행 근거를 담는다. 상징 의미(`symbolicMeanings`)는 별도 필드이며, 오행 판단에 쓰지 않는다.
- **타이거아이는 변종별로 따로 둔다.** 같은 이름이라도 색이 다르면 오행이 갈린다(wuxing 페이지 기준).
  - `tiger-eye-gold`: 토
  - `tiger-eye-red`: 화
  - `tiger-eye-blue`: 수
- **골드 루틸은 하나로 합쳤다.** wuxing 페이지 금 목록에 두 번 실려 있어 `gold-rutilated-quartz` 하나만 남겼다.
- **추천하지 않는 항목(`recommendable:false`, rank 90)**: 같은 유통명 아래 서로 다른 광물이 팔려, 품종을 확정할 수 없는 경우다.
  - `moon-stone-blue`(블루 문스톤)
  - `moon-stone-peach`(피치 문스톤)
  - `money-stone`(머니스톤)

  guide 페이지의 "문스톤" 링크가 라브라도라이트 내용으로 이어지는 것도 확인했다. 그래서 라브라도라이트는 독립 항목(수)으로 두었다.
- **id에 `moonstone`을 쓰지 않는다.** 월정석 코드명과 겹치지 않게 `moon-stone-*`로 쓴다.
- **테라헤르츠는 제외했다.** crystals 페이지에도 천연석이 아니라고 적혀 있다.
- **상징 의미의 출처.** guide 페이지에 없는 원석은 널리 알려진 상징을 뜻만 가져와 새 문장으로 썼다. 해당 원석: 그린 아벤츄린, 스모키 쿼츠, 화이트 칼세도니, 레드·블루 타이거아이, 라브라도라이트.
- **오행마다 추천 가능 원석을 2개 이상 둔다.** rank 1이 대표 원석이다. 엔진은 rank 순으로 고른다.

## 추천 가능 목록

| 오행 | id(rank 순) |
|---|---|
| 목 | amazonite, green-phantom-quartz, green-aventurine |
| 화 | amethyst, rose-quartz, tiger-eye-red |
| 토 | citrine, tiger-eye-gold, smoky-quartz |
| 금 | clear-quartz, gold-rutilated-quartz, white-chalcedony |
| 수 | obsidian, aquamarine, tiger-eye-blue, labradorite |

## 고지

원석의 오행과 의미는 전통적 해석과 문화적 상징을 바탕으로 한다. 건강이나 운세의 변화를 보장하지 않는다. 엔진의 `limitations`에 항상 이 문장을 붙인다.
