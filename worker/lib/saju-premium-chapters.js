export const LOVE_SECRET_SOLO_CHAPTERS = Object.freeze([
  { title: "Chapter I. 본연의 연애 자아 — 나는 어떤 사랑을 하는 사람인가", subtitle: "일간·월지·오행·십성으로 보는 사랑의 기본 구조" },
  { title: "Chapter II. 치명적 매력과 페로몬 — 나의 연애 매력 코드", subtitle: "첫인상, 도화·홍염·화개, 표현 매력의 실제 힘" },
  { title: "Chapter III. 운명의 상대방 리포트 — 나에게 맞는 사람과 피해야 할 사람", subtitle: "배우자궁·이성운·인연 유형·회피 기준" },
  { title: "Chapter IV. 연애 패턴 분석 — 왜 비슷한 사랑을 반복하는가", subtitle: "썸·집착·회피·질투·이별 패턴의 반복 구조" },
  { title: "Chapter V. 결혼운과 장기 인연 — 사랑이 현실이 되는 조건", subtitle: "결혼운, 배우자궁 안정성, 장기 관계의 지속력" },
  { title: "Chapter VI. 사랑의 운 흐름 — 대운·세운으로 보는 연애 타이밍", subtitle: "연애·재회·결혼·정비 시기의 흐름과 전략" },
  { title: "Chapter VII. 실전 연애 전략 — 사랑을 얻고 지키는 비책", subtitle: "고백, 대화, 거리감, 연애운 활용의 실행 매뉴얼" },
]);

export const LOVE_SECRET_COMPAT_CHAPTERS = Object.freeze([
  { title: "Chapter I. 두 사람의 궁합 총론 — 이 관계의 기본 구조", subtitle: "A/B 기본 정보, 일간 관계, 오행 균형, 총체적 안정성" },
  { title: "Chapter II. 서로의 연애 자아 — 사랑 방식의 차이와 공통점", subtitle: "애정 표현, 상처 지점, 속도 차이, 사랑의 언어" },
  { title: "Chapter III. 끌림과 매력 궁합 — 왜 서로에게 끌리는가", subtitle: "첫인상, 도화·홍염·화개, 합·충·친밀감의 구조" },
  { title: "Chapter IV. 관계 패턴 분석 — 두 사람은 왜 싸우고 왜 다시 끌리는가", subtitle: "오해, 자존심, 질투, 회복, 반복 갈등의 원인" },
  { title: "Chapter V. 결혼 궁합과 장기 인연 — 함께 살아갈 수 있는 관계인가", subtitle: "결혼운, 배우자상, 생활/가족/책임의 적합도" },
  { title: "Chapter VI. 속궁합과 친밀감 — 몸과 마음의 밀착도", subtitle: "스킨십, 애정 온도, 친밀감 속도와 주의점" },
  { title: "Chapter VII. 두 사람의 운 흐름 — 연애·결혼·이별·재회 타이밍", subtitle: "대운·세운·월별 흐름과 관계 운영 시기" },
  { title: "Chapter VIII. 최종 궁합 비책 — 이 관계를 어떻게 다뤄야 하는가", subtitle: "장점·약점·운영 전략·관계 지속 여부의 최종 판단" },
]);

export const LOVE_SECRET_MODE_CONFIG = Object.freeze({
  solo: Object.freeze({
    mode: "solo",
    reportType: "saju_love_solo",
    totalChapters: 7,
    minTotalChars: 28000,
    chapterMinDefault: 3200,
    chapterTargetByIndex: Object.freeze({ 1: 4400, 2: 3800, 3: 4000, 4: 3900, 5: 3900, 6: 3800, 7: 3900 }),
    chapterMinByIndex: Object.freeze({ 1: 3740, 2: 3230, 3: 3400, 4: 3315, 5: 3315, 6: 3230, 7: 3315 }),
    title: "프리미엄 사주 연애 비책 리포트",
    chapters: LOVE_SECRET_SOLO_CHAPTERS,
  }),
  couple: Object.freeze({
    mode: "couple",
    reportType: "saju_love_couple",
    totalChapters: 8,
    minTotalChars: 32000,
    chapterMinDefault: 3200,
    chapterTargetByIndex: Object.freeze({ 1: 4400, 2: 3900, 3: 4000, 4: 3900, 5: 3900, 6: 3800, 7: 4000, 8: 3900 }),
    chapterMinByIndex: Object.freeze({ 1: 3740, 2: 3315, 3: 3400, 4: 3315, 5: 3315, 6: 3230, 7: 3400, 8: 3315 }),
    title: "프리미엄 사주 궁합 비책 리포트",
    chapters: LOVE_SECRET_COMPAT_CHAPTERS,
  }),
});

export const SAJU_NEW_YEAR_CHAPTERS = Object.freeze([
  { num: 1, title: "연간 파동 총론 - 올해의 기본 기조", subtitle: "올해 운영의 중심축과 기본 태도" },
  { num: 2, title: "커리어 전략 - 성과가 나는 월/주의 월", subtitle: "일의 성과 창과 주의 구간 운영" },
  { num: 3, title: "재물 흐름 - 수익/지출 관리 타이밍", subtitle: "현금흐름 중심의 수익/지출 전략" },
  { num: 4, title: "관계·인맥 - 협업과 거리두기 전략", subtitle: "사람을 통한 확장과 경계 설계" },
  { num: 5, title: "연애·가정 - 감정 파동 관리법", subtitle: "가까운 관계의 감정 리듬 관리" },
  { num: 6, title: "건강·에너지 - 번아웃 방지 설계", subtitle: "회복 루틴과 에너지 운영 시스템" },
  { num: 7, title: "분기별 핵심 의사결정 포인트", subtitle: "1~4분기 선택 기준과 실행 체크" },
  { num: 8, title: "리스크 시나리오와 대응 플랜", subtitle: "문제 발생 전후 대응 단계 설계" },
  { num: 9, title: "12개월 Go/Stop 월별 테이블", subtitle: "월별 행동 판정과 즉시 실행 지침" },
  { num: 10, title: "최종 실행 로드맵 - 연말 회수 전략", subtitle: "상하반기 운영과 연말 결과 회수" },
]);

export const SAJU_NEW_YEAR_CHAPTER_TARGETS = Object.freeze([4800, 5200, 4800, 4400, 4800, 4200, 5200, 5200, 6200, 5200]);