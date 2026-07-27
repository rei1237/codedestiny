import Link from "next/link";
import { INSIGHT_ARTICLES, getArticlesByTopic } from "./articles";
import { getFeatureGuidesByTopic } from "./feature-guides";

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
    ],
  },
  ziwei: {
    heading: "자미두수 인사이트를 읽는 법",
    paragraphs: [
      "자미두수는 태어난 시각을 바탕으로 명반이라 부르는 열두 궁을 세우고, 자미성을 비롯한 열네 개의 주성과 여러 보좌성이 어느 궁에 앉는지로 삶의 지도를 읽는 동양 점성입니다. 명궁을 중심으로 재백궁·관록궁·부처궁·천이궁 등 각 궁의 별 배치를 보면 기질과 관계, 일과 재물의 흐름이 입체적으로 드러납니다.",
      "이 허브에서는 명반을 처음 세우는 법, 열두 궁과 주성의 의미, 사화(화록·화권·화과·화기)의 작용 같은 기초부터 사주와 자미두수를 함께 볼 때의 차이까지 단계별로 정리했습니다. 별의 밝기와 궁의 상호작용을 함께 읽으면 한 장의 명반이 훨씬 풍부하게 보입니다.",
    ],
  },
  sukuyo: {
    heading: "숙요점 인사이트를 읽는 법",
    paragraphs: [
      "숙요점은 달이 하늘을 지나며 머무는 27수를 기준으로 사람의 타고난 본명수와 관계의 궁합을 읽는 동양의 오래된 점법입니다. 자신의 본명수를 찾은 뒤 상대와의 관계가 영친·안괴·업태 같은 어떤 자리에 놓이는지를 보면 두 사람 사이의 거리와 어울리는 시기를 가늠할 수 있습니다.",
      "이 허브의 글은 본명수를 찾는 법, 27수 각각의 성향, 관계를 읽는 아홉 자리의 의미를 차근히 설명합니다. 본명수와 월명수의 차이, 사주 궁합과 숙요 궁합을 함께 볼 때의 관점까지 다루어 처음 접하는 분도 관계의 결을 부담 없이 이해하도록 정리했습니다.",
    ],
  },
  tarot: {
    heading: "타로 인사이트를 읽는 법",
    paragraphs: [
      "타로는 78장의 카드가 지닌 상징으로 지금의 질문과 마음의 결을 비추는 도구입니다. 22장의 메이저 아르카나는 삶의 큰 주제를, 56장의 마이너 아르카나는 일상의 구체적인 장면을 나타냅니다. 카드 한 장의 그림과 방향(정방향·역방향), 그리고 스프레드 안에서의 자리를 함께 읽어야 의미가 살아납니다.",
      "이 허브에서는 카드를 처음 읽는 법, 메이저·마이너 아르카나의 의미, 연애·재회·마음 읽기 같은 상황별 스프레드를 정리했습니다. 타로는 정해진 운명을 알려주는 것이 아니라 답이 하나로 떨어지지 않는 고민을 여러 각도에서 정돈하도록 돕는 언어에 가깝습니다.",
    ],
  },
  astrology: {
    heading: "점성술 인사이트를 읽는 법",
    paragraphs: [
      "서양 점성술은 태어난 순간 하늘의 행성 배치를 담은 출생차트로 타고난 성향과 삶의 리듬을 읽습니다. 자아를 뜻하는 태양, 감정을 뜻하는 달, 첫인상을 뜻하는 상승궁을 축으로 각 행성이 어떤 별자리와 하우스에 놓이고 서로 어떤 각도를 맺는지를 살피면 나를 이루는 여러 결이 드러납니다.",
      "이 허브의 글은 출생차트를 읽는 법, 열두 하우스의 의미, 행성과 각도(어스펙트)의 작용을 단계별로 설명합니다. 별자리 운세만 보던 분이 자신의 전체 차트로 넘어가도록, 그리고 시기의 흐름인 트랜짓을 참고 자료로 활용하도록 정리했습니다.",
    ],
  },
  vedic: {
    heading: "베다 점성술 인사이트를 읽는 법",
    paragraphs: [
      "베다 점성술(조티샤)은 인도 전통의 점성 체계로, 서양 점성술과 달리 항성을 기준으로 한 별자리와 라그나(상승궁), 그리고 달이 지나는 27 나크샤트라를 중요하게 봅니다. 다샤라 부르는 행성 시기 흐름을 통해 삶의 국면이 어떻게 바뀌는지를 읽는 것이 특징입니다.",
      "이 허브에서는 베다 점성술이 무엇인지, 라그나와 나크샤트라를 어떻게 읽는지, 서양 점성술과의 차이는 무엇인지를 정리했습니다. 낯선 용어는 기초 글에서 먼저 익히고 관심 있는 주제로 넘어가면 전체 흐름을 부담 없이 따라갈 수 있습니다.",
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
    ],
  },
};

export default function InsightTopicArchive({ topic, title, intro, serviceCtaPath }) {
  const guide = TOPIC_GUIDES[String(topic || "").toLowerCase()];
  const featureGuides = getFeatureGuidesByTopic(topic);
  const matcher = topicMatcher(topic);
  const topicItems = getArticlesByTopic(topic);
  const matched = topicItems.length > 0 ? topicItems : INSIGHT_ARTICLES.filter(matcher);
  const items = matched.length > 0 ? matched : INSIGHT_ARTICLES.slice(0, 12);
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

      {featureGuides.length > 0 ? (
        <section className="mt-6 rounded-3xl border border-white/10 bg-[#0f1629] px-5 py-6 md:px-8 md:py-8">
          <h2 className="text-xl font-semibold text-amber-100">이 체계를 계산하는 방식</h2>
          <p className="mt-3 break-keep text-sm leading-7 text-slate-300 md:text-base">
            어떤 역법과 근거로 계산하는지, 결과를 어디까지 참고하면 되는지 정리한 기능 가이드입니다.
          </p>
          <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {featureGuides.map((featureGuide) => (
              <li key={featureGuide.href}>
                <Link
                  href={featureGuide.href}
                  className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-100 hover:border-amber-200/40 hover:bg-white/10 hover:text-amber-100"
                >
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
