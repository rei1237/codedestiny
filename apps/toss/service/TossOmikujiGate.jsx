import {useAuthStore} from '@/app/_lib/auth-store';
import TossOmikuji from './TossOmikuji';

export default function TossOmikujiGate(){
 const auth=useAuthStore();
 const owner=String(auth.user?.id||auth.user?.userId||auth.user?._id||auth.user?.uid||'');
 if(auth.isAuthenticated&&!owner)return <p role="status">계정을 확인하고 있어요.</p>;
 const scope=auth.isAuthenticated?'user:'+owner:'guest';
 return <TossOmikuji key={scope} scope={scope}/>;
}
