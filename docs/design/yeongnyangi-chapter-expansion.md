# 영냥이 챕터 확장 — 건강·연애·결혼·이동/해외·사업운과 체계별 파생 근거

- 상태: 구현 완료(2026-10-04). [v7 카탈로그 설계](yeongnyangi-v7-chapter-catalog.md)의 장 구성·원장 규칙·원가 가드를 그대로 따른다.
- 이 문서는 무엇을 왜 더했는지 기록한다. 장 표의 정본은 `worker/yeongnyangi/fortune/reading-v7.ts`(`v7Catalog`)다.
- 요청(2026-10-03 네오): 건강운(연어부터, 명리 헬스 리포트 참조)과 함께 타고난 연애 스타일·연애운·결혼운·이동수·해외운을 넣는다. 해외운은 천간 병존·지지 역마·충(축미충 포함)과 엮어 본다. 오행 과다(토·금·목 등)의 특징을 넣는다. 고등어부터 십성·오행 발달로 성격을 잡는다. 자미·베다·점성술에도 건강운을 넣는다. 자미 사업운은 재백궁과 자녀궁을 함께 본다.

## 원칙

- **가격은 그대로 둔다.** 장 수는 현재 가격(3,000/5,000/10,000원)의 원가 상한(원가율 ≤ 0.1, 질문 8개와 예방 장 +1 포함) 안에서만 늘린다.
  - 상한은 연어 8, 광어 14(예방 장 포함 시 13 유지), 참치 29다.
  - 연어 독립 장 분리는 가격이 오른 뒤 1커밋으로 한다.
- **공용 엔진은 바꾸지 않는다.** 자미(`ziwei-ai-chart.js`)·베다·스위스 천체력의 반환값은 그대로다. 영냥이 전용 파생 모듈이 엔진 결과를 읽어 결정적 사실을 만든다. 그래서 다른 상품의 프롬프트와 원가는 그대로다.
- **근거가 없는 판정은 만들지 않는다.** 파생 사실은 성립 조건을 함께 싣는다. 조건이 일부만 맞으면 '부분 성립', 연결이 없으면 '해당 연결 없음'으로 둔다.
- **건강은 의학 판단이 아니다.** 아래 §건강 안전을 따른다.

## 파생 모듈 (LLM 없음, 결정적)

| 체계 | 파일 | 사실 | 소유 장 |
|---|---|---|---|
| 사주 | `worker/lib/saju-derived-signals.js` | `elementProfile`(오행 과다·발달·균형·부족·결핍과 특징), `tenGodProfile`(십성 군집·식상생재 등 조합), `movementSignals`(생지·역마·원국 충 6종·천간 병존·세운 충/역마 해, 해외운 근거 묶음), `healthBasis`, `romanceTiming` | anchor·elements·movement·health·loveLuck·marriageLuck, 고등어 v6 `self` |
| 자미 | `worker/yeongnyangi/fortune/ziwei/derived.ts` | `businessBasis`(재백·자녀·전택·관록 궁과 궁간 化祿·權·科·忌 비화·자화 연결, `ziweiPalaceFlights`), `healthBasis`(질액궁·대궁 부모궁·복덕궁, 살성 동궁) | business·wealth·health |
| 베다 | `worker/yeongnyangi/fortune/vedic/derived.ts` | 행성 품위(물라트리코나 포함), 고전 요가 성립 조건, `healthBasis`(1·6·8·12하우스 주인의 배치) | health·yogas(참치) |
| 점성술 | `worker/yeongnyangi/fortune/astrology/derived.ts` | 전통 7행성 본질 품위, `chartSect`(주간·야간), 1·6·7·10하우스 주인, 원소·모드 분포, `healthBasis` | anchor·aspects·tension·love·career·health |

- 오행 임계값은 헬스 리포트 `getHealthState`(`js/entertain-engine.js`)와 같다. 29% 이상은 과다, 16% 이하는 부족, 0개는 결핍이다. 특징 문구는 `HEALTH_ELEMENT_KNOWLEDGE`에서 기질과 생활 리듬만 옮기고 장부 단정은 뺐다.
- 이동수는 개수만으로 확정하지 않는다. 축미충 같은 원국 충과 천간 병존, 역마·생지를 묶어 '이동 기질'로 읽고, 세운이 원국을 충하거나 역마가 드는 해를 '이동 기회의 해'로 읽는다.
- 자미 사업운은 재백궁(현금 흐름)과 자녀궁(동업·투자·확장, 전택의 대궁)을 함께 본다. 재백 祿이 자녀·전택으로 들어가면 확장이 쌓이는 구조, 자녀 忌가 전택을 충하면 확장이 자산을 깎는 구조로 읽는다. 생년·궁간 비화는 원국 사실이라 전 등급에 허용한다. 유년사화는 계속 금지한다.

## 장 구성 (v7, 2026-10-04 실측)

| 체계 | 연어 | 광어 | 참치 | 바뀐 점 |
|---|---|---|---|---|
| 사주 | 8 | 13 | 28 | 참치에 `elements`·`loveLuck`·`marriageLuck`·`movement` 추가. 연어·광어는 anchor(오행·십성 기질)와 yearNow(이동수·연애/결혼 시기)에 합쳤다. spouse는 '결혼운과 배우자 자리'. |
| 자미 | 8 | 13 | 21 | 참치에 `business` 추가. 연어·광어는 wealth 장이 `businessBasis`를 소유한다. |
| 베다 | 8 | 13 | 23 | 장 수는 그대로. health·yogas 근거가 깊어졌다. |
| 점성술 | 8 | 10 | 12 | 장 수는 그대로. 품위·섹트·하우스 주인·원소 근거를 실제 계산으로 넘긴다. |

- 광어에 장을 더하면 예방 장(+1)까지 15장이 되어 원가율이 0.1을 넘는다(실측 0.1041). 그래서 광어 장 수는 유지했다.
- 점성술 금지어는 계산하지 않는 것만 남겼다. 트랜짓·프로그레션, 카이런·릴리스 같은 감응점, 현대 행성을 하우스 주인으로 읽는 것이다.

## 건강 안전

- 네 체계의 건강 장(`key==='health'`)은 프롬프트 `domainRules.healthContract`로 같은 `HEALTH_RULES`(`reading-v7-prompt.ts`)를 받는다. 베다 건강 파트의 8·12하우스 장(위기와 변화, 소모와 쉼)은 건강 장이 아니라 받지 않는다. 질병명·진단·치료·복약·검사 수치를 말하지 않고, 생활 리듬·수면·식사·운동·휴식 수준의 관리 포인트로만 쓰며, 걱정되는 증상은 의료진과 확인하라고 안내한다.
- 파생 `healthBasis`는 사실 안에 체계별 고지문을 싣는다(`SAJU_HEALTH_DISCLAIMER`, `ZIWEI_HEALTH_DISCLAIMER` 등. 사주 문구는 헬스 리포트 고지를 따른다).
- 질병 단정("병에 걸립니다", "질환이 생깁니다", "발병할 것입니다")은 `UNSUPPORTED_READING_CLAIM`으로 거절한다. 전달 단계(`providers/delivery.ts`)는 같은 목록으로 그 문장만 지우고 나머지 본문은 전달한다. 두 정규식은 함께 고친다.

## 전달 계약과의 정합 (2026-10-04)

- 결제 후 장 전달 계약(`worker/yeongnyangi/chapter-delivery-contract.js`)의 분량 하한은 `max(120, ceil(minimumChars × 0.5))`다(`CHAPTER_DELIVERY_FLOOR_RATIO`). 이 하한은 빈 응답·절단 감지용이다. 품질 분량은 `validateChapter`의 1회 분량 교정이 맡고, 분량만으로 구매자에게서 장을 빼지 않는다(원칙 17).
- `__tests__/ui/yeongnyangi-reading-invariance.test.mjs`는 모든 상품·종류의 mock 장을 이 계약으로 전달해 본다.

## 범위 밖 (후속)

- 다른 자미 상품(ziwei-ai 템플릿, deep report)에 사업운을 적용하는 일.
- 가격 인상 뒤 연어 독립 장(건강·연애운 등) 분리와 caps 테스트 상향.
- 점성술 광어·참치의 `aspects.none-conjunction` 미소유(기존 결함).
