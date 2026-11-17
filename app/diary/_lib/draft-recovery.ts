// Memory-only recovery for unsuccessful device writes. No second persistent store is introduced.
const drafts = new Map<string, string>();
export const readRecoveredDraft = (key: string) => drafts.get(key);
export const rememberDraft = (key: string, value: string) => { drafts.set(key, value); };
export const forgetDraft = (key: string) => { drafts.delete(key); };
export const clearRecoveredDrafts = () => { drafts.clear(); };
