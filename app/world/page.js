import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";

/**
 * 캐릭터·세계관 안내. 푸터의 "캐릭터·세계관" 링크가 라이트 노벨 플레이어
 * (`/codedestiny-novel.html`)로 가던 것을 이 페이지로 받는다.
 *
 * 🔴 인물·장소 서술의 정본은 두 곳뿐이다 — 노벨 대본 `content/novel/episodes.source.json`
 *    과 집필 가이드 `docs/webnovel_review/webnovel_story_guideline.md`. 여기에 없는 지명
 *    (점성술·베다 계열 장소 등)을 지어내면 본편과 어긋나므로 추가하지 말 것.
 * 🔴 스포일러 선: 네오의 진명·시간여행 정체는 가이드 금칙(같은 문서 67행)이라 쓰지 않는다.
 *    흑막은 이름과 기운까지만 적는다.
 *
 * 짝이 되는 구현은 `app/methodology/page.js` 다 — 단일 파일 서버 렌더 + JSON-LD +
 * 관련 링크 칩. 로케일 분기를 두지 않는 것도 그 선례를 따른 것이다(고유명사 비중이 커
 * 기계 번역이 가장 크게 망가지는 유형이라, 번역은 별도 과제로 남겼다).
 */

const seo = publicSeoPages.world;

export const metadata = buildSeoMetadata(seo);

const CHARACTERS = [
  {
    id: "yeoni",
    symbol: "🌸",
    role: "주인공 · 꽃돼지 · 乙木",
    name: "연이",
    portrait: "/images/fortune-chat/persona/yeoni-greet.webp",
    body:
      "평범한 대학생이었다가 타로의 문을 지나며 꽃돼지의 모습이 된 주인공입니다. 타고난 글자는 을목(乙木), 나무 중에서도 덩굴입니다. 혼자서는 한 뼘도 서지 못하지만 붙잡을 것만 있으면 담벼락도 넘는 성질이라, 연이의 힘은 늘 누군가와 이어질 때 커집니다. 되찾은 기둥의 기운을 빌려 쓰는 그릇이기도 해서, 이야기가 진행될수록 쓸 수 있는 결이 하나씩 늘어납니다. 상담 화면의 연이는 이 인물이 그대로 건너온 것으로, 마음의 결을 먼저 살핀 뒤 오늘 해볼 수 있는 한 가지를 권하는 편지체로 말합니다.",
  },
  {
    id: "neo",
    symbol: "🦁",
    role: "동행 · 金",
    name: "네오",
    portrait: "/images/fortune-chat/persona/neo-world-greet.webp",
    body:
      "사주의 강을 지키는 가디언이자 연이의 동행입니다. 운명 세계에서는 금빛 사자, 현실에서는 흰 고양이의 모습으로 잠깐 나타납니다. 타고난 기운은 금(金)이라 베고 끊고 가르는 쪽입니다. 금은 본디 나무를 베는 기운이어서 연이 곁에 서는 것 자체가 위험을 안는 일인데, 네오는 그 칼을 연이를 위협하는 것에만 씁니다. 상담 화면의 네오는 결론을 첫 문장에 먼저 놓고, 그렇게 본 근거를 대고, 다음에 확인할 순서를 정리해 줍니다.",
  },
  {
    id: "seohanbi",
    symbol: "🌧️",
    role: "대적자 · 水",
    name: "서한비",
    portrait: "https://assets.code-destiny.com/CodeDestinyNovel/%EB%B0%95%EC%A7%80%EC%9D%80%20%EA%B8%B0%EB%B3%B8.webp",
    body:
      "이야기의 반대편에 선 인물입니다. 이름 그대로 찬 비의 기운을 쓰며, 세상의 시간과 인연을 제 것으로 긁어모으면서 그 일을 질서와 자비라고 부릅니다. 제 손으로 만든 그림자 자아 무성을 앞세워 움직이기 때문에, 연이가 마주하는 위협은 대개 그 그림자의 얼굴을 하고 있습니다. 자세한 내막은 라이트 노벨 본편에서 밝혀지므로 여기서는 이름과 기운까지만 적어 둡니다.",
  },
];

const PLACES = [
  ["타로의 문", "현실과 운명 세계를 잇는 입구. 연이는 이 문을 지나며 모습이 바뀌었습니다."],
  ["사주의 강", "간지의 글자들이 떠다니는 큰 강. 필요한 만큼 스스로 길을 만듭니다. 네오가 지키는 곳입니다."],
  ["비겁의 섬", "강 위에 흩어진 네 곳 중 첫 번째. 나와 같은 편, 그리고 나를 닮은 경쟁자를 마주하는 자리입니다."],
  ["식상의 섬", "표현하고 내보내는 기운의 섬. 무대와 소리가 있는 곳입니다."],
  ["재성의 섬", "가지려는 마음과 값을 매기는 일이 시험대에 오르는 섬입니다."],
  ["인성의 도서관", "기억이 책으로 꽂혀 있는 곳. 연이는 여기서 남의 이야기를 듣는 대신 기억을 직접 열람합니다."],
  ["별들의 궁", "열두 궁에 별을 배치해 사람의 자리를 읽는 곳. 자미두수 화면이 여기서 왔습니다."],
  ["붉은 실", "사람과 사람 사이에 이어진 실. 궁합과 인연 해석의 바탕이 되는 상징입니다."],
];

const RELATED_LINKS = [
  { href: "/fortune-tea-house/", text: "운명의 찻집" },
  { href: "/fortune-chat/", text: "연이·네오와 대화" },
  { href: "/stories/", text: "라이트 노벨 읽기" },
  { href: "/music/", text: "달빛 음악" },
];

const jsonLd = JSON.stringify({
  "@context": "https://schema.org",
  "@graph": [
    buildBreadcrumbJsonLd([
      { name: "홈", path: "/" },
      { name: "캐릭터와 세계관", path: "/world" },
    ]),
    buildWebPageJsonLd(seo),
  ],
});

export default function WorldPage() {
  return (
    <main className="cd-main-shell">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <header className="cd-main-header cd-world-hero">
        <div className="cd-world-hero-copy">
          <p className="cd-home-kicker">꿀꿀 운세 · 이야기</p>
          <h1 className="cd-main-title">캐릭터와 세계관</h1>
          <p className="cd-main-intro">
            꿀꿀 운세의 사주·타로·자미두수 화면 뒤에는 하나의 이야기가 깔려 있습니다.
            현대의 대학생 연이가 이상한 앱을 열었다가 운명 세계로 떨어지고, 그곳에서 흩어진 제 사주 여덟 글자를 되찾는 이야기입니다.
            상담 화면에서 만나는 연이와 네오, 찻집과 달빛 음악은 전부 이 세계에서 나왔습니다.
            여기서는 그 인물과 장소를 한자리에 모아 소개합니다.
          </p>
          <p className="cd-world-hero-trail">타로의 문 <span aria-hidden="true">→</span> 사주의 강 <span aria-hidden="true">→</span> 별들의 궁</p>
        </div>
        <figure className="cd-world-hero-art">
          <img
            src="/images/novel/remaster/river-of-names-v1.webp"
            alt="사주의 강으로 이어지는 운명 세계"
            width="1200"
            height="675"
          />
          <figcaption>사주의 강을 지키는 네오</figcaption>
        </figure>
      </header>

      <aside data-cd-editor-note="" className="cd-world-prologue" aria-labelledby="cd-world-prologue-title">
        <p className="cd-world-prologue-label">THE WORLD BEHIND THE READING</p>
        <h2 id="cd-world-prologue-title">세계관 안내</h2>
        <p>
          여기 적힌 인물과 장소는 라이트 노벨 본편에서 그대로 가져온 것이고, 새로 지어낸 설정은 없습니다. 상담 화면의 연이·네오가
          왜 그런 말투로 이야기하는지 궁금할 때 읽으시면 됩니다. 연이는 이상한 앱이 열어 준 타로의 문을 지나 운명 세계에 도착했고,
          꽃돼지는 다른 캐릭터가 아니라 그 여정에서 드러난 연이의 모습입니다.
        </p>
        <p>
          본편을 안 읽어도 됩니다. 이 페이지만 읽어도 상담 화면을 쓰는 데는 지장이 없으며, 결말과 이어지는 내용은 일부러 적지
          않았습니다. 이야기는 해석의 근거가 아닙니다. 명식·별자리 값은 계산 엔진이 내고, 세계관은 그 결과를 전하는 화자와 화면의
          결을 정할 뿐입니다. 인물 이름과 장소 표기는 노벨 대본이 정본이므로 본편이 바뀌면 이 페이지도 함께 고칩니다.
        </p>
      </aside>

      <section className="cd-world-section" aria-labelledby="cd-world-characters">
        <h2 id="cd-world-characters" className="cd-world-h2">인물</h2>
        <div className="cd-card-grid cd-world-characters">
          {CHARACTERS.map((character) => (
            <article key={character.id} id={character.id} className={`cd-card cd-world-character cd-world-character--${character.id}`}>
              <span className="cd-world-symbol" aria-hidden="true">{character.symbol}</span>
              {character.portrait ? (
                <figure className={`cd-world-character-portrait cd-world-character-portrait--${character.id}`}>
                  <img
                    src={character.portrait}
                    alt={character.id === "yeoni" ? "꽃돼지 모습의 연이" : character.id === "neo" ? "운명 세계의 네오" : "대적자 서한비"}
                    width="384"
                    height="384"
                  />
                  <figcaption>{character.id === "yeoni" ? "연이의 다른 모습" : character.id === "neo" ? "사주의 강을 지키는 네오" : "찬 비의 기운을 쓰는 서한비"}</figcaption>
                </figure>
              ) : null}
              <p className="cd-world-role">{character.role}</p>
              <h3 className="cd-world-name">{character.name}</h3>
              <p>{character.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cd-world-section" aria-labelledby="cd-world-places">
        <h2 id="cd-world-places" className="cd-world-h2">장소</h2>
        <div className="cd-card">
          <dl className="cd-world-places">
            {PLACES.map(([name, body]) => (
              <div key={name} className="cd-world-place">
                <dt>{name}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="cd-world-section" aria-labelledby="cd-world-usage">
        <h2 id="cd-world-usage" className="cd-world-h2">이 세계가 서비스에서 쓰이는 곳</h2>
        <div className="cd-card">
          <p>
            화면의 🌸 · 🦁 버튼이 상담자를 바꿉니다.
            같은 계산 결과라도 연이는 마음부터, 네오는 결론부터 이야기하므로 읽는 순서가 달라집니다.
            계산 자체는 두 상담자가 완전히 같은 엔진을 씁니다 — 명식과 별자리, 스물일곱 별자리 값은 사람이 아니라 계산기가 냅니다.
          </p>
          <nav className="cd-chip-wrap cd-world-chips" aria-label="이야기 관련 링크">
            {RELATED_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="cd-chip">{link.text}</Link>
            ))}
            <a className="cd-chip" href="/codedestiny-novel.html">삽화로 보는 라이트 노벨</a>
          </nav>
        </div>
      </section>

      <p className="cd-world-cta-wrap">
        {/* 홈은 정적 셸이 담당한다. `/` 로 보내면 배포 산출물의 RSC 페이로드가 React 홈을
            돌려주므로 `/about` 과 같은 목적지(`/static/#…`)를 쓴다. */}
        <Link className="cd-world-cta" href="/static/#destinyCardForm">✦ 내 운명 카드 만들기</Link>
      </p>

      <p className="cd-muted cd-world-note">
        이 페이지의 인물과 장소는 창작물입니다. 운세 해석의 근거는 이야기가 아니라 계산 엔진과
        전통 상징 체계이며, 그 기준은 <Link href="/methodology/">운세 콘텐츠 방법론</Link> 문서에 적어 두었습니다.
      </p>
    </main>
  );
}
