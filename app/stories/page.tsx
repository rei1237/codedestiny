import Link from "next/link";
import StoryIntegrityNote from "../components/StoryIntegrityNote";
import YehwaCard from "../components/service-intro/YehwaCard";
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
  title: "연이의 운명 노벨 — 사주로 걷는 70화 판타지 | Code Destiny",
  description:
    "평범한 대학생이 꽃돼지가 되어 십성의 섬과 자미두수·점성술·베다·타로의 네 하늘을 건너는 70화 완결 창작 소설. 등장인물과 세계관, 화별 줄거리를 한자리에서 볼 수 있습니다.",
  keywords: ["연이의 운명 노벨", "사주 소설", "운세 웹소설", "십성 판타지", "코드데스티니 스토리"],
});

const TOTAL_KOREAN = STORY_EPISODES.reduce((sum, episode) => sum + countKorean(episode), 0);
const TOTAL_MINUTES = STORY_EPISODES.reduce((sum, episode) => sum + readingMinutes(episode), 0);

const CHARACTERS = [
  { key: "yeon", role: "주인공. 꽃돼지의 몸으로 운세 세계에 떨어진 평범한 대학생." },
  { key: "neo", role: "갈기 달린 고양이를 자처하는 안내자. 에두르지 않고 짚어야 할 것을 짚는다." },
  { key: "geo", role: "거울 너머의 또 다른 연이. 스스로에게 묻는 질문을 대신 던진다." },
  { key: "moka", role: "식상의 섬의 마지막 불씨. 몰래 랩을 하는 독설가 수달 요리사." },
  { key: "yun", role: "사람 점술가 윤달. 태어난 시를 잃어 집에 못 가는 선배 사용자." },
  { key: "rab", role: "청토끼 금융의 주인. 남의 시간을 사고파는 자칭 최약체." },
  { key: "mu", role: "무성. 노래를 비웃음받던 소년. 검은 깃털을 받고 섬을 침묵시켰다." },
  { key: "crow", role: "검은 깃털의 재판관. 가면 아래의 얼굴이 별들의 궁에서 드러난다." },
  { key: "ln", role: "재성의 섬 빵집의 막내. 언니는 빵집을 지키려고 자기 시간을 팔아 왔다." },
  { key: "pje", role: "서한비. 장부를 든 검은 호랑이. 첫 번째 봄을 기억하는 회귀자." },
  { key: "heuk", role: "흑월. 운명 코드를 먹는 몸 없는 일식. 남의 얼굴을 쓰고 이간질한다." },
  { key: "god", role: "고객센터 우주. 앱 너머에서 끝까지 전화를 받지 않던 목소리." },
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
      <YehwaCard as="header">
        <p>Code Destiny Novel</p>
        <h1>
          연이의 운명 노벨
        </h1>
        <p>
          알람 세 개를 다 끄고도 일어나지 못하던 아침, 깔린 적 없는 앱 하나가 화면에 떠 있었습니다.
          평범한 대학생 연이는 그 앱을 열고 꽃돼지의 몸으로 낯선 세계에 떨어집니다. 이 이야기는
          그가 십성의 섬과 자미두수·점성술·베다·타로의 네 하늘을 차례로 건너며 자기 이름을 되찾는
          70화 완결 창작 소설입니다.
        </p>
        <p>
          전체 분량은 한글 약 {Math.round(TOTAL_KOREAN / 10000)}만 자, 처음부터 끝까지 읽는 데
          대략 {Math.round(TOTAL_MINUTES / 60)}시간 남짓 걸립니다. 아래 목차에서 원하는 화로 바로
          들어갈 수 있고, 연출과 음악이 함께 흐르는{" "}
          <a href="/codedestiny-novel.html" className="text-amber-100 underline">
            비주얼 노벨 버전
          </a>
          으로도 같은 이야기를 읽을 수 있습니다.
        </p>
      </YehwaCard>

      <YehwaCard as="section" id="world" ornament={false} className="mt-8">
        <h2>세계관 — 명식이 지도가 되는 곳</h2>
        <p>
          이 세계의 지형은 사주 명리학의 십성(十星)에서 왔습니다. 나와 같은 기운이 모인 비겁의 섬,
          만들고 표현하는 식상의 섬, 가진 것을 다루는 재성의 섬, 배우고 물려받는 인성의 도서관이
          차례로 이어집니다. 명식에서 어떤 기운이 강하고 어떤 기운이 비었는지가 그대로 지형이 되는
          셈이라, 연이가 어느 섬에서 헤매는지가 곧 그가 지금 무엇을 배우는 중인지를 말해 줍니다.
        </p>
        <p>
          후반부에는 무대가 네 개의 하늘로 넓어집니다. 자미두수의 열두 궁, 점성술의 열두 집,
          베다의 스물일곱 낙샤트라, 타로의 스물두 장이 차례로 열리고, 그 모든 하늘을 먹어 드는
          일식 흑월과의 싸움이 이어집니다. 이야기가 진행될수록 보는 범위가 나에게서 세상으로 넓어집니다.
        </p>
        <p>
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
      </YehwaCard>

      <YehwaCard as="section" id="characters" ornament={false} className="mt-8">
        <h2>등장인물</h2>
        <dl className="mt-4 space-y-3">
          {CHARACTERS.map((character) => (
            <div key={character.key} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <dt className="text-sm font-semibold text-slate-100">{STORY_SPEAKERS[character.key]}</dt>
              <dd className="mt-1 break-keep text-sm leading-7 text-slate-300">{character.role}</dd>
            </div>
          ))}
        </dl>
      </YehwaCard>

      <YehwaCard as="section" id="arcs" ornament={false} className="mt-8">
        <h2>{STORY_ARCS.length}개 아크 구성</h2>
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
      </YehwaCard>

      <YehwaCard as="section" id="toc" ornament={false} className="mt-8">
        <h2>전체 목차 — {STORY_EPISODES.length}화</h2>
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
      </YehwaCard>

      <StoryIntegrityNote />
    </main>
  );
}
