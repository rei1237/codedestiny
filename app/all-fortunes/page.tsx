import { buildSeoMetadata } from "@/lib/seo";
import { getAllFortuneSections } from "@/app/_lib/allFortunesCatalog";
import AllFortunesClient from "./AllFortunesClient";

export const metadata = buildSeoMetadata({
  path: "/all-fortunes",
  title: "모든 운세 한눈에 보기 | 사주·타로·점성술·신탁 전체 목록 — Code Destiny",
  description:
    "Code Destiny가 제공하는 사주, 타로, 자미두수, 숙요, 베다·서양 점성술, 신탁, 해몽, 관상, 손금까지 모든 운세를 한 화면에서 찾아보세요. 검색과 즐겨찾기로 원하는 운세에 바로 갑니다.",
  keywords: ["모든 운세", "운세 전체보기", "사주 타로 점성술", "운세 목록", "무료 운세"],
});

const GUIDE_SECTIONS = [
  {
    title: "사주 & 명리 — 타고난 기질부터 읽는다",
    body: "사주는 태어난 연·월·일·시를 여덟 글자로 옮겨 기질과 흐름을 읽는 방법입니다. 오행의 균형과 십성의 배치를 보면 무엇을 잘하고 무엇에서 지치는지가 먼저 드러납니다. 처음이라면 무료 만세력 기본 해석으로 내 명식을 확인한 뒤, 진로가 궁금하면 시빌라 시스템, 연애가 궁금하면 러브 코드처럼 주제를 좁힌 분석으로 옮겨가는 순서를 권합니다. 인생 전체의 큰 줄기를 한 번에 정리하고 싶다면 전문가 상담인 인생의 책을 보세요.",
  },
  {
    title: "동서양 명리 — 같은 하늘을 다르게 읽는 세 가지 눈",
    body: "자미두수는 열두 궁에 별을 배치해 인생의 무대를 그리고, 서양 점성술은 출생 차트의 행성 각도로 성향과 시기를 읽으며, 베다 점성술은 나크샤트라와 다샤로 시간의 마디를 나눕니다. 세 체계는 서로 경쟁하지 않습니다. 사주가 기질을 말한다면 자미두수는 자리, 점성술은 타이밍을 말해 줍니다. 같은 고민을 세 각도에서 겹쳐 보면 혼자서는 보이지 않던 선택지가 드러납니다.",
  },
  {
    title: "타로 & 신탁 — 지금 이 질문에 답이 필요할 때",
    body: "명식이 태어날 때 정해진 지도라면, 타로와 신탁은 오늘의 날씨에 가깝습니다. 질문을 어떻게 세우느냐가 답의 절반을 정하므로, 막연히 뽑기보다 상황과 선택지를 문장으로 정리한 뒤 카드를 여는 편이 훨씬 쓸모 있습니다. 연애 관계라면 6카드 리딩, 재회 여부라면 등대 타로, 한 해의 리듬이 궁금하면 십이지신 천운처럼 스프레드를 목적에 맞춰 고르세요. 주역 거북점·화투점·룬·찻잎점처럼 문화가 다른 신탁도 함께 준비되어 있습니다.",
  },
  {
    title: "해몽 · 관상 · 손금 — 몸과 무의식이 남긴 단서",
    body: "꿈은 낮에 정리하지 못한 감정이 상징으로 되돌아온 것입니다. 드림 프롬프트로 꿈 문장을 정리하거나 정신분석 해몽으로 프로이트 관점의 해석을 볼 수 있습니다. 관상과 손금은 얼굴형과 손바닥의 선에서 기질의 단서를 읽습니다. 이 셋은 예언이 아니라 관찰입니다. 결과를 정답으로 받기보다, 스스로도 어렴풋이 알고 있던 것을 말로 확인하는 도구로 쓰는 편이 정확합니다.",
  },
];

const FAQ_ITEMS = [
  {
    question: "무료로 볼 수 있는 운세는 어떤 것인가요?",
    answer:
      "사주 만세력 기본 해석, 자미두수 명반, 서양 점성술 코즈믹, 베다 점성술, 숙요점의 기본 서비스, 명리학 타로, 자존감 레벨업 타로, 오늘의 운세는 모두 무료입니다. 각 카드의 설명에 무료 여부와 가격을 함께 적어 두었으니 들어가기 전에 확인할 수 있습니다.",
  },
  {
    question: "처음이라면 어떤 순서로 보는 게 좋을까요?",
    answer:
      "먼저 프로필 카드에 생년월일과 태어난 시각을 저장하세요. 그러면 이후 모든 기능에서 생년 정보를 다시 입력할 필요가 없습니다. 그다음 무료 사주 기본 해석으로 내 명식을 확인하고, 궁금한 주제(연애·진로·관계)에 맞는 기능으로 좁혀 들어가는 순서를 권합니다.",
  },
  {
    question: "즐겨찾기와 최근 이용은 어디에 저장되나요?",
    answer:
      "이 브라우저에만 저장됩니다. 서버로 보내지 않으므로 다른 기기에서는 목록이 공유되지 않고, 브라우저 데이터를 지우면 함께 사라집니다.",
  },
  {
    question: "이용권과 개별 결제는 어떻게 다른가요?",
    answer:
      "이용권은 30일 동안 대상 기능을 추가 결제 없이 이용하는 방식이고, 개별 결제는 그 기능을 한 번 볼 때마다 결제하는 방식입니다. 이용권이 적용되는 기능이라면 결제창 없이 바로 통과하며, 적용되지 않는 기능에서만 결제창이 열립니다.",
  },
];

export default function AllFortunesPage() {
  const sections = getAllFortuneSections("ko");
  const totalCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#0a0818,#13102a)] px-4 pb-24 pt-8 text-violet-50">
      <div className="mx-auto max-w-6xl">
        <header>
          <p className="text-xs font-bold tracking-[0.18em] text-amber-200/80">ALL FORTUNES</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">모든 운세</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-violet-100/80">
            Code Destiny의 운세 {totalCount}종을 한 화면에 모았습니다. 사주와 자미두수처럼 타고난 기질을 읽는
            명리부터, 타로·신탁처럼 지금의 질문에 답하는 리딩, 해몽·관상·손금까지 카테고리별로 정리했습니다.
            이름으로 검색하거나 자주 보는 운세를 즐겨찾기에 담아 두면 다음부터는 한 번에 찾을 수 있습니다.
          </p>
        </header>

        <AllFortunesClient sections={sections} />

        <section className="mt-14" aria-labelledby="all-fortunes-guide">
          <h2 id="all-fortunes-guide" className="text-xl font-black">
            운세 고르는 법
          </h2>
          <div className="mt-4 space-y-5">
            {GUIDE_SECTIONS.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-violet-300/20 bg-violet-950/30 p-5"
              >
                <h3 className="text-base font-bold text-violet-100">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-violet-100/75">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12" aria-labelledby="all-fortunes-faq">
          <h2 id="all-fortunes-faq" className="text-xl font-black">
            자주 묻는 질문
          </h2>
          <dl className="mt-4 space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="rounded-2xl border border-violet-300/20 bg-violet-950/30 p-5">
                <dt className="text-base font-bold text-violet-100">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-violet-100/75">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </main>
  );
}
