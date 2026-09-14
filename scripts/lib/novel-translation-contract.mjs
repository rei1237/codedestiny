export function isCompleteNovelTranslation(value) {
  return typeof value === "string" && Boolean(value.trim()) && !/[가-힣]|ZXQCDITEM|__\s*CDITEM/i.test(value);
}
