"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./ResultShareClient.module.css";

type ShareFeature = "tarot-basic" | "saju-basic";

type PublicResultSnapshot = {
  shareId: string;
  feature: ShareFeature;
  title: string;
  summary: string;
  sections: { heading: string; body: string }[];
  locale: string;
  createdAt: string;
  expiresAt?: string;
};

const SHARE_ID_PATTERN = /^sr_[A-Za-z0-9_-]{24,80}$/;

/**
 * 🔴 링크는 여기(정적 셸 진입 타일의 href)와 한 벌이다. 런처 화이트리스트를 통과하지 못하는
 * 임의 action 을 적으면 친구는 결과만 보고 기능으로 못 들어간다 — 그 순간 바이럴 루프가 끊긴다.
 */
const FEATURE_COPY: Record<ShareFeature, { label: string; ctaTitle: string; href: string; ctaLabel: string }> = {
  "tarot-basic": {
    label: "타로 리딩",
    ctaTitle: "나도 지금 카드를 뽑아볼까요?",
    href: "/index.html?action=openTarotModal",
    ctaLabel: "내 카드 뽑아보기",
  },
  "saju-basic": {
    label: "사주 분석",
    ctaTitle: "내 생년월일로 보면 어떤 흐름일까요?",
    href: "/?action=cdOneStepFreeSajuEntry",
    ctaLabel: "내 사주 무료로 보기",
  },
};

function isShareFeature(value: unknown): value is ShareFeature {
  return value === "tarot-basic" || value === "saju-basic";
}

export default function ResultShareClient() {
  const searchParams = useSearchParams();
  const shareId = useMemo(() => {
    const value = searchParams?.get("shareId") || "";
    return SHARE_ID_PATTERN.test(value) ? value : "";
  }, [searchParams]);
  const [snapshot, setSnapshot] = useState<PublicResultSnapshot | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    if (!shareId) {
      setStatus("error");
      return () => { cancelled = true; };
    }
    setStatus("loading");
    fetch(`/api/fortune/share/${encodeURIComponent(shareId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || payload.ok === false || !isShareFeature(payload.feature)) {
          throw new Error("RESULT_SHARE_NOT_FOUND");
        }
        return payload as PublicResultSnapshot;
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
    return <main className={styles.page} aria-busy="true"><div className={styles.loading}>공유된 결과를 불러오는 중이에요.</div></main>;
  }

  if (status === "error" || !snapshot) {
    return (
      <main className={styles.page}>
        <section className={styles.errorCard} role="alert">
          <p className={styles.kicker}>CODE DESTINY</p>
          <h1>이 공유 결과를 찾을 수 없어요.</h1>
          <p>링크가 만료되었거나 더 이상 공개되지 않는 결과예요.</p>
          <a className={styles.primaryButton} href="/">꿀꿀 운세 홈으로 가기</a>
        </section>
      </main>
    );
  }

  const copy = FEATURE_COPY[snapshot.feature];

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <a className={styles.brand} href="/">CODE DESTINY</a>
          <span className={styles.headerLabel}>공유된 {copy.label} 결과</span>
        </header>

        <section className={styles.hero} aria-labelledby="resultShareTitle">
          <p className={styles.kicker}>{copy.label}</p>
          <h1 id="resultShareTitle">{snapshot.title}</h1>
          <p className={styles.summary}>{snapshot.summary}</p>
          <p className={styles.intro}>누군가가 공유한 결과예요. 같은 풀이를 내 정보로 다시 보면 흐름이 달라집니다.</p>
        </section>

        {snapshot.sections.map((section) => (
          <section className={styles.card} key={`${section.heading}-${section.body.slice(0, 12)}`}>
            <h2>{section.heading}</h2>
            <p>{section.body}</p>
          </section>
        ))}

        <section className={styles.cta} aria-labelledby="resultShareCtaTitle">
          <h2 id="resultShareCtaTitle">{copy.ctaTitle}</h2>
          <p>무료로 바로 확인할 수 있어요.</p>
          <div className={styles.ctaGrid}>
            <a className={styles.primaryButton} href={copy.href}>{copy.ctaLabel}</a>
            <a className={styles.secondaryButton} href="/">다른 운세도 둘러보기</a>
          </div>
        </section>

        <footer className={styles.footer}>운세는 가능성과 패턴을 살펴보는 참고 자료이며, 중요한 결정은 현실의 조건과 함께 판단해 주세요.</footer>
      </div>
    </main>
  );
}
