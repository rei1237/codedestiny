export type CompatArt = { id: string; src: string; width: number; height: number; alt: string };
export const COMPAT_ART: Readonly<Record<string, CompatArt>>;
export function pastLifeArt(grade: string): CompatArt;
