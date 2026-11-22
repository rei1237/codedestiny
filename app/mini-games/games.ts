import {PSYCHOTESTS} from "../../lib/psychotest-catalog";

type MiniGame = {
  slug: string;
  name: string;
  href: string;
  desc: string;
  badge: string;
};

export const GAMES: ReadonlyArray<MiniGame> = [
  { slug: "destiny-poker", name: "데스티니 포커", href: "/destiny-poker", desc: "네 마스터와 포커 · 왕 카드로 읽는 운세", badge: "무료" },
  { slug: "fortune-fish", name: "포춘 피쉬", href: "/fortune-teller-fish", desc: "금붕어의 몸짓으로 읽는 오늘의 흐름", badge: "무료" },
  { slug: "omikuji", name: "이모이 오미쿠지", href: "/emoi_omikuji_v2", desc: "제비통에서 뽑아 펼치는 오늘의 운세", badge: "무료" },
  { slug: "blood-type", name: "혈액형 테스트", href: "/blood-type-app", desc: "혈액형별 성향·궁합·코칭", badge: "무료" },
  { slug: "destiny-island", name: "운명의 섬", href: "/destiny-island", desc: "자미두수 명반이 섬이 되는 인터랙티브 맵", badge: "무료" },
  { slug: "secret-house", name: "시크릿 하우스", href: "/secret-house_real", desc: "내 일간으로 시작하는 선택형 연애 스토리", badge: "무료" },
  { slug: "hwatu-life", name: "화투 인생 패", href: "/oracle/hwatu-life/", desc: "7문항으로 찾는 나의 인생 패", badge: "무료" },
  { slug: "saju-fpti", name: "사주 FPTI", href: "/saju-fpti/", desc: "오행·십성 4축으로 보는 성향", badge: "무료" },
  { slug: "psychotest", name: "심리테스트", href: "/psychotest/", desc: `성격·연애·직장 테마 ${PSYCHOTESTS.length}종`, badge: "무료" },
];
