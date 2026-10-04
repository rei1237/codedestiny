export type SajuCompatTranslate = (key: string, vars: Record<string, string | number>, fallback: string) => string;
export type SajuCompatT = (key: string, vars?: Record<string, string | number>) => string;
export const SAJU_COMPAT_KO: Record<string, string>;
export function escapeHtml(value: unknown): string;
export function createSajuCompatT(translate?: SajuCompatTranslate | null): SajuCompatT;
export function sajuCompatKeys(): string[];
export function renderSajuCompat(snapshot: unknown, options?: { t?: SajuCompatT; selfName?: string }): string;
