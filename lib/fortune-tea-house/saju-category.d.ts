export const SAJU_CATEGORIES: readonly string[];
export function resolveQuestionCategory(input?: { questionCategory?: string; question?: string }): { primary: string | null; secondary: string | null; needsClarification: boolean };
export const CATEGORY_FOCUS: Record<string, { gods: string[]; focus: string; time: string }>;
export function selectQuestionGuests<T extends { scope: string; tenGodId: string }>(guests: T[], category: string): T[];
