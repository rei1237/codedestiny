'use strict';
const products = {
  love: { title: '숙요점', hook: '우리는 왜 끌리고,\n왜 자꾸 엇갈릴까요?', value: '두 사람의 관계 유형과 거리를 살펴보며, 서로의 속도를 이해할 실마리를 찾아보세요.', questions: ['강하게 끌리는데 왜 자주 부딪힐까요?', '서로에게 편안한 거리는 어느 정도일까요?', '연애와 협업에서도 같은 모습이 나타날까요?'], map: [['두 사람의 본명숙', '각자의 숙을 먼저 확인합니다'], ['관계 유형과 거리', '둘 사이의 관계를 살펴봅니다'], ['관계별 해석', '연애·결혼·재회·협업 등 주제로 읽습니다']], method: '두 사람의 본명숙을 계산하고 관계 유형과 거리를 판정합니다. 같은 관계 유형도 실제 상황에 따라 다르게 경험할 수 있습니다.' },
  self: { title: '자미두수', hook: '나는 왜 비슷한\n선택을 반복할까요?', value: '열두 궁과 별의 배치를 통해 성향·관계·일의 주제를 나누어 살펴보세요.', questions: ['나를 움직이는 성향은 무엇일까요?', '관계와 일에서는 어떤 차이가 나타날까요?', '지금 눈여겨볼 삶의 주제는 무엇일까요?'], map: [['명궁과 주요 별', '나를 이해하는 출발점'], ['열두 궁의 배치', '삶의 주제별로 나누어 읽기'], ['시기의 흐름', '현재의 질문과 연결해 살펴보기']], method: '생년월일과 출생시간으로 명궁과 열두 궁을 세우고 주요 별의 배치를 살펴봅니다. 기본 명반과 심화 상담은 제공 범위가 다르므로 시작 전 구분해 안내합니다.' },
  life: { title: '초융합 심층 리딩', hook: '여러 관점에서 보면,\n무엇이 달라질까요?', value: '각 체계의 해석을 구분해서 읽고, 겹치는 흐름과 다른 선택지를 함께 살펴보세요.', questions: ['다른 체계에서도 같은 흐름이 나타날까요?', '해석이 다르면 어떻게 이해하면 좋을까요?', '지금의 질문에서 무엇부터 살펴볼까요?'], map: [['체계별로 읽기', '사주·자미두수·베다·숙요·점성술·타로'], ['겹침과 차이', '같은 흐름과 다른 관점을 구분'], ['종합 리딩', '현재의 질문을 중심으로 정리']], method: '각 체계의 결과를 별도로 읽은 뒤 종합하는 구성을 보여줍니다. 여러 해석이 겹친다는 사실을 정확도나 미래의 보장으로 표현하지 않습니다.' },
};
function selectProduct(key) {
  const p = products[key]; if (!p) return;
  document.getElementById('product-name').textContent = p.title;
  const hook = document.getElementById('product-hook'); hook.replaceChildren();
  p.hook.split('\n').forEach((line, i) => { if (i) hook.append(document.createElement('br')); hook.append(document.createTextNode(line)); });
  document.getElementById('product-value').textContent = p.value;
  document.getElementById('recommend-title').textContent = p.title;
  document.getElementById('recommend-copy').textContent = p.value;
  document.getElementById('recommend-context').textContent = { love: '관계의 거리와 속도가 궁금할 때', self: '나의 성향과 선택이 궁금할 때', life: '여러 관점을 함께 살펴보고 싶을 때' }[key];
  document.getElementById('method-copy').textContent = p.method;
  document.getElementById('questions').replaceChildren(...p.questions.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  document.getElementById('result-map').replaceChildren(...p.map.map(([title, text]) => { const div = document.createElement('div'); const strong = document.createElement('strong'); strong.textContent = title; const span = document.createElement('span'); span.textContent = text; div.append(strong, span); return div; }));
  document.querySelectorAll('.concerns button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.concern === key)));
}
function showView(view) {
  document.querySelectorAll('.view').forEach(node => { node.hidden = node.id !== view; });
  document.querySelectorAll('.review-tools button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
  const heading = document.querySelector(`#${view} h1`); heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); window.scrollTo(0, 0);
}
document.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; if (button.dataset.concern) selectProduct(button.dataset.concern); if (button.dataset.view) showView(button.dataset.view); });
selectProduct('love');
fetch('inventory.json').then(response => { if (!response.ok) throw new Error('inventory unavailable'); return response.json(); }).then(data => {
  document.getElementById('counts').textContent = `소스 후보 ${data.counts.candidateRecords}개 · 라우트 ${data.counts.appRoutes}개 · 마케팅 키 ${data.counts.marketingKeys}개. 중복을 포함하며 최종 서비스 수가 아닙니다.`;
  function render() {
    const query = document.getElementById('search').value.toLowerCase().trim();
    const gapsOnly = document.getElementById('gaps-only').checked;
    const rows = data.rows.filter(row => (!gapsOnly || !row.copySource) && (!query || JSON.stringify([row.title, row.identity, row.entrypoints]).toLowerCase().includes(query)));
    document.getElementById('shown').textContent = `${rows.length}개 후보 표시 · 6단계 점수 전부 미평가`;
    document.getElementById('records').replaceChildren(...rows.map(row => {
      const details = document.createElement('details'); details.className = 'record'; const summary = document.createElement('summary'); summary.textContent = `${row.title} — ${row.identity}`;
      const status = document.createElement('p'); status.className = 'scores'; status.textContent = '인지 — / 호기심 — / 검토 — / 신뢰 — / 전환 — / 재방문 —';
      const pre = document.createElement('pre'); pre.textContent = JSON.stringify({ source: row.sources, entrypoints: row.entrypoints, routeEvidence: row.routeEvidence, callsiteCandidates: row.callsiteCandidates, copySource: row.copySource, gaps: row.gaps, existingCopy: row.existingCopy }, null, 2);
      details.append(summary, status, pre); return details;
    }));
  }
  document.getElementById('search').addEventListener('input', render); document.getElementById('gaps-only').addEventListener('change', render); render();
}).catch(() => { document.getElementById('counts').textContent = '조사표를 불러오지 못했습니다. README의 로컬 서버 명령으로 열어 주세요.'; });
