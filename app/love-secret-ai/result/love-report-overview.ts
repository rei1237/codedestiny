import type { ConsultationBookSummary } from "@/lib/pdf/export-consultation-book-pdf";
import type { LoveSpeaker } from "./love-secret-sections";

export const loveReportMasters = {
  yeoni: {
    portrait: "/images/master-profiles/yeoni-love-portrait-360.webp",
    avatar: "/images/master-profiles/avatars/yeoni-love.webp",
  },
  hanbi: {
    portrait: "/images/master-profiles/hanbi-love-portrait-360.webp",
    avatar: "/images/master-profiles/avatars/hanbi-love.webp",
  },
} satisfies Record<LoveSpeaker, { portrait: string; avatar: string }>;

export function loveCoverPortraits(names: Record<LoveSpeaker, string>) {
  return (["yeoni", "hanbi"] as const).map(key => ({ src: loveReportMasters[key].portrait, name: names[key] }));
}

const speakerNames: Record<string, Record<LoveSpeaker, string>> = {
  ko: { yeoni: "연이", hanbi: "서한비" },
  en: { yeoni: "Yeoni", hanbi: "Seo Hanbi" },
  ja: { yeoni: "ヨニ", hanbi: "ソ・ハンビ" },
  zh: { yeoni: "妍伊", hanbi: "徐寒菲" },
};

export function loveReportSpeakerNames(locale: string) {
  return speakerNames[locale.toLowerCase().split(/[-_]/)[0]] || speakerNames.en;
}

export function loveReportCopy(locale: string) {
  return locale.split(/[-_]/)[0].toLowerCase() === "ko" ? {
    masters: "담당 마스터", overview: "한눈에 보는 상담", diagnosis: "관계의 한 문장",
    months: "월별 흐름", dates: "주요 날짜", date: "시기", flow: "흐름", basis: "근거",
    favorable: "살펴볼 날", caution: "조심할 날",
    roles: { yeoni: "연애 성향과 실천", hanbi: "관계 흐름과 시기" },
  } : {
    masters: "Your readers", overview: "Reading at a glance", diagnosis: "Your relationship in one line",
    months: "Monthly outlook", dates: "Dates to note", date: "Timing", flow: "Outlook", basis: "Basis",
    favorable: "Favorable window", caution: "Use care",
    roles: { yeoni: "Relationship patterns and next steps", hanbi: "Relationship dynamics and timing" },
  };
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const list = (value: unknown) => Array.isArray(value) ? value.map(record) : [];

export function loveReportOverview(source: unknown, locale = "ko") {
  const result = record(source);
  const reading = record(result.reading);
  const calendar = record(record(result.sajuSummary).calendar ?? record(result.sajuResult).calendar);
  const copy = loveReportCopy(locale);
  const months = calendar.available === false ? [] : list(calendar.monthlyFlow).flatMap(month => {
    const label = text(month.monthLabel);
    const detail = text(month.grade);
    return label && detail ? [{ label, detail, source: "" }] : [];
  });
  const dates = calendar.available === false ? [] : (["best", "caution"] as const).flatMap(kind =>
    list(calendar[kind]).slice(0, kind === "best" ? 8 : 5).flatMap(day => {
      const label = text(day.date);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) return [];
      const tags = Array.isArray(day.tags) ? day.tags.map(text).filter(Boolean).slice(0, 4) : [];
      return [{
        label,
        detail: [kind === "best" ? copy.favorable : copy.caution, text(day.grade)].filter(Boolean).join(" · "),
        source: [text(day.ganjiKo) || text(day.ganji), ...tags].filter(Boolean).join(" · "),
      }];
    })
  );
  return { diagnosis: text(reading.oneLineDiagnosis) || text(result.oneLineDiagnosis), months, dates };
}

export function buildLoveReportSummary(source: unknown, locale = "ko"): ConsultationBookSummary {
  const copy = loveReportCopy(locale);
  const { diagnosis, months, dates } = loveReportOverview(source, locale);
  return {
    title: copy.overview,
    figures: [
      { kind: "lead", title: copy.diagnosis, text: diagnosis },
      { kind: "timeline", title: copy.months, items: months },
      { kind: "timeline", title: copy.dates, items: dates },
    ],
  };
}
