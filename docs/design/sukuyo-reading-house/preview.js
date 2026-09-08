const data = window.SUKUYO_PREVIEW;
const grid = document.getElementById('mansion-grid');
function selectMansion(m, jump) {
  document.getElementById('mansion-name').textContent = m.ko + '숙';
  document.getElementById('mansion-han').textContent = m.han + '宿';
  for (const [id, key] of Object.entries({'mansion-desc':'desc',core:'core',hidden:'hidden','love-text':'love',social:'social','work-text':'work',wealth:'wealth','advice-text':'advice'})) document.getElementById(id).textContent = m[key] || m.karma || '';
  grid.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.key === m.key)));
  if (jump) { document.getElementById('reading').scrollIntoView(); document.getElementById('reading').tabIndex=-1; document.getElementById('reading').focus({preventScroll:true}); }
}
for (const m of data) {
  const b = document.createElement('button'); b.type='button'; b.dataset.key=m.key; b.setAttribute('aria-label',m.ko+'숙 '+m.han+' 해석 읽기');
  const han=document.createElement('span');han.textContent=m.han;const ko=document.createElement('small');ko.textContent=m.ko+'숙';b.append(han,ko);
  b.addEventListener('click',()=>selectMansion(m,true));grid.append(b);
}
selectMansion(data[0],false);
document.getElementById('search').addEventListener('input',e=>{ const q=e.target.value.trim().replace(/숙/g,'');let count=0;grid.querySelectorAll('button').forEach((b,i)=>{b.hidden=!(data[i].ko.includes(q)||data[i].han.includes(q));if(!b.hidden)count++;});document.getElementById('search-status').textContent=count?count+'개의 숙을 찾았어요.':'해당 숙이 없어요. 한 글자 이름이나 한자로 다시 찾아보세요.'; });
document.getElementById('theme').addEventListener('click',e=>{const neo=document.body.classList.toggle('neo');e.target.textContent=neo?'연이 색상 보기':'네오 색상 보기';});
const stories=[
  ['숙요점이란? 달의 자리로 읽는 나의 성향',['숙요점은 스물일곱 숙이라는 상징을 통해 성향과 관계를 살펴보는 전통 해석입니다. 여기서 숙은 달이 머무는 자리를 뜻합니다. 서양 점성술의 태양 별자리와는 계산 기준과 해석 언어가 다릅니다.','Code Destiny의 기본 숙요점은 음력 생일을 바탕으로 본명숙을 계산합니다. 태어난 시각은 기본 숙 산출에 반영하지 않습니다. 먼저 프로필의 양력·음력 구분과 생일이 맞는지 살펴보세요.','해석에서 익숙한 성향을 발견했다면, 그 성향이 도움이 되었던 순간과 부담이 되었던 순간을 하나씩 떠올려 보세요. 같은 특성도 상황과 선택에 따라 다르게 드러납니다.']],
  ['이름이 같은 두 위숙, 어떻게 구분할까요?',['27숙에는 한국어로 모두 위숙이라고 읽는 두 숙이 있습니다. 한자는 危와 胃로 서로 다릅니다. 이 도감에서는 숙 이름 옆에 한자를 함께 표시해 두 숙을 구별합니다.','검색창에 위를 입력하면 두 숙이 함께 나타납니다. 본명숙 결과에 표시된 한자와 같은 항목을 골라 읽어주세요. 결과를 공유할 때도 한자를 함께 적으면 혼동을 줄일 수 있습니다.','이름이 같다고 같은 해석을 사용하는 것은 아닙니다. 숙의 구별은 기존 계산 엔진의 고유 식별자를 유지하고, 화면에서만 읽기 쉬운 이름을 덧붙입니다.']],
  ['궁합은 결론보다 서로의 차이를 읽는 도구',['숙요의 관계 해석은 두 사람이 어떤 지점에서 편안함을 느끼고, 어떤 차이에서 긴장이 생길 수 있는지 돌아보는 계기로 사용할 수 있습니다. 관계 이름 하나가 두 사람의 미래를 결정하지는 않습니다.','상대의 답장이 느릴 때 무관심이라고 판단하기 전에, 서로 편안한 연락 간격부터 이야기해 보세요. 해석을 근거로 상대의 마음을 단정하기보다 실제 말과 행동을 함께 살피는 것이 좋습니다.','오늘은 상대에게 바라는 것을 한 문장으로 구체화해 보세요. 자주 연락해 줘 대신 바쁜 날에는 저녁에 짧게 안부를 알려주면 마음이 놓일 것 같아처럼 말해 볼 수 있습니다.']]
];
let lastStory;
document.querySelectorAll('[data-story]').forEach(b=>b.addEventListener('click',()=>{lastStory=b;const [title,paragraphs]=stories[Number(b.dataset.story)];document.getElementById('story-title').textContent=title;const body=document.getElementById('story-body');body.replaceChildren(...paragraphs.map(t=>{const p=document.createElement('p');p.textContent=t;return p;}));const reader=document.getElementById('story-reader');reader.hidden=false;reader.focus();reader.scrollIntoView();}));
document.getElementById('close-story').addEventListener('click',()=>{document.getElementById('story-reader').hidden=true;lastStory?.focus();});
const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('.sy-nav a').forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});}},{rootMargin:'-60px 0px -60% 0px'});['home','directory','journal'].forEach(id=>observer.observe(document.getElementById(id)));
