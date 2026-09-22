"use client";
import dynamic from 'next/dynamic';
import styles from '../yeongnyangi.module.css';
import ReadingLoading from './ReadingLoading';
const Consultation=dynamic(()=>import('./Consultation'),{ssr:false,loading:()=> <p className={styles.loading}>상담방을 준비하고 있어요.</p>});
const Result=dynamic(()=>import('./Result'),{ssr:false,loading:()=> <ReadingLoading/>});
const Library=dynamic(()=>import('./Library'),{ssr:false,loading:()=> <ReadingLoading/>});
export default function Experience({view}:{view:'fortune'|'result'|'library'}){return view==='fortune'?<Consultation/>:view==='result'?<Result/>:<Library/>;}
