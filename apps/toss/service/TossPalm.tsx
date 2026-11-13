import {useEffect, useRef, useState} from 'react';
import {getAuthState, useAuthStore} from '@/app/_lib/auth-store';
import PalmDestinyMain from '@/app/palm-reading/PalmDestinyMain';
import type {TossTeaPriceSelection} from '@/src/features/fortune-tea-house/lib/tossPriceSelection';
import {api, paymentRequiresReview} from '../src/platform';
import {checkoutReport} from './native-report-checkout';
import TossTeaPrice from './TossTeaPrice';

const feature = 'palm-reading-general';
const ownerId = () => {const u = getAuthState().user; return String(u?.id || u?.userId || u?._id || u?.uid || '');};
export default function TossPalm() {
  useAuthStore();
  const owner = ownerId();
  return <PalmForm key={owner} owner={owner}/>;
}
function PalmForm({owner}: {owner: string}) {
  const params = new URLSearchParams(location.search), id = params.get('intentId'), orderId = params.get('orderId');
  const key = 'toss:palm-prepared:' + owner;
  const [prepared, setPrepared] = useState(() => owner && localStorage.getItem(key) || '');
  const [price, setPrice] = useState<TossTeaPriceSelection|null>(null);
  const [error, setError] = useState('');
  const alive = useRef(true), busy = useRef(false), cancel = useRef<()=>void>();
  const current = () => alive.current && owner === ownerId();
  useEffect(() => {
    const leave = () => {alive.current = false; cancel.current?.();};
    const enter = () => {alive.current = true; busy.current = false;};
    enter(); window.addEventListener('pagehide', leave); window.addEventListener('pageshow', enter);
    return () => {leave(); window.removeEventListener('pagehide', leave); window.removeEventListener('pageshow', enter);};
  }, []);
  const ready = Boolean(owner && !id && (orderId || price?.owner === owner && !paymentRequiresReview()));
  async function start(reading: Record<string, unknown>, preparedId?: string) {
    if (!ready || busy.current || !current()) return;
    busy.current = true;
    try {
      const intent = await checkoutReport({service:'palm', feature, owner, input:{reading}, orderId, price, preparedId, current,
        onPrepared: value => {localStorage.setItem(key, value); setPrepared(value);},
        onPurchase: dispose => {cancel.current = dispose;}});
      if (intent && current()) {localStorage.removeItem(key); location.replace('/palm-reading/?intentId=' + intent);}
    } finally {if (current()) busy.current = false;}
  }
  async function read() {
    if (!id || !owner || owner !== ownerId()) return null;
    try {
      const result = await api<Record<string, unknown>>('/native/palm/results/' + encodeURIComponent(id));
      if (current()) {setError(''); return result;}
    } catch {if (current()) setError('이 계정의 구매 기록에서 손금 리포트를 확인해 주세요.');}
    return null;
  }
  const sale = owner ? orderId ? '구매한 손금 리포트' : <TossTeaPrice featureKey={feature} onPrice={setPrice}/>
    : <a href={'/login/?next=' + encodeURIComponent(location.pathname + location.search)}>토스로 로그인하기</a>;
  const priceContent = <>{id && owner ? null : sale}
    {!id && prepared && ready && <button onClick={() => start({}, prepared).catch(() => setError('판독을 다시 여는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'))}>분석해 둔 손금 열기</button>}
    {error && <p role="alert">{error} <a href="/records/">구매 기록 보기</a></p>}</>;
  return <PalmDestinyMain native={{ready, price: priceContent, start, read}}/>;
}
