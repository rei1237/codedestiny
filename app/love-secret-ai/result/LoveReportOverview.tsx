import { useState } from "react";
import { loveReportCopy, loveReportMasters, loveReportOverview } from "./love-report-overview";
import type { LoveSpeaker } from "./love-secret-sections";
import styles from "./LoveReportOverview.module.css";

export function LoveMasterImage({ src, size }: { src: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt="" width={size} height={size} decoding="async" onError={() => setFailed(true)} />;
}

export function LoveReportMasters({ names, locale }: { names: Record<LoveSpeaker, string>; locale: string }) {
  const copy = loveReportCopy(locale);
  return (
    <ul className={styles.masters} aria-label={copy.masters}>
      {(["yeoni", "hanbi"] as const).map(key => (
        <li key={key} className={styles.master}>
          <LoveMasterImage src={loveReportMasters[key].portrait} size={64} />
          <div><strong>{names[key]}</strong><span>{copy.roles[key]}</span></div>
        </li>
      ))}
    </ul>
  );
}

export function LoveReportTiming({ source, locale }: { source: unknown; locale: string }) {
  const copy = loveReportCopy(locale);
  const { months, dates } = loveReportOverview(source, locale);
  return (
    <>
      {([["months", months], ["dates", dates]] as const).map(([kind, rows]) => rows.length > 0 && (
        <table key={kind} className={styles.timing}>
          <caption>{copy[kind]}</caption>
          <thead><tr><th scope="col">{copy.date}</th><th scope="col">{copy.flow}{kind === "dates" ? ` · ${copy.basis}` : ""}</th></tr></thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.label}-${index}`}>
                <th scope="row">{row.label}</th>
                <td><strong>{row.detail}</strong>{row.source && <span>{row.source}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </>
  );
}
