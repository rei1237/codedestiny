import { authFetch } from '@/app/_lib/auth-client';

export type RewardReceipt = { status: string; amount: number; expiresAt?: string };
export type ActivationState = {
  accountId: string;
  policy: { tutorial: { amount: number; days: number }; firstPaid: { amount: number; days: number }; review: { amount: number; days: number; trigger: string } };
  wallet: { balance: number; nextExpiry?: string; minimumProductKRW: number };
  tutorial: { eligible: boolean; legacySignupReceived: boolean; profileId?: string; receipt?: RewardReceipt };
  firstPaid: { receipt?: RewardReceipt };
  recommendations: { featureKey: string; title: string; description: string; href: string; amountKRW: number; moonstonesAllowed: boolean }[];
  granted?: boolean; replayed?: boolean;
};
export type CampusState = { eligibleEmail: boolean; verified: boolean; email?: string; profileId?: string; complete?: boolean;
  unlockedFeatureKeys: string[]; features: { featureKey: string; title: string }[] };

export class ActivationApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function activationApi<T>(path: string, body?: object, signal?: AbortSignal): Promise<T> {
  const response = await authFetch(`/api/activation-rewards/${path}`, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'include', cache: 'no-store', signal,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  });
  const data = await response.json();
  if (!response.ok || data.ok !== true) throw new ActivationApiError(response.status, data.message || '선물을 확인하지 못했어요. 잠시 후 다시 확인해 주세요.');
  return data as T;
}
