import type { Metadata } from "next";
import MasterLoveCodexRouteClient from "./MasterLoveCodexRouteClient";
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildServiceJsonLd,
} from "../../lib/structured-data";
import { siteSeo } from "../../lib/seo/siteSeo";
import ServiceIntroSection from "../components/ServiceIntroSection";

const PAGE_PATH = "/master-love-codex/";
const PAGE_TITLE = "마스터 운명 연애 비책 | 사주·자미두수 융합 20장 연애 전략서 — Code Destiny";
const PAGE_DESCRIPTION =
  "사주 명식과 자미두수 명반을 함께 펼쳐 연애 성향·끌림의 원리·갈등의 뿌리·재회와 결혼운까지 20장으로 읽는 최상위 프리미엄 상담. 운명의 안내자 박지은이 한 권의 연애 전략서로 읽어 드립니다.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  keywords: ["연애운", "사주 연애", "자미두수 부부궁", "연애 전략서", "궁합", "재회운", "결혼운", "프리미엄 연애 상담"],
  alternates: {
    canonical: `${siteSeo.siteUrl}${PAGE_PATH}`,
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: `${siteSeo.siteUrl}${PAGE_PATH}`,
    siteName: siteSeo.siteName,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [{ url: siteSeo.defaultOgImage, width: 1200, height: 630, alt: "마스터 운명 연애 비책" }],
  },
  twitter: {
    card: siteSeo.twitterCard,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: [siteSeo.defaultOgImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const chapterOutline = [
  "제1장 운명의 문 — 당신이라는 사람",
  "제2장 타고난 연애 기질 — 일간과 십성이 말하는 것",
  "제3장 부부궁이 말하는 배우자상",
  "제4장 끌림의 원리 — 오행과 조후",
  "제5장 애착과 표현 방식",
  "제6장 마음의 방어기제",
  "제7장 인연이 열리는 자리 — 천이궁의 지도",
  "제8장 썸에서 연애로 넘어가는 조건",
  "제9장 고백과 타이밍",
  "제10장 관계의 온도 곡선",
  "제11장 갈등의 뿌리 — 형충파해가 건드리는 자리",
  "제12장 화해와 회복의 언어",
  "제13장 질투·집착·거리두기",
  "제14장 친밀감과 두 사람의 리듬",
  "제15장 이별의 패턴과 재회의 문",
  "제16장 결혼운과 장기 동행",
  "제17장 사주 × 자미두수 교차검증",
  "제18장 연애 DNA 프로필",
  "제19장 앞으로 3년, 인연의 흐름",
  "제20장 박지은의 마지막 편지",
];

const masterLoveCodexFaqItems = [
  {
    question: "마스터 운명 연애 비책은 기존 연애 비책 상담과 무엇이 다른가요?",
    answer:
      "기존 연애 비책 상담이 사주 명식만으로 지금의 연애 흐름을 읽어 준다면, 마스터 운명 연애 비책은 사주와 자미두수 명반을 함께 펼쳐 두고 스무 장에 걸쳐 관계 전체를 다룹니다. 두 체계가 같은 말을 하는 지점은 신뢰도가 높은 성향으로, 엇갈리는 지점은 그 이유까지 설명해 드립니다. 분량과 깊이가 다른 상위 등급 상담입니다.",
  },
  {
    question: "어떤 정보가 필요한가요?",
    answer:
      "생년월일과 태어난 시각, 성별, 양력·음력 구분이 필요합니다. 프로필 카드를 만들어 두셨다면 자동으로 채워집니다. 태어난 시각을 모르셔도 진행할 수 있으며, 이 경우 시주를 제외하고 읽습니다. 큰 흐름은 그대로지만 하루 단위의 세밀한 해석은 다소 흐려집니다.",
  },
  {
    question: "상대방의 생년월일도 필요한가요?",
    answer:
      "필요하지 않습니다. 이 비책은 상대를 점치는 것이 아니라 당신이 관계에서 반복하는 방식을 읽는 책입니다. 어떤 사람에게 끌리는지, 어떤 지점에서 마음을 닫는지, 갈등이 어디에서 시작되는지를 당신의 명식과 명반만으로 짚습니다.",
  },
  {
    question: "결과는 다시 볼 수 있나요?",
    answer:
      "네. 완성된 비책은 계정에 보관되어 재결제 없이 다시 열람할 수 있습니다. 생성 도중 창을 닫으셔도 그때까지 쓰인 장은 그대로 보관되며, 다시 들어오시면 이어서 완성할 수 있습니다. PDF로 내려받아 소장하실 수도 있습니다.",
  },
  {
    question: "이용권으로 볼 수 있나요?",
    answer:
      "패밀리 등급 이용권은 이 상담을 무료로 커버합니다. 그 외 등급은 이용권 커버 한도를 넘는 금액이라 단건 결제 또는 월정석으로 이용하실 수 있으며, 결제 화면에서 두 방법을 함께 확인하실 수 있습니다.",
  },
  {
    question: "결과를 그대로 믿어도 되나요?",
    answer:
      "명식과 명반은 타고난 성향과 시기의 흐름을 보여 주는 지도일 뿐, 정해진 결말이 아닙니다. 이 비책도 단정하는 대신 경향과 조건으로 서술합니다. 결혼이나 이별처럼 무게가 큰 결정은 이 한 권으로 정하기보다 실제 대화와 시간을 함께 쌓으며 확인하시길 권합니다.",
  },
];

const masterLoveCodexJsonLd = [
  buildServiceJsonLd({
    name: "마스터 운명 연애 비책",
    description: PAGE_DESCRIPTION,
    path: PAGE_PATH,
    serviceType: "사주·자미두수 융합 프리미엄 연애 상담",
  }),
  buildFaqPageJsonLd(masterLoveCodexFaqItems),
  buildBreadcrumbJsonLd([
    { name: "홈", path: "/" },
    { name: "마스터 운명 연애 비책", path: PAGE_PATH },
  ]),
];

export default function MasterLoveCodexPageRoute() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(masterLoveCodexJsonLd) }}
      />
      <MasterLoveCodexRouteClient />
      <ServiceIntroSection label="마스터 운명 연애 비책 안내">
        <h1>마스터 운명 연애 비책 — 사주와 자미두수로 읽는 스무 장의 연애 전략서</h1>
        <p>
          마스터 운명 연애 비책은 Code Destiny가 제공하는 최상위 프리미엄 상담입니다. 사주 명식(일간과
          십성, 오행의 균형과 조후, 대운과 세운의 흐름)과 자미두수 명반(명궁·부부궁·복덕궁을 비롯한
          열두 궁과 생년사화, 삼방사정)을 한자리에 펼쳐 두고, 두 체계를 서로 맞춰 가며 당신이 사랑에서
          반복하는 방식을 스무 장에 걸쳐 읽어 내려갑니다. 짧은 요약이나 몇 줄의 총평이 아니라,
          한 권의 책으로 읽는 경험을 목표로 만들어졌습니다.
        </p>
        <p>
          이야기의 화자는 운명의 안내자 박지은입니다. 신비의 도서관에서 당신을 맞이한 뒤, 아직 아무도
          읽지 않은 당신의 책을 한 장씩 펼쳐 보여 줍니다. 결과 화면을 훑는 것이 아니라 누군가가 곁에서
          읽어 주는 흐름이라, 처음부터 끝까지 하나의 이야기로 이어집니다.
        </p>
        <h2>왜 사주와 자미두수를 함께 보나요</h2>
        <p>
          두 체계는 서로 다른 언어로 같은 사람을 설명합니다. 사주는 태어난 순간의 기운의 배합으로
          기질과 시기의 흐름을 읽고, 자미두수는 열두 궁에 별을 앉혀 삶의 영역별 형세를 봅니다. 한쪽만
          보면 놓치는 자리가 생깁니다. 예를 들어 사주에서는 표현이 적은 기질로 읽히는데 명반의 부부궁이
          밝게 서 있는 경우가 있습니다. 이때 어느 한쪽을 틀렸다고 하지 않고, 왜 그런 차이가 생기는지를
          성장 환경과 현재 지나는 운의 흐름으로 함께 설명합니다. 제17장 교차검증은 이 대조를 위해
          따로 마련한 장입니다.
        </p>
        <h2>스무 장의 구성</h2>
        <p>
          비책은 타고난 기질에서 시작해 끌림, 관계의 전개, 갈등과 회복, 이별과 재회, 결혼과 장기 동행을
          지나 마지막 편지로 닫힙니다. 각 장은 근거를 먼저 밝히고, 그 근거가 실제 관계에서 어떤 장면으로
          나타나는지 보여 준 뒤, 오늘부터 해 볼 수 있는 조언으로 마무리합니다.
        </p>
        <ul>
          {chapterOutline.map((chapter) => (
            <li key={chapter}>{chapter}</li>
          ))}
        </ul>
        <h2>이런 순간에 특히 도움이 됩니다</h2>
        <ul>
          <li>
            사람은 바뀌는데 관계의 결말이 늘 비슷하게 흘러갈 때 — 반복되는 자리가 어디인지 명식과
            명반의 근거로 짚어 드립니다.
          </li>
          <li>
            상대의 마음보다 내 마음이 먼저 헷갈릴 때 — 확인하고 싶은 마음과 물러서고 싶은 마음이
            언제 켜지는지 살펴봅니다.
          </li>
          <li>
            매번 같은 지점에서 다투고 같은 방식으로 풀리지 않을 때 — 표면의 주제가 아니라 그 아래에
            깔린 진짜 쟁점을 드러냅니다.
          </li>
          <li>
            결혼이나 장기적인 동행을 앞두고 스스로가 감당할 수 있는 관계의 모양을 확인하고 싶을 때
            도움이 됩니다.
          </li>
        </ul>
        <h2>진행 방식</h2>
        <ol>
          <li>도서관에 입장해 프롤로그를 읽습니다. 프롤로그는 무료이며 언제든 건너뛸 수 있습니다.</li>
          <li>생년월일과 태어난 시각을 입력합니다. 프로필 카드가 있으면 자동으로 채워집니다.</li>
          <li>입력한 정보로 사주 명식과 자미두수 명반을 세운 뒤, 스무 장을 순서대로 씁니다.</li>
          <li>완성된 비책은 계정에 보관되며, 언제든 다시 열람하거나 PDF로 내려받을 수 있습니다.</li>
        </ol>
        <p>
          비책이 쓰이는 동안 창을 닫으셔도 괜찮습니다. 이미 완성된 장은 그대로 보관되고, 다시 들어오시면
          남은 장부터 이어서 채워집니다. 한 번에 다 읽지 않으셔도 되며, 목차에서 원하는 장으로 바로
          건너뛸 수 있습니다.
        </p>
        <h2>자주 묻는 질문</h2>
        {masterLoveCodexFaqItems.map((item) => (
          <div key={item.question}>
            <h3>{item.question}</h3>
            <p>{item.answer}</p>
          </div>
        ))}
      </ServiceIntroSection>
    </>
  );
}
