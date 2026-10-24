"use client";

import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import AdminErrorState from "../_components/AdminErrorState";
import { adminButton } from "../_components/ui";
import { HQ_ART } from "../_hq/art";
import { HqPageHeader, HqPanel, KeeperLine, LoadingBlock, StatusBadge } from "../_hq/components";
import { useHqResource } from "../_hq/useHqResource";
import type { HqSummary } from "../_hq/types";
import { formatDateTime } from "../_hq/format";

// Read existing status only. Opening this workspace never starts a publishing job.
export default function AdminThreadsPage() {
  const summary = useHqResource<HqSummary>("/api/admin/hq/summary?range=today", "Threads 상태를 불러오지 못했어요.");
  if (summary.error && !summary.data) return <AdminErrorState view={summary.error} onRetry={summary.reload} retrying={summary.loading} />;
  if (!summary.data) return <LoadingBlock lines={5} label="Threads 기록을 확인하는 중" />;
  const { threadsToday, threadsError, generatedAt } = summary.data;
  return <div className="cd-hq-page space-y-6">
    <HqPageHeader label="Threads 작업실" game="연이의 대화 원정" description="원문에서 짧은 대화로. 원고를 검토하고, 공개한 글의 기록과 반응을 확인해요."
      actions={<button className={adminButton("neutral")} disabled={summary.loading} onClick={summary.reload}><RefreshCw size={16} aria-hidden="true" /> 상태 새로 보기</button>} />
    <KeeperLine art={HQ_ART.yeoniLibrary} name="연이">한 가지 고민에 답하는 짧은 글부터 준비해요. 초안은 스튜디오에 저장하고, 게시 전에는 계정과 원고를 직접 확인해 주세요.</KeeperLine>
    {summary.error && <p role="alert" className="cd-hq-tone-warn">갱신하지 못해 이전 조회 결과를 보여 드려요. 상태 새로 보기를 눌러 주세요.</p>}
    <HqPanel title="오늘의 Threads 상태" game="기존 발행 기록">
      <p className="cd-hq-quiet text-sm">조회 시각 {formatDateTime(generatedAt)} · 서버 모드 {threadsToday?.mode ?? "확인되지 않음"}</p>
      {threadsError ? <p role="alert" className="cd-hq-tone-err">Threads 기록을 가져오지 못했어요. 연결 상태에서 오류를 확인해 주세요.</p> : threadsToday ? <>
        <p className="mt-3 text-sm">{threadsToday.mode === "off" || threadsToday.mode === "0" ? "서버 자동 발행이 꺼져 있어요. 원고 작성과 검토는 진행할 수 있어요." : "서버의 기존 자동 발행 설정이 남아 있어요. 사용자 확인 후 발행 원칙과 일치하는지 연결 상태에서 점검해 주세요."}</p>
        <ul className="mt-3 space-y-3">{threadsToday.jobs.map((job) => <li key={job.type} className="cd-hq-row p-3"><div className="flex flex-wrap justify-between gap-2"><strong>{job.label}</strong><StatusBadge tone={job.state === "confirmed" ? "ok" : "muted"} label={job.stateLabel} /></div><p className="mt-1 text-sm">{job.note}</p><p className="cd-hq-quiet text-xs">기존 작업 기준 시각 {job.time} · KST</p>{job.postIds.length > 0 && <p className="cd-hq-quiet break-all text-xs">확인된 게시 ID: {job.postIds.join(", ")}</p>}</li>)}</ul>
        {!threadsToday.jobs.length && <p className="mt-3 text-sm">오늘 표시할 발행 작업이 없어요. 게시 완료나 반응이 없다는 뜻은 아니에요.</p>}
      </> : <p className="mt-3">Threads 상태 자료가 아직 없어요.</p>}
      <Link className={`${adminButton("neutral")} mt-3`} href="/admin/connections/">연결 상태 확인</Link>
    </HqPanel>
    <HqPanel title="원고에서 게시까지" game="직접 확인 후 공개">
      <ol className="list-decimal space-y-3 pl-5 text-sm"><li>마케팅 스튜디오의 프로젝트에서 <strong>Threads 작업실</strong>을 열어요.</li><li>첫 글과 답글을 저장하고, 출처·정책·링크를 검토해요.</li><li>검토한 원고를 복사해 Threads에서 계정과 글의 순서를 확인한 뒤 게시해요.</li><li>실제 게시물 주소와 관측 시각을 남기고 조회·좋아요·답글·재게시를 확인해요.</li></ol>
      <p className="cd-hq-quiet my-3 text-sm">이 화면은 기존 서버 기록을 조회해요. 스튜디오에서 복사한 글을 게시 완료로 자동 처리하지 않아요. 기존 크론 실행·재시도도 여기서 호출하지 않아요.</p>
      <a className={adminButton("primary")} href="https://www.threads.com/" target="_blank" rel="noopener noreferrer">Threads에서 최종 확인 <ExternalLink size={16} aria-hidden="true" /></a>
    </HqPanel>
    <HqPanel title="이전 기록과 원문" game="다음 대화를 준비해요"><div className="flex flex-wrap gap-3"><Link className={adminButton("neutral")} href="/admin/quests/?channel=threads_existing_worker">기존 Threads 증빙</Link><Link className={adminButton("neutral")} href="/admin/wordpress/">WordPress 원문 작업실</Link></div><p className="cd-hq-quiet mt-3 text-sm">지난 캠페인 일정은 보관 기록으로 유지해요. 새로운 초안이나 게시 지시로 다시 실행하지 않아요.</p></HqPanel>
  </div>;
}
