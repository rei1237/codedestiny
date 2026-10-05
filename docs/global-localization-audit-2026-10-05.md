# 해외 현지화 점검과 출시 기준 — 2026-10-05

## 확인한 현재 상태

- UI/AI 공통 locale 정본은 ko/en/ja/zh-CN/zh-TW/vi/hi/es/fr/de/nl/ms 12개다.
- 일반 AI 상담은 ai-locale-context → Gemini/LLM 공통 언어 지시 경로를 쓴다. 영냥이는 구입 시 저장한 reading locale을 사용한다. 언어 선택을 국적·거주국·종교로 해석하지 않는다.
- PayPal PortOne V2 USD 주문/승인 경로가 이미 있다. 이번 작업은 표시 문구만 변경한다. PayPal은 서버가 사용 가능 설정을 제공하기 전에는 잠겨 있다. 실결제/운영 설정의 정상 작동을 검증한 것은 아니다.
- 전체 유료 콘텐츠가 12개 언어로 제공되는 상태는 아니다. 아래 한국어 전용 유형을 임의 해제하면 결제 후 생성 거부 또는 한국어 입력 화면이 생긴다.

## 이번 코드 변경

- 공통 결제수단 및 이용권 결제 화면에 PayPal 국제 결제/USD 안내. 12개 언어. 기존 국내 결제수단, 이용권·월정석·단건 정책 유지.
- 메인 영냥이 입구를 상담실 첫 넓은 카드로 배치. 소개·CTA·이동 장면 12개 언어 적용. 기존 640ms 전환에서 마지막 문구가 사라지는 동작을 제거하고 잔잔한 선의 확장으로 연결. 모션 감소 설정 유지.
- 대통령 관련 원문을 탐색 가능한 기록 섹션으로 배치. 윤석열/이재명, 공개일, 한국어 원문 링크를 노출. 사전 기록과 후속 사건의 비교를 강조하며 정확도 수치나 미래 보장은 넣지 않음.
- 공통 AI 지시에 언어별 용어·문체 지침 추가. JSON 키·계산 근거·생시·시간대 보존.
- 영냥이 차트 해설의 vi/hi/es/fr/de/nl/ms 영어 폴백을 231개 현지어 문자열로 대체.

## 남아 있는 전체 유료 콘텐츠 현지화 범위

| 유형 | 현재 제한/빈틈 | 필요한 작업 |
|---|---|---|
| 건강, 사주 결혼·이동, 자미 사업 | consultation-kinds의 koOnly 및 미번역 메뉴 | 메뉴·전용 설명·출력 계약 번역. 건강 질병/발병 단정 검사에 언어별 fixture 필요 |
| 자미/베다/점성술 관계 상담, 타로 관계 유형 | relationship-copy 45문구, 질문/체계 설명, 한국어 강제 locale | 11언어 495문구 및 질문/설명 번역, ProfilePicker/관계 의식 locale 연결 |
| 타로 맞춤 배열 v3 | 플래너 한국어 고정, 19개 배열/9개 프리셋 | UI/입력 상태/추천 질문의 현지어 지원. 카탈로그 457개 한국어 문자열은 내부 프롬프트를 포함하므로 UI와 구분 |
| symbolic mode | 질문하늘/신점 검증기가 한국어 근거 문구 일치에 의존 | locale 독립 근거 ID 계약으로 먼저 검증 가능하게 하고, 언어별 안전 fixture와 UI 번역 이후 개방 |

관련 코드: worker/yeongnyangi/service.ts, fortune/consultation-kinds.ts, fortune/reading-quality.ts, fortune/spirit.ts, fortune/question-sky-reading.ts, app/yeongnyangi/_lib/relationship-copy.ts, _components/RelationshipJourney.tsx, TarotSpreadPlanner.tsx.
현재 제한은 사용자에게 제공할 수 없는 결과를 판매하지 않기 위한 기존 계약이므로 유지한다. 전체 현지화 완료로 홍보하지 않는다.

## 해외 시장과 용어

미국을 무경쟁 시장이라고 보지 않는다. Pew의 2025-05-21 발표(2024년 조사)는 미국 성인 30%가 연 1회 이상 점성술·타로·점술을 이용하며, 상당수가 재미로 이용한다고 밝혔다. 수요의 근거이지 Code Destiny 전환율·시장점유율의 근거는 아니다.
https://www.pewresearch.org/religion/2025/05/21/3-in-10-americans-consult-astrology-tarot-cards-or-fortune-tellers/

국가 간 비교는 문항/조사대상이 다른 만큼 이용률 순위로 단순 결합하지 않는다.
https://www.pewresearch.org/religion/2025/05/06/spells-curses-and-ways-to-see-the-future/

다음 우선순위는 서비스 보유 콘텐츠와 언어 적합성을 바탕으로 한 실행 제안이며 매출 실측이 아니다.

| 우선 테스트 | 표현·포지셔닝 | 첫 콘텐츠 |
|---|---|---|
| 미국/영어권 | Korean Saju / Four Pillars of Destiny / personalized reading. fortune-telling만 반복하지 않음 | Saju vs birth chart, 관계 패턴, 커리어 선택. 영냥이 소개→질문→상담 유형→PayPal |
| 일본 | 四柱推命·紫微斗数·宿曜·相性. 체계 구분 | 生まれ持った気質, 関係の距離感. 과도한 단언·적중률 제외 |
| 대만 등 번체 사용자 | 八字·紫微斗數·命盤·流年 | 체계별 풀이 근거와 감정/사업 선택 |
| 간체 사용자 | 四柱命理·紫微斗数·合盘 | 모호한 开运 보장보다 성향·선택 설명. 언어만으로 거주국·결제 가능성 단정 금지 |
| 베트남 | Saju Hàn Quốc / Tứ trụ, Tử Vi 체계 구분 | 연애·직업·자기이해 |
| 힌디어 사용자 | साजू, वैदिक ज्योतिष·लग्न·राशि·नक्षत्र 체계 구분 | 코리안 사주와 베다의 차이. 종교/카스트/가족역할 가정 금지 |
| 스페인어 | Saju coreano / lectura personal | relaciones·trabajo·patrones. 불필요한 지역 속어 제외 |
| 프랑스어 | Saju coréen / lecture personnalisée | connaissance de soi·relations, 부드러운 존칭 |
| 독일어 | koreanische Vier-Säulen-Deutung | 명료한 근거와 구체적 선택, 과장 배제 |
| 네덜란드어 | Koreaans Saju / persoonlijke duiding | 간결하고 자연스러운 자기이해 |
| 말레이어 | Saju Korea / bacaan peribadi | 성찰과 선택. 종교적 권위·신앙 가정 금지 |

## 대통령 기록의 사용 기준

자사 보유 기록의 날짜와 원문 링크를 우선 제시한다. 해외 이용자에게는 두 인물과 한국 정치 상황을 설명할 필요가 있으므로, “대통령을 맞혔다”만 단독 노출하지 않는다. 이재명에 관한 원문 표현인 ‘혁명’을 단순히 실제 사건과 동일시하지 않는다.

원문 링크: https://blog.naver.com/neosaju/223444062729 (2024-05-12), https://blog.naver.com/neosaju/223459696339 (2024-05-27).
웹 도구는 이번 점검에서 Naver 원문 접근에 실패했다. 날짜/링크는 저장소의 기존 신뢰 기록을 재사용했고 새 직접 인용을 추가하지 않았다. 따라서 ‘독립적으로 검증된 적중’이라고 쓰지 않는다.
후속 사건 참조: https://apnews.com/article/a754f6c7fe8f44d15e2898b59b9a5f3c

## 출시 후 실측할 것

언어별 영냥이 진입률, 상담 유형 선택, 결제수단 노출→PayPal 선택→승인→결과 제공·재열람까지 구분해 본다. 기존 이벤트를 먼저 사용하고 새 추적기/개인정보 수집은 이번 작업에 추가하지 않는다. 번역된 광고 문구를 실제 발행하거나 광고비를 집행하지 않았다.

mock 테스트는 언어 계약·문구 완전성·결제 선택 보존의 근거다. 실 LLM 결과의 문장 품질, 원어민 감수, 국가별 실제 PayPal 결제 성공, 운영 배포를 증명하지 않는다.
