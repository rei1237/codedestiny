import { setHomeLabel } from './home-label.mjs';
const art = document.querySelector('[data-home-yeoni]');
const toggle = document.querySelector('[data-yeoni-motion]');
const preference = matchMedia('(prefers-reduced-motion: reduce)');
const loaded = new Map();
const connection = navigator.connection;
const constrained = () => connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '');
const ggulggul = /^\/ggulggul(?:\/|$)/.test(location.pathname);
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
  const humanActs = [
    ['welcome','먼 길 오셨지요. 이쪽에 편히 앉으세요.'],
    ['listen','천천히 말씀하세요. 어떤 대목에서 마음이 걸렸나요?'],
    ['offer','잔을 조금 가까이 놓아 드릴게요.'],
    ['speak','오늘은 그 이야기부터 함께 읽어 볼까요?']
  ];
  let nextAct = 0;
  let activeAct;
  const hero = art.closest('[data-home-hero]');
  const petals = document.createElement('span');
  petals.className = 'yh-drifting-petals';
  petals.setAttribute('aria-hidden', 'true');
  if (ggulggul && hero) {
    for (let i=0; i<4; i++) petals.appendChild(document.createElement('i'));
    hero.appendChild(petals);
  }
  async function perform(action, current) {
    const sheet = new Image();
    sheet.src = '/images/fortune-tea-house/hanbok-yeoni/' + action + '.webp';
    try { await sheet.decode(); } catch { return; }
    if (turn !== current) return;
    const ratio = sheet.naturalWidth / sheet.naturalHeight;
    const count = Number.isFinite(ratio) && Math.round(ratio) > 1 ? Math.round(ratio) : 6;
    const layer = document.createElement('span');
    layer.className = 'yh-human-performance';
    layer.setAttribute('aria-hidden','true');
    const cells = [0,1].map(() => {
      const cell = document.createElement('span');
      cell.style.cssText = 'position:absolute;inset:0;border-radius:inherit;background-repeat:no-repeat;opacity:0';
      cell.style.backgroundImage = 'url(' + sheet.src + ')';
      cell.style.backgroundSize = count*100 + '% 100%';
      layer.appendChild(cell);
      return cell;
    });
    art.appendChild(layer);
    activeAct = layer;
    const forward = Array.from({length:count}, (_, frame) => frame);
    const order = action === 'offer' ? forward.concat(forward.slice(0, -1).reverse()) : forward;
    const hold = action === 'offer' ? 200 : 320;
    const fades = [];
    function show(step) {
      if (turn !== current) return;
      if (step >= order.length) { timer = setTimeout(() => refresh(), 650); return; }
      const cell = cells[step % 2];
      cells[(step + 1) % 2].style.zIndex = '1';
      cell.style.zIndex = '2';
      cell.style.backgroundPosition = order[step]*100/(count-1) + '% 0%';
      fades[step % 2]?.cancel();
      fades[step % 2] = cell.animate([{opacity:step ? 0 : 1},{opacity:1}],{duration:120,easing:'ease-out',fill:'forwards'});
      timer = setTimeout(() => show(step + 1), hold);
    }
    show(0);
  }
  function refresh(reaction) {
    const current = ++turn;
    clearTimeout(timer);
    activeAct?.remove();
    activeAct = undefined;
    patch.hidden = true;
    effect.hidden = true;
    if (toggle) toggle.checked = enabled;
    const moving = visible && enabled && !document.hidden && !preference.matches && !constrained();
    petals.hidden = !moving;
    if (!moving) return;
    if (reaction?.action && art.animate) { void perform(reaction.action, current); return; }
    if (ggulggul && form === 'human') return;
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
    if (ggulggul && form === 'human') {
      const [action,line] = humanActs[nextAct];
      nextAct = (nextAct + 1) % humanActs.length;
      setHomeLabel(speech, 'home.shelf.human.' + action, line);
      refresh({action});
      return;
    }
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
  window.addEventListener('pagehide', () => { ++turn; clearTimeout(timer); activeAct?.remove(); petals.hidden = true; patch.hidden = true; });
  window.addEventListener('pageshow', refresh);
  preference.addEventListener('change', refresh);
  connection?.addEventListener('change', refresh);
  refresh();
}

if (ggulggul && !customElements.get('cd-saju-reading-film')) {
  class ReadingFilm extends HTMLElement {
    connectedCallback() {
      this.visible = false;
      this.failed = false;
      this.sync = () => {
        const enabled = this.visible && !document.hidden && !preference.matches && !constrained() && !this.failed;
        if (!enabled) { this.release(); return; }
        if (this.firstChild) return;
        const neo = this.dataset.master === 'neo';
        const film = document.createElement('video');
        film.muted = film.defaultMuted = film.playsInline = film.loop = true;
        film.setAttribute('aria-hidden','true');
        film.poster = neo ? '/images/consultation-rooms/neo.webp' : '/images/fortune-tea-house/renewal/yeoni-room-poster.webp';
        film.src = neo ? '/images/consultation-rooms/neo.mp4' : '/images/saju/yeoni-pig-analysis.mp4';
        this.append(film);
        film.onerror = () => { if (film.parentNode === this) { this.failed = true; this.release(); } };
        void film.play().catch(() => film.onerror?.());
      };
      this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; this.sync(); });
      this.observer.observe(this);
      this.style.display = 'block';
      this.style.minHeight = '1px';
      document.addEventListener('visibilitychange', this.sync);
      preference.addEventListener('change', this.sync);
      connection?.addEventListener('change', this.sync);
    }
    release() {
      const film = this.firstChild;
      if (!film) return;
      film.onerror = null;
      film.remove();
      film.pause();
      film.removeAttribute('src');
      film.load();
    }
    disconnectedCallback() {
      this.observer.disconnect();
      this.release();
      document.removeEventListener('visibilitychange', this.sync);
      preference.removeEventListener('change', this.sync);
      connection?.removeEventListener('change', this.sync);
    }
  }
  customElements.define('cd-saju-reading-film', ReadingFilm);
}
