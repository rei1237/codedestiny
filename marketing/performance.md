# 성과 기준선

관측 2026-09-09 KST. `미확인`은 0이 아니다. 아래 누적치는 동일한 노출 기간이 아니다.

| Threads 원글 | 조회수 표시 | 좋아요 | 답글 표시 | 리포스트 | 공유 표시 |
|---|---:|---:|---:|---:|---:|
| [9/8 일일](https://www.threads.com/@codedestiny_official/post/DdAInaxCl20) | 38 | 1 | 5 | 미확인 | 미확인 |
| [9/7 복구 공지](https://www.threads.com/@codedestiny_official/post/Dc-__BUnf41) | 113 | 미확인 | 미확인 | 미확인 | 미확인 |
| [9/7 일일](https://www.threads.com/@codedestiny_official/post/Dc9j0xTk_43) | 153 | 2 | 미확인 | 미확인 | 미확인 |
| [9/6 일일](https://www.threads.com/@codedestiny_official/post/Dc6_DRaCIqy) | 119 | 미확인 | 미확인 | 미확인 | 미확인 |
| [이용권 공지](https://www.threads.com/@codedestiny_official/post/Dc0jZw1HQJz) | 48 | 미확인 | 미확인 | 미확인 | 미확인 |
| [9/2 일일](https://www.threads.com/@codedestiny_official/post/Dcv8u3ajmLi) | 129 | 2 | 1 | 미확인 | 미확인 |
| [계수 9월](https://www.threads.com/@codedestiny_official/post/Dcu-BuUgDxd) | 약 2.5천 | 32 | 7 | 1 | 3 |
| [임수 9월](https://www.threads.com/@codedestiny_official/post/Dcu3K_1D83u) | 약 2.5천 | 31 | 7 | 1 | 2 |
| [신금 9월](https://www.threads.com/@codedestiny_official/post/DcuwQ6SiYwz) | 약 4.9천 | 33 | 8 | 1 | 미확인 |
| [경금 9월](https://www.threads.com/@codedestiny_official/post/DcupWa7gAml) | 약 2.7천 | 24 | 8 | 미확인 | 미확인 |
| [기토 9월](https://www.threads.com/@codedestiny_official/post/DcuifXYk7N_) | 미확인 | 46 | 7 | 미확인 | 3 |
| [정화 9월](https://www.threads.com/@codedestiny_official/post/DcuU1_8kppD) | 미확인 | 48 | 6 | 2 | 1 |

10건 이상 관측했으므로 가설을 수치와 연결한다: 월간 일간 해설이 일일 게시보다 누적 조회/반응이 컸다. 하지만 게시 나이, 길이, 주제, 연속 답글 수가 달라 원인을 하나로 확정할 수 없다. 사주 전문 해설을 유지하고 짧은 입문 Hook을 추가하되 이미 게시한 9월 일간 원고는 재게시하지 않는다. 숙요/자미두수 비교 데이터는 아직 없다. 답글 7개를 '독자 7명 반응'으로 합산하지 않는다.

## 수집 주기와 지표
각 신규 콘텐츠 게시 후 24h·72h·7d에 같은 시점 기준으로 누적값을 기록한다. 우선순위: 저장·공유 → 프로필 방문 → 사이트 클릭 → 무료 체험 → 가입 → 유료 전환. 조회수는 보조 지표.
- 저장률=저장/도달, 공유율=공유/도달. 도달이 없으면 계산하지 않는다.
- 프로필 방문률=해당 콘텐츠의 프로필 방문/도달. 계정 전체 방문을 개별 글에 나누지 않는다.
- 사이트 유입은 GA4의 UTM 세션. Instagram 링크 클릭과 GA4 세션은 서로 다른 수치다.
- Reels는 3초 유지·평균 시청·완주율을 제공되는 범위에서 기록. 제공되지 않으면 미확인.
- 가입/구매 전환은 실제 이벤트·귀속 기간·동의 범위를 확인하기 전에는 미측정. js/core/analytics.js에서 cdTrack/gtag는 확인했지만 전체 퍼널 이벤트가 검증된 것은 아니다.

## 실험 규칙
첫 7일 A=오해 바로잡기, B=일상 장면 질문. 각 주제별 동일 형식·같은 게시 후 시간으로 비교한다. 10개 이상 새 콘텐츠가 쌓이면 중앙값·표본수·총 도달을 함께 보고 승자를 정한다. 저장/공유가 높고 사이트 유입도 있는 패턴을 다음 주 10%p 늘린다. 낮은 패턴은 Hook 또는 형식 중 한 변수만 바꾼다. 동일 원고 재게시 금지.

## UTM
utm_source=threads 또는 instagram, utm_medium=organic_social, utm_campaign=yeoni_202609, utm_content=콘텐츠ID.
Instagram 고정 bio는 bio, Story 링크는 S01 등 개별 식별. bio에서 개별 Feed 기여도를 정확하게 역산할 수 없다. Threads 직접 링크는 해당 글 ID 사용. 생년월일·이름·질문을 UTM에 넣지 않는다.
