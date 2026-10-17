type SajuTeaDraft = { consultationMode: 'saju'; concernTopic: string; question: string; profileId?: string };
type EntryContext = { owner?: string; profileId?: string; question?: string };
export const TEA_SAJU_URL: string;
export const TEA_SAJU_DRAFT_KEY: string;
export function writeSajuTeaDraft(storage: Storage, context: EntryContext, now?: number): void;
export function readSajuTeaDraft(storage: Storage, owner?: string, now?: number): SajuTeaDraft | null;
export function teaSajuEntryMarkup(): string;
export function mountTeaSajuEntry(root: HTMLElement, context: () => EntryContext): void;
