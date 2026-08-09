export const LOVE_SECRET_SOLO_CHAPTERS = Object.freeze([
  { title: "타고난 성향과 사랑 원형", subtitle: "일간·오행으로 보는 타고난 기질을 먼저 짚고, 그 결이 사랑에서 어떻게 드러나는가" },
  { title: "끌림의 공식", subtitle: "내가 끌리는 사람과 나를 끌어당기는 사람" },
  { title: "연애 패턴 분석", subtitle: "반복되는 사랑의 흐름" },
  { title: "표현과 소통", subtitle: "말, 침묵, 감정 전달법" },
  { title: "연애에서의 불안과 집착", subtitle: "사랑받고 싶은 마음과 안정감의 리듬" },
  { title: "결혼운과 배우자운", subtitle: "오래 함께할 사람의 조건" },
  { title: "이별과 재회 패턴", subtitle: "멀어지는 이유와 다시 이어지는 조건" },
  { title: "조후로 보는 친밀감과 속궁합", subtitle: "관계의 온도와 정서적 밀착 리듬" },
  { title: "좋은 인연을 만나는 시기와 조건", subtitle: "대운·세운으로 보는 만남의 창" },
  { title: "나를 위한 연애 마스터플랜", subtitle: "앞으로의 사랑을 위한 실전 전략" },
]);

export const LOVE_SECRET_COMPAT_CHAPTERS = Object.freeze([
  { title: "나의 타고난 성향과 연애 결", subtitle: "일간·오행으로 보는 나의 기본 기질을 먼저 짚는다" },
  { title: "상대의 타고난 성향과 연애 결", subtitle: "상대의 기본 기질을 먼저 짚어 이해의 바탕을 세운다" },
  { title: "두 사람의 사랑 구조 총론", subtitle: "각자의 성향을 바탕으로 궁합의 핵심 결을 정리" },
  { title: "일간 궁합과 기본 기질", subtitle: "두 사람 기질의 상호작용" },
  { title: "일지 궁합과 관계의 뿌리", subtitle: "생활 밀착 영역의 궁합 진단" },
  { title: "배우자성으로 보는 사랑의 기대치", subtitle: "서로가 관계에서 바라는 기준" },
  { title: "오행 균형으로 보는 감정 궁합", subtitle: "감정 온도와 안정감의 균형" },
  { title: "조후로 보는 속궁합과 친밀감", subtitle: "정서적 밀착과 몸의 편안함" },
  { title: "대화와 표현 궁합", subtitle: "말의 결이 맞는 지점과 엇갈림" },
  { title: "갈등과 화해 패턴", subtitle: "충돌의 구조와 회복의 방식" },
  { title: "이별과 재회 가능성", subtitle: "관계 지속의 조건과 한계" },
  { title: "결혼과 장기 관계 궁합", subtitle: "현실 생활로 이어질 가능성" },
  { title: "현실 문제와 관계 유지 전략", subtitle: "돈·일·가족·생활의 실제 조율" },
  { title: "두 사람의 운 흐름과 타이밍", subtitle: "대운·세운으로 보는 전환점" },
  { title: "두 사람을 위한 최종 사랑 전략", subtitle: "관계를 이어가거나 정리할 기준" },
]);

export const LOVE_SECRET_COUPLE_ALL_CHAPTERS = Object.freeze([
  ...LOVE_SECRET_COMPAT_CHAPTERS,
]);

export const LOVE_SECRET_MODE_CONFIG = Object.freeze({
  solo: Object.freeze({
    mode: "solo",
    reportType: "saju_love_solo",
    totalChapters: 10,
    minTotalChars: 35000,
    chapterMinDefault: 3000,
    chapterTargetByIndex: Object.freeze({ 1: 3600, 2: 3600, 3: 3500, 4: 3500, 5: 3500, 6: 3500, 7: 3500, 8: 3400, 9: 3400, 10: 3500 }),
    chapterMinByIndex: Object.freeze({ 1: 3000, 2: 3000, 3: 2900, 4: 2900, 5: 2900, 6: 2900, 7: 2900, 8: 2800, 9: 2800, 10: 2900 }),
    title: "프리미엄 사주 연애 비책 리포트",
    chapters: LOVE_SECRET_SOLO_CHAPTERS,
  }),
  couple: Object.freeze({
    mode: "couple",
    reportType: "saju_love_couple",
    totalChapters: 15,
    minTotalChars: 54000,
    chapterMinDefault: 3500,
    chapterTargetByIndex: Object.freeze({
      1: 3900, 2: 3800, 3: 3800, 4: 3800, 5: 3800,
      6: 3800, 7: 3800, 8: 3800, 9: 3800, 10: 3800,
      11: 3800, 12: 3800, 13: 3800, 14: 3800, 15: 3900,
    }),
    chapterMinByIndex: Object.freeze({
      1: 3500, 2: 3400, 3: 3400, 4: 3400, 5: 3400,
      6: 3400, 7: 3400, 8: 3400, 9: 3400, 10: 3400,
      11: 3400, 12: 3400, 13: 3400, 14: 3400, 15: 3500,
    }),
    title: "프리미엄 사주 궁합 비책 리포트",
    chapters: LOVE_SECRET_COUPLE_ALL_CHAPTERS,
  }),
});

export const SAJU_NEW_YEAR_CHAPTERS = Object.freeze([
  { num: 1, title: "Ch.1 연간 파동 총론 — 올해의 기본 기조", subtitle: "원국/대운/세운 기반 연간 구조 해석" },
  { num: 2, title: "Ch.2 커리어 전략 — 성과가 나는 일의 방향", subtitle: "성과 전환과 커리어 판단 기준" },
  { num: 3, title: "Ch.3 재물 흐름 — 수익과 지출 관리 타이밍", subtitle: "수익화/손실 방어의 실전 기준" },
  { num: 4, title: "Ch.4 관계·인맥 — 협업과 거리두기 전략", subtitle: "관계 에너지 최적화" },
  { num: 5, title: "Ch.5 연애·가정 — 감정 파동과 가까운 관계", subtitle: "가까운 관계의 정서 운영" },
  { num: 6, title: "Ch.6 건강·에너지 — 번아웃 방지 설계", subtitle: "과열/회복 밸런스 설계" },
  { num: 7, title: "Ch.7 분기별 핵심 의사결정 포인트", subtitle: "분기별 Go/Stop 기준" },
  { num: 8, title: "Ch.8 리스크 시나리오와 대응 플랜", subtitle: "손실 최소화 대응 매뉴얼" },
  { num: 9, title: "Ch.9 12개월 월별 운세 테이블 — Go/Stop 월별 전략", subtitle: "1월~12월 월별 실행 포인트" },
  { num: 10, title: "Ch.10 최종 실행 로드맵 — 연말 회수 전략", subtitle: "연말 회수와 다음 해 연결" },
]);

export const SAJU_NEW_YEAR_CHAPTER_TARGETS = Object.freeze([4800, 5200, 4800, 4400, 4800, 4200, 5200, 5200, 6200, 5200]);