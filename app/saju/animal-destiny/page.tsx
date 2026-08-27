import type { Metadata } from "next";
import AnimalDestinyRouteClient from "./AnimalDestinyRouteClient";

const ANIMAL_DESTINY_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "십이운성 동물점 무료 | 내 운명의 동물 보는 곳 — 동물 도감",
    description: "생년월일로 세운 사주의 십이운성 흐름에서 나만의 운명 동물을 무료로 찾아 드립니다. 핵심 성향과 관계, 일과 재물 감각, 지금 단계의 성장 미션을 봅니다.",
  },
  en: {
    title: "Destiny Animal Codex | Twelve Growth Animal Reading | Code Destiny",
    description: "Find your destiny animal through the Twelve Growth flow of your saju chart, with core traits, relationships, work and wealth senses, and growth missions at a glance.",
  },
  ja: {
    title: "運命の動物図鑑 | 十二運星動物占い | Code Destiny",
    description: "生まれた四柱の十二運星の流れから自分だけの運命動物を見つけ、核心性向、関係、仕事と財の感覚、成長ミッションまで一目で確認できます。",
  },
} as const;

const animalDestinyPageCopy = ANIMAL_DESTINY_PAGE_TEXT_TRANSLATIONS.ko;

export const metadata: Metadata = {
  title: animalDestinyPageCopy.title,
  description: animalDestinyPageCopy.description,
  alternates: {
    canonical: "https://code-destiny.com/saju/animal-destiny",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function Page() {
  return (
    <>
      <section className="sr-only" aria-label="운명의 동물 도감 안내">
        <h1>운명의 동물 도감</h1>
        <p>
          태어난 사주의 십이운성 흐름은 한 사람의 기운이 어떤 속도로 피어나고, 어떤 방식으로 세상과 관계를 맺는지 조용히 드러냅니다.
          운명의 동물 도감은 그 흐름을 동물의 상징으로 옮겨, 당신 안에 오래 머문 생존 감각과 성장 방향, 관계에서 반복되는 움직임을 부드럽게 비춥니다.
        </p>
        <p>
          장생, 목욕, 관대, 건록, 제왕, 쇠, 병, 사, 묘, 절, 태, 양으로 이어지는 십이운성의 결은 단순한 성격표가 아니라 삶의 리듬을 읽는 지도에 가깝습니다.
          어떤 순간에 앞서 나가고, 어떤 순간에 물러서며, 어떤 관계에서 힘을 회복하는지가 사주의 계절감 위에 차분히 떠오릅니다.
        </p>
        <p>
          이 도감은 당신의 핵심 성향, 일과 재물의 감각, 사랑과 인간관계의 습관, 스스로를 키우는 미션을 한 번에 바라볼 수 있도록 구성됩니다.
          동물 상징은 가볍게 보이지만 해석은 사주의 흐름을 따라 깊게 열리며, 결과 문장은 사용자의 삶을 단정하기보다 지금 손에 쥘 수 있는 방향을 가리킵니다.
        </p>
        <p>
          이 동물점은 사주 안에서 먼저 움직이는 기운과 뒤에서 오래 버티는 기운을 함께 살핍니다.
          겉으로 보이는 성격보다, 어떤 상황에서 마음이 활짝 열리고 어떤 압박 앞에서 본능적으로 몸을 낮추는지가 더 중요하게 드러납니다.
        </p>
        <p>
          같은 동물 상징을 가진 사람도 명식의 계절, 오행의 기울기, 십이운성의 위치에 따라 전혀 다른 빛을 냅니다.
          어떤 이는 조용히 준비하다가 결정적인 순간에 강해지고, 어떤 이는 처음부터 빠르게 움직이지만 오래 버티는 힘을 따로 배워야 합니다.
          도감은 그 차이를 부드럽게 가려내어, 사용자가 자신의 장점을 과장하지도 숨기지도 않도록 돕습니다.
        </p>
        <p>
          관계에서는 어떤 상대 앞에서 방어가 생기고, 어떤 환경에서 마음이 넓어지는지도 함께 드러납니다.
          일과 재물에서는 무리하게 밀어붙일 때보다 자연스럽게 힘이 모이는 방식이 보입니다.
          운명의 동물은 귀여운 이미지에 머물지 않고, 지금 삶에서 회복해야 할 리듬과 앞으로 키워야 할 태도를 가리키는 상징으로 읽힙니다.
        </p>
        <p>
          때로는 강해지는 법보다 쉬는 법이 먼저 필요하고, 때로는 조용히 지켜 온 감각을 세상 앞에 꺼내야 할 때가 옵니다.
          십이운성의 동물 상징은 그 전환점을 다정하게 알려 주며, 당신이 자신을 더 자연스럽게 믿을 수 있는 방향을 비춥니다.
        </p>
        <p>
          결과를 읽을 때에는 동물 하나의 이름에만 머물지 않고, 그 상징이 사랑과 일, 돈의 흐름 속에서 어떻게 살아나는지를 함께 바라보는 것이 좋습니다.
          익숙한 약점처럼 느껴졌던 반응도 제대로 읽으면 오래 살아남기 위해 몸에 익힌 지혜일 수 있고, 쉽게 드러나지 않던 장점은 적절한 계절을 만나며 분명히 피어납니다.
        </p>
        <p>
          당신의 동물은 오늘의 기분을 맞히는 장난스러운 이름이 아니라, 오래 축적된 생명력의 방향을 담은 표식에 가깝습니다.
          어디에서 조심스러워지고 어디에서 대담해지는지, 어떤 사람 곁에서 더 부드러워지고 어떤 일 앞에서 다시 힘을 얻는지를 읽으면
          삶의 리듬은 조금 더 선명하고 편안하게 돌아오기 시작합니다.
        </p>
      </section>
      <AnimalDestinyRouteClient />
    </>
  );
}
