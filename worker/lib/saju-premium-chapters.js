export const LOVE_SECRET_SOLO_CHAPTERS = Object.freeze([
  { title: "Chapter I. 본연의 연애 자아 — 나는 사랑 앞에서 어떤 사람인가", subtitle: "연애 자아의 기본 성향과 핵심 가치" },
  { title: "Chapter II. 치명적 매력과 페로몬 — 나를 끌리게 만드는 힘", subtitle: "매력의 결, 과잉 리스크, 건강한 활용" },
  { title: "Chapter III. 운명의 상대방 리포트 — 어떤 사람과 사랑이 깊어지는가", subtitle: "이상형·위험형·성장형 파트너 구분" },
  { title: "Chapter IV. 연애 패턴 분석 — 반복되는 사랑의 습관", subtitle: "호감/불안/실수 패턴과 끊는 전략" },
  { title: "Chapter V. 감정 표현과 소통법 — 사랑을 망치지 않는 대화", subtitle: "오해 방지와 관계를 살리는 대화법" },
  { title: "Chapter VI. 스킨십·친밀감·정서적 거리 — 가까워지는 속도", subtitle: "친밀감 리듬과 거리 조절 전략" },
  { title: "Chapter VII. 결혼관과 장기 관계 — 함께 살아갈 수 있는 사랑인가", subtitle: "장기 안정성과 결혼/동거 조건" },
  { title: "Chapter VIII. 이별·상처·미련 — 사랑이 끝날 때 드러나는 진짜 모습", subtitle: "상처 패턴과 회복 루틴" },
  { title: "Chapter IX. 재회와 관계 회복 — 다시 이어질 수 있는 인연인가", subtitle: "재회 가능성과 행동 전략" },
  { title: "Chapter X. 연애운의 흐름 — 사랑이 들어오는 시기와 준비", subtitle: "시기 해석과 현실 준비 전략" },
  { title: "Chapter XI. 궁합의 핵심 원리 — 좋은 사람보다 맞는 사람", subtitle: "끌림과 안정의 균형 원리" },
  { title: "Chapter XII. 실전 연애 전략 — 앞으로 이렇게 사랑하라", subtitle: "초반·안정기·갈등기·장기 전략" },
  { title: "Chapter XIII. 사랑의 최종 비책 — 나를 잃지 않고 사랑하는 법", subtitle: "최종 원칙과 개인 선언문" },
]);

export const LOVE_SECRET_COMPAT_CHAPTERS = Object.freeze([
  { title: "Chapter I. 두 사람의 관계 자아 진단 — 사랑 앞에서 각자는 어떤 사람인가", subtitle: "각자의 연애 자아와 관계 기본 성향" },
  { title: "Chapter II. 상호 매력과 감정 점화 패턴 — 무엇이 서로를 끌어당기는가", subtitle: "끌림, 긴장, 감정 점화 구조" },
  { title: "Chapter III. 궁합 핵심 구조 리포트 — 잘 맞는 지점과 어긋나는 지점", subtitle: "오행·십성·조후 기반 핵심 궁합" },
  { title: "Chapter IV. 실전 커뮤니케이션 전술 — 싸우지 않고 통하는 대화법", subtitle: "오해 방지와 소통 회복 전략" },
  { title: "Chapter V. 시기별 관계 진전 타이밍 — 가까워질 때와 멈출 때", subtitle: "관계 진전/보류 시점 해석" },
  { title: "Chapter VI. 갈등·거리감·권태 위기 관리 — 무너질 때 다시 회복하는 법", subtitle: "위기 징후와 회복 시나리오" },
  { title: "Chapter VII. 친밀감과 조후 궁합 리듬 — 몸과 마음의 속도 맞추기", subtitle: "친밀감, 온도차, 속도 조율" },
  { title: "Chapter VIII. 현대 연애 상황별 운영 비책 — 현실 조건 속 관계 유지법", subtitle: "바쁜 일상·거리·환경 변수 대응" },
  { title: "Chapter IX. 결혼·동거·정착 적합성 — 함께 살아갈 수 있는가", subtitle: "장기 정착과 생활 합의 가능성" },
  { title: "Chapter X. 커플 맞춤 개운 처방전 — 관계를 살리는 실전 루틴", subtitle: "두 사람에게 맞는 관계 보정 루틴" },
  { title: "Chapter XI. 재회·이별·회복 의사결정표 — 다시 만날지 놓아줄지", subtitle: "재회 가능성과 종료 판단 기준" },
  { title: "Chapter XII. 장기 관계 운영 매뉴얼 — 오래 가는 커플의 시스템", subtitle: "관계 유지 규칙과 장기 운영 전략" },
  { title: "Chapter XIII. 커플 사랑 마스터플랜 — 두 사람이 선택할 최종 방향", subtitle: "관계 선언문과 최종 실행 로드맵" },
]);

export const LOVE_SECRET_MODE_CONFIG = Object.freeze({
  solo: Object.freeze({
    mode: "solo",
    reportType: "saju_love_solo",
    totalChapters: 13,
    minTotalChars: 48000,
    chapterMinDefault: 3200,
    chapterTargetByIndex: Object.freeze({ 1: 4500, 2: 3800, 3: 4000, 4: 4000, 5: 4000, 6: 3800, 7: 4300, 8: 4000, 9: 3600, 10: 3600, 11: 3400, 12: 3500, 13: 3500 }),
    chapterMinByIndex: Object.freeze({ 1: 3825, 2: 3230, 3: 3400, 4: 3400, 5: 3400, 6: 3230, 7: 3655, 8: 3400, 9: 3060, 10: 3060, 11: 2890, 12: 2975, 13: 2975 }),
    title: "프리미엄 사주 연애 비책 리포트",
    chapters: LOVE_SECRET_SOLO_CHAPTERS,
  }),
  couple: Object.freeze({
    mode: "couple",
    reportType: "saju_love_couple",
    totalChapters: 13,
    minTotalChars: 48000,
    chapterMinDefault: 3200,
    chapterTargetByIndex: Object.freeze({ 1: 4500, 2: 3800, 3: 4000, 4: 4000, 5: 4000, 6: 3800, 7: 4300, 8: 4000, 9: 3600, 10: 3600, 11: 3400, 12: 3500, 13: 3500 }),
    chapterMinByIndex: Object.freeze({ 1: 3825, 2: 3230, 3: 3400, 4: 3400, 5: 3400, 6: 3230, 7: 3655, 8: 3400, 9: 3060, 10: 3060, 11: 2890, 12: 2975, 13: 2975 }),
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