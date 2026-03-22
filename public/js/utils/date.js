/**
 * 날짜/시간 유틸리티
 * @module utils/date
 */

/**
 * 한국 시간대 오프셋 (UTC+9)
 */
export const KST_OFFSET = 9 * 60;

/**
 * Date를 YYYY-MM-DD 형식으로 반환
 * @param {Date} d
 * @returns {string}
 */
export function toYMD(d) {
  if (!d || !(d instanceof Date)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Date를 HH:mm 형식으로 반환
 * @param {Date} d
 * @returns {string}
 */
export function toHM(d) {
  if (!d || !(d instanceof Date)) return '';
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}
