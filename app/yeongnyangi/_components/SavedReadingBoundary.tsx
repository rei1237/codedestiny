'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {useReadingLanguage} from '../_lib/use-reading-language';
import {chromeCopy} from '../_lib/chrome-copy';
import styles from '../yeongnyangi.module.css';

// Route-specific code can download with the document. Private URL, language and
// account state are still read only after mounting, just like Experience.
export default function SavedReadingBoundary({children}:{children:ReactNode}){
 const [mounted,setMounted]=useState(false);
 const {siteLocale}=useReadingLanguage();
 useEffect(()=>setMounted(true),[]);
 return <div className={styles.experience}>{mounted?children:<p role="status" className={styles.loading}>{chromeCopy(siteLocale).loading}</p>}</div>;
}
