import {useState} from 'react';
import {DailyTarotReading} from '../../../app/yeongnyangi/_components/DailyTarotCard';
import type {AttendanceState} from '../../../worker/yeongnyangi/fortune/free/categories';
import DailyReadings from './DailyReadings';
import TossSessionScope from './TossSessionScope';
import {hasTossSession,login} from './platform';

function RoomDailyContent(){
 const [pass,setPass]=useState<AttendanceState|null>(null);
 const [notice,setNotice]=useState('');
 const loggedIn=hasTossSession();
 const failure=()=>setNotice('오늘의 기록을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.');
 const signIn=()=>{setNotice('');void login().catch(()=>setNotice('로그인을 마치지 못했어요. 다시 로그인해 주세요.'));};
 return <>
  {notice&&<p role="alert">{notice}</p>}
  <section id="daily" tabIndex={-1}><DailyReadings loggedIn={loggedIn} onLogin={signIn} onError={failure} onPassChange={setPass}/></section>
  <DailyTarotReading pass={loggedIn?pass:null} guest={!loggedIn} onLogin={signIn}/>
 </>;
}

export default function RoomDaily(){
 return <TossSessionScope><RoomDailyContent/></TossSessionScope>;
}
