export type CompatArt = { id: string; src: string; width: number; height: number; alt: string };
export const COMPAT_ART: Readonly<Record<string, CompatArt>>;
export function pastLifeArt(grade: string): CompatArt;
export const STORY_PROMPT_VERSION: string;
export function storyArtFor(type: string, past: { grade: { code: string }; cross: { gan: string; ji: string }[] }, promptVersion?: string): CompatArt;
