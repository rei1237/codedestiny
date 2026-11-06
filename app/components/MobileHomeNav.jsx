"use client";
import {useEffect, useState} from 'react';
import {BookOpen, Layers, MessageCircle, Trees} from 'lucide-react';
import styles from '../home-main.module.css';

const destinations = [
  { id: 'webServiceTitle', label: '홈', icon: Layers },
  { id: 'homeCardTitle', label: '상담 추천', icon: MessageCircle },
  { id: 'homeForest', label: '숲길', icon: Trees },
  { id: 'homeStoryTitle', label: '웹툰 서가', icon: BookOpen },
];

export default function MobileHomeNav() {
  const [current, setCurrent] = useState(destinations[0].id);
  useEffect(() => {
    const mobile = matchMedia('(max-width:699px)');
    const headers = destinations.map(({id}) => document.getElementById(id)).filter(Boolean);
    function trackSection() {
      const last = headers.filter(el => el.getBoundingClientRect().top <= innerHeight * 0.4).at(-1);
      setCurrent(last?.id || destinations[0].id);
    }
    const observer = new IntersectionObserver(trackSection, {rootMargin: '0px 0px -60% 0px'});
    function observeHeadings() {
      observer.disconnect();
      if (mobile.matches) headers.forEach(el => observer.observe(el));
    }
    observeHeadings();
    mobile.addEventListener('change', observeHeadings);
    return () => {
      observer.disconnect();
      mobile.removeEventListener('change', observeHeadings);
    };
  }, []);
  return <nav className={styles.mobileNav} aria-label="대표 홈 바로가기">
    {destinations.map(({id,label,icon: Icon}) => <a key={id} href={'#'+id} aria-current={current === id ? 'location' : undefined}>
      <Icon size={19} strokeWidth={1.6} aria-hidden="true"/><span>{label}</span>
    </a>)}
  </nav>;
}
