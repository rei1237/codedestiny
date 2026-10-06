'use client';
import { useCallback, useEffect, useState } from 'react';
import { adminFetch } from '../_lib/admin-api';
import { adminButton, ADMIN_INPUT } from '../_components/ui';
import RecommendationBrowse from '@/app/components/recommendations/RecommendationBrowse';
import { ProductCard, RecommendationResult } from '@/app/components/recommendations/RecommendationSurface';
import { affiliateCopy } from '@/js/affiliate-presentation.mjs';
import { recommendationCopy } from '@/js/recommendations-copy.mjs';
import { CATEGORIES, PRODUCT_KINDS, INTERESTS, SERVICE_MAP, PARTNER_ACCOUNT, DEFAULT_SETTINGS } from '@/js/recommendations-core.mjs';
import styles from './page.module.css';

const empty = () => ({ id: '', category: 'books', title: '', reason: '', serviceTags: [], topicTags: [], interests: [], species: [], groupId: '', affiliateUrl: '', linkSource: 'portal', linkType: 'product', imageUrl: '', imageSource: '', evidence: '', attributes: [], stock: 'unknown', price: null, priceVerifiedAt: null, featured: false, order: 100 });
const samples = [
  { id: 'preview-book', category: 'books', interests: ['reading','journaling','planning'], title: '도서·기록 상품 자리', reason: '책의 주제와 독자 수준을 확인한 뒤 선택 기준을 작성하는 자리예요.', attributes: ['구성 확인용 예시'], price: null, affiliateUrl: '', imageUrl: '' },
  { id: 'preview-daily', category: 'daily-life', interests: ['hydration','rest','meal-prep'], title: '일상 생활용품 자리', reason: '직접 선택한 생활 관심사와 실제 용도를 연결하는 자리예요.', attributes: ['구매할 수 없는 미리보기'], price: null, affiliateUrl: '', imageUrl: '' },
  { id: 'preview-pet', category: 'pets', interests: ['play','grooming'], species: ['cat','dog'], title: '반려생활 상품 자리', reason: '종과 사용 대상을 확인한 상품만 소개하는 자리예요.', attributes: ['실제 판매 상품 아님'], price: null, affiliateUrl: '', imageUrl: '' },
];
const localDateTime = value => { if (!value) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); };
const split = s => s.split(',').map(x => x.trim()).filter(Boolean);
const statusNames = { draft: '초안', active: '상품 검수 완료', paused: '중지' };
export default function RecommendationsAdmin() {
  const [products, setProducts] = useState([]), [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [draft, setDraft] = useState(empty), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [preview, setPreview] = useState(null), [showDemo, setShowDemo] = useState(false);
  const [metrics, setMetrics] = useState(null), [checks, setChecks] = useState({ account: false, facts: false, image: false, allowedCategory: false });
  const [previewBrand, setPreviewBrand] = useState('yeongnyangi');
  const [previewPartner, setPreviewPartner] = useState('coupang');
  const demoProducts = samples.map((p, i) => ({ ...p, providerId: previewPartner === 'mixed' ? i === 0 ? 'book-partner-preview' : i === 1 ? 'lifestyle-partner-preview' : 'coupang' : 'coupang' }));
  const [metricService, setMetricService] = useState('');
  const [selection, setSelection] = useState({ service: 'legacy-saju', species: '', groupId: '', interests: [] });
  const [selectionProducts, setSelectionProducts] = useState(null);
  const [report, setReport] = useState({ from: '', to: '', clicks: '', orders: '', cancellations: '', commissionKRW: '', evidence: '' });
  const copy = { ...recommendationCopy('ko'), ...affiliateCopy('ko') };
  const load = useCallback(async () => {
    try {
      const [data, stats] = await Promise.all([adminFetch('/api/admin/recommendations/'), adminFetch('/api/admin/recommendations/metrics')]);
      setProducts(data.products); setSettings(data.settings); setMetrics(stats);
    } catch (e) { setError(e.message || '불러오지 못했습니다. 다시 시도해 주세요.'); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const action = async (name, body) => {
    setBusy(true); setError(''); setNotice('');
    try {
      const data = await adminFetch('/api/admin/recommendations/' + name, { method: 'POST', body });
      if (name === 'preview') setPreview(data);
      else if (name === 'selection-preview') setSelectionProducts(data.products);
      else { await load(); setChecks({ account: false, facts: false, image: false, allowedCategory: false }); setNotice('저장했습니다. 승인 전 공개 차단은 유지됩니다.'); }
    } catch (e) { setError(e.message || '저장하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  };
  const field = (key, value) => setDraft(d => ({ ...d, [key]: value }));
  const listField = (key, label, options, labels = options) => <fieldset><legend>{label}</legend><div className={styles.checks}>{options.map((v, i) => <label key={v}><input type="checkbox" checked={draft[key].includes(v)} onChange={e => field(key, e.target.checked ? [...draft[key], v] : draft[key].filter(x => x !== v))}/>{labels[i]}</label>)}</div></fieldset>;
  const sums = Object.fromEntries(['impression', 'click', 'more', 'filter', 'dismiss'].map(event => [event, (metrics?.metrics || []).filter(m => m.event === event && (!metricService || m.service === metricService)).reduce((sum, m) => sum + m.count, 0)]));
  return <main className={styles.admin}>
    <h1>생활 추천 관리</h1>
    <p>쿠팡 파트너스 <strong>{PARTNER_ACCOUNT}</strong> · 승인 전 기반 · <strong>운영 광고 OFF</strong></p>
    <p>계정 ID는 제휴 링크가 아닙니다. 공식 발급 링크와 상품 자료를 검수한 뒤 별도 공개 절차를 진행합니다.</p>
    <p role="alert">{error}</p><p role="status">{notice}</p>
    <div className={styles.toolbar}><button className={adminButton()} onClick={() => void load()} disabled={busy}>다시 불러오기</button><button className={adminButton()} onClick={() => setShowDemo(!showDemo)}>구성 미리보기 {showDemo ? '닫기' : '열기'}</button></div>
    {showDemo && <><div className={styles.form} data-affiliate-preview-controls><label>미리보기 브랜드<select className={ADMIN_INPUT} value={previewBrand} onChange={e => setPreviewBrand(e.target.value)}><option value="yeongnyangi">영냥이 · 달빛 취향</option><option value="ggulggul">꿀꿀 운세 · 연이의 추천 서가</option></select></label><label>미리보기 제휴 구성<select className={ADMIN_INPUT} value={previewPartner} onChange={e => setPreviewPartner(e.target.value)}><option value="coupang">쿠팡 파트너스</option><option value="mixed">여러 제휴사 · 준비용 예시</option></select></label></div><p>다른 제휴사 카드는 화면 구성 예시입니다. 계약·공식 링크·고지 검수가 끝나기 전에는 등록·외부 이동을 제공하지 않습니다.</p><RecommendationBrowse previewProducts={demoProducts} locale="ko" brand={previewBrand}/><section><h2>결과 화면 배치 미리보기</h2><p>실제 상담 원문을 넣지 않는 검수용 결과 영역입니다.</p><button disabled className={adminButton()}>저장·공유 영역</button><RecommendationResult service="legacy-saju" previewProducts={demoProducts} locale="ko" brand={previewBrand === 'ggulggul' ? 'yeoni' : previewBrand}/></section></>}
    <section className={styles.section}><h2>공개 상태</h2>
      <p>운영 상품 {products.filter(p => p.status === 'active').length}건 검수 · 초안 {products.filter(p => p.status === 'draft').length}건 · 공개 0건</p>
      <div className={styles.checks}><label><input type="checkbox" checked={settings.approved} onChange={e => setSettings(s => ({ ...s, approved: e.target.checked }))}/>계정 승인 확인 기록</label><label><input type="checkbox" checked={settings.mediaRegistered} onChange={e => setSettings(s => ({ ...s, mediaRegistered: e.target.checked }))}/>활동 매체 등록 확인 기록</label></div>
      <label>서비스별 중지 (쉼표로 구분한 서비스 키)<textarea className={ADMIN_INPUT} value={settings.disabledServices.join(', ')} onChange={e => setSettings(s => ({ ...s, disabledServices: split(e.target.value) }))}/></label>
      <button className={adminButton('warn')} disabled={busy} onClick={() => void action('settings', { ...settings, enabled: false })}>전체 OFF 및 서비스별 중지 저장</button>
      <details><summary>연결 가능한 서비스 키</summary><p>{Object.keys(SERVICE_MAP).join(', ')}</p><p>영냥이 상품 키와 운명의 찻집 세부 상담 키도 지원합니다.</p></details>
    </section>
    <section className={styles.section}><h2>상품 목록</h2>
      {!products.length && <p>등록된 실제 상품이 없습니다. 임의 상품이나 링크는 자동으로 추가되지 않습니다.</p>}
      <ul className={styles.items}>{products.map(p => <li key={p.id}><div><strong>{p.title}</strong><p>{p.id} · {statusNames[p.status]} · URL 형식 {p.urlFormatValid ? '통과' : '미확인'} · 계정 귀속 {p.accountVerified ? '관리자 검수' : '미확인'}</p><p>검수 {p.verifiedAt || '미확인'} / 만료 {p.expiresAt || '미확인'}</p></div><button className={adminButton()} onClick={() => { setDraft({ ...empty(), ...p }); setPreview(null); setChecks({ account: false, facts: false, image: false, allowedCategory: false }); }}>편집</button><button disabled={busy} className={adminButton('warn')} onClick={() => void action('pause', { id: p.id })}>중지</button></li>)}</ul>
    </section>
    <section className={styles.section}><h2>상품 등록·편집</h2><p>저장하면 초안이 됩니다. 가격을 모르면 비워 두세요. 설명에는 직접 확인한 사실과 자체 선택 기준만 적어 주세요.</p>
      <form onSubmit={e => { e.preventDefault(); void action('product', draft); }} className={styles.form}>
        <label>상품 ID<input required pattern="[a-z0-9][a-z0-9_-]{1,79}" value={draft.id} onChange={e => field('id', e.target.value)} className={ADMIN_INPUT}/></label>
        <label>분야<select value={draft.category} onChange={e => field('category', e.target.value)} className={ADMIN_INPUT}>{CATEGORIES.map((v, i) => <option key={v} value={v}>{copy.categories[i]}</option>)}</select></label>
        <label>상품 종류<select value={draft.kind || ''} onChange={e => field('kind', e.target.value)} className={ADMIN_INPUT}><option value="">종류 선택</option>{PRODUCT_KINDS[draft.category].map(k => <option key={k}>{k}</option>)}</select></label>
        <label>확인된 상품명<input required maxLength={180} value={draft.title} onChange={e => field('title', e.target.value)} className={ADMIN_INPUT}/></label>
        <label>추천 이유 한 문장<textarea maxLength={240} value={draft.reason} onChange={e => field('reason', e.target.value)} className={ADMIN_INPUT}/></label>
        <label>공식 제휴 URL<input value={draft.affiliateUrl} onChange={e => field('affiliateUrl', e.target.value)} className={ADMIN_INPUT}/></label>
        <label>발급 출처<select value={draft.linkSource} onChange={e => field('linkSource', e.target.value)} className={ADMIN_INPUT}><option value="portal">파트너스 포털 상품 링크</option><option value="quick-link">공식 간편 링크</option><option value="official-api">권한 확인된 공식 API</option></select></label>
        <label>연결 대상<select value={draft.linkType} onChange={e => field('linkType', e.target.value)} className={ADMIN_INPUT}><option value="product">상품 상세</option><option value="search">검색·카테고리 결과</option></select></label>
        <label>이미지 주소<input value={draft.imageUrl} onChange={e => field('imageUrl', e.target.value)} className={ADMIN_INPUT}/></label>
        <label>이미지 출처·사용 근거<textarea value={draft.imageSource} onChange={e => field('imageSource', e.target.value)} className={ADMIN_INPUT}/></label>
        <label>상품 사실·계정 귀속 확인 근거<textarea value={draft.evidence} onChange={e => field('evidence', e.target.value)} className={ADMIN_INPUT} placeholder="확인일, 포털 발급 확인, 도서 난이도·용도·앨범 구성 등의 출처. 비밀키·개인정보 입력 금지."/></label>
        <label>핵심 속성 (한 줄에 하나)<textarea value={draft.attributes.join('\n')} onChange={e => field('attributes', e.target.value.split('\n'))} className={ADMIN_INPUT}/></label>
        <label>서비스 키 (쉼표 구분)<input value={draft.serviceTags.join(', ')} onChange={e => field('serviceTags', split(e.target.value))} className={ADMIN_INPUT}/></label>
        {listField('topicTags', '주제', ['saju','ziwei','sukuyo','vedic','astrology','tarot','human-design','relationship','planning'], ['사주','자미두수','숙요점','베다점','서양 점성술','타로','휴먼 디자인','관계','계획'])}
        {listField('interests', '사용 목적', INTERESTS, copy.interests)}
        {listField('species', '사용 대상 종', ['cat','dog'], ['고양이','강아지'])}
        <label>최애 그룹 ID (일반 수집 용품은 빈칸)<input value={draft.groupId} onChange={e => field('groupId', e.target.value)} className={ADMIN_INPUT}/></label>
        <label>가격 (원, 모르면 빈칸)<input type="number" min="1" value={draft.price ?? ''} onChange={e => field('price', e.target.value === '' ? null : Number(e.target.value))} className={ADMIN_INPUT}/></label>
        <label>가격 확인 시각<input type="datetime-local" value={localDateTime(draft.priceVerifiedAt)} onChange={e => field('priceVerifiedAt', e.target.value ? new Date(e.target.value).toISOString() : null)} className={ADMIN_INPUT}/></label>
        <label>재고 상태<select value={draft.stock} onChange={e => field('stock', e.target.value)} className={ADMIN_INPUT}><option value="unknown">미확인</option><option value="available">확인 당시 판매 중</option><option value="sold-out">품절</option><option value="ended">판매 종료</option></select></label>
        <label>동일 적합성 내 순서<input type="number" min="0" max="999" value={draft.order} onChange={e => field('order', Number(e.target.value))} className={ADMIN_INPUT}/></label>
        <label><input type="checkbox" checked={draft.featured} onChange={e => field('featured', e.target.checked)}/>적합성 필터 통과 후 대표 상품</label>
        <div className={styles.toolbar}><button disabled={busy} className={adminButton('primary')}>초안 저장</button><button type="button" disabled={busy || !draft.id || !draft.title} className={adminButton()} onClick={() => void action('preview', { product: draft })}>상품 카드 미리보기</button><button type="button" className={adminButton()} onClick={() => { setDraft(empty()); setPreview(null); }}>새 상품 입력</button></div>
      </form>
      {preview && <div className={styles.preview}><p>{copy.disclosure}</p><ProductCard product={preview.product} copy={copy} preview/><ul>{preview.reviewErrors.map(e => <li key={e}>{e}</li>)}</ul></div>}
      <h3>저장한 상품 검수</h3><p>URL 형식 검사는 계정 귀속이나 정품 확인을 대신하지 않습니다. 의약품·치료 목적 제품·위조 상품은 제외합니다.</p>
      <div className={styles.checks}>{[['account','AF7837486 공식 발급 링크 확인'],['facts','상품 정보·분류·종·그룹 확인'],['image','이미지 사용 근거 확인'],['allowedCategory','금지 품목·효능 보장 문구 제외']].map(([key,label]) => <label key={key}><input type="checkbox" checked={checks[key]} onChange={e => setChecks(c => ({ ...c, [key]: e.target.checked }))}/>{label}</label>)}</div>
      <button className={adminButton()} disabled={busy || !products.some(p => p.id === draft.id) || !Object.values(checks).every(Boolean)} onClick={() => void action('review', { id: draft.id, checks })}>저장본 검수 완료 기록</button>
    </section>
    <section className={styles.section}><h2>등록 상품 추천 규칙 미리보기</h2><p>저장·검수한 상품을 실제 추천 규칙으로 걸러 봅니다. 구매 링크와 통계는 비활성 상태입니다.</p>
      <div className={styles.form}><label>미리보기 서비스 키<input className={ADMIN_INPUT} value={selection.service} onChange={e => setSelection(s => ({ ...s, service: e.target.value }))}/></label>
      <label>미리보기 종<select className={ADMIN_INPUT} value={selection.species} onChange={e => setSelection(s => ({ ...s, species: e.target.value }))}><option value="">미선택</option><option value="cat">고양이</option><option value="dog">강아지</option></select></label>
      <label>미리보기 그룹 ID<input className={ADMIN_INPUT} value={selection.groupId} onChange={e => setSelection(s => ({ ...s, groupId: e.target.value }))}/></label>
      <label>미리보기 관심사<select className={ADMIN_INPUT} value={selection.interests[0] || ''} onChange={e => setSelection(s => ({ ...s, interests: e.target.value ? [e.target.value] : [] }))}><option value="">미선택</option>{INTERESTS.map((v,i) => <option key={v} value={v}>{copy.interests[i]}</option>)}</select></label></div>
      <button className={adminButton()} disabled={busy} onClick={() => void action('selection-preview', selection)}>추천 규칙 확인</button>
      {selectionProducts && (selectionProducts.length ? <RecommendationResult service={selection.service} previewProducts={selectionProducts} locale="ko"/> : <p role="status">현재 조건에 맞는 검수 상품이 없습니다.</p>)}
    </section>
    <section className={styles.section}><h2>운영 지표</h2><p>자체 이벤트는 구매·수익이 아닙니다. 아래 자체 집계는 최근 30일 기준이며, 표본이 작을 때 증가 원인이나 승자를 판정하지 않습니다.</p>
      <label>서비스별 조회<select className={ADMIN_INPUT} value={metricService} onChange={e => setMetricService(e.target.value)}><option value="">전체</option>{[...new Set((metrics?.metrics || []).map(m => m.service))].map(s => <option key={s}>{s}</option>)}</select></label>
      {metrics ? <dl className={styles.metrics}>{[['impression','자체 노출'],['click','자체 클릭'],['more','더 보기'],['filter','필터 선택'],['dismiss','추천 접기']].map(([k,label]) => <div key={k}><dt>{label}</dt><dd>{sums[k]}</dd></div>)}</dl> : <p>통계 미확인</p>}
      {metrics?.possiblyTruncated && <p>조회 한도에 도달해 일부 집계만 표시됩니다.</p>}
      <p>상담 구매·결과 열람·페이지 성능: 기존 분석 대시보드에서 확인 · 이 화면과 자동 대조는 미연결</p>
      <h3>쿠팡 공식 리포트</h3>{!metrics?.reports?.length && <p>공식 클릭·주문·취소·수익: 미확인</p>}
      {(metrics?.reports || []).map(r => <p key={r.from + r.to}>{r.from} ~ {r.to} · 클릭 {r.clicks ?? '미확인'} / 주문 {r.orders ?? '미확인'} / 취소 {r.cancellations ?? '미확인'} / 수익 {r.commissionKRW ?? '미확인'}원 · 공식 리포트 수동 기록 · 확인 {r.verifiedAt}</p>)}
      <form className={styles.form} onSubmit={e => { e.preventDefault(); void action('report', { ...report, ...Object.fromEntries(['clicks','orders','cancellations','commissionKRW'].map(k => [k, report[k] === '' ? null : Number(report[k])])) }); }}>
        {['from','to'].map((k,i) => <label key={k}>{i ? '종료일' : '시작일'}<input type="date" required value={report[k]} onChange={e => setReport(r => ({ ...r, [k]: e.target.value }))} className={ADMIN_INPUT}/></label>)}
        {[['clicks','공식 클릭'],['orders','공식 주문'],['cancellations','공식 취소'],['commissionKRW','공식 수익 (원)']].map(([k,label]) => <label key={k}>{label}<input type="number" min="0" step={k === 'commissionKRW' ? '0.01' : '1'} value={report[k]} onChange={e => setReport(r => ({ ...r, [k]: e.target.value }))} className={ADMIN_INPUT}/></label>)}
        <label>공식 보고서 출처·확인 근거<textarea required minLength={10} maxLength={1000} value={report.evidence} onChange={e => setReport(r => ({ ...r, evidence: e.target.value }))} className={ADMIN_INPUT}/></label><button disabled={busy} className={adminButton()}>공식 실적 기록</button>
      </form>
    </section>
  </main>;
}
