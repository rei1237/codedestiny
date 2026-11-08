export function paidDetailsIdentity(input: { birthDate: string; calendarType: string; partner: { kind: string; id: string } }): Promise<{ hash: string; requestId: string }>;
