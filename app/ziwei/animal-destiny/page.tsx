import { generatePageMetadata } from "../../../lib/generate-page-metadata";
import ZiweiAnimalDestinyClientLoader from "./ZiweiAnimalDestinyClientLoader";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";
import ImmersiveRelatedLinks from "../../components/ImmersiveRelatedLinks";

const ZIWEI_ANIMAL_METADATA_COPY = {
  ko: {
    title: "내 영혼을 상징하는 자미두수 동물 · 명궁으로 보는 소울 캐릭터",
    description:
      "생년월일시를 입력하면 자미두수 명궁을 기준으로 당신의 영혼과 닮은 동물 캐릭터를 찾아드립니다. 성격, 인연, 일과 재물의 결을 동물 캐릭터와 참고 기록으로 확인하세요.",
    keywords: ["자미두수 동물", "자미두수 영혼 동물", "명궁 동물", "자미두수 성격", "자미두수 캐릭터", "내 영혼 동물", "자미두수 명궁", "ziwei animal", "soul animal"],
  },
  en: {
    title: "Zi Wei Soul Animal · Discover the Animal in Your Life Palace",
    description:
      "Enter your birth date and time to reveal the animal character that matches your Zi Wei Dou Shu Life Palace. See your personality, relationships, career, and wealth patterns through a soul animal.",
    keywords: ["ziwei animal", "zi wei soul animal", "ming palace animal", "ziwei personality", "ziwei character", "soul animal", "zi wei dou shu"],
  },
  ja: {
    title: "紫微斗数 魂の動物 · 命宮でわかるソウルキャラクター",
    description:
      "生年月日時を入力すると、紫微斗数の命宮を基準にあなたの魂に近い動物キャラクターがわかります。性格・相性・仕事とお金の流れを動物キャラクターと参考記録で確認しましょう。",
    keywords: ["紫微斗数 動物", "魂の動物", "命宮 動物", "紫微斗数 性格", "紫微斗数 キャラクター", "ziwei animal"],
  },
  zh: {
    title: "紫微斗数灵魂动物 · 用命宫看你的性格角色",
    description:
      "输入出生年月日时，根据紫微斗数命宫为你揭示最贴近灵魂的动物角色，通过动物角色与参考记录了解性格、姻缘、事业与财运的走向。",
    keywords: ["紫微斗数动物", "灵魂动物", "命宫动物", "紫微斗数性格", "紫微斗数角色", "ziwei animal"],
  },
};

export function generateMetadata() {
  const copy = ZIWEI_ANIMAL_METADATA_COPY.ko;
  return generatePageMetadata({
    path: "/ziwei/animal-destiny",
    title: copy.title,
    description: copy.description,
    keywords: copy.keywords,
  });
}

const ZIWEI_ANIMAL_FAQ_JSON_LD = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "자미두수 영혼 동물은 어떻게 정해지나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "자미두수 명반에서 타고난 기질과 삶의 중심 테마가 새겨지는 자리인 명궁(命宮)의 지지를 기준으로, 그 결에 가장 가까운 동물 캐릭터를 찾아 보여드립니다.",
      },
    },
    {
      "@type": "Question",
      name: "사주 동물 운세와는 어떤 차이가 있나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "사주 동물 운세는 오행과 십이운성의 흐름으로 캐릭터를 찾고, 자미두수 영혼 동물은 12궁 명반 구조에서 명궁 자리에 놓인 상징을 기준으로 찾습니다. 기준이 다르므로 함께 비교해 보면 자신을 더 입체적으로 이해할 수 있습니다.",
      },
    },
    {
      "@type": "Question",
      name: "출생시간을 모르면 결과를 볼 수 없나요?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "출생시간을 모른다면 정오를 기준으로 한 참고용 명궁을 계산해 결과를 보여드립니다. 다만 명궁 지지가 시간에 따라 달라질 수 있으므로, 정확한 결과를 원한다면 출생시간을 확인한 뒤 다시 계산해 보시길 권합니다.",
      },
    },
  ],
});

export default function ZiweiAnimalDestinyPage() {
  return (
    <main className="relative min-h-[100dvh] bg-[#030712] text-slate-100">
      <RouteMetadataLocaleSync entries={ZIWEI_ANIMAL_METADATA_COPY} />
      <h1 className="sr-only">내 영혼을 상징하는 자미두수 동물, 명궁으로 찾는 소울 캐릭터</h1>
      <section className="sr-only" aria-label="자미두수 영혼 동물 안내">
        <p>
          자미두수 명반에서 명궁(命宮)은 타고난 기질과 삶을 바라보는 기본 시선이 새겨지는 자리입니다.
          이 명궁이 열두 지지 중 어디에 놓이는지에 따라, 그 사람의 성격과 관계 맺는 방식, 일과 재물을 대하는 태도가 조금씩 다른 결을 띱니다.
          자미두수 영혼 동물은 이 명궁의 지지를 기준으로 삼아, 그 결에 가장 가까운 동물 캐릭터 한 마리를 찾아 보여주는 기능입니다.
        </p>
        <p>
          생년월일시와 양력·음력, 성별을 입력하면 명반을 계산해 명궁·신궁·오행국을 확인하고, 명궁의 지지에 대응하는 동물 캐릭터를 바로 알려드립니다.
          단순히 동물 이름 하나만 알려주는 데서 그치지 않고, 그 캐릭터가 왜 당신과 닮았는지를 명궁의 기질, 인연 속에서 드러나는 모습, 일과 재물이 흐르는 자리, 지금 이 순간의 조언까지 네 가지 결로 풀어내는 전체 해석을 함께 제공합니다.
        </p>
        <p>
          결과 화면 아래에는 참고 기록도 함께 표시됩니다. 이 동물이 왜 당신의 명궁과 연결되는지, 명반 위에서 근거가 된 배치를 펼쳐 볼 수 있어
          결과를 그냥 받아들이기보다 어떤 흐름에서 비롯된 해석인지 스스로 확인할 수 있습니다.
        </p>
        <p>
          자미두수 영혼 동물은 열두 동물 캐릭터 중 하나로 연결됩니다. 각 캐릭터는 태양처럼 뻗어나가는 기운부터 달빛처럼 스며드는 기운까지 서로 다른 결을 지니고 있으며,
          강점과 약점, 사랑과 인연에서 끌리는 지점, 일에서 능력을 발휘하는 방식, 재물이 흐르는 패턴까지 자미두수 특유의 언어로 새로 풀어씁니다.
        </p>
        <p>
          이미 무료 명반 리포트에서 명궁과 12궁을 확인했다면, 이 기능은 그 명궁 하나에 집중해 성격과 캐릭터를 더 직관적으로 보여주는 짧고 가벼운 다음 걸음입니다.
          반대로 처음 자미두수를 접하는 분이라면, 동물 캐릭터로 먼저 가볍게 시작한 뒤 전체 명반 리포트로 이어가도 좋습니다.
        </p>
        <h2>명궁 지지에 따라 만나는 열두 동물</h2>
        <p>
          아래 목록은 이 서비스의 자미두수 엔진이 실제로 배정하는 명궁 지지와 동물 캐릭터의 짝입니다.
          자신의 명궁을 아직 모르더라도, 열두 지지가 각각 어떤 동물과 연결되는지 먼저 살펴볼 수 있습니다.
        </p>
        <ul>
          <li>자(子) — 현자 부엉이: 밤에도 또렷한 판단력과 정리된 경험치가 강점인 자리입니다.</li>
          <li>축(丑) — 별빛 강아지: 성실함과 꾸준함으로 기반과 신뢰를 쌓는 자리입니다.</li>
          <li>인(寅) — 태양 사자: 주도적인 카리스마와 확장의 추진력이 도드라지는 자리입니다.</li>
          <li>묘(卯) — 구름 토끼: 예민한 감각과 섬세한 돌봄, 회복력이 강점인 자리입니다.</li>
          <li>진(辰) — 밤하늘 흑고양이: 리셋과 전환의 타이밍을 잘 읽는 독립적인 자리입니다.</li>
          <li>사(巳) — 신비 나비: 조용히 스며들며 관계를 넓혀 가는 자리입니다.</li>
          <li>오(午) — 달빛 고양이: 매력과 감수성, 예술성과 인기가 따르는 자리입니다.</li>
          <li>미(未) — 솜구름 아기양: 돌봄과 안정된 성장을 아끼는 포근한 관계복의 자리입니다.</li>
          <li>신(申) — 리본 여우: 표현력과 자존감, 무대 위 존재감이 빛나는 자리입니다.</li>
          <li>유(酉) — 보물 햄스터: 차곡차곡 쌓고 관리하는 알뜰한 감각이 강점인 자리입니다.</li>
          <li>술(戌) — 새싹 사슴: 새로운 시작과 순수한 성장의 기운이 강한 자리입니다.</li>
          <li>해(亥) — 꿈알 병아리: 가능성을 품고 미래를 상상하며 준비하는 자리입니다.</li>
        </ul>
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ZIWEI_ANIMAL_FAQ_JSON_LD }} />
      <ZiweiAnimalDestinyClientLoader />
      <ImmersiveRelatedLinks fromPath="/ziwei/animal-destiny" />
    </main>
  );
}
