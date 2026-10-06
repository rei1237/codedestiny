"use client";
import { useEffect, useRef, useState } from 'react';
import { CATEGORIES, INTERESTS, normalizeContext } from '@/js/recommendations-core.mjs';
import { ROSTER_GROUPS } from '@/lib/idol-chemi/data/roster.js';
import { observeRecommendation, trackRecommendation, readRecommendationContext, recommendationReturnPath } from '@/js/recommendations-browser.mjs';
import { getApiBaseUrl } from '@/app/_lib/api-config';
import { useCopy, useCatalogue, ProductCard } from './RecommendationSurface';
import styles from './recommendations.module.css';

export default function RecommendationBrowse({ category = '', previewProducts = null, locale = '' }) {
  const c = useCopy(locale), preview = previewProducts !== null;
  const [context, setContext] = useState(normalizeContext({ category }));
  const [returnPath, setReturnPath] = useState('/ggulggul/');
  const host = useRef(null);
  useEffect(() => { if (!preview) { setContext({ ...readRecommendationContext(), category }); setReturnPath(recommendationReturnPath()); } }, [category, preview]);
  const data = useCatalogue(context, previewProducts);
  const track = (event, product = '') => { if (!preview) trackRecommendation(event, context, 'browse', product, getApiBaseUrl()); };
  useEffect(() => data.enabled ? observeRecommendation(host.current, () => track('impression')) : undefined, [data.enabled]);
  const change = patch => { setContext(old => ({ ...old, ...patch })); track('filter'); };
  const shownProducts = preview ? data.products.filter(p => (!context.category || p.category === context.category) && !context.exclude.includes(p.id)) : data.products;
  return <main className={styles.page} data-recommendation-browse>
    <a className={styles.back} href={returnPath}>{c.back}</a>
    <header className={styles.header}><div><h1>{c.title}</h1><p>{data.enabled ? c.intro : c.pending}</p></div><img src="/assets/yeongnyangi/original/hero-800.webp" width="180" height="180" alt="" /></header>
    {data.enabled && <>
      <p className={styles.disclosure}>{c.disclosure}</p>
      {preview && <p role="status" className={styles.preview}>{c.preview}</p>}
      <nav className={styles.tabs} aria-label={c.all}>{['', ...CATEGORIES].map((id, i) => <button key={id} aria-pressed={context.category === id} onClick={() => change({ category: id })}>{i ? c.categories[i - 1] : c.all}</button>)}</nav>
      <div className={styles.filters}>
        <label>{c.purpose}<select value={context.interests[0] || ''} onChange={e => change({ interests: e.target.value ? [e.target.value] : [] })}><option value="">{c.all}</option>{INTERESTS.map((id, i) => <option key={id} value={id}>{c.interests[i]}</option>)}</select></label>
        <label>{c.budget}<input type="number" min="1" inputMode="numeric" value={context.maxPrice || ''} onChange={e => change({ maxPrice: e.target.value ? Number(e.target.value) : null })}/></label>
        {(context.category === 'pets' || context.service.startsWith('pet-')) && <label>{c.species}<select value={context.species} onChange={e => change({ species: e.target.value })}><option value="">{c.species}</option><option value="cat">{c.cat}</option><option value="dog">{c.dog}</option></select></label>}
        {context.category === 'fandom' && <label>{c.categories[3]}<select value={context.groupId} onChange={e => change({ groupId: e.target.value })}><option value="">{c.generic}</option>{ROSTER_GROUPS.map(g => <option key={g.id} value={g.id}>{g.nameKo} · {g.nameEn}</option>)}</select></label>}
      </div>
      <section ref={host} aria-label={c.title} className={styles.products}>{shownProducts.length ? shownProducts.map(p => <ProductCard key={p.id} product={p} copy={c} preview={preview} onClick={() => track('click', p.id)} onExclude={() => change({ exclude: [...context.exclude, p.id] })}/>) : <p>{c.empty}</p>}</section>
      <p className={styles.guide}>{c.criteria}</p>
    </>}
    <a className={styles.back} href={returnPath}>{c.returnResult}</a>
  </main>;
}
