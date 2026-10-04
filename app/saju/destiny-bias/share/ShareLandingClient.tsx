"use client";

import { useEffect, useState } from "react";
import { getApiBaseUrl } from "@/app/_lib/api-config";
import { useAnalytics } from "@/app/hooks/useAnalytics";
import { CHEMI_TYPE_BY_ID, type ChemiTypeId } from "@/lib/idol-chemi";
import { ASSETS, TYPE_ACCENT, typeSymbolSrc } from "../components/chemi/chemiAssets";
import styles from "../destiny-bias.module.css";

type PublicShare = {
  shareId: string;
  chemiTypeId: ChemiTypeId;
  chemiTypeNameKo: string;
  chemiTypeShortKo: string;
  oneLiner: string;
  partner: { kind: "roster" | "preset"; id: string; displayName: string; groupLabel: string };
  nicknameDisplay: string | null;
  minorMode: boolean;
};

const SHARE_ID_PATTERN = /^dbs_[A-Za-z0-9_-]{24,80}$/;
const PARTNER_ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const FUNNEL = "destiny_bias_chemi";
const FEATURE_PATH = "/saju/destiny-bias/";

function isPublicShare(value: unknown): value is PublicShare {
  const v = value as PublicShare | null;
  return Boolean(
    v &&
      typeof v.shareId === "string" &&
      typeof v.chemiTypeNameKo === "string" &&
      typeof v.oneLiner === "string" &&
      v.chemiTypeId in CHEMI_TYPE_BY_ID &&
      v.partner &&
      (v.partner.kind === "roster" || v.partner.kind === "preset") &&
      PARTNER_ID_PATTERN.test(String(v.partner.id || "")),
  );
}

/**
 * 공유 링크 방문자 화면. 서버가 저장한 **공개 요약**(유형·한 줄·최애·닉네임)만 그린다.
 * 원본 결과·명식·생일은 서버에도 없으므로 여기서 보여 줄 수 없다.
 */
export default function ShareLandingClient() {
  const { trackClick, trackFunnelStep } = useAnalytics();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [share, setShare] = useState<PublicShare | null>(null);

  useEffect(() => {
    // 정적 export: useSearchParams 대신 location 을 직접 읽는다(Suspense 경계 불필요).
    const shareId = new URLSearchParams(window.location.search).get("s") || "";
    if (!SHARE_ID_PATTERN.test(shareId)) {
      setStatus("error");
      return undefined;
    }
    let cancelled = false;
    const apiBase = String(getApiBaseUrl() || "").trim();
    fetch(`${apiBase}/api/destiny-bias/share/${encodeURIComponent(shareId)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "omit",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (cancelled) return;
        if (!response.ok || !payload?.ok || !isPublicShare(payload.snapshot)) {
          setStatus("error");
          return;
        }
        setShare(payload.snapshot);
        setStatus("ready");
        trackFunnelStep({ funnel: FUNNEL, step: "share_landing_visit", stepIndex: 6 });
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // 마운트 시 1회
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCta = (kind: "same_idol" | "pick_own") => {
    trackFunnelStep({ funnel: FUNNEL, step: "share_landing_cta", stepIndex: 7 });
    trackClick("destiny_bias_share_landing_cta", { cta: kind });
  };

  if (status === "loading") {
    return (
      <div className={styles.page}>
        <main className={styles.frame} aria-busy="true">
          <div className={styles.emptyState}>
            <img src={ASSETS.miniLoading} alt="" width={96} height={96} aria-hidden />
            <p>공유된 케미 카드를 불러오는 중이에요.</p>
          </div>
        </main>
      </div>
    );
  }

  if (status === "error" || !share) {
    return (
      <div className={styles.page}>
        <main className={styles.frame}>
          <section className={styles.landing}>
            <div className={styles.emptyState}>
              <img src={ASSETS.miniError} alt="" width={96} height={96} aria-hidden />
              <p>이 공유 카드는 만료됐거나 주소가 올바르지 않아요.</p>
            </div>
            <div className={styles.landingActions}>
              <a className={styles.ctaPrimary} href={`${FEATURE_PATH}?from=share`} onClick={() => onCta("pick_own")}>
                내 최애 선택하기
              </a>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const partnerKey = share.partner.kind === "roster" ? "m" : "p";
  const sameIdolHref = `${FEATURE_PATH}?${partnerKey}=${encodeURIComponent(share.partner.id)}&from=share`;
  const who = share.nicknameDisplay || "친구";

  return (
    <div className={styles.page}>
      <main className={styles.frame}>
        <section className={styles.landing} aria-labelledby="dbk-landing-title">
          <p className={styles.kicker}>최애운명 · 공유된 케미 카드</p>
          <h1 id="dbk-landing-title" className={styles.stepTitle}>
            {who}님과 {share.partner.displayName}의 케미 유형
          </h1>

          <div className={styles.landingCard} data-accent={TYPE_ACCENT[share.chemiTypeId]}>
            <p className={styles.landingPair}>
              <strong>{share.nicknameDisplay || "익명"}</strong>
              <i aria-hidden>×</i>
              <strong>{share.partner.displayName}</strong>
            </p>
            {share.partner.groupLabel ? <p className={styles.landingGroup}>{share.partner.groupLabel}</p> : null}
            <img src={typeSymbolSrc(share.chemiTypeId)} alt="" width={120} height={120} decoding="async" aria-hidden />
            <p className={styles.typeShort}>{share.chemiTypeShortKo}</p>
            <p className={styles.landingType}>{share.chemiTypeNameKo}</p>
            <p className={styles.landingOneLiner}>{share.oneLiner}</p>
          </div>

          <div className={styles.landingActions}>
            <a className={styles.ctaPrimary} href={sameIdolHref} onClick={() => onCta("same_idol")}>
              같은 아이돌과 내 케미 확인하기
            </a>
            <a className={styles.ctaSecondary} href={`${FEATURE_PATH}?from=share`} onClick={() => onCta("pick_own")}>
              내 최애 선택하기
            </a>
          </div>

          <p className={styles.helpText}>
            공유 카드에는 유형과 한 줄 요약만 담겨요. 친구의 생일이나 상세 결과는 저장되지도, 보이지도 않아요. 오락용 콘텐츠이며 실제 인물의 성격·관계와는 무관해요.
          </p>
        </section>
      </main>
    </div>
  );
}
