import timeline from "./dasha-timeline.module.css";
import type {useNakshatraCopy} from "../_lib/copy";

interface Antardasha {
  lord: string;
  lordKo: string;
  startDate: string;
  endDate: string;
  tone: string;
  isCurrent: boolean;
}
interface EasternCycle {
  pillar: string;
  startYear: number;
  endYear: number;
  startAge: number;
  endAge: number;
  tenGod: string;
  isCurrent: boolean;
}
export interface Period {
  index: number;
  lordKo: string;
  title: string;
  focus: string;
  opens: string;
  demands: string;
  caution: string;
  startDate: string;
  endDate: string;
  startYear: number;
  endYear: number;
  startAge: number | null;
  endAge: number | null;
  isCurrent: boolean;
  isPast: boolean;
  antardashas: Antardasha[];
  easternCycles: EasternCycle[];
}
export default function PeriodRow({ period, copy }: { period: Period; copy: ReturnType<typeof useNakshatraCopy> }) {
  const className = [
    timeline.period,
    period.isCurrent ? timeline.periodCurrent : "",
    period.isPast ? timeline.periodPast : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <details className={className} open={period.isCurrent}>
      <summary className={timeline.periodHead}>
        <span className={timeline.age}>
          {period.startAge}–{period.endAge}{copy.dashaAgeSuffix}
        </span>
        <span className={timeline.lord}>{period.lordKo}</span>
        <span className={timeline.phase}>{period.title}</span>
        {period.isCurrent && <span className={timeline.nowBadge}>{copy.dashaNowBadge}</span>}
      </summary>
      <div className={timeline.periodBody}>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>{copy.dashaPeriodLabel}</span>
          {period.startDate} ~ {period.endDate} · {period.focus}
        </p>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>{copy.dashaOpensLabel}</span>
          {period.opens}
        </p>
        <p className={timeline.line}>
          <span className={timeline.lineLabel}>{copy.dashaDemandsLabel}</span>
          {period.demands}
        </p>
        <p className={`${timeline.line} ${timeline.lineCaution}`}>
          <span className={timeline.lineLabel}>{copy.dashaCautionLabel}</span>
          {period.caution}
        </p>

        {period.easternCycles.length > 0 && (
          <p className={timeline.eastern}>
            <span className={timeline.easternLabel}>{copy.dashaEasternLabel}</span>
            {period.easternCycles
              .map((cycle) => `${cycle.pillar}${cycle.tenGod ? `(${cycle.tenGod})` : ""} ${cycle.startAge}–${cycle.endAge}${copy.dashaAgeSuffix}`)
              .join(" · ")}
          </p>
        )}

        <ul className={timeline.subs}>
          {period.antardashas.map((sub) => (
            <li key={`${period.index}-${sub.lord}`} className={`${timeline.sub} ${sub.isCurrent ? timeline.subCurrent : ""}`}>
              <span className={timeline.subDate}>
                {sub.startDate} ~ {sub.endDate}
              </span>
              <span className={timeline.subLord}>{sub.lordKo}</span>
              <span className={timeline.subTone}>{sub.tone}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
