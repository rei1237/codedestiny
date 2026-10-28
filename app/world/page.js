import Link from "next/link";
import { buildSeoMetadata } from "../../lib/seo";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd } from "../../lib/structured-data";
import { publicSeoPages } from "../../lib/seo/siteSeo";
import { getEditorNote } from "../_content/editor-notes";
import EditorNote from "../components/EditorNote";
import { CHARACTER_GROUPS, PLACES, STORY_MAP } from "./world-data";

/**
 * 캐릭터·세계관 안내. 푸터의 "캐릭터·세계관" 링크가 라이트 노벨 플레이어
 * (`/codedestiny-novel.html`)로 가던 것을 이 페이지로 받는다.
 *
 * 🔴 인물·장소 서술의 정본은 두 곳뿐이다 — 노벨 대본 `content/novel/episodes.source.json`
 *    과 VN 바이블 `docs/webnovel_review/SAJU_SERIES_BIBLE.md`. 여기 없는 지명이나
 *    설정은 지어내지 않는다. 인물·장소 데이터는 `world-data.js` 에 둔다.
 * 🔴 스포일러 선: 1부 끝(EP.27B)과 2부 초입(EP.28)까지만. 네오의 진명·회귀 정체, 무성의 정체,
 *    흑월의 최후는 쓰지 않는다.
 *
 * 짝이 되는 구현은 `app/methodology/page.js` 다 — 단일 파일 서버 렌더 + JSON-LD +
 * 관련 링크 칩. 로케일 분기를 두지 않는 것도 그 선례를 따른 것이다.
 */

const seo = publicSeoPages.world;

export const metadata = buildSeoMetadata(seo);

const RELATED_LINKS = [
  { href: "/fortune-tea-house/", text: "운명의 찻집" },
  { href: "/fortune-chat/", text: "연이와 대화" },
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
    <main className="cd-main-shell cd-world-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <header className="cd-main-header cd-world-hero">
        <div className="cd-world-hero-copy">
          <p className="cd-home-kicker">CODE DESTINY · MOONLIGHT NOVEL</p>
          <h1 className="cd-main-title">캐릭터와 세계관</h1>
          <p className="cd-main-intro">
            꽃돼지가 된 연이와 비밀을 품은 영냥이 네오.
            사주의 강을 건너 흩어진 운명의 글자를 찾아가는 두 주인공의 이야기를 만나보세요.
          </p>
          <p className="cd-world-hero-trail">타로의 문 <span aria-hidden="true">→</span> 사주의 강 <span aria-hidden="true">→</span> 비겁의 섬</p>
          <nav className="cd-world-hero-links" aria-label="세계관 바로가기">
            <a href="#cast">주요 인물 만나기 <span aria-hidden="true">↓</span></a>
            <a href="#story-map">이야기 지도 <span aria-hidden="true">↓</span></a>
          </nav>
        </div>
        <figure className="cd-world-hero-art">
          <img
            src="/images/novel/yeoni-youngyangi-hero-v1.webp"
            alt="달빛과 벚꽃이 흐르는 운명 세계에서 함께 모험하는 연이와 영냥이 네오"
            width="1024"
            height="1536"
            fetchPriority="high"
          />
          <figcaption><span>MOONLIGHT NOVEL</span>연이와 영냥이, 운명의 길 위에서</figcaption>
        </figure>
      </header>

      <section id="cast" className="cd-world-section" aria-labelledby="cd-world-characters">
        <h2 id="cd-world-characters" className="cd-world-h2">여정의 동행들</h2>
        {CHARACTER_GROUPS.map((group) => (
          <div key={group.id} className="cd-world-group">
            <h3 className="cd-world-group-title">{group.title}</h3>
            <p className="cd-muted cd-world-group-intro">{group.intro}</p>
            <div className="cd-card-grid cd-world-characters">
              {group.characters.map((character) => (
                <article key={character.id} id={character.id} className={`cd-card cd-world-character cd-world-character--${character.id}`}>
                  <figure className={`cd-world-character-portrait cd-world-character-portrait--${character.id}`}>
                    <img
                      src={character.portrait}
                      alt={character.alt}
                      width="384"
                      height="384"
                      loading="lazy"
                    />
                    <figcaption>{character.caption}</figcaption>
                  </figure>
                  <div className="cd-world-character-header">
                    <div>
                      <h4 className="cd-world-name">{character.name}</h4>
                      <p className="cd-world-role">{character.role}</p>
                    </div>
                  </div>
                  <p>{character.body}</p>
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="cd-world-prologue" aria-labelledby="cd-world-prologue-title">
        <p className="cd-world-prologue-label">THE WORLD BEHIND THE READING</p>
        <h2 id="cd-world-prologue-title">한 장의 운명 카드에서 시작된 세계</h2>
        <p>
          연이는 타로의 문을 지나 운명 세계에 도착했습니다.
          사주 여덟 글자를 되찾는 여정은 사주의 강과 네 개의 섬, 기억이 잠든 도서관으로 이어집니다.
          꽃돼지는 다른 캐릭터가 아니라 그 여정에서 드러난 연이의 다른 모습입니다.
        </p>
        <p>
          이 세계관은 운세 결과를 대신 해석하지 않습니다.
          계산 엔진이 만든 값을 연이의 목소리로 전하고, 사용자는 그 문장을 자기 오늘에 비춰 봅니다.
        </p>
      </section>

      <EditorNote note={getEditorNote("/world")} className="my-6" />

      <section id="story-map" className="cd-world-section" aria-labelledby="cd-world-story">
        <h2 id="cd-world-story" className="cd-world-h2">이야기 지도</h2>
        <p className="cd-muted cd-world-section-intro">
          본편 초반의 여정만 담았습니다. 그 뒤의 이야기는 라이트 노벨에서 이어집니다.
        </p>
        <div className="cd-world-story">
          {STORY_MAP.map((part) => (
            <div key={part.part} className="cd-card cd-world-story-part">
              <h3 className="cd-world-name">{part.part}</h3>
              <ol className="cd-world-story-stops">
                {part.stops.map((stop) => (
                  <li key={stop.name}>
                    <span className="cd-world-story-name">{stop.name}</span>
                    <span className="cd-world-story-note">{stop.note}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="cd-world-section" aria-labelledby="cd-world-places">
        <h2 id="cd-world-places" className="cd-world-h2">장소</h2>
        <div className="cd-world-places">
          {PLACES.map((place) => (
            <article key={place.name} className="cd-card cd-world-place">
              <figure className="cd-world-place-art">
                <img
                  src={place.image}
                  alt={place.alt}
                  width="1920"
                  height="1080"
                  loading="lazy"
                />
              </figure>
              <h3 className="cd-world-name">{place.name}</h3>
              <p>{place.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cd-world-section" aria-labelledby="cd-world-usage">
        <h2 id="cd-world-usage" className="cd-world-h2">세계관이 닿는 곳</h2>
        <div className="cd-card">
          <p>
            이 세계관은 운세 해석을 대신하지 않습니다. 명식과 별자리 값은 계산 엔진이 만들고,
            연이와 네오는 그 결과를 각자의 목소리로 전합니다.
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
