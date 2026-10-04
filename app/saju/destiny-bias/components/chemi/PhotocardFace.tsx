// 포토카드 앞·뒷면. 표시용 문자열만 받는다 — 날짜 입력·명식 같은 개인정보는 이 파일에 들어오지 않는다.
import styles from "../../photocard.module.css";

export type PhotocardGauge = { key: string; label: string; value: number };

export type PhotocardView = {
  me: string;
  partnerName: string;
  groupLabel: string;
  typeName: string;
  typeShort: string;
  symbolSrc: string;
  oneLiner: string;
  total: number;
  grade: string;
  gradeTitle: string;
  edition: string;
  aura: string;
  keywords: string[];
  serial: string;
  issuedAt: string;
  gauges: PhotocardGauge[];
  modeLabel: string;
  themeKey: string;
};

export const PHOTOCARD_THEMES = [
  { key: "moonlight_neon", label: "Aurora Glass" },
  { key: "gold_nocturne", label: "Chrome Star" },
  { key: "coral_haze", label: "Pink Top-kku" },
  { key: "skywave_mint", label: "Midnight Stage" },
  { key: "jade_orbit", label: "Soft Fan Letter" },
] as const;

export const DEFAULT_PHOTOCARD_THEME = PHOTOCARD_THEMES[0].key;

type FaceProps = {
  view: PhotocardView;
  /** 기기 안에서만 쓰는 사진(data URL). 없으면 유형 심볼을 그린다. */
  photoUrl?: string | null;
  /** 내보내기 캔버스용: 3D·애니메이션 없이 평면으로 놓는다. */
  flat?: boolean;
  hidden?: boolean;
};

export function PhotocardFront({ view, photoUrl, flat, hidden }: FaceProps) {
  return (
    <div className={`${styles.pcFace} ${flat ? styles.pcStatic : ""}`} data-theme={view.themeKey} aria-hidden={hidden || undefined}>
      <span className={`${styles.pcLayer} ${styles.pcArt}`} aria-hidden />
      {photoUrl ? (
        <span className={`${styles.pcLayer} ${styles.pcPhoto}`} aria-hidden>
          <img src={photoUrl} alt="" decoding="async" />
        </span>
      ) : (
        <span className={`${styles.pcLayer} ${styles.pcSymbol}`} aria-hidden>
          <img src={view.symbolSrc} alt="" width={240} height={240} decoding="async" />
        </span>
      )}
      <span className={`${styles.pcLayer} ${styles.pcScrim}`} aria-hidden />
      <span className={`${styles.pcLayer} ${styles.pcHolo}`} aria-hidden />
      <span className={`${styles.pcLayer} ${styles.pcGlitter}`} aria-hidden />
      <span className={`${styles.pcLayer} ${styles.pcGrain}`} aria-hidden />
      <span className={styles.pcFrame} aria-hidden />

      <div className={styles.pcTop}>
        <p className={styles.pcEdition}>
          {view.edition}
          <strong className={styles.pcGrade}>{view.grade}</strong>
          <em className={styles.pcGradeTitle}>{view.gradeTitle}</em>
        </p>
        <span className={styles.pcGem}>
          <span className={styles.pcGemCore}>
            <b className={styles.pcGemValue}>
              {view.total}
              <small>%</small>
            </b>
            <span className={styles.pcGemLabel}>CHEMI</span>
          </span>
        </span>
      </div>

      <div className={styles.pcBottom}>
        {view.groupLabel ? <p className={styles.pcGroup}>{view.groupLabel}</p> : null}
        <p className={styles.pcPair}>
          {view.me}
          <i aria-hidden>×</i>
          {view.partnerName}
        </p>
        <p className={styles.pcType}>
          {view.typeShort} · {view.typeName}
        </p>
        {view.keywords.length ? (
          <ul className={styles.pcKeywords}>
            {view.keywords.map((keyword) => (
              <li key={keyword}>#{keyword}</li>
            ))}
          </ul>
        ) : null}
        <div className={styles.pcSerial}>
          <span>
            {view.serial} · {view.issuedAt}
          </span>
          <span className={styles.pcBarcode} aria-hidden />
        </div>
      </div>
    </div>
  );
}

export function PhotocardBack({ view, hidden }: FaceProps) {
  return (
    <div className={`${styles.pcFace} ${styles.pcBack}`} data-theme={view.themeKey} aria-hidden={hidden || undefined}>
      <span className={`${styles.pcLayer} ${styles.pcBackArt}`} aria-hidden />
      <span className={`${styles.pcLayer} ${styles.pcGrain}`} aria-hidden />
      <span className={styles.pcFrame} aria-hidden />
      <div className={styles.pcBackBody}>
        <p className={styles.pcBackKicker}>BACKSTAGE REPORT</p>
        <p className={styles.pcBackTitle}>
          {view.me} × {view.partnerName} 케미 {view.total}%
        </p>
        <ul className={styles.pcGauges}>
          {view.gauges.map((gauge) => (
            <li key={gauge.key}>
              <span>{gauge.label}</span>
              <b>{gauge.value}</b>
              <span className={styles.pcGaugeTrack} aria-hidden>
                <span className={styles.pcGaugeFill} style={{ width: `${Math.max(4, Math.min(100, gauge.value))}%` }} />
              </span>
            </li>
          ))}
        </ul>
        <p className={styles.pcQuote}>{view.oneLiner}</p>
        <div className={styles.pcBackFoot}>
          <span>{view.aura}</span>
          <span>{view.modeLabel}</span>
        </div>
      </div>
    </div>
  );
}
