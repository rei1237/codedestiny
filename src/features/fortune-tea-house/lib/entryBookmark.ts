import { isTeaHouseEntryStage, getTeaHouseEntryScene, type TeaHouseEntryStage } from "../data/entryStory";

// Reading progress is deliberately separate from consultation and payment recovery.
export const ENTRY_BOOKMARK_KEY = "fortuneTeaHouse.novelBookmark.v1";
export type EntryBookmark = { stage: TeaHouseEntryStage; line: number };

export function readEntryBookmark(): EntryBookmark | null {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(ENTRY_BOOKMARK_KEY) || "null");
    if (!raw || typeof raw !== "object") return null;
    const value = raw as Record<string, unknown>;
    if (typeof value.stage !== "string" || !isTeaHouseEntryStage(value.stage)) return null;
    if (typeof value.line !== "number" || !Number.isInteger(value.line) || value.line < 0) return null;
    if (value.line >= getTeaHouseEntryScene(value.stage).lines.length) return null;
    return { stage: value.stage, line: value.line };
  } catch { return null; }
}

export function saveEntryBookmark(value: EntryBookmark | null) {
  try {
    if (value) window.localStorage.setItem(ENTRY_BOOKMARK_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(ENTRY_BOOKMARK_KEY);
  } catch { /* Private browsing must not prevent reading. */ }
}
