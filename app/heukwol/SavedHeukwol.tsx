'use client';
import HeukwolResult from './HeukwolResult';
import type {HeukwolReport} from './types';
import styles from './heukwol.module.css';
export default function SavedHeukwol({value}:{value:Record<string,unknown>}){
 if(!Array.isArray(value.chapters)||!value.analysis)return <section className={styles.page}><div className={styles.form}><h2>{String(value.title||'흑월의 경고')}</h2><p>완성한 장을 저장하고 있어요. 상담 화면에서 진행 상태를 확인할 수 있어요.</p><a href={`/heukwol/?result=${encodeURIComponent(String(value.reportId||''))}`}>상담 이어서 확인하기</a></div></section>;
 return <div className={styles.page}><HeukwolResult report={value as unknown as HeukwolReport}/></div>;
}
