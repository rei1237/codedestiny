export const ZIWEI_PERSONAL_CHAPTERS_V3 = Object.freeze([
  { index: 1, key: "personal_01_chart_overview", title: "🌌 명반 전체 구조 — 내 운명의 별자리 지도" },
  { index: 2, key: "personal_02_life_palace", title: "👑 명궁 완전 해석 — 내가 태어난 운명의 중심" },
  { index: 3, key: "personal_03_body_palace", title: "🧭 신궁 심층 분석 — 인생 후반부의 방향" },
  { index: 4, key: "personal_04_twelve_palaces", title: "🏛️ 12궁 인생 지도 — 삶의 영역별 운명 코드" },
  { index: 5, key: "personal_05_major_auxiliary_stars", title: "✨ 주성과 보성 — 나를 움직이는 별의 성격" },
  { index: 6, key: "personal_06_malefic_stars", title: "⚔️ 살성과 위기 구조 — 고비를 만드는 별, 돌파하게 하는 힘" },
  { index: 7, key: "personal_07_four_transformations", title: "🔮 사화 분석 — 화록·화권·화과·화기의 운명 작용" },
  { index: 8, key: "personal_08_career_wealth", title: "💼 관록궁과 재백궁 — 직업, 성공, 돈의 구조" },
  { index: 9, key: "personal_09_love_marriage", title: "💗 부처궁과 연애·결혼 — 사랑과 배우자의 별" },
  { index: 10, key: "personal_10_fortune_mind", title: "🧠 복덕궁과 마음의 그릇 — 행복, 불안, 내면의 회복력" },
  { index: 11, key: "personal_11_world_people_home", title: "🌍 천이궁·교우궁·전택궁 — 세상, 사람, 거처의 운" },
  { index: 12, key: "personal_12_luck_flow", title: "🕰️ 대운·유년 흐름 — 지금 어떤 별의 시기를 지나고 있는가" },
  { index: 13, key: "personal_13_star_letter", title: "📜 별들이 남기는 마지막 편지 — 나에게 주는 자미두수 선언문" },
]);

export const ZIWEI_COMPATIBILITY_CHAPTERS_V3 = Object.freeze([
  { index: 1, key: "compat_01_chart_meeting", title: "🌌 두 사람의 명반 구조 — 별들이 만나는 방식" },
  { index: 2, key: "compat_02_life_palace", title: "👑 명궁 궁합 — 성격과 인생 방향이 맞는가" },
  { index: 3, key: "compat_03_body_palace", title: "🧭 신궁 궁합 — 시간이 지날수록 어디로 향하는가" },
  { index: 4, key: "compat_04_spouse_palace", title: "💗 부처궁 궁합 — 사랑과 배우자 인연의 구조" },
  { index: 5, key: "compat_05_fortune_palace", title: "🧠 복덕궁 궁합 — 마음이 편안한 관계인가" },
  { index: 6, key: "compat_06_communication", title: "💬 교우궁·형제궁 궁합 — 대화와 관계 운영 방식" },
  { index: 7, key: "compat_07_wealth", title: "💰 재백궁 궁합 — 돈과 현실을 함께 운영할 수 있는가" },
  { index: 8, key: "compat_08_career", title: "💼 관록궁 궁합 — 일, 목표, 사회적 방향의 조화" },
  { index: 9, key: "compat_09_conflict", title: "⚔️ 갈등 구조 — 살성과 사화가 만드는 관계의 고비" },
  { index: 10, key: "compat_10_home_migration", title: "🏡 전택궁·천이궁 궁합 — 함께 살 수 있는가, 함께 떠날 수 있는가" },
  { index: 11, key: "compat_11_timing", title: "🕰️ 두 사람의 대운·유년 타이밍 — 관계가 깊어지는 시기" },
  { index: 12, key: "compat_12_practical_manual", title: "🗝️ 이 관계를 살리는 실전 전략 — 자미두수 궁합 사용 설명서" },
  { index: 13, key: "compat_13_star_letter", title: "📜 두 사람에게 보내는 별의 편지 — 자미두수 궁합의 결론" },
]);

export const ZIWEI_V3_STATUS_MESSAGES = Object.freeze({
  preparing: "자미두수 명반 리포트를 집필하고 있습니다.",
  billing: "결제 확인 중입니다.",
  calculatingUserChart: "자미두수 명반을 계산하는 중입니다.",
  calculatingPartnerChart: "상대방 자미두수 명반을 계산하는 중입니다.",
  buildingCompatibility: "두 사람의 궁합 구조를 분석하는 중입니다.",
  rendering: "PDF를 제본하는 중입니다.",
  completed: "다운로드 준비 완료",
});

export function getZiweiV3ChapterDefs(mode) {
  return mode === "compatibility" ? ZIWEI_COMPATIBILITY_CHAPTERS_V3 : ZIWEI_PERSONAL_CHAPTERS_V3;
}
