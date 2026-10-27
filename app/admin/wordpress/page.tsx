"use client";

import Link from "next/link";
import { BookOpen, CheckCircle2, ExternalLink, Search, ScrollText } from "lucide-react";
import { WORDPRESS_EDITOR, WORDPRESS_URL, missionHref } from "@/lib/admin-operations.mjs";
import { HqPageHeader, HqPanel, KeeperLine } from "../_hq/components";
import { HQ_ART } from "../_hq/art";
import { adminButton } from "../_components/ui";

const drafts = [
  { id: 88, title: "자미두수 명반 보는 법", role: "대표 안내", detail: "명반을 읽는 순서와 개인 상담으로 이어지는 질문" },
  { id: 91, title: "자미두수로 직업 고민을 정리할 때", role: "질문 적용", detail: "직업 고민을 구체적인 상담 질문으로 정리하기" },
  { id: 95, title: "명반 계산 결과가 다를 때", role: "참고 자료", detail: "입력 조건을 하나씩 확인하는 비교 체크리스트" },
];

export default function WordPressWorkshop() {
  return (
    <div className="cd-hq-page cd-ops-workshop space-y-6">
      <HqPageHeader label="WordPress 작업실" game="연이의 편집 원정" description="한 주제의 원문을 쌓고, 검색에서 상담까지 이어지는 길을 만들어요."
        actions={<a href={WORDPRESS_EDITOR} target="_blank" rel="noopener noreferrer" className={adminButton("primary")}>편집기 열기 <ExternalLink size={16} aria-hidden="true" /></a>} />
      <KeeperLine art={HQ_ART.yeoniLibrary} name="연이">문장은 직접 다듬어 주세요. 저는 원고 검토, 자료 확인, 검색 점검을 차례로 챙길게요.</KeeperLine>
      <section className="cd-ops-route" aria-label="편집 원정 단계">
        {[["원문 검토", "질문에 충분히 답하기", BookOpen], ["근거 확인", "출처·예시·링크 점검", CheckCircle2], ["직접 발행", "WordPress에서 최종 결정", ScrollText], ["검색 관측", "색인·질의·상담 이동 확인", Search]].map(([title, body, Icon]) => {
          const StageIcon = Icon as typeof BookOpen;
          return <div key={String(title)}><StageIcon size={22} aria-hidden="true" /><strong>{String(title)}</strong><span>{String(body)}</span></div>;
        })}
      </section>
      <HqPanel title="검토할 원고" game="첫 번째 주제 · 자미두수">
        <p className="cd-hq-quiet text-sm">2026-10-21에 저장을 확인한 초안 목록입니다. WordPress와 실시간 동기화되지 않으므로 현재 상태는 편집기에서 확인해 주세요.</p>
        <ul className="cd-ops-manuscripts">
          {drafts.map((draft) => <li key={draft.id}><div><span>{draft.role} · #{draft.id}</span><h3>{draft.title}</h3><p>{draft.detail}</p></div>
            <a href={`${WORDPRESS_URL}/wp-admin/post.php?post=${draft.id}&action=edit`} target="_blank" rel="noopener noreferrer" className={adminButton("neutral")}>원고 수정 <ExternalLink size={15} aria-hidden="true" /></a></li>)}
        </ul>
      </HqPanel>
      <div className="cd-ops-workshop__actions">
        <div><h2>오늘의 퀘스트를 기록해요</h2><p>추가 → 진행 → 증빙 → 완료. 실제 완료를 확인한 작업에만 기존 XP 규칙을 적용해요.</p></div>
        <Link href={missionHref("editorial")} className={adminButton("primary")}>원고 검토 시작</Link>
        <Link href={missionHref("discovery")} className={adminButton("neutral")}>검색 관측 시작</Link>
      </div>
      <HqPanel title="관측 도구" game="검색에서 상담까지">
        <div className="cd-ops-tools">
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
