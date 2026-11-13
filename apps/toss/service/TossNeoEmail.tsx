import {getAuthState,useAuthStore} from '@/app/_lib/auth-store';
import NeoConsultationClient, {type NeoNativeAdapter} from '@/app/neo-consultation/NeoConsultationClient';
import TossAstrologyProfilePicker from './TossAstrologyProfilePicker';
import {api} from '../src/platform';

const simulated = import.meta.env.DEV && import.meta.env.MODE === 'toss-offline';
const call: NeoNativeAdapter['call'] = async (path, body) => {
  if (!simulated) throw Error('토스 이메일 상담은 판매 준비 중이에요.');
  if (path === '' && body) {
    const user = getAuthState().user;
    const key = 'toss:neo-email-attempt:' + String(user?.id || user?.userId || user?._id || user?.uid || '');
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(body))))).join('.');
    const saved = JSON.parse(localStorage.getItem(key) || '{}');
    const attempt = saved.digest === digest ? saved.attempt : crypto.randomUUID();
    localStorage.setItem(key, JSON.stringify({digest,attempt}));
    return api('/native/neo-email/create', {attempt,input:body});
  }
  return api('/native/neo-email' + path, body);
};
const adapter: NeoNativeAdapter = {simulated, call,
  pay: async order => (await call('/' + order.id + '/mock-pay', {})).order,
  ProfilePicker: props => <TossAstrologyProfilePicker calendarMode="native-lunar" onSelect={props.onSelect}/>,
};
export default function TossNeoEmail() {
  const {user} = useAuthStore();
  return <NeoConsultationClient key={String(user?.id || user?.userId || user?._id || user?.uid || '')} native={adapter}/>;
}
