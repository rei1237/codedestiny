import Link from 'next/link';
import { trustRecordCopy } from '@/lib/marketing/trust-record.mjs';
import styles from './trust-record-line.module.css';

// 첫 화면 CTA 아래의 한 줄 근거. 날짜가 찍힌 원문 비교 페이지로만 연결한다.
export default function TrustRecordLine({ variant = 'full', className = '' }: { variant?: 'full' | 'short'; className?: string }) {
  return <p className={`${styles.line} ${className}`.trim()} lang="ko" data-cd-trust-record={variant}>
    {trustRecordCopy[variant]}{' '}
    <Link className={styles.link} href={trustRecordCopy.href} prefetch={false}>{trustRecordCopy.publicLink} <span aria-hidden="true">›</span></Link>
  </p>;
}
