// Each home uses the same self-contained dialogue. The first line works without JS.
class PassDuet extends HTMLElement {
  connectedCallback() {
    if (this.events) return;
    this.events = new AbortController();
    const options = { signal: this.events.signal };
    this.lines = [...this.querySelectorAll('.pb__line')];
    if (!this.lines.length) return;
    this.index = 0;
    this.motion = matchMedia('(prefers-reduced-motion: reduce)');
    this.paused = this.motion.matches;
    this.visible = false;
    this.querySelector('[data-prev]').addEventListener('click', () => this.move(-1, true), options);
    this.querySelector('[data-next]').addEventListener('click', () => this.move(1, true), options);
    this.querySelector('[data-play]').addEventListener('click', () => {
      this.paused = !this.paused;
      this.refresh();
    }, options);
    this.motion.addEventListener('change', () => {
      if (this.motion.matches) this.paused = true;
      this.refresh();
    }, options);
    document.addEventListener('visibilitychange', () => this.refresh(), options);
    this.observer = new IntersectionObserver(([entry]) => {
      this.visible = entry.isIntersecting;
      this.refresh();
    });
    this.observer.observe(this);
    this.querySelector('.pb__controls').hidden = false;
    this.refresh();
  }

  disconnectedCallback() {
    this.events?.abort();
    this.events = null;
    this.observer?.disconnect();
    clearTimeout(this.timer);
  }

  move(step, manual) {
    if (manual) this.paused = true;
    this.lines[this.index].setAttribute('aria-hidden', 'true');
    this.index = (this.index + step + this.lines.length) % this.lines.length;
    this.querySelector('.pb__banner').setAttribute('aria-live', manual ? 'polite' : 'off');
    this.lines[this.index].setAttribute('aria-hidden', 'false');
    this.refresh();
  }

  refresh() {
    clearTimeout(this.timer);
    this.querySelector('[data-position]').textContent = (this.index + 1) + ' / ' + this.lines.length;
    this.querySelector('[data-play]').textContent = this.paused ? '자동 재생' : '일시 정지';
    if (this.visible && !this.paused && !document.hidden) {
      this.timer = setTimeout(() => this.move(1, false), 6500);
    }
  }
}
if (!customElements.get('cd-pass-duet')) customElements.define('cd-pass-duet', PassDuet);
