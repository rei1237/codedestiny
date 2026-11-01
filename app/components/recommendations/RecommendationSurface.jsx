"use client";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CATEGORIES, RECOMMENDATIONS_RELEASED, RESULT_PRODUCT_LIMIT, normalizeContext, validateAffiliateUrl, validImageUrl } from '@/js/recommendations-core.mjs';
import { recommendationCopy } from '@/js/recommendations-copy.mjs';
import { createRecommendationSeed, ensureRecommendationFonts, observeRecommendationProducts, trackRecommendation, recommendationQuery } from '@/js/recommendations-browser.mjs';
import { detectLocale, normalizeLocale } from '@/lib/i18n/dictionary';
import { getApiBaseUrl } from '@/app/_lib/api-config';
import { BookOpen, ArrowUpRight, ShoppingBag, RotateCw } from 'lucide-react';
import { affiliateBrand, affiliateCopy, affiliatePresentation } from '@/js/affiliate-presentation.mjs';
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
export function ProductCard({ product, copy, preview = false, onClick = () => {}, onImageError = null, terms = true }) {
  const [failed, setFailed] = useState(false);
  const provider = affiliatePresentation(product.providerId);
  const merchant = provider.label || copy[provider.labelKey];
  const merchantCopy = value => product.providerId === 'aliexpress' ? value.replace(/쿠팡|Coupang|coupang/g, 'AliExpress') : value;
  const actionable = !preview && !provider.previewOnly && validateAffiliateUrl(product.affiliateUrl, product.providerId);
  const PlaceholderIcon = product.category === 'books' ? BookOpen : ShoppingBag;
  if (!preview && (failed || !validImageUrl(product.imageUrl))) return null;
  const ctaLabel = (product.linkType === 'search' ? copy.search : merchantCopy(copy.view)).replace(/\s*↗$/, '');
  return <article data-recommendation-product={product.id} className={styles.product} data-affiliate-provider={product.providerId || 'coupang'}>
    <div className={styles.image}>{validImageUrl(product.imageUrl) && !failed
      // eslint-disable-next-line @next/next/no-img-element -- 외부 제휴 이미지. 정적 export(images.unoptimized)라 next/image 이점이 없고 no-referrer·onError 대체가 필요하다
      ? <img src={product.imageUrl} alt={product.title} width="96" height="112" loading="lazy" referrerPolicy="no-referrer" onError={() => { setFailed(true); onImageError?.(product.imageUrl); }}/>
      : <span className={styles.placeholder}><PlaceholderIcon size={40} strokeWidth={1} aria-hidden="true"/><span>{preview ? copy.previewImage || copy.image : copy.categories?.[CATEGORIES.indexOf(product.category)] || copy.image}</span></span>}</div>
    <div className={styles.productText}>
      <h3 title={product.title}>{product.title}</h3>
      <p className={styles.meta} title={product.book?.author || merchant}>{product.book?.author || merchant} · {copy.ad}</p>
      {product.reason && <p className={styles.reason}>{product.reason}</p>}
      {actionable ? <a className={styles.button} href={product.affiliateUrl} target="_blank" rel="sponsored noopener" referrerPolicy="no-referrer" onClick={onClick}>{ctaLabel}<ArrowUpRight size={16} aria-hidden="true"/></a> : <button className={styles.button} disabled>{copy.pendingLink || copy.preview}</button>}
      {terms && <small className={styles.merchantTerms}>{copy.partnerTerms}</small>}
    </div>
  </article>;
}
export function useCatalogue(context, previewProducts) {
  const [state, setState] = useState({ enabled: false, products: [] });
  const query = recommendationQuery(context);
  const identity = new URLSearchParams(query); identity.delete('seed');
  const contextKey = identity.toString();
  useEffect(() => {
    if (previewProducts) return;
    if (!RECOMMENDATIONS_RELEASED) return;
    const controller = new AbortController();
    const load = () => {
      void fetch(getApiBaseUrl() + '/api/recommendations?' + query, { credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: controller.signal })
        .then(r => r.ok ? r.json() : null).then(data => { if (!controller.signal.aborted) setState({ ...(data?.enabled && Array.isArray(data.products) ? data : { enabled: false, products: [] }), query, contextKey }); }).catch(() => { if (!controller.signal.aborted) setState({ enabled: false, products: [], query, contextKey }); });
    };
    load();
    // Dedicated ad settings refresh only; never calls billing, auth or generation.
    const timer = setInterval(load, 60000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [query, contextKey, previewProducts]);
  // A new species/group/filter must never display the previous response while loading.
  return previewProducts ? { enabled: true, products: previewProducts } : state.contextKey === contextKey ? state : { enabled: false, products: [] };
}
export function RecommendationResult({ service, species = '', groupId = '', locale = '', brand = 'yeoni', completed = true, practiceTags = /** @type {string[]} */ ([]), source = 'result', color = '', motif = '', previewProducts = null }) {
  const c = useCopy(locale);
  const [selectionSeed, setSelectionSeed] = useState(createRecommendationSeed);
  const context = normalizeContext({ service, species, groupId, practiceTags, source, color, motif, selectionSeed });
  const data = useCatalogue(context, previewProducts);
  const preview = previewProducts !== null;
  const host = useRef(null);
  const [top, setTop] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [failedImages, setFailedImages] = useState([]);
  const products = data.products.filter(p => (preview || validImageUrl(p.imageUrl)) && !failedImages.includes(p.imageUrl)).slice(0, RESULT_PRODUCT_LIMIT);
  const placement = source === 'footer' ? 'footer' : 'result';
  const shown = source !== 'article' && completed && !dismissed && data.enabled && products.length > 0;
  useEffect(() => { if (shown) ensureRecommendationFonts(); }, [shown]);
  useEffect(() => {
    if (!shown || source === 'footer' || !host.current) return;
    const parent = host.current.parentElement;
    if (!parent || parent.querySelector(':scope > [data-recommendation-disclosure]')) return;
    const disclosure = document.createElement('div');
    disclosure.dataset.recommendationDisclosure = 'true';
    parent.prepend(disclosure); setTop(disclosure);
    return () => { disclosure.remove(); setTop(null); };
  }, [shown, source]);
  // 노출 이벤트는 service만 싣는다. context는 렌더마다 새 객체라 의존성에 넣으면 구독이 매번 새로 생겨 노출이 중복 집계된다.
  const trackedService = context.service;
  const impressions = useRef({ service: trackedService, seen: new Set() });
  const productKey = products.map(p => p.id).join('|');
  useEffect(() => {
    if (!shown || preview) return;
    if (impressions.current.service !== trackedService) impressions.current = { service: trackedService, seen: new Set() };
    return observeRecommendationProducts(host.current, impressions.current.seen, id => trackRecommendation('impression', { service: trackedService }, placement, id, getApiBaseUrl()));
  }, [shown, trackedService, preview, productKey, placement]);
  if (!shown) return null;
  const uiBrand = affiliateBrand(brand);
  const title = c.inlineTitle;
  return <section ref={host} className={`${styles.surface} ${source === 'footer' ? styles.footer : ''}`} data-brand={brand} data-affiliate-brand={uiBrand} data-yn-night aria-label={title} data-recommendation-block data-recommendation-placement={placement}>
    {top && createPortal(<p className={styles.disclosure} data-affiliate-brand={uiBrand} data-brand={brand} data-yn-night>{preview || products.some(p => p.providerId === 'aliexpress') ? c.genericDisclosure + (products.some(p => !p.providerId || p.providerId === 'coupang') ? ' ' + c.disclosure : '') : c.disclosure}</p>, top)}
    <div className={styles.heading}><div><h2>{title}</h2><p className={styles.resultLead}>{context.practiceTags.length > 0 ? c.resultLead : c.inlineIntro}</p></div><button type="button" className={styles.shuffle} onClick={() => { setSelectionSeed(createRecommendationSeed()); if (!preview) trackRecommendation('more', context, placement, '', getApiBaseUrl()); }}><RotateCw size={16} aria-hidden="true"/>{c.shuffle}</button></div>
    <p className={styles.disclosure}>{preview || products.some(p => p.providerId === 'aliexpress') ? c.genericDisclosure + (products.some(p => !p.providerId || p.providerId === 'coupang') ? ' ' + c.disclosure : '') : c.disclosure}</p>
    <div className={styles.products}>{products.map(p => <ProductCard key={`${p.id}:${p.imageUrl}`} product={p} copy={c} preview={preview} terms={false} onImageError={url => setFailedImages(old => [...old, url])} onClick={() => { if (!preview) trackRecommendation('click', context, placement, p.id, getApiBaseUrl()); }}/>)}</div>
    <div className={styles.actions}><p className={styles.merchantTerms}>{c.inlineNote}<br/>{c.partnerTerms}</p><button type="button" onClick={() => { setDismissed(true); if (!preview) trackRecommendation('dismiss', context, placement, '', getApiBaseUrl()); }}>{c.dismiss}</button></div>
  </section>;
}
