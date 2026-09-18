import { ANIMAL_DESTINY_DATA } from "@/components/fortune/animal-twelve/animalTwelveData";
import type { AnimalId } from "@/app/saju/animal-destiny/lib/types";

export interface ZiweiAnimalSection {
  key: string;
  title: string;
  paragraphs: string[];
}

export interface ZiweiAnimalContent {
  headline: string;
  introduction: string;
  sections: ZiweiAnimalSection[];
  actions: string[];
}

// advanced-ziwei-reading.ts의 hasBatchim/josa와 동일한 구현(그 파일은 export하지 않아 로컬로 둔다).
// "${지지}궁" 직접 결합은 자(子)에서 "자궁"(子宮)과 충돌하므로 쓰지 않는다 — "자리에 놓인" 형태만 쓴다.
function hasBatchim(word: string): boolean {
  const last = String(word || "").trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function josa(word: string, type: "이가" | "은는" | "을를" | "와과"): string {
  const map: Record<typeof type, [string, string]> = {
    이가: ["이", "가"],
    은는: ["은", "는"],
    을를: ["을", "를"],
    와과: ["과", "와"],
  };
  const [withBatchim, withoutBatchim] = map[type];
  return `${word}${hasBatchim(word) ? withBatchim : withoutBatchim}`;
}

export function buildZiweiAnimalContent(animalId: AnimalId): ZiweiAnimalContent {
  const data = ANIMAL_DESTINY_DATA[animalId];
  const { animalName, profile, keywords } = data;
  const { personality, love, relationship, career, money, daily } = profile;
  const [strength1, strength2, strength3] = personality.strengths;
  const [weakness1, weakness2, weakness3] = personality.weaknesses;

  const topic = josa(animalName, "은는");
  const subject = josa(animalName, "이가");

  const headline = `내 명궁이 품은 동물, ${animalName}`;
  const introduction = `자미두수 명반에서 명궁(命宮)은 타고난 기질과 인생의 중심 테마가 새겨지는 자리입니다. 당신의 명궁 자리에는 ${subject} 깃들어 있어, ${keywords.slice(0, 3).join("·")}의 결이 성격 전반에 흐릅니다.`;

  const sections: ZiweiAnimalSection[] = [
    {
      key: "temperament",
      title: "명궁이 그리는 기질",
      paragraphs: [
        `명궁 자리에 ${subject} 앉아 있습니다. ${josa(strength1, "이가")} 가장 먼저 눈에 띄고, 이어서 ${strength2}까지 자연스럽게 따라옵니다.`,
        `다만 ${josa(weakness1, "이가")} 고개를 들 때는 ${weakness2}까지 겹치기 쉬우니, 명궁의 기운을 다스리는 첫 걸음은 이 흐름을 스스로 알아차리는 것입니다.`,
      ],
    },
    {
      key: "bond",
      title: "인연 속에서 드러나는 모습",
      paragraphs: [
        `사랑과 인연 앞에서는 ${josa(love.attractionPoint, "이가")} 상대의 마음을 먼저 잡아끕니다. ${topic} 호감을 숨기지 못하는 편입니다.`,
        `다만 ${josa(love.weakPoint, "이가")} 관계를 흔들 때가 있으니, ${josa(relationship.bestFit, "와과")} 함께라면 이 흐름을 훨씬 편안하게 다룰 수 있습니다.`,
      ],
    },
    {
      key: "career",
      title: "일과 재물이 흐르는 자리",
      paragraphs: [
        `일에서는 ${josa(career.workStyle, "이가")} 자미두수식 성장 곡선과 맞닿아 있습니다. ${career.goodFields.slice(0, 3).join("·")} 같은 자리와 특히 궁합이 좋습니다.`,
        `재물의 흐름은 ${money.moneyFlow}입니다. 명궁의 기운이 재물궁까지 이어지도록, 이 흐름이 왔을 때를 놓치지 않는 것이 중요합니다.`,
      ],
    },
    {
      key: "advice",
      title: "지금 이 순간의 조언",
      paragraphs: [
        `${topic} 오늘도 ${josa(strength3, "을를")} 발휘할 준비가 되어 있습니다. 다만 ${josa(weakness3, "이가")} 튀어나오는 순간을 스스로 알아채는 것이 이번 시기의 과제입니다.`,
      ],
    },
  ];

  const actions = [daily.luckyAction, daily.caution, `${josa(relationship.bestFit, "을를")} 곁에 두기`];

  return { headline, introduction, sections, actions };
}
