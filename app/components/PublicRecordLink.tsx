import Link from 'next/link';
import { publicRecordCopy, PUBLIC_RECORD_PATH } from '@/lib/seo/public-record-copy.mjs';

export default function PublicRecordLink() {
  const copy = publicRecordCopy.ko;
  return <aside className="my-5 text-sm leading-7" lang="ko">
    <p data-cd-trans="home.gardenCopy.publicRecordsTitle">{copy.strip}</p>
    <Link href={PUBLIC_RECORD_PATH} className="underline underline-offset-4" data-cd-trans="home.gardenCopy.publicRecordsLink">{copy.link}</Link>
  </aside>;
}
