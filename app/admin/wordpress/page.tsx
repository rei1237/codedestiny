"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, Link2, Search, ScrollText } from "lucide-react";
import { WORDPRESS_EDITOR, WORDPRESS_URL, missionHref } from "@/lib/admin-operations.mjs";
import { WORDPRESS_PUBLICATIONS, WORDPRESS_PUBLICATION_SITE, wordpressPublicationReview } from "@/lib/marketing/wordpress-publications.mjs";
import draftStatus from "@/marketing/wordpress/2026-10-21/draft-status.json";
import { HqPageHeader, HqPanel, KeeperLine } from "../_hq/components";
import { HQ_ART } from "../_hq/art";
import { adminButton } from "../_components/ui";

const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" });

function formatDate(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? koreanDate.format(timestamp) : "날짜 확인 필요";
}

export default function WordPressWorkshop() {
  return (
    <div className="cd-hq-page cd-ops-workshop space-y-6">
      <HqPageHeader label="WordPress 작업실" game="연이의 편집 원정" description="한 주제의 원문을 쌓고, 검색에서 상담까지 이어지는 길을 만들어요."
        actions={<a href={WORDPRESS_EDITOR} target="_blank" rel="noopener noreferrer" className={adminButton("primary")}>편집기 열기 <ExternalLink size={16} aria-hidden="true" /></a>} />
      <KeeperLine art={HQ_ART.yeoniLibrary} name="연이">문장은 직접 다듬어 주세요. 저는 원고 검토, 자료 확인, 검색 점검을 차례로 챙길게요.</KeeperLine>
      <section className="cd-ops-route" aria-label="편집 원정 단계">
        {[["원문 검토", "질문·근거·서비스 링크 확인", BookOpen], ["직접 발행", "WordPress에서 공개 결정", ScrollText], ["허브 재유통", "인사이트 서재와 RSS에서 다시 연결", Link2], ["검색 관측", "색인·질의·상담 이동 확인", Search]].map(([title, body, Icon]) => {
          const StageIcon = Icon as typeof BookOpen;
          return <div key={String(title)}><StageIcon size={22} aria-hidden="true" /><strong>{String(title)}</strong><span>{String(body)}</span></div>;
        })}
      </section>
      <HqPanel title="공개된 운세 신문" game={`공개 API 동기화 · ${formatDate(WORDPRESS_PUBLICATION_SITE.syncedAt)}`}>
        <p className="cd-hq-quiet text-sm">WordPress 공개 API에서 확인한 발행물입니다. 공개 글마다 서비스로 이어지는 링크가 있는지 함께 점검하며, 최신 글은 운세 인사이트 허브에서도 다시 소개합니다.</p>
        <ul className="cd-ops-manuscripts">
          {WORDPRESS_PUBLICATIONS.map((post) => {
            const review = wordpressPublicationReview(post);
            return <li key={post.id}><div><span>{formatDate(post.publishedAt)} · {review.label} · 서비스 연결 {post.serviceLinks.length}곳</span><h3>{post.title}</h3><p>{post.excerpt}</p></div>
              <a href={post.url} target="_blank" rel="noopener noreferrer" className={adminButton("neutral")}>공개 글 보기 <ExternalLink size={15} aria-hidden="true" /></a></li>;
          })}
        </ul>
      </HqPanel>
      <HqPanel title="검토할 원고" game="첫 번째 주제 · 자미두수">
        <p className="cd-hq-quiet text-sm">{draftStatus.checked}에 저장을 확인한 초안 목록입니다. 공개 API에는 초안이 나오지 않으므로 현재 편집 상태는 WordPress에서 확인해 주세요.</p>
        <ul className="cd-ops-manuscripts">
          {draftStatus.posts.map((draft) => <li key={draft.id}><div><span>{draft.category} · 초안 #{draft.id} · 다음 검토일 {draft.nextReview}</span><h3>{draft.title}</h3><p>공개 전 제목·슬러그·태그와 서비스 연결을 확인해 주세요.</p></div>
            <a href={draft.editorUrl} target="_blank" rel="noopener noreferrer" className={adminButton("neutral")}>원고 수정 <ExternalLink size={15} aria-hidden="true" /></a></li>)}
        </ul>
      </HqPanel>
      <div className="cd-ops-workshop__actions">
        <div><h2>오늘의 퀘스트를 기록해요</h2><p>추가 → 진행 → 증빙 → 완료. 실제 완료를 확인한 작업에만 기존 XP 규칙을 적용해요.</p></div>
        <Link href={missionHref("editorial")} className={adminButton("primary")}>원고 검토 시작</Link>
        <Link href={missionHref("discovery")} className={adminButton("neutral")}>검색 관측 시작</Link>
      </div>
      <HqPanel title="관측 도구" game="검색에서 상담까지">
        <div className="cd-ops-tools">
          <a href={WORDPRESS_URL} target="_blank" rel="noopener noreferrer">공개 신문 <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={WORDPRESS_PUBLICATION_SITE.feedUrl} target="_blank" rel="noopener noreferrer">RSS 피드 <ExternalLink size={14} aria-hidden="true" /></a>
          <a href={`https://wordpress.com/stats/day/${new URL(WORDPRESS_URL).hostname}`} target="_blank" rel="noopener noreferrer">WordPress 통계 <ExternalLink size={14} aria-hidden="true" /></a>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Search Console <ExternalLink size={14} aria-hidden="true" /></a>
          <a href="https://searchadvisor.naver.com/" target="_blank" rel="noopener noreferrer">네이버 서치어드바이저 <ExternalLink size={14} aria-hidden="true" /></a>
          <Link href="/admin/connections/">측정 연결 상태</Link>
          <Link href="/admin/orders/">승인 결제·결과 제공</Link>
        </div>
        <p className="cd-hq-quiet mt-3 text-sm">검색 클릭·세션·사용자·실결제는 다른 지표예요. 서비스로 보내는 자사 링크는 독립 외부 추천과 구분해서 봐요.</p>
      </HqPanel>
      <details className="cd-ops-archive"><summary>이전 SNS 운영 기록</summary><p>Threads 운영을 다시 준비합니다. 새 원고와 상태는 Threads 작업실에서 확인하고, 지난 일정은 기록으로 보존해요.</p><Link href="/admin/threads/">Threads 작업실 열기</Link></details>
    </div>
  );
}
