"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./GuardianFortuneShareClient.module.css";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

type GuardianShareCopy = {
  modeAltYeoni: string;
  modeAltNeo: string;
  openingAria: string;
  innerStateTitle: string;
  coreReadingTitle: string;
  topicAdviceTitle: string;
  cautionPatternTitle: string;
  luckyActionTitle: string;
};

const GUARDIAN_SHARE_EN: GuardianShareCopy = {
  modeAltYeoni: "Yeoni mode's flower-pig character",
  modeAltNeo: "Neo mode's tactical-strategist human character",
  openingAria: "The guardian spirit's opening words",
  innerStateTitle: "Your Flow Right Now",
  coreReadingTitle: "Today's Core Fortune",
  topicAdviceTitle: "What Matters in This Area",
  cautionPatternTitle: "Pattern to Watch",
  luckyActionTitle: "Today's Lucky Action",
};

const GUARDIAN_SHARE_COPY: Partial<Record<LoadingLocale, GuardianShareCopy>> = {
  ko: {
    modeAltYeoni: "연이 모드의 꽃돼지 캐릭터",
    modeAltNeo: "네오 모드의 팩폭 전략실 인간형 캐릭터",
    openingAria: "귀인의 첫마디",
    innerStateTitle: "지금 당신의 흐름",
    coreReadingTitle: "오늘의 핵심 운세",
    topicAdviceTitle: "이 분야에서 중요한 점",
    cautionPatternTitle: "조심할 패턴",
    luckyActionTitle: "오늘의 귀인 행동",
  },
  en: GUARDIAN_SHARE_EN,
  ja: {
    modeAltYeoni: "モード「連理」の花豚キャラクター",
    modeAltNeo: "モード「ネオ」の戦略室人型キャラクター",
    openingAria: "貴人の第一声",
    innerStateTitle: "今のあなたの流れ",
    coreReadingTitle: "今日の核心運勢",
    topicAdviceTitle: "この分野で重要な点",
    cautionPatternTitle: "注意すべきパターン",
    luckyActionTitle: "今日の貴人アクション",
  },
  "zh-CN": {
    modeAltYeoni: "妍伊模式的花猪角色",
    modeAltNeo: "尼奥模式的策略室人形角色",
    openingAria: "贵人的第一句话",
    innerStateTitle: "你现在的运势走向",
    coreReadingTitle: "今日核心运势",
    topicAdviceTitle: "这个领域的重点",
    cautionPatternTitle: "需要注意的模式",
    luckyActionTitle: "今日贵人行动",
  },
  "zh-TW": {
    modeAltYeoni: "妍伊模式的花豬角色",
    modeAltNeo: "尼奧模式的策略室人形角色",
    openingAria: "貴人的第一句話",
    innerStateTitle: "你現在的運勢走向",
    coreReadingTitle: "今日核心運勢",
    topicAdviceTitle: "這個領域的重點",
    cautionPatternTitle: "需要注意的模式",
    luckyActionTitle: "今日貴人行動",
  },
  vi: {
    modeAltYeoni: "Nhân vật heo hoa của chế độ Yeoni",
    modeAltNeo: "Nhân vật hình người phòng chiến lược của chế độ Neo",
    openingAria: "Lời mở đầu của quý nhân",
    innerStateTitle: "Dòng chảy vận mệnh của bạn lúc này",
    coreReadingTitle: "Vận mệnh cốt lõi hôm nay",
    topicAdviceTitle: "Điều quan trọng trong lĩnh vực này",
    cautionPatternTitle: "Kiểu mẫu cần thận trọng",
    luckyActionTitle: "Hành động may mắn hôm nay",
  },
  hi: {
    modeAltYeoni: "योनी मोड का फ्लावर-पिग किरदार",
    modeAltNeo: "नियो मोड का रणनीति-कक्ष मानव किरदार",
    openingAria: "भाग्य-रक्षक के पहले शब्द",
    innerStateTitle: "अभी आपका प्रवाह",
    coreReadingTitle: "आज का मुख्य भाग्य",
    topicAdviceTitle: "इस क्षेत्र में महत्वपूर्ण बात",
    cautionPatternTitle: "सावधान रहने योग्य पैटर्न",
    luckyActionTitle: "आज की भाग्यशाली गतिविधि",
  },
  es: {
    modeAltYeoni: "Personaje cerdo-flor del modo Yeoni",
    modeAltNeo: "Personaje humano de sala de estrategia del modo Neo",
    openingAria: "Las primeras palabras del espíritu guardián",
    innerStateTitle: "Tu flujo en este momento",
    coreReadingTitle: "La fortuna clave de hoy",
    topicAdviceTitle: "Lo que importa en esta área",
    cautionPatternTitle: "Patrón a tener en cuenta",
    luckyActionTitle: "La acción de la suerte de hoy",
  },
  fr: {
    modeAltYeoni: "Personnage cochon-fleur du mode Yeoni",
    modeAltNeo: "Personnage humain de la salle de stratégie du mode Neo",
    openingAria: "Les premiers mots de l'esprit tutélaire",
    innerStateTitle: "Votre flux en ce moment",
    coreReadingTitle: "La fortune essentielle du jour",
    topicAdviceTitle: "Ce qui compte dans ce domaine",
    cautionPatternTitle: "Schéma à surveiller",
    luckyActionTitle: "L'action porte-bonheur du jour",
  },
  de: {
    modeAltYeoni: "Blumenschwein-Charakter des Yeoni-Modus",
    modeAltNeo: "Menschlicher Strategieraum-Charakter des Neo-Modus",
    openingAria: "Die ersten Worte des Schutzgeistes",
    innerStateTitle: "Ihr Fluss gerade jetzt",
    coreReadingTitle: "Das heutige Kernglück",
    topicAdviceTitle: "Was in diesem Bereich wichtig ist",
    cautionPatternTitle: "Zu beachtendes Muster",
    luckyActionTitle: "Die Glücksaktion von heute",
  },
  nl: {
    modeAltYeoni: "Bloemvarken-personage van Yeoni-modus",
    modeAltNeo: "Menselijk strategiekamer-personage van Neo-modus",
    openingAria: "De eerste woorden van de beschermgeest",
    innerStateTitle: "Jouw stroom op dit moment",
    coreReadingTitle: "Het kerngeluk van vandaag",
    topicAdviceTitle: "Wat belangrijk is op dit gebied",
    cautionPatternTitle: "Patroon om op te letten",
    luckyActionTitle: "De geluksactie van vandaag",
  },
  ms: {
    modeAltYeoni: "Watak khinzir bunga mod Yeoni",
    modeAltNeo: "Watak manusia bilik strategi mod Neo",
    openingAria: "Kata-kata pembukaan roh pelindung",
    innerStateTitle: "Aliran anda sekarang",
    coreReadingTitle: "Nasib teras hari ini",
    topicAdviceTitle: "Perkara penting dalam bidang ini",
    cautionPatternTitle: "Corak yang perlu diberi perhatian",
    luckyActionTitle: "Tindakan bertuah hari ini",
  },
};

function getGuardianShareCopy(locale: LoadingLocale): GuardianShareCopy {
  return GUARDIAN_SHARE_COPY[locale] || GUARDIAN_SHARE_EN;
}

function useGuardianShareCopy(): GuardianShareCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getGuardianShareCopy(locale);
}

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

const MODE_COPY: Record<ShareMode, { label: string; image: string }> = {
  yeoni: {
    label: "연이가 읽어준 흐름",
    image: "/images/fortune-tea-house/flower-pig-honey-hug.webp",
  },
  neo: {
    label: "네오가 짚어준 핵심",
    image: "/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp",
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
  const copy = useGuardianShareCopy();
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
            <img className={snapshot.mode === "neo" ? styles.neoHumanImage : undefined} src={modeCopy.image} alt={snapshot.mode === "neo" ? copy.modeAltNeo : copy.modeAltYeoni} />
          </div>
        </section>

        <section className={styles.opening} aria-label={copy.openingAria}>
          <span className={styles.openingLabel}>귀인의 첫마디</span>
          <p>{snapshot.openingLine}</p>
        </section>

        <div className={styles.cards}>
          <ResultSection title={copy.innerStateTitle} wide>{snapshot.innerState}</ResultSection>
          <ResultSection title={copy.coreReadingTitle} wide>{snapshot.coreReading}</ResultSection>
          <ResultSection title={copy.topicAdviceTitle}>{snapshot.topicAdvice}</ResultSection>
          <ResultSection title={copy.cautionPatternTitle}>{snapshot.cautionPattern}</ResultSection>
          <ResultSection title={copy.luckyActionTitle} wide action>{snapshot.luckyAction}</ResultSection>
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
