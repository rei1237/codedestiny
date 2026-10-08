import Link from "next/link";
import { ArrowRight, ArrowDown } from "lucide-react";
import { fortuneLandings, getFortuneLanding } from "../../lib/fortune-landings.mjs";
import { SEO_SERVICE_SCOPES } from "../../lib/seo-service-scope";
import styles from "./fortune-landing.module.css";

export function hasFortuneLanding(path: string) { return !!getFortuneLanding(path); }

export default function FortuneLandingHero({ path }: { path: string }) {
  const story = getFortuneLanding(path);
  if (!story) return null;
  const scope = SEO_SERVICE_SCOPES[path === '/ziwei/chart' ? '/ziwei' : path];
  return <>
    <header className={styles.hero}>
      <div className={styles.copy}>
        <h1>{story.title.split("\n").map((line: string, i: number) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1>
        <p className={styles.description}>{story.description}</p>
        <a className={styles.start} data-landing-start href={"/ggulggul/?action=" + story.action}>{story.cta}<ArrowRight size={18} aria-hidden="true" /></a>
        <a className={styles.previewLink} href="#landing-preview">어떤 이야기를 볼 수 있나요?<ArrowDown size={16} aria-hidden="true" /></a>
      </div>
      <figure className={styles.art}>
        {/* Reuse the service's own published artwork, not a generic shared hero. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={story.image} width={640} height={427} alt={story.alt} decoding="async" fetchPriority="high" />
        <figcaption>{story.scene}</figcaption>
      </figure>
    </header>
    <section id="landing-preview" className={styles.preview} aria-labelledby="landing-preview-title">
      <div className={styles.previewHeading}>
        <h2 id="landing-preview-title">{story.question}</h2>
        <p>이런 관점으로 나의 이야기를 읽어요.</p>
      </div>
      <dl className={styles.topics}>{story.topics.map(([title, description]: string[]) => <div key={title}><dt>{title}</dt><dd>{description}</dd></div>)}</dl>
      {scope && <p className={styles.scope}><strong>기본 결과</strong> {scope.free}<br /><strong>더 깊이 알고 싶다면</strong> {scope.paid}</p>}
    </section>
  </>;
}

export function FortuneLandingDirectory({ path }: { path: string }) {
  const current = getFortuneLanding(path);
  return <section className={styles.directory} aria-labelledby="landing-directory-title">
    <h2 id="landing-directory-title">다른 관점으로도 나를 만나보세요</h2>
    <p>궁금한 이야기에 맞춰 골라보세요. 각 체계의 해석과 이용 방법을 먼저 살펴볼 수 있어요.</p>
    <div className={styles.services}>{Object.entries(fortuneLandings).filter(([, story]) => story !== current).map(([href, story]) => <Link key={href} href={href + '/'}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={story.image} alt="" width={640} height={427} loading="lazy" decoding="async" />
      <span><strong>{story.name}</strong><ArrowRight size={16} aria-hidden="true" /></span><small>{story.scene}</small>
    </Link>)}</div>
  </section>;
}
