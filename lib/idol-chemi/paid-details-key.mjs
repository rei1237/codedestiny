// The same input keeps its payment retry key across reloads. No raw birthday in URLs or storage.
export async function paidDetailsIdentity(input) {
  const birthDate = String(input?.birthDate || '').replace(/-/g, '');
  const kind = input?.partner?.kind;
  const id = input?.partner?.id;
  const calendarType = input?.calendarType;
  if (!/^\d{8}$/.test(birthDate) || !['solar', 'lunar', 'lunar_leap'].includes(calendarType) ||
      !['roster', 'preset'].includes(kind) || typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) {
    throw new Error('상세 리포트 입력을 확인해 주세요.');
  }
  const bytes = new TextEncoder().encode(JSON.stringify([kind, id, birthDate, calendarType]));
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  return { hash, requestId: `destiny-bias-analyze:${hash}` };
}
