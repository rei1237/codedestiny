import React from 'react';
import { createRoot } from 'react-dom/client';
import ZiweiAiClient from '../../../app/ziwei-ai/ZiweiAiClient';
import { hydrateAuthSuccessUser } from '../../../app/_lib/auth-store';
import checkoutEntry from '../../../js/core/checkout-entry.js';

const scope = window as any;
const storageKey = '__audit_mock_paid_return';
scope.__audit = { gateCalls: 0, resumed: null, documentId: crypto.randomUUID() };
scope._cdOpenPaidServiceGate = (options: any) => new Promise(() => {
  scope.__audit.gateCalls++;
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', '합성 PG 결제');
  dialog.innerHTML = '<p>로컬 검증용 가짜 결제입니다. 실제 청구는 없습니다.</p><button type="button">mock 결제 승인</button>';
  dialog.querySelector('button')!.onclick = async () => {
    const response = await fetch('/__audit/pg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: options.requestId || options.idempotencyKey, resume: options.resume }) });
    if (!response.ok) throw new Error('Mock payment rejected');
    const proof = await response.json();
    sessionStorage.setItem(storageKey, JSON.stringify({ descriptor: options.resume, proof }));
    location.assign('/__audit/pg-return');
  };
  document.body.append(dialog); dialog.showModal();
});
const restoreAuth = () => hydrateAuthSuccessUser({ id: 'mock-owner', _id: 'mock-owner', nickname: '합성 검증', email: 'audit@example.invalid' });
if (new URLSearchParams(location.search).has('delayedAuth')) setTimeout(restoreAuth, 1000);
else restoreAuth();
createRoot(document.getElementById('root')!).render(<ZiweiAiClient />);
if (new URLSearchParams(location.search).has('auditReturn')) {
  const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
  if (saved) {
    // Real dispatcher waits for the actual usePaidResume effect to register.
    void checkoutEntry.runPaidResume(saved.descriptor, saved.proof).then((ok: boolean) => {
      scope.__audit.resumed = ok;
      if (ok) sessionStorage.removeItem(storageKey);
    });
  }
}
