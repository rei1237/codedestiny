export function normalizeBirthDateInput(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) {
    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() === year &&
      check.getUTCMonth() === month - 1 &&
      check.getUTCDate() === day
    ) {
      return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    return "";
  }

  const match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return "";
  return normalizeBirthDateInput(`${match[1]}${match[2].padStart(2, "0")}${match[3].padStart(2, "0")}`);
}

export function formatBirthDateDigits(value: unknown): string {
  const normalized = normalizeBirthDateInput(value);
  if (normalized) return normalized.replace(/\D/g, "");
  return String(value ?? "").replace(/\D/g, "").slice(0, 8);
}

export function normalizeBirthDateFromDigits(value: unknown): string {
  const digits = formatBirthDateDigits(value);
  return digits.length === 8 ? normalizeBirthDateInput(digits) : digits;
}
