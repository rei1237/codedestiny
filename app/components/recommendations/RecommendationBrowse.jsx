"use client";
import { useEffect, useRef, useState } from 'react';
import { PRACTICE_TOPICS, TOPIC_RULES, SYMBOL_COLORS, SYMBOL_MOTIFS } from '@/js/recommendations-context.mjs';
import { CATEGORIES, CURRENCIES, INTERESTS, normalizeContext } from '@/js/recommendations-core.mjs';
import { ROSTER_GROUPS } from '@/lib/idol-chemi/data/roster.js';
import { observeRecommendation, trackRecommendation, readRecommendationContext, recommendationReturnPath } from '@/js/recommendations-browser.mjs';
import { getApiBaseUrl } from '@/app/_lib/api-config';
import { useCopy, useCatalogue, ProductCard } from './RecommendationSurface';
import { ArrowLeft, BookOpen, ArrowDown } from 'lucide-react';
import { AFFILIATE_BRANDS, affiliateBrand } from '@/js/affiliate-presentation.mjs';
import styles from './recommendations.module.css';

export default function RecommendationBrowse({ category = '', previewProducts = null, locale = '', brand = '' }) {
  const c = useCopy(locale), preview = previewProducts !== null;
  const [context, setContext] = useState(normalizeContext({ category }));
  const [uiBrand, setUiBrand] = useState(affiliateBrand(brand));
  const [returnPath, setReturnPath] = useState(AFFILIATE_BRANDS[affiliateBrand(brand)].home);
  const host = useRef(null);
  useEffect(() => {
    const selected = affiliateBrand(brand || new URLSearchParams(location.search).get('brand'));
    setUiBrand(selected);
    if (!preview) { setContext({ ...readRecommendationContext(), service: 'recommendations', source: 'browse', category }); setReturnPath(recommendationReturnPath(AFFILIATE_BRANDS[selected].home)); }
    else setReturnPath(AFFILIATE_BRANDS[selected].home);
  }, [category, preview, brand]);
  const data = useCatalogue(context, previewProducts);
  const track = (event, product = '') => { if (!preview) trackRecommendation(event, context, 'browse', product, getApiBaseUrl()); };
  useEffect(() => data.enabled ? observeRecommendation(host.current, () => track('impression')) : undefined, [data.enabled]);
  const change = patch => { setContext(old => ({ ...old, ...patch })); track('filter'); };
  const shownProducts = preview ? data.products.filter(p => (!context.category || p.category === context.category) && !context.exclude.includes(p.id) && (!context.maxPrice || (p.price != null && p.price <= context.maxPrice)) && (!context.interests.length || context.interests.some(i => p.interests?.includes(i))) && (!context.species || p.category !== 'pets' || p.species?.includes(context.species)) && (!context.groupId || p.category !== 'fandom' || !p.groupId || p.groupId === context.groupId)) : data.products;
  const identity = AFFILIATE_BRANDS[uiBrand];
  const title = uiBrand === 'ggulggul' ? c.yeoniTitle : c.title;
  const Container = preview ? 'section' : 'main';
  return <Container className={styles.page} data-recommendation-browse data-affiliate-brand={uiBrand} data-yn-night>
    <div className={styles.masthead}><a className={styles.back} href={returnPath}><ArrowLeft size={18} aria-hidden="true"/>{c.back}</a><a href={identity.home} className={styles.brandName}>{uiBrand === 'ggulggul' ? (c.locale === 'ko' ? '꿀꿀 운세' : 'Ggulggul') : (c.locale === 'ko' ? '영냥이' : 'Yeongnyangi')}</a></div>
    <header className={styles.header}>
      <div><h1>{title}</h1><p className={styles.lead}>{uiBrand === 'ggulggul' ? c.yeoniLead : c.ynLead}</p><p>{data.enabled ? c.partnerTerms : c.pending}</p>
      {data.enabled && <a className={styles.explore} href="#affiliate-selection">{c.selection}<ArrowDown size={18} aria-hidden="true"/></a>}</div>
      <img src={identity.image} width="320" height="320" alt="" />
    </header>
    {data.enabled && <>
      <p className={styles.disclosure}>{preview || data.products.some(p => p.providerId === 'aliexpress') ? c.genericDisclosure + (data.products.some(p => !p.providerId || p.providerId === 'coupang') ? ' ' + c.disclosure : '') : c.disclosure}</p>
      {preview && <p role="status" className={styles.preview}>{c.preview}</p>}
      <nav id="affiliate-selection" className={styles.tabs} aria-label={c.all}>{['', ...CATEGORIES].map((id, i) => <button key={id} aria-pressed={context.category === id} onClick={() => change({ category: id })}>{i ? c.categories[i - 1] : c.all}</button>)}</nav>
      <div className={styles.filters}>
        <label>{c.locale === "ko" ? "지금 관심 있는 주제" : "Topic"}<select value={context.practiceTags[0] || ""} onChange={e => change({ practiceTags: e.target.value ? [e.target.value] : [] })}><option value="">{c.purpose}</option>{PRACTICE_TOPICS.map(id => <option key={id} value={id}>{c.locale === "ko" ? TOPIC_RULES[id][0] : id.replaceAll("-", " ")}</option>)}</select></label>
        <label>{c.purpose}<select value={context.interests[0] || ''} onChange={e => change({ interests: e.target.value ? [e.target.value] : [] })}><option value="">{c.all}</option>{INTERESTS.map((id, i) => <option key={id} value={id}>{c.interests[i]}</option>)}</select></label>
        <label>{c.locale === 'ko' ? '예산 상한' : 'Budget limit'}<input type="number" min="1" inputMode="numeric" value={context.maxPrice || ''} onChange={e => change({ maxPrice: e.target.value ? Number(e.target.value) : null })}/></label>
        <label>{c.locale === 'ko' ? '예산 통화' : 'Budget currency'}<select value={context.currency} onChange={e => change({ currency: e.target.value })}>{CURRENCIES.map(id => <option key={id}>{id}</option>)}</select></label>
        {context.practiceTags.includes('symbolism') && <>
          <label>{c.locale === 'ko' ? '마음에 드는 색상' : 'Color'}<select value={context.color} onChange={e => change({ color: e.target.value })}><option value="">{c.all}</option>{SYMBOL_COLORS.map((id,i) => <option key={id} value={id}>{c.locale === 'ko' ? ['빨강','주황','노랑','초록','파랑','보라','분홍','흰색','검정','금색','은색'][i] : id}</option>)}</select></label>
          <label>{c.locale === 'ko' ? '기억하고 싶은 상징' : 'Motif'}<select value={context.motif} onChange={e => change({ motif: e.target.value })}><option value="">{c.all}</option>{SYMBOL_MOTIFS.map((id,i) => <option key={id} value={id}>{c.locale === 'ko' ? ['별','달','꽃','나무','하트'][i] : id}</option>)}</select></label>
        </>}
        {(context.category === 'pets' || context.service.startsWith('pet-')) && <label>{c.species}<select value={context.species} onChange={e => change({ species: e.target.value })}><option value="">{c.species}</option><option value="cat">{c.cat}</option><option value="dog">{c.dog}</option></select></label>}
        {context.category === 'fandom' && <label>{c.categories[3]}<select value={context.groupId} onChange={e => change({ groupId: e.target.value })}><option value="">{c.generic}</option>{ROSTER_GROUPS.map(g => <option key={g.id} value={g.id}>{g.nameKo} · {g.nameEn}</option>)}</select></label>}
      </div>
      <section ref={host} aria-label={c.title} className={styles.products}>{shownProducts.length ? shownProducts.map(p => <ProductCard key={p.id} product={p} copy={c} preview={preview} onClick={() => track('click', p.id)} onExclude={() => change({ exclude: [...context.exclude, p.id] })}/>) : <p>{c.empty}</p>}</section>
      <aside className={styles.guide}><BookOpen size={28} strokeWidth={1.3} aria-hidden="true"/><div><h2>{c.criteriaTitle}</h2><p>{c.criteria}</p><p>{c.partnerTerms}</p></div></aside>
    </>}
    <a className={styles.back} href={returnPath}><ArrowLeft size={18} aria-hidden="true"/>{c.returnResult}</a>
  </Container>;
}
