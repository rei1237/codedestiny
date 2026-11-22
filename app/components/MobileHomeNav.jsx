"use client";
import {useEffect, useRef, useState} from 'react';
import {BookOpen, Layers, MessageCircle, IdCard} from 'lucide-react';
import styles from '../home-main.module.css';

const destinations = [
  { id: 'webServiceTitle', label: '홈', icon: Layers },
  { id: 'homeCardTitle', label: '상담 추천', icon: MessageCircle },
  { id: 'homeStoryTitle', label: '웹툰 서가', icon: BookOpen },
  { id: 'homeDailyCard', label: '출석부', icon: IdCard },
];

export default function MobileHomeNav() {
  const [current, setCurrent] = useState(destinations[0].id);
  const nav = useRef(null);
  useEffect(() => {
    const mobile = matchMedia('(max-width:699px)');
    const root = document.documentElement;
    const reserveDock = () => {
      const fixed = nav.current && getComputedStyle(nav.current).position === 'fixed';
      const height = fixed ? Math.ceil(nav.current.getBoundingClientRect().height) : 0;
      if (height) root.style.setProperty('--cd-home-nav-height', `${height}px`);
      else root.style.removeProperty('--cd-home-nav-height');
    };
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(reserveDock) : null;
    if (nav.current) resize?.observe(nav.current);
    const headers = destinations.map(({id}) => document.getElementById(id)).filter(Boolean);
    function trackSection() {
      const last = headers.filter(el => el.getBoundingClientRect().top <= innerHeight * 0.4).at(-1);
      setCurrent(last?.id || destinations[0].id);
    }
    const observer = new IntersectionObserver(trackSection, {rootMargin: '0px 0px -60% 0px'});
    function observeHeadings() {
      reserveDock();
      observer.disconnect();
      if (mobile.matches) headers.forEach(el => observer.observe(el));
    }
    observeHeadings();
    mobile.addEventListener('change', observeHeadings);
    window.addEventListener('resize', reserveDock);
    return () => {
      resize?.disconnect();
      root.style.removeProperty('--cd-home-nav-height');
      observer.disconnect();
      mobile.removeEventListener('change', observeHeadings);
      window.removeEventListener('resize', reserveDock);
    };
  }, []);
  return <nav ref={nav} className={styles.mobileNav} aria-label="대표 홈 바로가기">
    {destinations.map(({id,label,icon: Icon}) => <a key={id} href={'#'+id} aria-current={current === id ? 'location' : undefined}>
      <Icon size={19} strokeWidth={1.6} aria-hidden="true"/><span>{label}</span>
    </a>)}
  </nav>;
}
