'use client';
import { useEffect, useRef } from 'react';
import { mountYehwaHome } from '../../js/core/yehwa-home.mjs';
import { NativeHomeHtml } from './NativeHomeCopy';
import { useLocale } from '../../lib/i18n/useT';
import '../../styles/yehwa-home.css';
import '../../styles/yehwa-motifs.css';

export default function YehwaHome({ html }) {
  const ref = useRef(null);
  const locale = useLocale();
  useEffect(() => mountYehwaHome(ref.current?.querySelector('[data-yh-home]')), [locale, html]);
  return <div className="yh-root" ref={ref}><NativeHomeHtml html={html}/></div>;
}
