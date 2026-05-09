import { notFound } from "next/navigation";
import { toLocale } from "../../lib/i18n/locales";

export function resolveLocale(paramLocale) {
  const locale = toLocale(paramLocale);
  if (!locale || locale === "ko") {
    notFound();
  }
  return locale;
}
