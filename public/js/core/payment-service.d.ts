export type PaymentMethod = "MEMBERSHIP_PASS" | "MONTHLY" | "DIRECT_KRW";

export type PaymentSuccessEventPayload = {
  operationId: string;
  requestId: string;
  productId: string;
  featureKey: string;
  profileId: string;
  method: PaymentMethod | string;
  accessGrant: Record<string, unknown>;
  unlockMap: Record<string, boolean>;
  monthlyBalance: number | null;
  snapshotPatch: Record<string, unknown>;
  completedAt: string;
};

export type PaymentCommand = Partial<PaymentSuccessEventPayload> & {
  method: PaymentMethod | string;
  requestId: string;
  snapshotCovered?: boolean;
  backgroundVerify?: (command: PaymentCommand) => Promise<unknown> | unknown;
};

declare const paymentService: {
  VERSION: number;
  METHODS: Record<PaymentMethod, PaymentMethod>;
  normalizeMethod(value: unknown): string;
  commandKey(input: PaymentCommand): string;
  executePayment<T>(input: PaymentCommand, executor?: (command: PaymentCommand) => Promise<T> | T): Promise<T | { ok: true; optimistic: true; paymentSuccessEvent: PaymentSuccessEventPayload }>;
  reducePaymentSuccess(payload: Partial<PaymentSuccessEventPayload> & { operationId: string; requestId: string }): PaymentSuccessEventPayload;
  registerPaymentWindow(renderer: (options: Record<string, unknown>) => unknown, owner?: string): boolean;
  openPaymentWindow(options?: Record<string, unknown>): Promise<unknown>;
  registerSnapshotSynchronizer(synchronizer: ((event: PaymentSuccessEventPayload) => Promise<unknown> | unknown) | null): void;
  scheduleSnapshotSync(userKey: string, event: PaymentSuccessEventPayload): Promise<unknown>;
};

export default paymentService;
