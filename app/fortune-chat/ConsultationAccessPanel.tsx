"use client";
import { PriceBadge } from "@/app/components/PriceBadge";
import { HONEY_COST } from "./consultation-access";
import type { HoneyStatus } from "./consultation-api";
import base from "./fortune-chat.module.css";
import styles from "./consultation.module.css";

/**
 * 준비된 상담을 여는 방법 고르기 — 꿀방울 30개 또는 이용권·1회 결제.
 * 꿀방울 카드는 연이 기본 상담에만 보인다(서버도 네오·질문 상품은 HONEY_NOT_AVAILABLE 로 거절한다).
 * 잔액은 표시용이다. 실제 차감은 서버가 잔액 조건부로 한 번만 한다.
 */
export default function ConsultationAccessPanel({
  lead, showHoney, honey, honeyLoading, busy, isPaying, onHoney, onAttend, onPay,
}: {
  lead: string;
  showHoney: boolean;
  honey: HoneyStatus | null;
  honeyLoading: boolean;
  busy: boolean;
  isPaying: boolean;
  onHoney: () => void;
  onAttend: () => void;
  onPay: () => void;
}) {
  const balance = honey ? Math.max(0, Math.floor(Number(honey.balance) || 0)) : null;
  const short = balance === null ? null : Math.max(0, HONEY_COST - balance);
  const enough = short === 0;
  const fill = balance === null ? 0 : Math.min(100, Math.round((balance / HONEY_COST) * 100));
  const status = balance === null
    ? (honeyLoading ? "꿀방울을 확인하고 있어요." : "꿀방울 잔액을 불러오지 못했어요.")
    : enough ? `지금 ${balance}개 · 열고 나면 ${balance - HONEY_COST}개가 남아요` : `지금 ${balance}개 · ${short}방울 더 모으면 열 수 있어요`;

  return (
    <div className={styles.accessPanel} data-consultation-access>
      <p className={styles.accessLead}>{lead}</p>
      <div className={styles.accessCards}>
        {showHoney && (
          <section className={`${styles.accessCard} ${styles.honeyCard}`} aria-labelledby="consultation-access-honey" data-consultation-honey-card={enough ? "ready" : "short"}>
            <p className={styles.accessKicker}>꿀방울로 열기</p>
            <h3 id="consultation-access-honey" className={styles.accessTitle}><span className={styles.honeyDrop} aria-hidden="true" />꿀방울 {HONEY_COST}개</h3>
            <div className={styles.honeyMeter} aria-hidden="true"><span style={{ width: `${fill}%` }} /></div>
            <p className={styles.accessNote} role="status">{status}</p>
            {enough ? (
              <button type="button" className={styles.accessPrimary} data-consultation-honey disabled={busy || isPaying} onClick={onHoney}>
                {busy ? "상담을 여는 중…" : `꿀방울 ${HONEY_COST}개로 상담 열기`}
              </button>
            ) : honey && !honey.attended ? (
              <button type="button" className={styles.accessSecondary} data-consultation-attend disabled={busy || honeyLoading} onClick={onAttend}>
                오늘 출석하고 꿀방울 1개 받기
              </button>
            ) : honey?.attended ? (
              <p className={styles.muted}>오늘 출석을 마쳤어요. 내일 또 1개를 받을 수 있어요.</p>
            ) : null}
            <p className={styles.muted}>매일 출석하면 꿀방울이 1개씩 쌓여요. 답을 받기 전에 상담이 멈추면 30개를 그대로 돌려드려요.</p>
          </section>
        )}
        <section className={`${styles.accessCard} ${styles.payCard}`} aria-labelledby="consultation-access-pay">
          <p className={styles.accessKicker}>이용권 · 결제로 열기</p>
          <h3 id="consultation-access-pay" className={styles.accessTitle}>바로 상담 열기</h3>
          {/* 가격표 키는 서비스 등록 키다 — 상담별 결제 키(fc-<id>)는 가격표에 없어 "가격 확인 필요"가 뜬다. */}
          <PriceBadge featureKey="fortune-chat-consultation" fallbackLabel="5,000원" prefix="1회 " className={base.priceBadge} />
          <p className={styles.accessNote}>이용권이 있으면 결제창에서 먼저 골라 쓸 수 있어요.</p>
          <button type="button" className={showHoney && enough ? styles.accessSecondary : styles.accessPrimary} data-consultation-pay disabled={busy || isPaying} onClick={onPay}>
            {isPaying ? "결제창을 여는 중…" : "결제 내용 확인하기"}
          </button>
        </section>
      </div>
    </div>
  );
}
