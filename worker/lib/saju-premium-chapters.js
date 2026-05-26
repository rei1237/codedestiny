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
  { title: "Ch.1 두 사람의 원국 요약", subtitle: "각자의 관계 기본 성향을 먼저 정리" },
  { title: "Ch.2 끌림의 구조", subtitle: "처음 끌림이 생기는 핵심 신호 분석" },
  { title: "Ch.3 관계 온도차", subtitle: "감정 표현 속도와 애착 리듬 비교" },
  { title: "Ch.4 소통 패턴", subtitle: "대화 방식과 오해 포인트 진단" },
  { title: "Ch.5 생활 궁합", subtitle: "현실 루틴과 책임 분배 적합도" },
  { title: "Ch.6 장기 안정 조건", subtitle: "관계를 오래 유지하는 운영 원칙" },
  { title: "Ch.7 갈등 패턴", subtitle: "반복되는 상처와 방어 구조 분석" },
  { title: "Ch.8 재회/이별 시그널", subtitle: "반복 인연 가능성과 경계선 정리" },
  { title: "Ch.9 관계 성장 포인트", subtitle: "서로를 성장시키는 협력 지점" },
  { title: "Ch.10 타이밍 전략", subtitle: "시기 운을 반영한 관계 의사결정" },
  { title: "Ch.11 90일 실행 플랜", subtitle: "갈등 완화와 신뢰 회복 실행안" },
  { title: "Ch.12 최종 궁합 로드맵", subtitle: "관계 유지 전략의 최종 정리" },
]);

export const LOVE_SECRET_COUPLE_ALL_CHAPTERS = Object.freeze([
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
    totalChapters: 12,
    minTotalChars: 44000,
    chapterMinDefault: 3200,
    chapterTargetByIndex: Object.freeze({
      1: 4100, 2: 3900, 3: 3900, 4: 3800, 5: 3800, 6: 3800,
      7: 3700, 8: 3700, 9: 3700, 10: 3700, 11: 3800, 12: 4000,
    }),
    chapterMinByIndex: Object.freeze({
      1: 3500, 2: 3300, 3: 3300, 4: 3200, 5: 3200, 6: 3200,
      7: 3100, 8: 3100, 9: 3100, 10: 3100, 11: 3200, 12: 3400,
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