import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
      <h1>{story.title.split("\n").map((line: string, i: number) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1>
      <div className={styles.copy}>
        <p className={styles.description}>{story.description}</p>
        <a className={styles.start} data-landing-start href={"/ggulggul/?action=" + story.action}>{story.cta}<ArrowRight size={18} aria-hidden="true" /></a>
        <a className={styles.previewLink} href="#landing-preview">어떤 도움을 받을 수 있나요?</a>
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
        <p>이곳에서 나를 만나는 방법</p>
      </div>
      <dl className={styles.topics}>{story.topics.map(([title, description]: string[]) => <div key={title}><dt>{title}</dt><dd>{description}</dd></div>)}</dl>
      {scope && <p className={styles.scope}>기본 결과에서 시작해요. 심층 상담은 별도 유료 서비스예요.<br /><a href="#landing-guide">제공 범위와 이용 방법 확인하기</a></p>}
    </section>
  </>;
}

export function FortuneLandingDirectory({ path }: { path: string }) {
  const current = getFortuneLanding(path);
  return <section className={styles.directory} aria-labelledby="landing-directory-title">
    <h2 id="landing-directory-title">다른 관점으로도 나를 만나보세요</h2>
    <p>지금 마음이 향하는 이야기를 골라보세요.</p>
    <div className={styles.services}>{Object.entries(fortuneLandings).filter(([, story]) => story !== current).map(([href, story]) => <Link key={href} href={href + '/'}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={story.image} alt="" width={640} height={427} loading="lazy" decoding="async" />
      <span><strong>{story.name}</strong><ArrowRight size={16} aria-hidden="true" /></span><small>{story.scene}</small>
    </Link>)}</div>
  </section>;
}
