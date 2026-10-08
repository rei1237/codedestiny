"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RECOMMENDATIONS_RELEASED, normalizeContext, validateAffiliateUrl, validImageUrl } from '@/js/recommendations-core.mjs';
import { recommendationCopy } from '@/js/recommendations-copy.mjs';
import { observeRecommendation, trackRecommendation, rememberRecommendationContext, recommendationQuery } from '@/js/recommendations-browser.mjs';
import { detectLocale, normalizeLocale } from '@/lib/i18n/dictionary';
import { getApiBaseUrl } from '@/app/_lib/api-config';
import { BookOpen, ArrowUpRight, ShoppingBag } from 'lucide-react';
import { affiliateBrand, affiliateBrowsePath, affiliateCopy, affiliatePresentation } from '@/js/affiliate-presentation.mjs';
import { bookPerspectiveLabel } from '@/js/recommendations-context.mjs';
import './affiliate-tokens.css';
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
  return { ...recommendationCopy(lang), ...affiliateCopy(lang), locale: lang };
}
export function ProductCard({ product, copy, preview = false, onClick = () => {}, onExclude = null }) {
  const [failed, setFailed] = useState(false);
  const provider = affiliatePresentation(product.providerId);
  const merchant = provider.label || copy[provider.labelKey];
  const merchantCopy = value => product.providerId === 'aliexpress' ? value.replace(/쿠팡|Coupang|coupang/g, 'AliExpress') : value;
  const actionable = !preview && !provider.previewOnly && validateAffiliateUrl(product.affiliateUrl, product.providerId);
  const PlaceholderIcon = product.category === 'books' ? BookOpen : ShoppingBag;
  return <article className={styles.product} data-affiliate-provider={product.providerId || 'coupang'}>
    <div className={styles.image}>{validImageUrl(product.imageUrl) && !failed
      ? <img src={product.imageUrl} alt={product.title} width="320" height="240" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)}/>
      : <span className={styles.placeholder}><PlaceholderIcon size={40} strokeWidth={1} aria-hidden="true"/><span>{preview ? copy.previewImage || copy.image : copy.image}</span></span>}</div>
    <div className={styles.productText}>
      <span className={styles.label}>{merchant || 'Coupang'} · {copy.ad}</span>
      <h3>{product.title}</h3>
      {product.book?.author && <p>{[product.book.author, product.book.publisher, product.book.edition, product.book.language, product.book.format].filter(Boolean).join(" · ")}</p>}
      {product.book?.perspective && <p>{bookPerspectiveLabel(product.book.perspective, copy.locale)}</p>}
      {product.genericCollection && <p>{copy.generic}</p>}
      {product.attributes?.length > 0 && <ul>{product.attributes.map(a => <li key={a}>{a}</li>)}</ul>}
      <p>{product.reason}</p>
      <p className={styles.price}>{product.price == null ? (provider.previewOnly ? copy.pendingLink : merchantCopy(copy.price)) : <>{new Intl.NumberFormat(undefined, { style: 'currency', currency: product.currency || 'KRW' }).format(product.price)} <small>{product.priceVerifiedAt && new Date(product.priceVerifiedAt).toLocaleString()}</small></>}</p>
      {actionable ? <a className={styles.button} href={product.affiliateUrl} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer" onClick={onClick}>{product.linkType === 'search' ? copy.search : merchantCopy(copy.view)}<ArrowUpRight size={16} aria-hidden="true"/></a> : <button className={styles.button} disabled>{copy.pendingLink || copy.preview}</button>}
      <small className={styles.merchantTerms}>{copy.partnerTerms}</small>
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
export function RecommendationResult({ service, species = '', groupId = '', locale = '', brand = 'yeoni', completed = true, practiceTags = /** @type {string[]} */ ([]), source = 'result', color = '', motif = '', previewProducts = null }) {
  const c = useCopy(locale);
  const context = normalizeContext({ service, species, groupId, practiceTags, source, color, motif });
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
  const uiBrand = affiliateBrand(brand);
  const title = uiBrand === 'ggulggul' ? c.yeoniTitle : c.locale === 'ko' ? '영냥이가 고른 오늘의 취향' : c.title;
  return <section ref={host} className={styles.surface} data-brand={brand} data-affiliate-brand={uiBrand} data-yn-night aria-label={title} data-recommendation-block>
    {top && createPortal(<p className={styles.disclosure} data-affiliate-brand={uiBrand} data-yn-night>{preview || data.products.some(p => p.providerId === 'aliexpress') ? c.genericDisclosure + (data.products.some(p => !p.providerId || p.providerId === 'coupang') ? ' ' + c.disclosure : '') : c.disclosure}</p>, top)}
    <h2>{title}</h2><p className={styles.disclosure}>{preview || data.products.some(p => p.providerId === 'aliexpress') ? c.genericDisclosure + (data.products.some(p => !p.providerId || p.providerId === 'coupang') ? ' ' + c.disclosure : '') : c.disclosure}</p>
    <div className={styles.products}>{data.products.slice(0, 3).map(p => <ProductCard key={p.id} product={p} copy={c} preview={preview} onClick={() => { if (!preview) trackRecommendation('click', context, 'result', p.id, getApiBaseUrl()); }}/>)}</div>
    <div className={styles.actions}>{!preview && <a href={affiliateBrowsePath(brand)} onClick={() => { rememberRecommendationContext(context); trackRecommendation('more', context, 'result', '', getApiBaseUrl()); }}>{c.more}</a>}<button onClick={() => { setDismissed(true); if (!preview) trackRecommendation('dismiss', context, 'result', '', getApiBaseUrl()); }}>{c.dismiss}</button></div>
  </section>;
}
