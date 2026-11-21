/* eslint-disable @next/next/no-img-element -- 장식용 사전 크기 WebP, 정적 export 라 next/image 최적화 대상이 아니다. */
import type { CSSProperties, ReactNode } from "react";
import YeoniPortrait, { type YeoniMood } from "@/app/fortune/[period]/YeoniPortrait";
import styles from "./scroll.module.css";

export type FortuneScrollProps = {
  /** 이미지 저장·공유가 캡처할 요소 id (ScrollActions 의 targetId 와 같아야 한다). */
  id: string;
  /** "오늘" | "내일" — 라벨(오늘의 색…)에만 쓴다. */
  when: "오늘" | "내일";
  /** "2026년 11월 21일 · 쥐띠 오늘의 운세" 같은 윗줄. */
  eyebrow: string;
  title: string;
  headingLevel?: "h2" | "h3";
  /** 본문 요약(문자열 또는 타자기 컴포넌트 등). */
  summary?: ReactNode;
  /** 제목 아래 배지 줄(길흉 배지 등). */
  badge?: ReactNode;
  /** "총운 8/10" 같은 점수 칩 문구. */
  scoreLabel?: string;
  /** 요약 아래 추가 내용(하이라이트 칩 등). */
  children?: ReactNode;
  lucky?: { colorKr: string; swatch: string | null; number: number | string };
  practice?: string;
  say?: { text: string; mood?: YeoniMood };
  /** 하단 작은 안내(출처·날짜 등). */
  footnote?: string;
  className?: string;
};

/**
 * 도화서원식 두루마리 결과 카드. 서버·클라이언트 어디서든 쓸 수 있다(훅 없음).
 * 본문은 모두 실제 텍스트(이미지에 글자를 굽지 않는다)라 검색·접근성·AdSense 본문 계산에 그대로 잡힌다.
 */
export default function FortuneScroll({
  id,
  when,
  eyebrow,
  title,
  headingLevel = "h2",
  summary,
  badge,
  scoreLabel,
  children,
  lucky,
  practice,
  say,
  footnote,
  className,
}: FortuneScrollProps) {
  const Heading = headingLevel;
  return (
    <article id={id} className={`${styles.scroll}${className ? ` ${className}` : ""}`} data-fortune-scroll aria-label={`${when}의 운세 두루마리`}>
      <span className={styles.rod} aria-hidden="true" />
      <div className={styles.sheet}>
        <img className={styles.petals} src="/images/fortune-tea-house/renewal/prop-petals.webp" alt="" width={64} height={64} loading="lazy" decoding="async" />
        <p className={styles.eyebrow}>{eyebrow}</p>
        <Heading className={styles.title}>{title}</Heading>
        {(badge || scoreLabel) && (
          <div className={styles.badgeRow}>
            {scoreLabel && <span className={styles.chip}>{scoreLabel}</span>}
            {badge}
          </div>
        )}
        {summary && <div className={styles.summary}>{summary}</div>}
        {children && <div className={styles.extra}>{children}</div>}

        {lucky && (
          <>
            <hr className={styles.divider} />
            <dl className={styles.lucky}>
              <div className={styles.luckyCell}>
                <dt className={styles.luckyLabel}>{`${when}의 색`}</dt>
                <dd className={styles.luckyValue}>
                  {lucky.swatch && <span className={styles.swatch} style={{ background: lucky.swatch } as CSSProperties} aria-hidden="true" />}
                  <span>{lucky.colorKr}</span>
                </dd>
              </div>
              <div className={styles.luckyCell}>
                <dt className={styles.luckyLabel}>{`${when}의 숫자`}</dt>
                <dd className={styles.luckyValue}>
                  <span className={styles.numberRing}>{lucky.number}</span>
                </dd>
              </div>
            </dl>
          </>
        )}

        {practice && (
          <div className={styles.practice}>
            <p className={styles.practiceLabel}>{`${when}의 작은 실천`}</p>
            <p className={styles.practiceText}>{practice}</p>
          </div>
        )}

        {say && (
          <div className={styles.say} data-scroll-say>
            <YeoniPortrait mood={say.mood ?? "greet"} size={56} className={styles.sayPortrait} />
            <p className={styles.sayBubble}>
              <b className={styles.sayName}>연이</b>
              {say.text}
            </p>
          </div>
        )}

        {footnote && <p className={styles.footerNote}>{footnote}</p>}
        <span className={styles.seal} aria-hidden="true">
          <span className={styles.sealLine}>꿀꿀</span>
          <span className={styles.sealLine}>운세</span>
        </span>
      </div>
      <span className={styles.rod} aria-hidden="true" />
    </article>
  );
}
