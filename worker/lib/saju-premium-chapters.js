export const LOVE_SECRET_SOLO_CHAPTERS = Object.freeze([
  { title: "나의 사랑 원형", subtitle: "나는 어떤 방식으로 사랑하는가" },
  { title: "끌림의 공식", subtitle: "내가 끌리는 사람과 나를 끌어당기는 사람" },
  { title: "연애 패턴 분석", subtitle: "반복되는 사랑의 흐름" },
  { title: "표현과 소통", subtitle: "말, 침묵, 감정 전달법" },
  { title: "결혼운과 배우자운", subtitle: "오래 함께할 사람의 조건" },
  { title: "이별과 재회 패턴", subtitle: "멀어지는 이유와 다시 이어지는 조건" },
  { title: "나에게 맞는 연애 전략", subtitle: "사랑을 오래 지키는 법" },
  { title: "대운·세운으로 보는 연애 시기", subtitle: "시기별 만남과 관계 심화의 흐름" },
  { title: "사랑의 약점과 반전 전략", subtitle: "약점을 관계 자산으로 전환하는 실행법" },
  { title: "최종 연애 비책", subtitle: "이 명식의 사랑 사용법" },
]);

export const LOVE_SECRET_COMPAT_CHAPTERS = Object.freeze([
  { title: "두 사람의 기본 명식 요약", subtitle: "각자의 원국 축과 관계 기조" },
  { title: "나의 사랑 방식", subtitle: "내가 관계에서 여는 방식과 방어선" },
  { title: "상대의 사랑 방식", subtitle: "상대가 사랑을 받아들이고 표현하는 구조" },
  { title: "두 사람의 끌림 구조", subtitle: "끌림의 근거와 오래 가는 접점" },
  { title: "감정 속도와 표현 방식", subtitle: "감정 리듬과 소통 온도 조율" },
  { title: "갈등이 생기는 지점", subtitle: "충돌 촉발 요인과 완충 설계" },
  { title: "성격 차이와 현실 조율법", subtitle: "생활 리듬과 역할 조정 전략" },
  { title: "결혼 가능성과 생활 궁합", subtitle: "장기 파트너십의 현실 점검" },
  { title: "돈·일·관계의 현실 궁합", subtitle: "현실 운영에서의 협업 적합도" },
  { title: "이별 위험과 재회 가능성", subtitle: "거리감 신호와 회복 조건" },
  { title: "대운·세운으로 보는 관계 흐름", subtitle: "시기별 관계 변화와 기회" },
  { title: "최종 궁합 전략", subtitle: "두 사람이 오래 가기 위한 실행 로드맵" },
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
    totalChapters: 12,
    minTotalChars: 45000,
    chapterMinDefault: 3600,
    chapterTargetByIndex: Object.freeze({
      1: 3900, 2: 3800, 3: 3800, 4: 3800, 5: 3800, 6: 3800,
      7: 3800, 8: 3800, 9: 3800, 10: 3800, 11: 3800, 12: 3900,
    }),
    chapterMinByIndex: Object.freeze({
      1: 3600, 2: 3500, 3: 3500, 4: 3500, 5: 3500, 6: 3500,
      7: 3500, 8: 3500, 9: 3500, 10: 3500, 11: 3500, 12: 3600,
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