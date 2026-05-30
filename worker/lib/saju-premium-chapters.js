export const LOVE_SECRET_SOLO_CHAPTERS = Object.freeze([
  { title: "나의 연애 기본값", subtitle: "사랑 앞에서 드러나는 진짜 성향" },
  { title: "끌림의 패턴", subtitle: "내가 강하게 반응하는 사람" },
  { title: "배우자궁 해석", subtitle: "인연이 들어오고 머무는 자리" },
  { title: "도화·홍염·화개", subtitle: "매력과 고독의 사랑 신호" },
  { title: "연애의 강점", subtitle: "사랑에서 빛나는 나의 무기" },
  { title: "반복되는 연애 실수", subtitle: "무너지는 지점과 방어 패턴" },
  { title: "결혼 가능성과 장기 인연", subtitle: "관계가 현실이 되는 조건" },
  { title: "이별과 회복", subtitle: "마음이 닫히고 다시 열리는 방식" },
  { title: "연애운의 타이밍", subtitle: "대운·세운으로 보는 흐름" },
  { title: "사랑을 위한 실행 전략", subtitle: "좋은 인연을 붙잡는 법" },
]);

export const LOVE_SECRET_COMPAT_CHAPTERS = Object.freeze([
  { title: "두 사람의 인연 구조", subtitle: "두 사람을 묶는 인연의 기본 골격 분석" },
  { title: "감정 궁합", subtitle: "감정 리듬과 애착 속도의 공명도" },
  { title: "애정 표현 충돌", subtitle: "표현 방식과 오해 발생 지점 정리" },
  { title: "성적·스킨십 궁합", subtitle: "친밀감 온도차와 신체적 끌림 해석" },
  { title: "싸움 패턴", subtitle: "갈등이 커지는 구조와 방어 패턴 진단" },
  { title: "이별 위기 구조", subtitle: "관계 붕괴 직전의 경고 신호와 취약 구간" },
  { title: "재회 가능성", subtitle: "다시 붙는 조건과 재접속 가능성 평가" },
  { title: "결혼 궁합", subtitle: "장기 제도권 관계와 결혼 안정성 분석" },
  { title: "현실 생활 궁합", subtitle: "생활 루틴, 책임 분배, 현실 적합도" },
  { title: "관계 유지 전략", subtitle: "관계를 오래 지키는 운영 규칙" },
  { title: "karmic 관계 분석", subtitle: "업보적 반복과 karmic 연결 해석" },
  { title: "최종 궁합 총론", subtitle: "전체 궁합을 묶는 최종 총론" },
]);

export const LOVE_SECRET_COUPLE_ALL_CHAPTERS = Object.freeze([
  ...LOVE_SECRET_COMPAT_CHAPTERS,
]);

export const LOVE_SECRET_MODE_CONFIG = Object.freeze({
  solo: Object.freeze({
    mode: "solo",
    reportType: "saju_love_solo",
    totalChapters: 10,
    minTotalChars: 42000,
    chapterMinDefault: 3600,
    chapterTargetByIndex: Object.freeze({ 1: 4500, 2: 4300, 3: 4300, 4: 4100, 5: 4100, 6: 4100, 7: 4300, 8: 4100, 9: 4200, 10: 4400 }),
    chapterMinByIndex: Object.freeze({ 1: 3900, 2: 3700, 3: 3700, 4: 3600, 5: 3600, 6: 3600, 7: 3800, 8: 3600, 9: 3700, 10: 3900 }),
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