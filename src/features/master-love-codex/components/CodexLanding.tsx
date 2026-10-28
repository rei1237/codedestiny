"use client";

/**
 * 코덱스 입장 화면 — 프리미엄 상담 상품 페이지.
 *
 * 진입 3초 안에 ① 유료 프리미엄 상담이라는 인지 ② 가격 ③ 그 가격의 근거가 보여야 한다.
 * 이 화면은 일반 문서 흐름이라 아래에 서버 렌더 소개 섹션(ServiceIntroSection)이
 * 이어진다. 몰입 단계로 넘어가면 CodexShell 이 fixed 로 그 위를 덮는다.
 *
 * 🔴 이 기능은 SKU 가 두 개다(개인/궁합). 한쪽 금액만 크게 박으면 다른 쪽 사용자에게
 *    거짓 가격이 되므로 두 상품을 나란히 세운다. 금액은 전부 PriceBadge(서버 조회)다.
 */

import { useEffect, type ReactNode } from "react";
import MasterProfile from "@/components/fortune/MasterProfile";
import { masterProfiles } from "@/components/fortune/master-profiles";
import CraftedProductDisclosure from "@/app/components/CraftedProductDisclosure";
import { PriceBadge } from "@/app/components/PriceBadge";
import { trackEvent } from "@/lib/analytics";
import resultSamples from "@/lib/marketing/result-samples.json";
import SampleSurface from "@/app/components/SampleSurface";
import Link from "next/link";
import { ArrowDownRight, Check, ChevronLeft, Home } from "lucide-react";
import CodexShell from "./CodexShell";
import CodexArtwork from "./CodexArtwork";
import CodexReveal from "./CodexReveal";
import CodexPremiumCard from "./CodexPremiumCard";
import CodexWhyPremium from "./CodexWhyPremium";
import CodexTrustStrip from "./CodexTrustStrip";
import CodexFloatingCta from "./CodexFloatingCta";
import { masterLoveCodexAssets } from "../data/assets";
import { CODEX_HERO_SPECS } from "../data/premium";
import { masterLoveCodexBilling, type MasterLoveCodexMode } from "../constants";
import { useMasterLoveCodexCopy, useMasterLoveCodexLocale } from "../_lib/copy";
import { useCodexContentCopy } from "../_lib/contentCopy";
import styles from "../styles/codex.module.css";

interface CodexLandingProps {
  hasSeenPrologue: boolean;
  chapterCount: number;
  /** 어느 상품 카드로 들어왔는지 — 입력 화면의 상대 정보 섹션이 미리 펼쳐진다 */
  onEnter: (intent?: MasterLoveCodexMode) => void;
  onReplayPrologue: () => void;
  /** 결제한 책이 있을 때만 채워지는 내 서재 — 다시 찾아온 구매자가 스크롤 없이 책을 연다 */
  library?: ReactNode;
}

/** 하단 고정 바는 추천 상품(궁합)의 금액을 든다 — 눌렀을 때 시작되는 상품과 반드시 같아야 한다. */
const FLOATING_MODE: MasterLoveCodexMode = "compat";
/** 홈 결과 예시 띠가 여는 자리 — 한국어 상세 안내(CraftedProductDisclosure) 묶음이다. */
const SAMPLE_ID = "codex-sample";

function trackCodexStep(event: string, locale: string) {
  trackEvent(event, { service: "master-love-codex", surface: "codex_landing", locale });
}

export default function CodexLanding({ hasSeenPrologue, chapterCount, onEnter, onReplayPrologue, library }: CodexLandingProps) {
  const locale = useMasterLoveCodexLocale();
  const copy = useMasterLoveCodexCopy();
  const heroSpecs = useCodexContentCopy("heroSpecs", CODEX_HERO_SPECS);
  const floatingBilling = masterLoveCodexBilling(FLOATING_MODE, locale);
  const soloBilling = masterLoveCodexBilling("solo", locale);
  const compatBilling = masterLoveCodexBilling("compat", locale);
  const soloTitle = soloBilling.title;
  useEffect(() => { trackCodexStep("product_detail_view", locale); }, [locale]);
  const openSample = () => {
    trackCodexStep("product_sample_open", locale);
    const sample = document.querySelector<HTMLDetailsElement>(`#${SAMPLE_ID} details`);
    if (sample) sample.open = true;
  };

  return (
    <CodexShell ariaLabel={copy.entryAriaLabel(soloTitle)}>
      <nav className="flex items-center justify-between px-[var(--codex-gutter)] pt-6" aria-label={copy.navAriaLabel}>
        {/* 새 탭·공유 링크로 바로 들어와 돌아갈 곳이 없으면 옆의 홈과 같은 곳으로 보낸다. */}
        <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : window.location.assign("/"))} className={`${styles.quiet} inline-flex items-center gap-1`}>
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.backButton}
        </button>
        <Link href="/" className={`${styles.quiet} inline-flex min-h-11 items-center gap-1`}>
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.homeButton}
        </Link>
      </nav>

      {library}

      {/* 첫 화면은 로딩 셸과 같은 구조를 쓴다. 이미지와 제목은 애니메이션 전에 보인다. */}
      <div className={styles.landingHero}>
        <div className={styles.landingHeroCopy}>
          <h2 className={styles.landingHeroTitle}>{soloTitle}</h2>
          <p className={styles.landingHeroEnglish}>MASTER LOVE CODEX</p>
          {/* 첫 화면에서 가격·분량·소장 방식을 먼저 보인다. 금액은 두 SKU 모두 PriceBadge(서버 조회)다. */}
          <p className={styles.landingPrice}>
            <span>{locale === "ko" ? "개인" : "Solo"} <PriceBadge featureKey={soloBilling.featureKey} fallbackCoins={soloBilling.cost} /></span>
            <span aria-hidden="true"> · </span>
            <span>{locale === "ko" ? "궁합" : "Pair"} <PriceBadge featureKey={compatBilling.featureKey} fallbackCoins={compatBilling.cost} /></span>
            <small>{locale === "ko" ? `${chapterCount}장 · PDF 소장 · 결과 영구 보관` : `${chapterCount} chapters · PDF to keep · Results saved`}</small>
          </p>
          <p className={styles.landingLead}>{copy.heroDescription(chapterCount)}</p>
          <p className={styles.landingEdition}>{copy.chaptersActsSuffix(chapterCount)}</p>
          <div className={styles.heroActions}>
            <a href="#codex-reading-options" className={`${styles.cta} ${styles.heroChoose}`} onClick={() => trackCodexStep("product_start_click", locale)}>
              {copy.chooseReadingButton}
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            </a>
            {locale === "ko" && <a href={`#${SAMPLE_ID}`} className={styles.heroSample} onClick={openSample}>결과 예시 보기</a>}
          </div>
        </div>
        <figure className={styles.landingPortrait}>
          <CodexArtwork
            src={masterLoveCodexAssets.humanHero}
            alt={locale === "ko" ? "사주와 자미두수 열두 궁을 함께 살피는 인연의 서 마스터" : "The Master comparing four pillars and the twelve-palace relationship chart"}
            width={1200}
            height={675}
            sizes="(max-width: 767px) 100vw, 600px"
            className={styles.heroArtwork}
            priority
          />
          <figcaption className={styles.landingPortraitCaption}>
            <strong>{locale === "ko" ? "인연의 서를 읽어주는 마스터" : "The Master, your Love Codex guide"}</strong>
            <span>{locale === "ko" ? "달빛 아래, 당신의 인연 지도를 함께 펼쳐봐요." : "Unfold your map of love together under the moonlight."}</span>
          </figcaption>
        </figure>
      </div>

      {locale === "ko" && <SampleSurface><section className={styles.section} aria-label="인연의 서 결과 미리 읽기" data-consultation-item="master-love-codex">
        <div className={styles.measure}>
          <h2 className={styles.chapterTitle}>먼저, 실제 결과의 한 대목을 읽어보세요.</h2>
          <p className={styles.landingLead}>가상 프로필로 생성한 AI 결과 원문 발췌입니다. 실제 고객 후기나 모든 사람에게 적용되는 해석이 아닙니다.</p>
          {resultSamples.find(item => item.id === "codex")?.guide?.examples.filter(example => example.kind === "result").map(example => (
            <div key={example.title} className="mt-6" data-example-kind="result">
              <h3 className={styles.chapterTitle}>{example.title}</h3>
              <blockquote className={styles.landingLead}>{example.text}</blockquote>
            </div>
          ))}
          <a className={styles.detailReturn} href={`#${SAMPLE_ID}`} onClick={openSample}>개인판·궁합판의 구성과 출처 확인하기</a>
        </div>
      </section></SampleSurface>}

      {locale === "ko" && <MasterProfile profile={masterProfiles.master} />}

      <div className={styles.landingContents}>
        <ul className={styles.landingSpecs}>
          {heroSpecs.map((spec) => (
            <li key={spec}>
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{spec}</span>
            </li>
          ))}
        </ul>
        <CodexArtwork
          src={masterLoveCodexAssets.cover}
          alt={copy.coverImageAlt}
          width={960}
          height={540}
          sizes="(max-width: 767px) 100vw, 500px"
          className={styles.previewArtwork}
        />
      </div>

      {/* ── 상품·가격 ──────────────────────────────────────────────────────── */}
      <section id="codex-reading-options" className={`${styles.section} ${styles.landingPricing}`} aria-label={copy.pricingSectionAriaLabel}>
        <div className={styles.measure}>
          <CodexReveal>
            <p
              className={`${styles.numeral} text-[0.6875rem]`}
              style={{ letterSpacing: "0.28em", color: "var(--codex-gold-dim)" }}
            >
              CHOOSE YOUR READING
            </p>
            <h2 className={`${styles.actTitle} mt-4`}>{copy.pricingTitle}</h2>
            <p className="mt-5 max-w-[42ch] leading-8" style={{ fontSize: "var(--codex-caption)", color: "var(--codex-silver)" }}>
              {copy.pricingDescription(chapterCount)}
            </p>
          </CodexReveal>

          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            <CodexReveal index={1}>
              <CodexPremiumCard mode="compat" featured onSelect={onEnter} />
            </CodexReveal>
            <CodexReveal index={2}>
              <CodexPremiumCard mode="solo" onSelect={onEnter} />
            </CodexReveal>
          </div>
          {locale === "ko" && <div id={SAMPLE_ID} className="mt-10 space-y-8">
            <section aria-label="개인판 상세 안내">
              <h3 className={styles.chapterTitle}>나를 읽는 개인판</h3>
              <CraftedProductDisclosure featureKey="master-love-codex" />
              <a className={styles.detailReturn} href="#codex-plan-solo">개인판 가격과 상담 시작 확인하기</a>
            </section>
            <section aria-label="궁합판 상세 안내">
              <h3 className={styles.chapterTitle}>두 사람을 읽는 궁합판</h3>
              <CraftedProductDisclosure featureKey="master-love-codex-compat" />
              <a className={styles.detailReturn} href="#codex-plan-compat">궁합판 가격과 상담 시작 확인하기</a>
            </section>
          </div>}
        </div>
      </section>

      {/* ── 왜 프리미엄인가 ─────────────────────────────────────────────────── */}
      <CodexWhyPremium />

      {/* ── 신뢰 + 최종 CTA ────────────────────────────────────────────────── */}
      <section className={`${styles.section} pt-0 text-center`} aria-label={copy.startSectionAriaLabel}>
        <div className={styles.measure}>
          <CodexReveal>
            <hr className={styles.rule} />
            <div className="mt-10">
              <CodexTrustStrip />
            </div>
          </CodexReveal>

          <CodexReveal index={1} className="mt-12">
            <button type="button" onClick={() => onEnter()} className={styles.cta}>
              {hasSeenPrologue ? copy.startNowButton : copy.enterLibraryButton}
            </button>
            {hasSeenPrologue ? (
              <div className="mt-6">
                <button type="button" onClick={onReplayPrologue} className={styles.quiet}>
                  {copy.replayPrologueButton}
                </button>
              </div>
            ) : null}
          </CodexReveal>
        </div>
      </section>

      <CodexFloatingCta
        featureKey={floatingBilling.featureKey}
        fallbackCoins={floatingBilling.cost}
        label={copy.floatingStartLabel}
        editionLabel={copy.compatTitle}
        onClick={() => onEnter(FLOATING_MODE)}
      />
    </CodexShell>
  );
}
