'use client';
import {useEffect,useState} from 'react';
import {readFirstVisit,firstVisitScope,resumeFirstVisitLogin,type FirstVisitState} from '@/js/first-visit-state.mjs';
export function useFirstVisit(){
 const [state,setState]=useState<FirstVisitState|null>(null);
 const [scope,setScope]=useState('');
 useEffect(()=>{
  const sync=()=>{resumeFirstVisitLogin('yeongnyangi');setScope(firstVisitScope());setState(readFirstVisit('yeongnyangi'));};
  sync();
  window.addEventListener('cd:first-visit-change',sync);
  window.addEventListener('cd:auth-changed',sync);
  window.addEventListener('storage',sync);
  return()=>{window.removeEventListener('cd:first-visit-change',sync);window.removeEventListener('cd:auth-changed',sync);window.removeEventListener('storage',sync);};
 },[]);
 return {state,scope};
}

