'use client';
import type {ReactNode} from 'react';
import {useReadingLanguage} from '../_lib/use-reading-language';

// Server HTML keeps the indexed Korean copy; other screen locales hide it instead of mixing languages.
export default function KoreanOnly({children}:{children:ReactNode}){
 const {siteLocale}=useReadingLanguage();
 return siteLocale==='ko'?children:null;
}
