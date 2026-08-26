import Link from "next/link";
import StoryIntegrityNote from "../components/StoryIntegrityNote";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd } from "../../lib/structured-data";
import {
  ARC_GUIDE_LINKS,
  STORY_ARCS,
  STORY_EPISODES,
  STORY_LOGLINES,
  STORY_SPEAKERS,
  countKorean,
  readingMinutes,
} from "../../lib/stories/vn";

export const metadata = buildSeoMetadata({
  path: "/stories",
  title: "연이의 운명 노벨 — 사주로 걷는 44화 판타지 | Code Destiny",
  description:
    "평범한 회사원이 꽃돼지가 되어 십성의 섬, 자미두수의 궁, 숙요의 붉은 실을 건너는 44화 완결 창작 소설. 등장인물과 세계관, 화별 줄거리를 한자리에서 볼 수 있습니다.",
  keywords: ["연이의 운명 노벨", "사주 소설", "운세 웹소설", "십성 판타지", "코드데스티니 스토리"],
});

const TOTAL_KOREAN = STORY_EPISODES.reduce((sum, episode) => sum + countKorean(episode), 0);
const TOTAL_MINUTES = STORY_EPISODES.reduce((sum, episode) => sum + readingMinutes(episode), 0);

const CHARACTERS = [
  { key: "yeon", role: "주인공. 꽃돼지의 몸으로 운세 세계에 떨어진 평범한 회사원." },
  { key: "neo", role: "갈기 달린 고양이를 자처하는 안내자. 에두르지 않고 짚어야 할 것을 짚는다." },
  { key: "geo", role: "거울 너머의 또 다른 연이. 스스로에게 묻는 질문을 대신 던진다." },
  { key: "moka", role: "식상의 섬에서 만나는 요리사. 재능을 나누는 법을 보여 준다." },
  { key: "rab", role: "청토끼 금융그룹의 얼굴. 재성의 섬을 계약서로 다스린다." },
  { key: "baek", role: "인성의 도서관을 지키는 사서. 오래된 상처를 품고 있다." },
  { key: "mu", role: "무성. 이름을 잃은 자리에서 이야기를 이어 간다." },
  { key: "crow", role: "검은 깃털의 주인. 여러 아크에 걸쳐 정체가 드러난다." },
  { key: "luna", role: "루나블룸. 별들의 궁으로 이어지는 문을 여는 존재." },
  { key: "pje", role: "서한비. 붉은 실 저편에서 불리는 이름." },
  { key: "god", role: "운명의 신. 읽는 쪽과 쓰는 쪽을 가르는 마지막 관문." },
];

// 회차 페이지(app/stories/[episode]/page.tsx)와 같은 계층을 허브에서도 내보낸다.
// 여기가 빠지면 검색 결과의 경로가 회차에서만 그려지고 허브는 맨 URL 로 남는다.
const storiesBreadcrumbJsonLd = buildBreadcrumbJsonLd([
  { name: "홈", path: "/" },
  { name: "연이의 운명 노벨", path: "/stories/" },
]);

export default function StoriesHubPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 text-slate-100 md:px-6 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storiesBreadcrumbJsonLd) }}
      />
      <header className="rounded-3xl border border-white/10 bg-[#10172b] px-5 py-7 md:px-8 md:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100/70">Code Destiny Novel</p>
        <h1 className="mt-3 break-keep text-3xl font-bold leading-tight text-amber-50 md:text-4xl">
          연이의 운명 노벨
        </h1>
        <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
          알람 세 개를 다 끄고도 일어나지 못하던 아침, 깔린 적 없는 앱 하나가 화면에 떠 있었습니다.
          평범한 회사원이던 연이는 그 앱을 열고 꽃돼지의 몸으로 낯선 세계에 떨어집니다. 이 이야기는
          그가 십성의 섬과 자미두수의 궁, 숙요의 붉은 실을 차례로 건너며 자기 이름을 되찾는
          44화 완결 창작 소설입니다.
        </p>
        <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
          전체 분량은 한글 약 {Math.round(TOTAL_KOREAN / 10000)}만 자, 처음부터 끝까지 읽는 데
          대략 {Math.round(TOTAL_MINUTES / 60)}시간 남짓 걸립니다. 아래 목차에서 원하는 화로 바로
          들어갈 수 있고, 연출과 음악이 함께 흐르는{" "}
          <a href="/codedestiny-novel.html" className="text-amber-100 underline">
            비주얼 노벨 버전
          </a>
          으로도 같은 이야기를 읽을 수 있습니다.
        </p>
      </header>

      <section id="world" className="mt-8 rounded-3xl border border-white/10 bg-[#0f172a] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">세계관 — 명식이 지도가 되는 곳</h2>
        <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
          이 세계의 지형은 사주 명리학의 십성(十星)에서 왔습니다. 나와 같은 기운이 모인 비겁의 섬,
          만들고 표현하는 식상의 섬, 가진 것을 다루는 재성의 섬, 배우고 물려받는 인성의 도서관이
          차례로 이어집니다. 명식에서 어떤 기운이 강하고 어떤 기운이 비었는지가 그대로 지형이 되는
          셈이라, 연이가 어느 섬에서 헤매는지가 곧 그가 지금 무엇을 배우는 중인지를 말해 줍니다.
        </p>
        <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
          후반부에는 무대가 넓어집니다. 자미두수의 열두 궁이 별들의 궁으로, 숙요 27수가 사람과
          사람을 잇는 붉은 실의 세계로 등장합니다. 세 체계가 각각 자기 자신·삶의 영역·관계라는
          다른 층위를 맡고 있어, 이야기가 진행될수록 보는 범위가 나에게서 세상으로 넓어집니다.
        </p>
        <p className="mt-4 break-keep text-sm leading-8 text-slate-300 md:text-base">
          다만 작품 속 설정은 서사를 위해 각색한 것입니다. 각 체계의 실제 해석 규칙이 궁금하다면{" "}
          <Link href="/saju/ten-gods/" className="text-amber-100 underline">
            십성 해석 가이드
          </Link>
          와{" "}
          <Link href="/ziwei/guide/" className="text-amber-100 underline">
            자미두수 명반 읽는 법
          </Link>
          을 함께 보시길 권합니다.
        </p>
      </section>

      <section id="characters" className="mt-8 rounded-3xl border border-white/10 bg-[#0f172a] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">등장인물</h2>
        <dl className="mt-4 space-y-3">
          {CHARACTERS.map((character) => (
            <div key={character.key} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <dt className="text-sm font-semibold text-slate-100">{STORY_SPEAKERS[character.key]}</dt>
              <dd className="mt-1 break-keep text-sm leading-7 text-slate-300">{character.role}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="arcs" className="mt-8 rounded-3xl border border-white/10 bg-[#0f172a] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">7부 구성</h2>
        <div className="mt-4 space-y-4">
          {STORY_ARCS.map((arc) => {
            const episodes = STORY_EPISODES.slice(arc.from, arc.to + 1);
            const korean = episodes.reduce((sum, episode) => sum + countKorean(episode), 0);
            const guide = ARC_GUIDE_LINKS[arc.key];
            return (
              <div key={arc.key} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <h3 className="text-base font-semibold text-slate-50">{arc.title}</h3>
                <p className="mt-2 break-keep text-sm leading-7 text-slate-300">{arc.summary}</p>
                <p className="mt-2 text-xs text-slate-400">
                  {episodes.length}화 · 한글 약 {korean.toLocaleString()}자
                  {guide ? (
                    <>
                      {" · 관련 가이드 "}
                      <Link href={guide.href} className="text-amber-100 underline">
                        {guide.label}
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="toc" className="mt-8 rounded-3xl border border-white/10 bg-[#11182b] px-5 py-6 md:px-8 md:py-8">
        <h2 className="text-xl font-semibold text-amber-100">전체 목차 — {STORY_EPISODES.length}화</h2>
        <ol className="mt-4 space-y-2">
          {STORY_EPISODES.map((episode) => (
            <li key={episode.slug}>
              <Link
                href={`/stories/${episode.slug}/`}
                className="block rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-amber-200/40 hover:bg-white/[0.08]"
              >
                <p className="text-xs text-slate-400">
                  {episode.no} · 읽는 시간 약 {readingMinutes(episode)}분
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{episode.title}</p>
                <p className="mt-1 break-keep text-xs leading-6 text-slate-300">
                  {STORY_LOGLINES[episode.slug] || ""}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <StoryIntegrityNote />
    </main>
  );
}
