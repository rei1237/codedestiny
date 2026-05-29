export const LOVE_SECRET_SOLO_CHAPTERS = Object.freeze([
  { title: "나의 연애 원형", subtitle: "사랑을 시작하는 방식" },
  { title: "끌리는 사람의 유형", subtitle: "왜 특정한 사람에게 약한가" },
  { title: "애착과 불안", subtitle: "사랑이 깊어질수록 생기는 감정" },
  { title: "연애에서 반복되는 상처", subtitle: "관계가 어려워지는 이유" },
  { title: "대화와 연락의 비책", subtitle: "관계를 살리는 표현 방식" },
  { title: "재회와 과거 인연", subtitle: "미련과 복귀 흐름의 구조" },
  { title: "결혼과 장기 연애 운", subtitle: "오래 가는 관계의 조건" },
  { title: "올해와 가까운 시기의 연애 흐름", subtitle: "대운·세운으로 보는 타이밍" },
  { title: "연애를 망치는 선택과 반전 포인트", subtitle: "위험한 선택과 뒤집는 조건" },
  { title: "최종 연애 비책", subtitle: "사랑의 원칙과 최종 조언" },
]);

export const LOVE_SECRET_COMPAT_CHAPTERS = Object.freeze([
  { title: "두 사람의 사주 궁합 기본 지도", subtitle: "두 명식의 첫인상" },
  { title: "일간과 일지로 보는 핵심 궁합", subtitle: "일간·일지 관계의 핵심 구조" },
  { title: "십성으로 보는 사랑의 역할", subtitle: "서로에게 어떤 역할로 작동하는가" },
  { title: "오행 균형과 감정 리듬", subtitle: "보완과 과자극의 리듬" },
  { title: "끌림과 집착의 구조", subtitle: "강한 끌림이 집착으로 바뀌는 이유" },
  { title: "대화·연락·거리감의 궁합", subtitle: "말투와 연락 리듬의 차이" },
  { title: "갈등과 화해 패턴", subtitle: "싸움과 복구의 반복 구조" },
  { title: "이별과 재회 가능성", subtitle: "재회 조건과 반복 문제" },
  { title: "결혼·동거·현실 궁합", subtitle: "생활과 책임이 맞는지" },
  { title: "시기별 관계 흐름", subtitle: "대운·세운이 주는 시기 변화" },
  { title: "이 관계의 위험과 반전 포인트", subtitle: "위험과 회복의 분기점" },
  { title: "최종 연애 비책", subtitle: "관계의 원칙과 선언문" },
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