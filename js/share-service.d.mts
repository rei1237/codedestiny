export type ShareChannel = 'kakao' | 'native' | 'copy';
export type ShareData = { title: string; text: string; url: string; image?: string };
export type ShareOutcome = { status: 'copied' | 'manual' | 'shared' | 'cancelled' | 'failed' | 'unavailable' | 'opened' };
export const KAKAO_SDK_URL: string;
export function publicShareUrl(value: string, origin?: string): string;
export function prepareKakao(key: string | undefined): Promise<boolean>;
export function shareThrough(channel: ShareChannel, data: ShareData): Promise<ShareOutcome>;
