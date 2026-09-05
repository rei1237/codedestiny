import Link from "next/link";
import { INSIGHT_ARTICLES, getArticlesByTopic, getArticleBySlug } from "./articles";
import { getFeatureGuidesByTopic } from "./feature-guides";
import EditorNote from "../components/EditorNote";

function topicMatcher(topic) {
  const normalized = String(topic || "all").toLowerCase();

  if (normalized === "all") return () => true;

  return (item) => {
    const bag = `${item.title || ""} ${item.category || ""} ${(item.tags || []).join(" ")} ${(item.keywords || []).join(" ")}`.toLowerCase();
    if (normalized === "saju") return /사주|명리|만세력|오행|일간/.test(bag);
    if (normalized === "ziwei") return /자미두수|명궁|관록궁|궁위/.test(bag);
    if (normalized === "sukuyo") return /숙요|27숙|영친|안괴|업태/.test(bag);
    if (normalized === "tarot") return /타로|아르카나|카드|스프레드/.test(bag);
    if (normalized === "astrology") return /점성술|출생차트|상승궁|하우스/.test(bag);
    if (normalized === "vedic") return /베다|라그나|나크샤트라|다샤/.test(bag);
    if (normalized === "compatibility") return /궁합|인연|관계|compatibility/.test(bag);
    if (normalized === "dream") return /꿈|해몽|태몽/.test(bag);
    return false;
  };
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

// 카테고리 허브별 실질 해설 산문 — 카드 목록만 있던 얇은 허브를 "무엇을·어떻게 읽는지"
// 설명하는 콘텐츠 페이지로 보강한다(Google 콘텐츠 품질 대응). 서버 렌더 한국어.
const TOPIC_GUIDES = {
  saju: {
    heading: "사주 인사이트를 읽는 법",
    paragraphs: [
      "사주팔자는 태어난 연·월·일·시를 네 기둥으로 세우고, 각 기둥의 천간과 지지에 담긴 오행의 균형과 십성의 작용, 대운의 흐름을 함께 살피는 전통 명리학입니다. 처음에는 용어가 낯설지만, 나를 상징하는 글자인 일간이 무엇인지, 오행 중 무엇이 강하고 약한지, 십성이 관계·재물·일 가운데 어디에 몰려 있는지를 순서대로 짚으면 전체 그림이 잡힙니다.",
      "이 허브의 글은 '무엇인가'를 설명하는 입문 글과 '어떻게 읽는가'를 다루는 실전 해석 글로 나뉩니다. 만세력 보는 법, 오행과 십성의 의미, 대운과 세운의 차이 같은 기초를 먼저 익힌 뒤 궁합·재물·직업처럼 관심 있는 주제로 넘어가면 됩니다. 모든 해석은 미래를 단정하기 위해서가 아니라 지금의 선택을 정돈하는 참고 자료로 정리했습니다.",
      "한국에서 통용되는 사주는 대부분 자평 명리입니다. 일간을 나로 두고 나머지 글자와의 관계를 십성으로 이름 붙이며, 태어난 달의 계절로 힘의 강약을 재고, 부족한 기운을 용신으로 잡는 순서가 그 틀입니다. 띠나 신살처럼 다른 갈래에서 온 개념은 참고로만 쓰고 명식 해석의 뼈대로 삼지 않습니다.",
      "읽는 순서를 권한다면 만세력 보는 법에서 명식을 세우는 규칙을 익히고, 오행과 십성 글에서 자기 명식의 특징을 찾은 다음, 대운·세운 글로 지금 시기를 겹쳐 보는 흐름이 가장 무리가 없습니다. 궁합·재물·직업 같은 주제 글은 그 뒤에 읽어야 용어가 걸리지 않습니다.",
    ],
  },
  ziwei: {
    heading: "자미두수 인사이트를 읽는 법",
    paragraphs: [
      "자미두수는 태어난 시각을 바탕으로 명반이라 부르는 열두 궁을 세우고, 자미성을 비롯한 열네 개의 주성과 여러 보좌성이 어느 궁에 앉는지로 삶의 지도를 읽는 동양 점성입니다. 명궁을 중심으로 재백궁·관록궁·부처궁·천이궁 등 각 궁의 별 배치를 보면 기질과 관계, 일과 재물의 흐름이 입체적으로 드러납니다.",
      "이 허브에서는 명반을 처음 세우는 법, 열두 궁과 주성의 의미, 사화(화록·화권·화과·화기)의 작용 같은 기초부터 사주와 자미두수를 함께 볼 때의 차이까지 단계별로 정리했습니다. 별의 밝기와 궁의 상호작용을 함께 읽으면 한 장의 명반이 훨씬 풍부하게 보입니다.",
      "자미두수는 유파에 따라 같은 명반을 다르게 읽습니다. 사화의 흐름을 따라 궁 사이의 인과를 좇는 읽기와, 궁의 삼방사정에 모인 별의 조합을 중시하는 읽기가 대표적입니다. 어느 쪽이 옳다기보다 강조점이 다른 것이라, 한 글 안에서 두 기준을 섞지 않고 읽는 것이 혼란을 줄입니다.",
      "처음이라면 열두 궁이 각각 무엇을 다루는지 정리한 글, 그다음 십사주성의 성격을 하나씩 소개한 글, 마지막으로 사화와 대한으로 시기를 읽는 글의 순서를 권합니다. 명반을 세워 두고 글을 읽으면 자기 궁의 별을 바로 대조할 수 있어 훨씬 빨리 익숙해집니다.",
    ],
  },
  sukuyo: {
    heading: "숙요점 인사이트를 읽는 법",
    paragraphs: [
      "숙요점은 달이 하늘을 지나며 머무는 27수를 기준으로 사람의 타고난 본명수와 관계의 궁합을 읽는 동양의 오래된 점법입니다. 자신의 본명수를 찾은 뒤 상대와의 관계가 영친·안괴·업태 같은 어떤 자리에 놓이는지를 보면 두 사람 사이의 거리와 어울리는 시기를 가늠할 수 있습니다.",
      "이 허브의 글은 본명수를 찾는 법, 27수 각각의 성향, 관계를 읽는 아홉 자리의 의미를 차근히 설명합니다. 본명수와 월명수의 차이, 사주 궁합과 숙요 궁합을 함께 볼 때의 관점까지 다루어 처음 접하는 분도 관계의 결을 부담 없이 이해하도록 정리했습니다.",
      "관계의 결을 부르는 이름은 자료마다 표기가 조금씩 다릅니다. 이 허브에서는 같은 자리를 뜻하는 명, 그리고 업태·영친·우쇠·안괴·위성의 이름을 기준으로 쓰고, 근거리·중거리·원거리 구분을 함께 적습니다. 같은 안괴라도 거리에 따라 나타나는 장면이 다르기 때문입니다.",
      "본명수를 먼저 찾고 27수 각각의 성향 글에서 자기 자리를 읽은 뒤, 관계의 자리를 다룬 글로 넘어가는 순서를 권합니다. 궁합 계산은 두 사람의 생년월일만 있으면 되므로, 글을 읽으며 실제 관계에 바로 대조해 보는 것이 이 체계를 가장 빨리 이해하는 길입니다.",
    ],
  },
  tarot: {
    heading: "타로 인사이트를 읽는 법",
    paragraphs: [
      "타로는 78장의 카드가 지닌 상징으로 지금의 질문과 마음의 결을 비추는 도구입니다. 22장의 메이저 아르카나는 삶의 큰 주제를, 56장의 마이너 아르카나는 일상의 구체적인 장면을 나타냅니다. 카드 한 장의 그림과 방향(정방향·역방향), 그리고 스프레드 안에서의 자리를 함께 읽어야 의미가 살아납니다.",
      "이 허브에서는 카드를 처음 읽는 법, 메이저·마이너 아르카나의 의미, 연애·재회·마음 읽기 같은 상황별 스프레드를 정리했습니다. 타로는 정해진 운명을 알려주는 것이 아니라 답이 하나로 떨어지지 않는 고민을 여러 각도에서 정돈하도록 돕는 언어에 가깝습니다.",
      "이 허브의 카드 해설은 라이더-웨이트-스미스 덱의 그림을 기준으로 씁니다. 마르세유 덱이나 토트 덱은 같은 번호의 카드라도 그림과 강조점이 달라, 다른 덱을 쓰는 분은 해설을 그대로 옮기기보다 상징의 방향만 참고하시는 편이 좋습니다.",
      "읽는 순서는 메이저 아르카나 22장의 흐름을 먼저 익히고, 네 수트가 각각 어떤 영역을 맡는지 정리한 뒤, 세 장 배열부터 실제로 뽑아 보는 쪽을 권합니다. 연애·재회·상대 마음처럼 질문이 정해진 리딩은 자리의 뜻이 미리 정해져 있어 처음 시작하기에 가장 무리가 없습니다.",
    ],
  },
  astrology: {
    heading: "점성술 인사이트를 읽는 법",
    paragraphs: [
      "서양 점성술은 태어난 순간 하늘의 행성 배치를 담은 출생차트로 타고난 성향과 삶의 리듬을 읽습니다. 자아를 뜻하는 태양, 감정을 뜻하는 달, 첫인상을 뜻하는 상승궁을 축으로 각 행성이 어떤 별자리와 하우스에 놓이고 서로 어떤 각도를 맺는지를 살피면 나를 이루는 여러 결이 드러납니다.",
      "이 허브의 글은 출생차트를 읽는 법, 열두 하우스의 의미, 행성과 각도(어스펙트)의 작용을 단계별로 설명합니다. 별자리 운세만 보던 분이 자신의 전체 차트로 넘어가도록, 그리고 시기의 흐름인 트랜짓을 참고 자료로 활용하도록 정리했습니다.",
      "서양 점성술은 하우스를 나누는 방식과 어스펙트에 허용하는 각도 폭이 전통과 현대에서 갈립니다. 같은 출생 정보라도 하우스 분할이 다르면 행성이 다른 하우스에 놓일 수 있으니, 다른 곳에서 본 차트와 배치가 다르다면 먼저 그 기준을 확인하시길 권합니다.",
      "별자리 운세만 보다가 출생차트로 넘어오는 분이라면 태양·달·상승점 세 축을 다룬 글에서 시작해, 열두 하우스와 행성 글로 자기 차트의 배치를 확인하고, 마지막에 트랜싯 글로 지금 시기를 겹쳐 보는 순서를 권합니다. 베다 점성술과 별자리가 다르게 나오는 것은 황도대 기준의 차이이니 오류로 보지 않으셔도 됩니다.",
    ],
  },
  vedic: {
    heading: "베다 점성술 인사이트를 읽는 법",
    paragraphs: [
      "베다 점성술(조티샤)은 인도 전통의 점성 체계로, 서양 점성술과 달리 항성을 기준으로 한 별자리와 라그나(상승궁), 그리고 달이 지나는 27 나크샤트라를 중요하게 봅니다. 다샤라 부르는 행성 시기 흐름을 통해 삶의 국면이 어떻게 바뀌는지를 읽는 것이 특징입니다.",
      "이 허브에서는 베다 점성술이 무엇인지, 라그나와 나크샤트라를 어떻게 읽는지, 서양 점성술과의 차이는 무엇인지를 정리했습니다. 낯선 용어는 기초 글에서 먼저 익히고 관심 있는 주제로 넘어가면 전체 흐름을 부담 없이 따라갈 수 있습니다.",
      "베다 점성술의 시기 읽기는 다샤가 중심입니다. 달이 머문 나크샤트라의 지배 행성에서 시작해 아홉 행성이 정해진 햇수로 돌아가는 빔쇼타리 다샤가 가장 널리 쓰이며, 지금 어느 행성의 시기인지에 따라 같은 차트라도 앞으로 나오는 주제가 달라집니다. 서양 점성술의 트랜싯과는 시간을 재는 자가 다른 셈입니다.",
      "처음이라면 사이더리얼 황도대가 무엇인지 설명한 글에서 별자리가 달라지는 이유를 이해하고, 라그나와 달의 나크샤트라 글로 자기 차트의 출발점을 잡은 뒤, 다샤 글로 시기를 읽는 순서를 권합니다. 나크샤트라 스물일곱 자리는 결정판 도감에서 한 자리씩 따로 볼 수 있습니다.",
    ],
  },
  compatibility: {
    heading: "궁합 인사이트를 읽는 법",
    paragraphs: [
      "궁합은 두 사람의 명식이나 차트를 나란히 놓고 서로의 기운이 어떻게 만나고 부딪히는지를 비교하는 읽기입니다. 사주 궁합은 오행과 십성의 조화를, 숙요 궁합은 본명수의 관계를, 점성 궁합은 두 차트의 각도를 살핍니다. 어떤 체계든 누가 맞고 틀리다가 아니라 서로의 결을 이해하는 실마리로 씁니다.",
      "이 허브의 글은 연인·부부는 물론 가족과 동료 관계까지 관계를 읽는 여러 방법과 그 한계를 함께 정리했습니다. 궁합 결과는 관계를 단정하는 판정이 아니라 서로를 조금 더 이해하고 대화를 여는 참고 자료로 삼는 것이 좋습니다.",
    ],
  },
  dream: {
    heading: "꿈해몽 인사이트를 읽는 법",
    paragraphs: [
      "해몽은 꿈에 나타난 상징을 삶의 맥락과 연결해 읽는 오래된 관습입니다. 같은 상징이라도 꾸는 사람의 상황과 감정에 따라 의미가 달라지므로, 꿈의 장면 하나만 떼어 단정하기보다 그때의 기분과 최근의 고민을 함께 떠올리며 읽는 것이 좋습니다.",
      "이 허브에서는 자주 나타나는 꿈 상징의 의미, 태몽처럼 특별하게 여겨지는 꿈, 그리고 꿈을 지나치게 불안하게 해석하지 않는 관점을 정리했습니다. 해몽은 예언이 아니라 무의식이 건네는 신호를 차분히 돌아보는 참고 자료입니다.",
      "한국에서 널리 쓰이는 해몽 갈래는 크게 둘입니다. 하나는 조선 후기 이후 민간에 전해 내려온 상징 사전 계열로, 물·불·조상·동물 같은 소재마다 길흉을 붙여 읽습니다. 다른 하나는 20세기 심리학이 들여온 관점으로, 꿈을 예고가 아니라 낮에 처리하지 못한 감정의 잔여로 봅니다. 같은 꿈을 두 갈래가 정반대로 읽는 경우도 흔한데, 어느 쪽이 맞다기보다 묻는 질문이 다르다고 보는 편이 정확합니다.",
      "그래서 이 허브의 글은 상징 풀이를 소개하되 그것을 확정으로 제시하지 않습니다. 꿈에서 무엇을 봤는지보다 그 장면에서 어떤 기분이었는지, 요즘 무엇이 마음에 걸려 있었는지를 함께 적어 두면 해석의 폭이 좁아집니다. 반복해서 꾸는 꿈이라면 특히 그 기록이 도움이 됩니다.",
    ],
  },
  fusion: {
    heading: "초융합 인사이트를 읽는 법",
    paragraphs: [
      "초융합은 사주, 자미두수, 숙요점, 베다 점성술, 서양 점성술, 타로처럼 기준이 서로 다른 여섯 체계를 한 사람에게 나란히 적용해, 어디서 같은 신호가 겹치고 어디서 다르게 읽히는지를 확인하는 방식입니다. 한 체계만 보면 우연으로 넘길 수 있는 흐름도, 기준이 다른 여러 체계가 같은 결론에 도달하면 훨씬 뚜렷한 신호로 드러납니다.",
      "이 허브는 두 체계씩 짝지어 재물·관계·시기 같은 같은 주제를 각자 어떤 기준으로 다르게 정의하는지 비교하는 글을 모았습니다. 아래 글로 각 체계의 차이와 접점을 먼저 확인한 뒤, 자신의 생년월일시로 여섯 체계를 한 번에 교차 분석하는 AI 리포트는 초융합 운세 서비스에서 이어볼 수 있습니다.",
    ],
  },
};

/**
 * 체계별 원전. 해석의 근거가 어디서 왔는지 밝히는 용도이며, 각 허브에 그대로 렌더링된다.
 * 출처 없이 단정하지 않는다는 편집 원칙(/editorial-policy)을 지면에서도 지키기 위한 블록.
 */
const TOPIC_SOURCES = {
  saju: [
    { name: "연해자평(淵海子平)", note: "송·명대에 정리된 자평명리의 기초 문헌. 일간을 기준으로 십성을 세우는 틀이 여기서 굳어졌습니다." },
    { name: "자평진전(子平眞詮)", note: "청대 심효첨의 저술. 격국을 잡는 방법을 체계화해 오늘날 해석의 뼈대가 되었습니다." },
  ],
  ziwei: [
    { name: "자미두수전서(紫微斗數全書)", note: "명대에 정리되어 가장 널리 인용되는 문헌. 이후 유파마다 성요 배치 규칙이 갈렸습니다." },
  ],
  sukuyo: [
    { name: "숙요경(宿曜經)", note: "당대에 한역된 불교 경전. 정식 명칭은 문수사리보살급제선소설길흉시일선악수요경이며, 인도의 나크샤트라 체계가 동아시아로 전해진 통로입니다." },
  ],
  tarot: [
    { name: "라이더-웨이트-스미스 덱(1909)", note: "아서 에드워드 웨이트의 설계와 파멜라 콜먼 스미스의 그림. 오늘날 통용되는 78장 상징 체계의 기준점입니다." },
    { name: "『타로의 그림 열쇠』(1911)", note: "웨이트가 직접 쓴 해설서. 카드별 의미의 1차 출처로 자주 인용됩니다." },
  ],
  astrology: [
    { name: "테트라비블로스(Tetrabiblos)", note: "2세기 프톨레마이오스의 저술. 행성·별자리·하우스를 다루는 서양 점성술 논의의 출발점입니다." },
  ],
  vedic: [
    { name: "브리핫 파라샤라 호라 샤스트라", note: "베다 점성술(조티쉬)에서 가장 널리 인용되는 고전. 다샤 체계와 나크샤트라 해석의 근거로 쓰입니다." },
  ],
  compatibility: [
    { name: "연해자평 · 자평진전", note: "두 사람의 명식을 나란히 두고 오행의 생극과 십성의 작용을 비교하는 방식의 근거." },
    { name: "숙요경", note: "27수 사이의 거리로 관계의 결을 읽는 동아시아 궁합법의 출처." },
  ],
  dream: [],
  fusion: [],
};

/** 아크별 스토리 링크 — 신규 텍스트 리더(/stories)에 주제 관련 인바운드를 공급한다. */
const TOPIC_STORY_LINKS = {
  saju: { href: "/stories/", label: "이야기로 읽는 십성 — 연이의 운명 노벨" },
  ziwei: { href: "/stories/ep-31/", label: "별들의 궁 — 자미두수 아크로 들어가기" },
  sukuyo: { href: "/stories/ep-35/", label: "붉은 실의 세계 — 숙요 아크로 들어가기" },
  compatibility: { href: "/stories/ep-38/", label: "끊을 수 없는 실 — 관계를 다루는 화" },
};

export default function InsightTopicArchive({ topic, title, intro, serviceCtaPath, curatedSlugs, editorNote }) {
  const topicKey = String(topic || "").toLowerCase();
  const guide = TOPIC_GUIDES[topicKey];
  const sources = TOPIC_SOURCES[topicKey] || [];
  const storyLink = TOPIC_STORY_LINKS[topicKey] || null;
  const featureGuides = getFeatureGuidesByTopic(topic);
  const curated = Array.isArray(curatedSlugs) && curatedSlugs.length > 0
    ? curatedSlugs.map(getArticleBySlug).filter(Boolean)
    : null;
  const matcher = topicMatcher(topic);
  const topicItems = getArticlesByTopic(topic);
  const matched = topicItems.length > 0 ? topicItems : INSIGHT_ARTICLES.filter(matcher);
  const items = curated && curated.length > 0 ? curated : (matched.length > 0 ? matched : INSIGHT_ARTICLES.slice(0, 12));
  const representativeTags = Array.from(new Set(items.flatMap((item) => item.tags || item.keywords || []).filter(Boolean))).slice(0, 12);
  const beginnerGuides = items.filter((item) => /기초|입문|처음|보는 법|란\?/.test(`${item.title} ${item.excerpt || item.description}`)).slice(0, 6);
  const practicalGuides = items.filter((item) => /해석|실전|흐름|관계|재물|사랑|직업/.test(`${item.title} ${item.excerpt || item.description}`)).slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 text-slate-100 md:px-6 md:py-10">
      <header className="rounded-3xl border border-white/10 bg-[#10172b] px-5 py-6 md:px-8 md:py-8">
        <h1 className="text-2xl font-semibold text-amber-50 md:text-4xl">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300 md:text-base">{intro}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {representativeTags.map((tag) => (
            <span key={tag} className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-slate-200">
              #{tag}
            </span>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href={serviceCtaPath} className="rounded-xl border border-amber-200/40 bg-amber-200/10 px-4 py-2 text-sm hover:bg-amber-200/20">
            관련 기능 바로 시작하기
          </Link>
          <Link href="/insights" className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">
            인사이트 전체 보기
          </Link>
        </div>
      </header>

      {/* 이 컴포넌트가 <main> 을 소유해서 호출부에서 노트를 끼울 수 없다. curatedSlugs 와
          같은 선택적 prop 으로 받는다 — 안 넘기면 null 이라 나머지 허브 7개의 출력은 그대로다. */}
      <EditorNote note={editorNote} className="mt-6" />

      {guide ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1629] px-5 py-6 md:px-8 md:py-8">
          <h2 className="text-xl font-semibold text-amber-100">{guide.heading}</h2>
          {guide.paragraphs.map((paragraph, index) => (
            <p key={index} className="mt-4 break-keep text-sm leading-7 text-slate-300 md:text-base">
              {paragraph}
            </p>
          ))}
        </section>
      ) : null}

      {sources.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1629] px-5 py-6 md:px-8 md:py-8">
          <h2 className="text-xl font-semibold text-amber-100">해석의 근거 — 참고 원전</h2>
          <p className="mt-3 break-keep text-sm leading-7 text-slate-300 md:text-base">
            이 허브의 글은 아래 문헌에서 전해 내려온 해석 규칙을 바탕으로 정리했습니다. 다만 같은
            원전을 두고도 유파마다 강조점이 달라, 여기서 소개하는 내용이 유일한 정답은 아닙니다.
          </p>
          <ul className="mt-4 space-y-3">
            {sources.map((source) => (
              <li key={source.name} className="rounded-xl border border-white/12 bg-white/5 px-4 py-3">
                <p className="text-sm font-semibold text-slate-100">{source.name}</p>
                <p className="mt-1 break-keep text-sm leading-7 text-slate-300">{source.note}</p>
              </li>
            ))}
          </ul>
          {storyLink ? (
            <p className="mt-4 break-keep text-sm leading-7 text-slate-300">
              이 체계를 이야기로 먼저 만나 보고 싶다면{" "}
              <Link href={storyLink.href} className="text-amber-100 underline">
                {storyLink.label}
              </Link>
              도 함께 읽어 보세요.
            </p>
          ) : null}
        </section>
      ) : null}

      {featureGuides.length > 0 ? (
        <section className="cd-guide-index mt-6">
          <h2 className="cd-guide-index__title">이 체계를 계산하는 방식</h2>
          <p className="cd-guide-index__lede">
            어떤 역법과 근거로 계산하는지, 결과를 어디까지 참고하면 되는지 정리한 기능 가이드입니다.
          </p>
          <ul className="cd-guide-index__grid">
            {featureGuides.map((featureGuide) => (
              <li key={featureGuide.href}>
                <Link href={featureGuide.href} className="cd-guide-index__link">
                  {featureGuide.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1629] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">추천 글</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.slice(0, 12).map((article) => (
            <Link
              key={article.slug}
              href={`/insights/${article.slug}`}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10"
            >
              <p className="text-xs text-slate-400">
                {article.category}
                {formatDate(article.publishedAt) ? ` · ${formatDate(article.publishedAt)}` : ""}
              </p>
              <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-100">{article.title}</h3>
              <p className="mt-2 text-xs leading-6 text-slate-300 line-clamp-3">{article.excerpt || article.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1525] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">최신 글</h2>
        <ul className="mt-4 space-y-2">
          {items.slice(0, 10).map((article) => (
            <li key={`latest-${article.slug}`} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <Link href={`/insights/${article.slug}`} className="text-sm leading-6 text-slate-100 hover:text-amber-100">
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#11182b] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">초보자 가이드</h2>
        <ul className="mt-4 space-y-2">
          {(beginnerGuides.length > 0 ? beginnerGuides : items.slice(0, 6)).map((article) => (
            <li key={`beginner-${article.slug}`} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <Link href={`/insights/${article.slug}`} className="text-sm leading-6 text-slate-100 hover:text-amber-100">
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-3xl border border-white/10 bg-[#11182b] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">실전 해석 글</h2>
        <ul className="mt-4 space-y-2">
          {(practicalGuides.length > 0 ? practicalGuides : items.slice(0, 6)).map((article) => (
            <li key={`practical-${article.slug}`} className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <Link href={`/insights/${article.slug}`} className="text-sm leading-6 text-slate-100 hover:text-amber-100">
                {article.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
