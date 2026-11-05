import {useAuthStore} from '@/app/_lib/auth-store';
import {useTossConsultationCopy} from '@/app/_lib/toss-consultation-copy';
import Karma from '@/app/karma-destiny-ai/KarmaDestinyAiClient';
import KarmaResult from '@/app/karma-destiny-ai/result/KarmaDestinyAiResultClient';
import Profile from './TossAstrologyProfilePicker';
import Price from './TossAstrologyPrice';

function KarmaProfile({onSelect}:Parameters<typeof Profile>[0]){return <Profile onSelect={onSelect} calendarMode="lunar"/>;}
function KarmaPrice(){return <Price featureKey="karma-destiny-ai-consultation"/>;}
const title:Record<string,string>={ko:'운명의 업 상담',en:'Karma Destiny Consultation',ja:'運命の業相談','zh-CN':'命运业力咨询','zh-TW':'命運業力諮詢',vi:'Tư vấn nghiệp vận mệnh',hi:'कर्म भाग्य परामर्श',es:'Consulta de karma y destino',fr:'Consultation karma et destinée',de:'Karma- und Schicksalsberatung',nl:'Karma- en lotsconsult',ms:'Konsultasi karma dan takdir'};
export default function TossKarma({result=false}:{result?:boolean}){
 const auth=useAuthStore();
 const {locale,copy}=useTossConsultationCopy();
 if(!auth.isAuthenticated){
  const next=location.pathname+location.search;
  return <main lang={locale} style={{padding:'24px 20px',paddingBottom:'calc(24px + var(--toss-service-bottom, 0px))'}}><h1>{title[locale]||title.en}</h1><p>{copy.login}</p><a style={{display:'inline-flex',alignItems:'center',minHeight:44}} href={'/login?next='+encodeURIComponent(next)}>{copy.loginLink}</a></main>;
 }
 return <div style={{paddingBottom:'var(--toss-service-bottom, 0px)'}}>{result?<KarmaResult paymentSurface="toss"/>:<Karma paymentSurface="toss" ProfilePicker={KarmaProfile} TossPrice={KarmaPrice}/>}</div>;
}
