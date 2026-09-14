// Recovery reads an existing paid snapshot; it never analyzes images or opens a gate.
export async function readPaidPalmResult(requestId: string, token: string, signal?: AbortSignal): Promise<Record<string, unknown> | null> {
  const response = await fetch('/api/palm/result' + (requestId ? '?requestId=' + encodeURIComponent(requestId) : ''), {
    credentials: 'include', headers: token ? { Authorization: 'Bearer ' + token } : {}, signal,
  });
  if ([401, 403, 404].includes(response.status)) return null;
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.saved || !body?.analysisSaved) throw new Error('RESULT_STORAGE_UNAVAILABLE');
  return body;
}
