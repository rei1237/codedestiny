export const LOVE_SECRET_SOLO_CHAPTERS = Object.freeze([
  { title: "💘 본연의 연애 자아", subtitle: "일간·일지·월지·오행·십성으로 보는 기본 연애 코드" },
  { title: "🌹 치명적 매력과 페로몬", subtitle: "도화·홍염·화개와 표현성 기반 매력 해석" },
  { title: "🧲 내가 끌리는 상대와 인연 코드", subtitle: "배우자성·관계성 기반 이상형/주의형 분석" },
  { title: "💬 썸·고백·초기 연애 전략", subtitle: "초기 호감 형성 조건과 실전 대화 접근" },
  { title: "💞 깊은 관계에서의 애착 패턴", subtitle: "가까워질수록 드러나는 애착/불안 구조" },
  { title: "⚠️ 연애에서 반복되는 상처와 방어기제", subtitle: "반복 상처 패턴과 회복 대화 전략" },
  { title: "🏡 결혼·장기 관계 성향", subtitle: "장기 안정 구조, 책임감, 생활 궁합 조건" },
  { title: "💼 일·돈·자존감이 연애에 미치는 영향", subtitle: "현실 변수와 관계 운영 균형" },
  { title: "🕰️ 연애운과 시기 흐름", subtitle: "대운·세운 기반 시기 해석과 선택 타이밍" },
  { title: "🗝️ 최종 연애 처방전", subtitle: "핵심 매력·주의 패턴·실행 체크리스트" },
]);

export const LOVE_SECRET_COMPAT_CHAPTERS = Object.freeze([
  { title: "💞 두 사람의 기본 궁합 구조", subtitle: "일간·일지·오행 관계 기반 구조 진단" },
  { title: "🧲 끌림과 인연의 이유", subtitle: "오행/십성/매력성 상호작용 해석" },
  { title: "🔥 감정 흐름과 애착 구조", subtitle: "감정 리듬 차이와 안정화 전략" },
  { title: "⚔️ 갈등 구조와 위험 신호", subtitle: "합충형파해/오해 패턴 기반 위기 대응" },
  { title: "🏡 장기 관계와 현실 궁합", subtitle: "결혼·생활·돈·역할 분담의 현실 합의" },
  { title: "🕰️ 두 사람의 시기 흐름", subtitle: "양측 대운·세운 기반 타이밍 조율" },
  { title: "🗝️ 두 사람을 위한 최종 관계 처방전", subtitle: "관계 종합 진단과 실행 체크리스트" },
]);

export const LOVE_SECRET_COUPLE_ALL_CHAPTERS = Object.freeze([
  ...LOVE_SECRET_SOLO_CHAPTERS,
  ...LOVE_SECRET_COMPAT_CHAPTERS,
]);

export const LOVE_SECRET_MODE_CONFIG = Object.freeze({
  solo: Object.freeze({
    mode: "solo",
    reportType: "saju_love_solo",
    totalChapters: 10,
    minTotalChars: 36000,
    chapterMinDefault: 3200,
    chapterTargetByIndex: Object.freeze({ 1: 4200, 2: 3900, 3: 3900, 4: 3800, 5: 3800, 6: 3800, 7: 3800, 8: 3600, 9: 3600, 10: 3800 }),
    chapterMinByIndex: Object.freeze({ 1: 3600, 2: 3300, 3: 3300, 4: 3200, 5: 3200, 6: 3200, 7: 3200, 8: 3000, 9: 3000, 10: 3200 }),
    title: "프리미엄 사주 연애 비책 리포트",
    chapters: LOVE_SECRET_SOLO_CHAPTERS,
  }),
  couple: Object.freeze({
    mode: "couple",
    reportType: "saju_love_couple",
    totalChapters: 17,
    minTotalChars: 60000,
    chapterMinDefault: 3200,
    chapterTargetByIndex: Object.freeze({
      1: 4200, 2: 3900, 3: 3900, 4: 3800, 5: 3800, 6: 3800, 7: 3800, 8: 3600, 9: 3600, 10: 3800,
      11: 3900, 12: 3800, 13: 3800, 14: 3800, 15: 3800, 16: 3800, 17: 3900,
    }),
    chapterMinByIndex: Object.freeze({
      1: 3600, 2: 3300, 3: 3300, 4: 3200, 5: 3200, 6: 3200, 7: 3200, 8: 3000, 9: 3000, 10: 3200,
      11: 3300, 12: 3200, 13: 3200, 14: 3200, 15: 3200, 16: 3200, 17: 3300,
    }),
    title: "프리미엄 사주 궁합 비책 리포트",
    chapters: LOVE_SECRET_COUPLE_ALL_CHAPTERS,
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