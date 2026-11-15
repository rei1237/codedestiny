"use client";
import {useEffect,useRef,useState,type ReactNode} from 'react';
import styles from '../space.module.css';
export default function ActivityTransition({identity,reduced,children}:{identity:string;reduced:boolean;children:ReactNode}){
 const last=useRef({identity,children});const[previous,setPrevious]=useState<ReactNode>(null);
 useEffect(()=>{let timer:ReturnType<typeof setTimeout>|undefined;if(last.current.identity!==identity&&!reduced){setPrevious(last.current.children);timer=setTimeout(()=>setPrevious(null),220);}else setPrevious(null);last.current={identity,children};return()=>clearTimeout(timer);},[identity,reduced]); // eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{last.current.children=children;},[children]);
 return <div className={styles.poseBlend}>{previous&&<div className={styles.posePrevious} aria-hidden="true">{previous}</div>}<div key={identity} className={!reduced?styles.poseCurrent:undefined}>{children}</div></div>;
}
