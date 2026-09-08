import type { VisualDetail } from './feature-detail-panels.mjs';
export function introductionShareData(detail: VisualDetail, kind?: string, channel?: string): { title: string; text: string; url: string };
export function shareIntroductionFromButton(button: HTMLButtonElement, detail: VisualDetail): Promise<void>;
