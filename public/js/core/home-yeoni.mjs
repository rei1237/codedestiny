import { setHomeLabel } from './home-label.mjs';
const art = document.querySelector('[data-home-yeoni]');
const toggle = document.querySelector('[data-yeoni-motion]');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const loaded = new Map();
const base = '/images/home/yeoni-expressions/';

async function frames(form) {
  if (!loaded.has(form)) {
    const sheet = new Image();
    sheet.src = base + form + '.webp';
    const request = fetch(base + form + '.json').then(response => {
      if (!response.ok) throw Error('Missing expression frames');
      return response.json();
    });
    loaded.set(form, Promise.all([request, sheet.decode()]).then(([info]) => info)
      .catch(error => { loaded.delete(form); throw error; }));
  }
  return loaded.get(form);
}

if (art) {
  const speech = document.querySelector("[data-yeoni-speech]");
  const effect = art.querySelector(".yh-reaction-art");
  const reactions = [
    {name:"wink", text:"우리만 아는 비밀로 할까요?", face:"wink"},
    {name:"hum", text:"따뜻한 차가 기다려요. 라라라♪", face:"hum"},
    {name:"petals", text:"오늘은 꽃잎 한 장 선물할게요.", face:"smileClosed"}
  ];
  let nextReaction = Math.floor(Math.random() * reactions.length);
  const patch = art.querySelector('[data-face]');
  const form = art.dataset.form || 'pig';
  let visible = false;
  let enabled = true;
  let greeted = false;
  let turn = 0;
  let timer;
  try { enabled = localStorage.getItem('cd:yeoni:motion') !== 'off'; } catch {}
  function refresh(reaction) {
    const current = ++turn;
    clearTimeout(timer);
    patch.hidden = true;
    effect.hidden = true;
    if (toggle) toggle.checked = enabled;
    if (!visible || !enabled || document.hidden || preference.matches) return;
    frames(form).then(info => {
      if (current !== turn) return;
      const { left, top, width, height } = info.face;
      patch.style.left = 100*left/info.canvas[0] + '%';
      patch.style.top = 100*top/info.canvas[1] + '%';
      patch.style.width = 100*width/info.canvas[0] + '%';
      patch.style.height = 100*height/info.canvas[1] + '%';
      patch.style.backgroundImage = 'url('+base+form+'.webp)';
      patch.style.backgroundSize = (info.states.length*100)+'% 100%';
      function show(state) {
        const index = info.states.indexOf(state);
        patch.hidden = index < 0;
        if (index >= 0) patch.style.backgroundPositionX = 100*index/(info.states.length-1)+'%';
      }
      function wait(ms, callback) {
        timer = setTimeout(() => { if (turn === current) callback(); }, ms);
      }
      function blink(smiling, done) {
        show(smiling ? 'smileHalf' : 'half');
        wait(65, () => {
          show(smiling ? 'smileClosed' : 'closed');
          wait(80, () => {
            show(smiling ? 'smileHalf' : 'half');
            wait(65, () => { show(smiling ? 'smile' : 'open'); done(); });
          });
        });
      }
      function idle() { wait(4000 + Math.random()*3000, () => blink(false, idle)); }
      if (reaction?.face) {
        greeted = true;
        effect.dataset.gesture = reaction.name;
        effect.hidden = false;
        show(form === "pig" ? reaction.face : "smile");
        wait(1100, () => { effect.hidden = true; show("smile"); wait(320, () => { show("open"); idle(); }); });
        return;
      }
      if (greeted) { idle(); return; }
      greeted = true;
      show('smile');
      wait(650, () => blink(true, () => wait(650, () => { show('open'); idle(); })));
    }).catch(() => { if (turn === current) patch.hidden = true; });
  }
  function greet() {
    const reaction = reactions[nextReaction];
    nextReaction = (nextReaction + 1 + Math.floor(Math.random() * (reactions.length - 1))) % reactions.length;
    setHomeLabel(speech, 'home.shelf.' + reaction.name, reaction.text);
    refresh(reaction);
  }
  art.addEventListener("click", greet);
  document.querySelector("[data-yeoni-greet]")?.addEventListener("click", greet);
  toggle?.addEventListener('change', () => {
    enabled = toggle.checked;
    try { localStorage.setItem('cd:yeoni:motion', enabled ? 'on' : 'off'); } catch {}
    refresh();
  });
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; refresh(); });
  observer.observe(art);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pagehide', () => { ++turn; clearTimeout(timer); patch.hidden = true; });
  window.addEventListener('pageshow', refresh);
  preference.addEventListener('change', refresh);
  refresh();
}
