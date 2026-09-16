"use client";
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import styles from './yeongnyangi.module.css';
export default function Layout({children}:{children:ReactNode}){
 const pathname=usePathname();
 if(pathname==='/yeongnyangi'||pathname==='/yeongnyangi/')return children;
 return <main className={styles.page}><nav className={styles.nav} aria-label="영냥이 메뉴"><a href="/yeongnyangi/">🐾 영냥이의 방</a><div><a href="/yeongnyangi/library/">내 상담</a><a href="/">CODE DESTINY</a></div></nav>{children}<footer className={styles.footer}><p>사주보는 고양이 영냥이 · CODE DESTINY</p><a href="/terms/">이용약관</a> · <a href="/privacy-policy/">개인정보 처리방침</a> · <a href="/refund-policy/">환불 정책</a> · <a href="/contact/">문의하기</a></footer></main>;
}
