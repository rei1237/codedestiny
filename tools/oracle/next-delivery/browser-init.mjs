// Test-only PG boundary. Auth, React, Next routing and resume hooks remain real.
export function installMockBrowser() {
  window.__audit = { documentId: crypto.randomUUID(), gateCalls: 0, resumed: null };
  if (new URLSearchParams(location.search).has('delayedAuth')) localStorage.removeItem('fortune_auth_user');
  else localStorage.setItem('fortune_auth_user', JSON.stringify({ id: 'mock-owner', _id: 'mock-owner', nickname: '합성 검증' }));
  document.cookie = 'fortune_auth_role=user; path=/; SameSite=Lax';
  window._cdOpenPaidServiceGate = options => new Promise(() => {
    window.__audit.gateCalls++;
    const dialog = document.createElement('dialog');
    dialog.setAttribute('aria-label', '합성 PG 결제');
    dialog.innerHTML = '<p>전체 Next 앱의 mock 결제입니다. 실제 청구 없음.</p><button>mock 결제 승인</button>';
    dialog.querySelector('button').onclick = async () => {
      const response = await fetch('/__audit/pg', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: options.requestId || options.idempotencyKey, resume: options.resume }) });
      if (!response.ok) throw new Error('Mock payment rejected');
      sessionStorage.setItem('__audit_mock_paid_return', JSON.stringify({ descriptor: options.resume, proof: await response.json() }));
      location.assign('/__audit/pg-return');
    };
    document.body.append(dialog); dialog.showModal();
  });
  if (new URLSearchParams(location.search).has('auditReturn')) {
      const start = performance.now();
      const timer = setInterval(() => {
        // Page and context init scripts have no guaranteed relative order.
        // Read the mock PG receipt after both have finished installing.
        const saved = JSON.parse(sessionStorage.getItem('__audit_mock_paid_return') || 'null');
        if (!saved) { clearInterval(timer); return; }
        if (!window.__cdCheckoutEntry) {
          if (performance.now() - start > 30000) { clearInterval(timer); window.__audit.resumed = false; }
          return;
        }
        clearInterval(timer);
        window.__audit.resumeStartedAt = performance.now();
        void window.__cdCheckoutEntry.runPaidResume(saved.descriptor, saved.proof).then(ok => {
          window.__audit.resumed = ok;
          window.__audit.resumeFinishedAt = performance.now();
          if (ok) sessionStorage.removeItem('__audit_mock_paid_return');
        });
      }, 50);
  }
}
