"use client";
import dynamic from 'next/dynamic';
import {useEffect,useState} from 'react';
import styles from '../yeongnyangi.module.css';
import ReadingLoading from './ReadingLoading';
const Consultation=dynamic(()=>import('./Consultation'),{ssr:false,loading:()=> <p className={styles.loading}>상담방을 준비하고 있어요.</p>});
const SpiritConsultation=dynamic(()=>import('./SpiritConsultation'),{ssr:false,loading:()=> <p className={styles.loading}>질문의 결을 살피는 중</p>});
const Result=dynamic(()=>import('./Result'),{ssr:false,loading:()=> <ReadingLoading/>});
const Library=dynamic(()=>import('./Library'),{ssr:false,loading:()=> <ReadingLoading/>});
export default function Experience({view}:{view:'fortune'|'result'|'library'}){const [spirit,setSpirit]=useState<boolean|null>(null);useEffect(()=>{setSpirit(new URLSearchParams(window.location.search).get('mode')==='spirit');},[]);return view==='fortune'?(spirit===null?<p className={styles.loading}>상담방을 준비하고 있어요.</p>:spirit?<SpiritConsultation/>:<Consultation/>):view==='result'?<Result/>:<Library/>;}
