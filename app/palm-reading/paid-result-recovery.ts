// Recovery reads an existing paid snapshot; it never analyzes images or opens a gate.
// accessMethod 'pass': 이용권 즉시 사용은 사용 기록을 뒤에서 쓰므로, 서버가 이 requestId 로 이용권을 직접 확정하게 한다.
export async function readPaidPalmResult(requestId: string, token: string, signal?: AbortSignal, accessMethod = ''): Promise<Record<string, unknown> | null> {
  const query = requestId ? '?requestId=' + encodeURIComponent(requestId) + (accessMethod ? '&accessMethod=' + encodeURIComponent(accessMethod) : '') : '';
  const response = await fetch('/api/palm/result' + query, {
    credentials: 'include', headers: token ? { Authorization: 'Bearer ' + token } : {}, signal,
  });
  if ([401, 403, 404].includes(response.status)) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.saved || !body?.analysisSaved) throw new Error('RESULT_STORAGE_UNAVAILABLE');
  return body;
}
