"use client";
import dynamic from 'next/dynamic';
import chatTheme from '@/app/fortune-chat/fortune-chat.module.css';
import consultationTheme from '@/app/fortune-chat/consultation.module.css';
import { SavedChapters, SavedText } from './SavedReadingParts';
import SavedServiceReading from './SavedServiceReading';
import styles from './saved-reading.module.css';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import { isStoredBiasViewModel, isStoredChemiReport } from '@/lib/records/stored-bias-shape.js';
import type { Decks, NatalIdentity } from '@/app/nakshatra/ai/AiConsultDecks';
import type { CodexChapter, CodexLoveDna } from '@/src/features/master-love-codex/components/CodexReader';
import type { NeoResultSession } from '@/src/features/neo-war-room/NeoOperationRoomResultPage';
import type { ChatConsultation } from '@/app/fortune-chat/consultation-api';
import type { LoadingLocale } from '@/constants/loadingMessages';
import type { Result as FusionResult } from '@/app/fusion-fortune/fusion-thread';
import fusionStyles from '@/app/fusion-fortune/fusion-fortune.module.css';
import BiasDestinyMainCard from '@/app/saju/destiny-bias/components/BiasDestinyMainCard';
import BiasDestinyFiveSections from '@/app/saju/destiny-bias/components/BiasDestinyFiveSections';
import BiasDestinyElementChart from '@/app/saju/destiny-bias/components/BiasDestinyElementChart';
import type { DestinyBiasResultViewModel } from '@/app/saju/destiny-bias/lib/types';
import type { ChemiReport } from '@/app/saju/destiny-bias/engine/chemiReportBridge';
import biasStyles from '@/app/saju/destiny-bias/destiny-bias.module.css';

const AiConsultDecks = dynamic(() => import('@/app/nakshatra/ai/AiConsultDecks'));
const CodexReader = dynamic(() => import('@/src/features/master-love-codex/components/CodexReader'));
const SavedNeoDocuments = dynamic(() => import('@/src/features/neo-war-room/NeoOperationRoomResultPage').then(module => module.SavedNeoDocuments));
const FusionResultThread = dynamic(() => import('@/app/fusion-fortune/FusionResultThread').then(module => module.FusionResultThread));
const ConsultationResult = dynamic(() => import('@/app/fortune-chat/ConsultationResult'));
const ChemiCoreCard = dynamic(() => import('@/app/saju/destiny-bias/components/chemi/ChemiCoreCard'));
const ChemiSections = dynamic(() => import('@/app/saju/destiny-bias/components/chemi/ChemiSections'));
const ChemiReportTabs = dynamic(() => import('@/app/saju/destiny-bias/components/chemi/ChemiReportTabs'));
const ChemiEvidencePanel = dynamic(() => import('@/app/saju/destiny-bias/components/chemi/ChemiEvidencePanel'));

const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
function IncompleteBiasReading({ row, notice, noBody }: { row: Record<string, unknown>; notice: string; noBody: string }) {
  // Invalid card snapshots must never expose engine objects or fill missing facts.
  // Older collection saves contain readable reportText/summary without a full VM.
  const content = Object.fromEntries(['reportText', 'summary', 'content', 'text', 'reading', 'answer']
    .filter(key => typeof row[key] === 'string' && String(row[key]).trim())
    .map(key => [key === 'reportText' ? 'report' : key, row[key]]));
  return <div data-saved-bias-incomplete style={{background:'var(--dbk-cream)',padding:24,borderRadius:16}} className={`${biasStyles.page} ${styles.biasPartial}`}><p className="text-sm leading-6">{notice}</p>{Object.keys(content).length ? <SavedChapters showEmpty={false} value={content} /> : <p>{noBody}</p>}</div>;
}
export default function StoredReading({ source, serviceId, value, status }: { source: string; serviceId: string; value: unknown; status?: string }) {
  const locale = useLocale(), c = recordsCopy(locale), row = object(value);
  const canonical = object(row.canonical), vm = object(canonical.viewModel);
  if (source === 'destiny-bias' && canonical.version === 'destiny-bias-record-v1' && Object.prototype.hasOwnProperty.call(canonical,'chemiReport')) {
    if (!isStoredChemiReport(canonical.chemiReport)) return <IncompleteBiasReading row={row} notice={c.formatUnavailable} noBody={c.noBody} />;
    const report = canonical.chemiReport as ChemiReport;
    return <div data-saved-chemi className={`${biasStyles.page} space-y-6 rounded-[var(--cd-r-card)] p-4`} style={{background:'var(--dbk-cream)'}}><ChemiCoreCard report={report} themeKey={String(canonical.themeKey || '')} /><ChemiSections copy={report.copy} /><ChemiReportTabs vm={report.vm} /><ChemiEvidencePanel result={report.result} /></div>;
  }
  if (source === 'destiny-bias' && canonical.version === 'destiny-bias-record-v1' && isStoredBiasViewModel(vm)) {
    const snapshot = vm as DestinyBiasResultViewModel;
    return <><div className={`${biasStyles.page} space-y-6 rounded-[var(--cd-r-card)] p-4`} style={{background:'var(--dbk-cream)'}}><BiasDestinyMainCard vm={snapshot} /><BiasDestinyElementChart vm={snapshot} /><BiasDestinyFiveSections vm={snapshot} /></div></>;
  }
  if (source === 'destiny-bias') return <IncompleteBiasReading row={row} notice={c.formatUnavailable} noBody={c.noBody} />;
  if (source === 'chat-consultation' && Array.isArray(row.chapters) && Array.isArray(row.manifest)) return <div data-saved-consultation className={`${chatTheme.room} ${row.persona === 'neo' ? consultationTheme.starlight : ''}`} style={{height:'auto',display:'block',overflow:'visible',padding:20,borderRadius:20}}><ConsultationResult row={row as ChatConsultation} readOnly onNew={() => window.location.assign('/fortune-chat/')} /></div>;
  if (source === 'fusion' && object(row.result).sajuSection) return <><div className={`${fusionStyles.page} rounded-[var(--cd-r-card)] p-3`}><ol className="space-y-5"><FusionResultThread result={row.result as FusionResult} openSection="" onToggleSection={() => {}} exporting readOnly /></ol></div><SavedChapters showEmpty={false} value={Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'result'))} /></>;
  if (source === 'neo' && row.initialBriefing) return <div className={styles.night}><SavedNeoDocuments session={row as NeoResultSession} locale={locale as LoadingLocale} /><SavedChapters showEmpty={false} value={Object.fromEntries(Object.entries(row).filter(([key]) => !['initialBriefing','refinedOrder','question','selectedMethod','topic','compatSummary'].includes(key)))} /></div>;
  if (source === 'codex' && Array.isArray(row.chapters)) return <><div className={styles.codex}><CodexReader chapters={row.chapters as CodexChapter[]} loveDna={row.loveDna as CodexLoveDna || null} name="" birthLine="" totalCharCount={Number(row.totalCharCount) || 0} sessionId={String(row.id || '')} mode={row.mode === 'compat' ? 'compat' : 'solo'} completed={row.status === 'completed'} /></div><SavedChapters showEmpty={false} value={Object.fromEntries(Object.entries(row).filter(([key]) => !['chapters','loveDna'].includes(key)))} /></>;
  if (source === 'nakshatra' && row.decks) return <><AiConsultDecks decks={row.decks as Decks} natal={row.natal as NatalIdentity || null} question={typeof row.question === 'string' ? row.question : undefined} /><SavedChapters showEmpty={false} value={Object.fromEntries(Object.entries(row).filter(([key]) => !['decks','natal','question'].includes(key)))} /></>;
  if (source === 'chat' && Array.isArray(row.messages)) return <ol className={styles.dialogue}>{row.messages.map((message,index) => {
    const entry = object(message), role = entry.role || entry.speaker;
    return <li key={index} className={styles.message} data-role={String(role)}><p className={styles.speaker}>{role === 'user' ? (locale==='ko'?'나의 질문':'My question') : role === 'system' ? (locale==='ko'?'상담 안내':'Guidance') : row.characterId === 'neo' ? '네오' : '연이'}</p><ChatMessage value={entry.content || entry.text || entry.message}/><ChatMessage value={entry.detail}/></li>;
  })}</ol>;
  if (!Object.keys(row).length && typeof value !== 'string') return <p>{c.noBody}</p>;
  return <div data-saved-service={serviceId} className={styles.reader}><SavedServiceReading source={source} serviceId={serviceId} status={status} value={value}/></div>;
}

function ChatMessage({value}:{value:unknown}) { return typeof value==='string'?<SavedText text={value}/>:<SavedChapters value={value} showEmpty={false}/>; }
