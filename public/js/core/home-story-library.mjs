import { setHomeLabel } from './home-label.mjs';
export function mountStoryLibrary(library) {
  if (!library) return;
  const view = library.ownerDocument.defaultView;
  const storyDoor = library.closest(".yh-story-entry");
  function revealShelf() {
    const target = library.ownerDocument.getElementById(view.location.hash.slice(1));
    if (storyDoor && target && library.contains(target) && !storyDoor.open) { storyDoor.open = true; target.scrollIntoView(); }
  }
  // Restore this shelf when a reader returns through browser history.
  if (storyDoor) {
    try {
      if (view.history.state?.moonStoryOpen || (view.performance.getEntriesByType("navigation")[0]?.type === "back_forward" && view.sessionStorage.getItem("cd:story:return"))) storyDoor.open = true;
      view.sessionStorage.removeItem("cd:story:return");
    } catch {}
    storyDoor.addEventListener("toggle", () => {
      try { view.history.replaceState({...view.history.state, moonStoryOpen:storyDoor.open}, ""); } catch {}
    });
    library.addEventListener("click", e => {
      if (e.target.closest("a[href]")) { try { view.sessionStorage.setItem("cd:story:return", "1"); } catch {} }
    });
  }
  revealShelf();
  view.addEventListener("hashchange", revealShelf);
  const latest = library.querySelector('[data-serial-latest]');
  const resume = library.querySelector('[data-serial-resume]');
  const prologue = { no:1, slug:'ep1', href:'/yeongnyangi/season-1/prologue/', pages:Number(library.dataset.prologuePages) };
  let episodes = [prologue];
  function update() {
    resume.hidden = true;
    let recent = '';
    try {
      recent = view.localStorage.getItem('cd:webtoon:last-read') || '';
      const saved = episodes.map(episode => {
        const key = 'cd:webtoon:yeoni-s1-'+episode.slug+':page';
        return {episode, key, page:Number(view.localStorage.getItem(key))};
      }).filter(({page,episode}) => Number.isInteger(page) && page >= 2 && page < episode.pages);
      const current = saved.find(item => item.key === recent) || saved.at(-1);
      if (current) {
        resume.href = current.episode.href;
        setHomeLabel(resume, 'home.shelf.continueEpisode', '{episode}화 {page}쪽 이어보기', {episode: current.episode.no, page: current.page});
        resume.hidden = false;
      }
    } catch {}
  }
  let fetching = false;
  let ready = false;
  async function load() {
    update();
    if (fetching || ready) return;
    fetching = true;
    try {
      const response = await view.fetch('/assets/yeongnyangi/season-1/published.json');
      if (!response.ok) throw Error('Unavailable');
      const rows = await response.json();
      episodes = [prologue, ...rows];
      const last = episodes.at(-1);
      latest.href = last.href;
      setHomeLabel(latest, 'home.shelf.latestEpisode', '최신 {episode}화 보기', {episode: last.no});
      ready = true;
      update();
    } catch { setHomeLabel(latest, 'home.shelf.latestIndex', '최신화 · 시즌 목차'); }
    finally { fetching = false; }
  }
  const observer = new view.IntersectionObserver(([entry]) => { if (entry.isIntersecting) load(); });
  observer.observe(library);
  view.addEventListener('pageshow', update);
}

if (typeof document !== 'undefined') mountStoryLibrary(document.querySelector('.yh-library'));
