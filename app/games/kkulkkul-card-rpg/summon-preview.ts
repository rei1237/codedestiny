// Isolated design fixtures. These values never enter billing or the game inventory.
import { companions } from "./catalog";
import { fortuneTeaHouseAssets } from "@/src/features/fortune-tea-house/data/assets";
export const CARD_BACK = fortuneTeaHouseAssets.yeoni.transparent.tarotCard;
export type BannerId = "character" | "relic";
export type Scenario = "normal" | "poor" | "slow" | "failure" | "image";
export const scenarios: Record<Scenario, string> = {
  normal: "기본",
  poor: "잔액 부족",
  slow: "응답 지연",
  failure: "첫 요청 실패",
  image: "앞면 이미지 실패",
};
type Entry = {
  id: string;
  name: string;
  art: string;
  role: string;
  stars: number;
  weight: number;
};
type Banner = {
  label: string;
  title: string;
  cost: number;
  guarantee: number;
  shards: number;
  owned: string[];
  entries: Entry[];
};
const cast = (index: number, stars: number, weight: number): Entry => {
  const c = companions[index];
  return {
    id: c.sheet,
    name: c.name,
    art: c.image,
    role: c.role,
    stars,
    weight,
  };
};
export const banners: Record<BannerId, Banner> = {
  character: {
    label: "캐릭터",
    title: "언덕 너머의 동료들",
    cost: 40,
    guarantee: 10,
    shards: 3,
    owned: ["moka"],
    entries: [cast(2, 4, 15), cast(4, 3, 45), cast(5, 3, 40)],
  },
  relic: {
    label: "예장",
    title: "방에 남은 작은 기억",
    cost: 20,
    guarantee: 10,
    shards: 2,
    owned: ["alarm"],
    entries: [
      {
        id: "lotus",
        name: "연꽃의 문장",
        art: "/assets/mascot/moonstone-lotus-v2-480.webp",
        role: "방어를 돕는 예장 시안",
        stars: 4,
        weight: 15,
      },
      {
        id: "alarm",
        name: "세 번째 알람",
        art: "/images/novel/mobile/room.webp",
        role: "첫 행동을 돕는 예장 시안",
        stars: 3,
        weight: 45,
      },
      {
        id: "window",
        name: "창가의 아침",
        art: "/images/novel/mobile/roomNight.webp",
        role: "회복을 돕는 예장 시안",
        stars: 3,
        weight: 40,
      },
    ],
  },
};
export const fixtures = { balance: 600, poorBalance: 8, pity: 2, seed: 32127 };
export function quote(id: BannerId, n: 1 | 10, scenario: Scenario) {
  const balance = scenario === "poor" ? fixtures.poorBalance : fixtures.balance;
  const cost = banners[id].cost * n;
  return { balance, cost, after: balance - cost };
}
export function draw(id: BannerId, n: 1 | 10) {
  const banner = banners[id],
    owned = new Set(banner.owned);
  let seed = fixtures.seed,
    pity = fixtures.pity;
  return Array.from({ length: n }, () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    let roll = Math.floor((seed / 0x100000000) * 100);
    const guaranteed = pity + 1 >= banner.guarantee;
    const entry = guaranteed
      ? banner.entries[0]
      : banner.entries.find((item) => (roll -= item.weight) < 0)!;
    pity = entry.id === banner.entries[0].id ? 0 : pity + 1;
    const duplicate = owned.has(entry.id);
    owned.add(entry.id);
    return { entry, duplicate, guaranteed, pity };
  });
}
