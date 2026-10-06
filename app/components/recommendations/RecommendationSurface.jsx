"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RECOMMENDATIONS_RELEASED, normalizeContext, validateAffiliateUrl, validImageUrl } from '@/js/recommendations-core.mjs';
import { recommendationCopy } from '@/js/recommendations-copy.mjs';
import { observeRecommendation, trackRecommendation, rememberRecommendationContext, recommendationQuery } from '@/js/recommendations-browser.mjs';
import { detectLocale, normalizeLocale } from '@/lib/i18n/dictionary';
import { getApiBaseUrl } from '@/app/_lib/api-config';
import styles from './recommendations.module.css';

export function useCopy(locale) {
  const [lang, setLang] = useState(locale || 'ko');
  useEffect(() => {
    const update = () => setLang(normalizeLocale(locale || detectLocale()));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    window.addEventListener('storage', update);
    return () => { observer.disconnect(); window.removeEventListener('storage', update); };
  }, [locale]);
  return { ...recommendationCopy(lang), locale: lang };
}
export function ProductCard({ product, copy, preview = false, onClick = () => {}, onExclude = null }) {
  const [failed, setFailed] = useState(false);
  const actionable = !preview && validateAffiliateUrl(product.affiliateUrl);
  return <article className={styles.product}>
    <div className={styles.image}>{validImageUrl(product.imageUrl) && !failed
      ? <img src={product.imageUrl} alt={product.title} width="320" height="240" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
      : <span>{copy.image}</span>}</div>
    <div className={styles.productText}>
      <span className={styles.label}>{preview ? copy.preview : copy.ad}</span>
      <h3>{product.title}</h3>
      {product.genericCollection && <p>{copy.generic}</p>}
      {product.attributes?.length > 0 && <ul>{product.attributes.map(a => <li key={a}>{a}</li>)}</ul>}
      <p>{product.reason}</p>
      <p className={styles.price}>{product.price == null ? copy.price : <>{new Intl.NumberFormat(undefined, { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(product.price)} <small>{product.priceVerifiedAt && new Date(product.priceVerifiedAt).toLocaleString()}</small></>}</p>
      {actionable ? <a className={styles.button} href={product.affiliateUrl} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer" onClick={onClick}>{product.linkType === 'search' ? copy.search : copy.view}</a> : <button className={styles.button} disabled>{preview ? copy.preview : copy.price}</button>}
      {onExclude && <button className={styles.exclude} onClick={onExclude}>{copy.exclude}</button>}
    </div>
  </article>;
}
export function useCatalogue(context, previewProducts) {
  const [state, setState] = useState({ enabled: false, products: [] });
  const query = recommendationQuery(context);
  useEffect(() => {
    if (previewProducts) return;
    if (!RECOMMENDATIONS_RELEASED) return;
    const controller = new AbortController();
    const load = () => {
      void fetch(getApiBaseUrl() + '/api/recommendations?' + query, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: controller.signal })
        .then(r => r.ok ? r.json() : null).then(data => { if (!controller.signal.aborted) setState({ ...(data?.enabled && Array.isArray(data.products) ? data : { enabled: false, products: [] }), query }); }).catch(() => { if (!controller.signal.aborted) setState({ enabled: false, products: [], query }); });
    };
    load();
    // Dedicated ad settings refresh only; never calls billing, auth or generation.
    const timer = setInterval(load, 60000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [query, previewProducts]);
  // A new species/group/filter must never display the previous response while loading.
  return previewProducts ? { enabled: true, products: previewProducts } : state.query === query ? state : { enabled: false, products: [] };
}
export function RecommendationResult({ service, species = '', groupId = '', locale = '', brand = 'yeoni', completed = true, previewProducts = null }) {
  const c = useCopy(locale);
  const context = normalizeContext({ service, species, groupId });
  const data = useCatalogue(context, previewProducts);
  const preview = previewProducts !== null;
  const host = useRef(null);
  const [top, setTop] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const shown = completed && !dismissed && data.enabled && data.products.length > 0;
  useEffect(() => {
    if (!shown || !host.current) return;
    const parent = host.current.parentElement;
    if (!parent || parent.querySelector(':scope > [data-recommendation-disclosure]')) return;
    const disclosure = document.createElement('div');
    disclosure.dataset.recommendationDisclosure = 'true';
    parent.prepend(disclosure); setTop(disclosure);
    return () => { disclosure.remove(); setTop(null); };
  }, [shown]);
  useEffect(() => shown && !preview ? observeRecommendation(host.current, () => trackRecommendation('impression', context, 'result', '', getApiBaseUrl())) : undefined, [shown, service, preview]);
  if (!shown) return null;
  const title = c.locale === 'ko' ? brand === 'yeongnyangi' ? '영냥이가 고른 오늘의 취향' : brand === 'yeoni' ? '연이의 작은 추천 서가' : c.title : c.title;
  return <section ref={host} className={styles.surface} data-brand={brand} aria-label={c.title} data-recommendation-block>
    {top && createPortal(<p className={styles.disclosure}>{c.disclosure}</p>, top)}
    <h2>{title}</h2><p className={styles.disclosure}>{c.ad} · {c.disclosure}</p>
    <div className={styles.products}>{data.products.slice(0, 3).map(p => <ProductCard key={p.id} product={p} copy={c} preview={preview} onClick={() => { if (!preview) trackRecommendation('click', context, 'result', p.id, getApiBaseUrl()); }}/>)}</div>
    <div className={styles.actions}>{!preview && <a href="/recommendations/" onClick={() => { rememberRecommendationContext(context); trackRecommendation('more', context, 'result', '', getApiBaseUrl()); }}>{c.more}</a>}<button onClick={() => { setDismissed(true); if (!preview) trackRecommendation('dismiss', context, 'result', '', getApiBaseUrl()); }}>{c.dismiss}</button></div>
  </section>;
}
