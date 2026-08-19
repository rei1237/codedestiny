"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./GuardianFortuneShareClient.module.css";

type ShareMode = "yeoni" | "neo";
type ShareTopic = "daily" | "love" | "money_work" | "relationship" | "mind" | "decision";

type PublicSnapshot = {
  shareId: string;
  mode: ShareMode;
  topic: ShareTopic;
  title: string;
  openingLine: string;
  innerState: string;
  coreReading: string;
  topicAdvice: string;
  cautionPattern: string;
  luckyAction: string;
  premiumCta?: { ctaKey: string; label: string; targetPath: string; reason: string };
  shareText: string;
  createdAt: string;
  expiresAt?: string;
  locale: string;
};

const TOPIC_LABELS: Record<ShareTopic, string> = {
  daily: "오늘의 흐름",
  love: "연애/인연",
  money_work: "금전/일",
  relationship: "인간관계",
  mind: "마음/심리",
  decision: "결정/선택",
};

const MODE_COPY: Record<ShareMode, { label: string; image: string; alt: string }> = {
  yeoni: {
    label: "연이가 읽어준 흐름",
    image: "/images/fortune-tea-house/flower-pig-honey-hug.webp",
    alt: "연이 모드의 꽃돼지 캐릭터",
  },
  neo: {
    label: "네오가 짚어준 핵심",
    image: "/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp",
    alt: "네오 모드의 팩폭 전략실 인간형 캐릭터",
  },
};

const SHARE_ID_PATTERN = /^gf_[A-Za-z0-9_-]{24,80}$/;

function isInternalPath(value: unknown): value is string {
  return typeof value === "string" && /^\/[A-Za-z0-9/_?&=.#%-]*$/.test(value) && !value.startsWith("//");
}

function getModeLink(mode: ShareMode, topic: ShareTopic) {
  return `/?guardianMode=${encodeURIComponent(mode)}&guardianTopic=${encodeURIComponent(topic)}`;
}

function ResultSection({ title, children, wide = false, action = false }: { title: string; children: string; wide?: boolean; action?: boolean }) {
  return (
    <section className={`${styles.card} ${wide ? styles.cardWide : ""} ${action ? styles.cardAction : ""}`}>
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export default function GuardianFortuneShareClient() {
  const searchParams = useSearchParams();
  const shareId = useMemo(() => {
    const value = searchParams?.get("shareId") || "";
    return SHARE_ID_PATTERN.test(value) ? value : "";
  }, [searchParams]);
  const [snapshot, setSnapshot] = useState<PublicSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    if (!shareId) {
      setStatus("error");
      return () => { cancelled = true; };
    }
    setStatus("loading");
    fetch(`/api/fortune/guardian/share/${encodeURIComponent(shareId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.ok === false) throw new Error("GUARDIAN_FORTUNE_SHARE_NOT_FOUND");
        return payload as PublicSnapshot;
      })
      .then((payload) => {
        if (cancelled) return;
        setSnapshot(payload);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, [shareId]);

  if (status === "loading") {
    return <main className={styles.page} aria-busy="true"><div className={styles.loading}>공유된 운세를 불러오는 중이에요.</div></main>;
  }

  if (status === "error" || !snapshot) {
    return (
      <main className={styles.page}>
        <section className={styles.errorCard} role="alert">
          <p className={styles.kicker}>CODE DESTINY</p>
          <h1>이 공유 운세를 찾을 수 없어요.</h1>
          <p>링크가 만료되었거나 더 이상 공개되지 않는 결과예요.</p>
          <a className={styles.primaryButton} href="/">오늘의 귀인 운세로 돌아가기</a>
        </section>
      </main>
    );
  }

  const modeCopy = MODE_COPY[snapshot.mode];
  const topicLabel = TOPIC_LABELS[snapshot.topic];
  const modeLink = getModeLink(snapshot.mode, snapshot.topic);

  return (
    <main className={`${styles.page} ${snapshot.mode === "neo" ? styles.neo : styles.yeoni}`}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a className={styles.brand} href="/">CODE DESTINY</a>
          <span className={styles.headerLabel}>공유된 오늘의 귀인 운세</span>
        </header>

        <section className={styles.hero} aria-labelledby="guardianShareTitle">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>{modeCopy.label}</p>
            <h1 id="guardianShareTitle">{snapshot.title}</h1>
            <p className={styles.intro}>이건 누군가가 공유한 오늘의 귀인 운세예요. 내 생년월일로 다시 보면 나의 흐름을 더 섬세하게 볼 수 있어요.</p>
            <span className={styles.topicBadge}>{topicLabel}</span>
          </div>
          <div className={styles.characterFrame}>
            <img className={snapshot.mode === "neo" ? styles.neoHumanImage : undefined} src={modeCopy.image} alt={modeCopy.alt} />
          </div>
        </section>

        <section className={styles.opening} aria-label="귀인의 첫마디">
          <span className={styles.openingLabel}>귀인의 첫마디</span>
          <p>{snapshot.openingLine}</p>
        </section>

        <div className={styles.cards}>
          <ResultSection title="지금 당신의 흐름" wide>{snapshot.innerState}</ResultSection>
          <ResultSection title="오늘의 핵심 운세" wide>{snapshot.coreReading}</ResultSection>
          <ResultSection title="이 분야에서 중요한 점">{snapshot.topicAdvice}</ResultSection>
          <ResultSection title="조심할 패턴">{snapshot.cautionPattern}</ResultSection>
          <ResultSection title="오늘의 귀인 행동" wide action>{snapshot.luckyAction}</ResultSection>
        </div>

        {snapshot.premiumCta && isInternalPath(snapshot.premiumCta.targetPath) ? (
          <section className={styles.premium}>
            <p className={styles.kicker}>더 깊게 보고 싶다면</p>
            <h2>{snapshot.premiumCta.label}</h2>
            <p>{snapshot.premiumCta.reason}</p>
            <a className={styles.secondaryButton} href={snapshot.premiumCta.targetPath}>자세히 보기</a>
          </section>
        ) : null}

        <section className={styles.cta} aria-labelledby="guardianShareCtaTitle">
          <h2 id="guardianShareCtaTitle">내 생년월일로 다시 보면 더 구체적으로 볼 수 있어요.</h2>
          <p>로그인하면 첫 1회를 무료로 확인할 수 있어요.</p>
          <div className={styles.ctaGrid}>
            <a className={styles.primaryButton} href={modeLink}>내 생년월일로 다시 보기</a>
            <a className={styles.secondaryButton} href={getModeLink("yeoni", snapshot.topic)}>나도 연이에게 물어보기</a>
            <a className={styles.secondaryButton} href={getModeLink("neo", snapshot.topic)}>나도 네오에게 물어보기</a>
          </div>
        </section>

        <footer className={styles.footer}>운세는 가능성과 패턴을 살펴보는 참고 자료이며, 중요한 결정은 현실의 조건과 함께 판단해 주세요.</footer>
      </div>
    </main>
  );
}
