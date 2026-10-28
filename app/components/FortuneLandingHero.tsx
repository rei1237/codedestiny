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
  const sourcePath = path.replace(/\/$/, '') + '/';
  const service = path.split('/')[1];
  return <>
    <header className={styles.hero}>
      <h1>{story.title.split("\n").map((line: string, i: number) => <span key={line}>{i > 0 && <br />}{line}</span>)}</h1>
      <div className={styles.copy}>
        <p className={styles.description}>{story.description}</p>
        {scope && <p className={styles.input}><strong>준비할 정보</strong>{scope.input}</p>}
        <a className={styles.start} data-landing-start data-cd-cross-sell={sourcePath} data-cd-cta-placement="primary" data-cd-target-service={service} href={"/ggulggul/?action=" + story.action}>{story.cta}<ArrowRight size={18} aria-hidden="true" /></a>
        {scope && <p className={styles.entryScope}>{scope.free}<br />{scope.paid}</p>}
        <a className={styles.previewLink} href="#landing-preview">결과에서 확인할 내용</a>
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.moonArt} src="/images/consultation/moonlit-reflection-v1-640.webp" srcSet="/images/consultation/moonlit-reflection-v1-640.webp 640w, /images/consultation/moonlit-reflection-v1-1280.webp 1280w" sizes="(min-width: 768px) 440px, 100vw" width={1536} height={1024} alt="달빛이 비치는 산수와 매화의 예화" loading="lazy" decoding="async" />
        <h2 id="landing-preview-title">{story.question}</h2>
      </div>
      <dl className={styles.topics}>{story.topics.map(([title, description]: string[]) => <div key={title}><dt>{title}</dt><dd>{description}</dd></div>)}</dl>
      {scope && <p className={styles.scope}><a href="#landing-guide">계산 기준·이용 방법·자주 묻는 질문 확인하기</a></p>}
    </section>
  </>;
}

export function FortuneLandingDirectory({ path }: { path: string }) {
  const current = getFortuneLanding(path);
  return <section className={styles.directory} aria-labelledby="landing-directory-title">
    <h2 id="landing-directory-title">궁금한 질문에 맞는 운세 고르기</h2>
    <p>태어난 기질, 관계의 리듬, 지금의 선택. 각 체계가 보는 기준을 비교해 보세요.</p>
    <div className={styles.services}>{Object.entries(fortuneLandings).filter(([, story]) => story !== current).map(([href, story]) => <Link key={href} href={href + '/'} data-cd-cross-sell={path.replace(/\/$/, '') + '/'} data-cd-cta-placement="directory" data-cd-target-service={href.slice(1)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={story.image} alt="" width={640} height={427} loading="lazy" decoding="async" />
      <span><strong>{story.name}</strong><ArrowRight size={16} aria-hidden="true" /></span><small>{story.scene}</small>
    </Link>)}</div>
  </section>;
}
