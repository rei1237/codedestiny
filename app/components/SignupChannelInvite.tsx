'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '../_lib/auth-store';
import KakaoChannelInvite from './KakaoChannelInvite';
export default function SignupChannelInvite() {
  const { user, isAuthenticated } = useAuthStore();
  const path = usePathname();
  const [show,setShow] = useState(false);
  useEffect(()=>{
    setShow(false);
    if (!isAuthenticated || !user || /^\/(?:admin|login|signup|checkout|payments|gift)(?:\/|$)/.test(path||'')) return;
    try {
      const hint=JSON.parse(sessionStorage.getItem('cd_fresh_signup_v1')||'null');
      const scope=String(user.id||user.userId||user._id||user.uid||'').toLowerCase();
      if(hint?.scope===scope && Date.now()-hint.at>=0 && Date.now()-hint.at<5*60000) setShow(true);
    } catch { /* signup never depends on this optional hint */ }
  },[user,isAuthenticated,path]);
  return show ? <KakaoChannelInvite source="signup_complete"/> : null;
}
