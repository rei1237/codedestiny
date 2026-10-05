"use client";
import dynamic from 'next/dynamic';
import AiResultProse from '@/components/fortune/AiResultProse';
import { sanitizePublicInsightHtml } from '@/app/insights/_lib/sanitizePublicHtml';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import { isStoredBiasViewModel, isStoredChemiReport } from '@/lib/records/stored-bias-shape.js';
import type { Decks, NatalIdentity } from '@/app/nakshatra/ai/AiConsultDecks';
import type { HdChart } from '@/app/human-design/_lib/types';
import type { Locale as HdLocale } from '@/app/human-design/_copy';
import SajuPillarTable, { type SajuPillarInput } from '@/components/fortune/SajuPillarTable';
import TarotAssetCard from '@/src/features/fortune-tea-house/components/TarotAssetCard';
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
const BodyGraph = dynamic(() => import('@/app/human-design/_components/BodyGraph'));
const CodexReader = dynamic(() => import('@/src/features/master-love-codex/components/CodexReader'));
const SavedNeoDocuments = dynamic(() => import('@/src/features/neo-war-room/NeoOperationRoomResultPage').then(module => module.SavedNeoDocuments));
const FusionResultThread = dynamic(() => import('@/app/fusion-fortune/FusionResultThread').then(module => module.FusionResultThread));
const ConsultationResult = dynamic(() => import('@/app/fortune-chat/ConsultationResult'));
const ChemiCoreCard = dynamic(() => import('@/app/saju/destiny-bias/components/chemi/ChemiCoreCard'));
const ChemiSections = dynamic(() => import('@/app/saju/destiny-bias/components/chemi/ChemiSections'));
const ChemiReportTabs = dynamic(() => import('@/app/saju/destiny-bias/components/chemi/ChemiReportTabs'));
const ChemiEvidencePanel = dynamic(() => import('@/app/saju/destiny-bias/components/chemi/ChemiEvidencePanel'));

// Legacy snapshots keep their structure: chapters, message order/roles, card
// positions and tabular facts. Dedicated modern result routes remain primary.
const labels: Record<string, string> = {
  chapters: '챕터', sections: '상세 해석', messages: '대화 기록', summary: '요약', content: '해석', body: '본문', text: '해석', answer: '답변', reading: '리딩', result: '결과', report: '리포트',
  saju: '사주 명식', sajuResult: '사주 해석', sajuFacts: '사주 근거', facts: '계산 근거', basis: '해석 근거', evidence: '해석 근거', evidencePack: '근거', charts: '차트', chart: '차트', calculation: '설계도', birthChart: '출생 차트', ziweiChart: '자미두수 명반', astrologyChart: '점성술 차트', vedicChart: '베다 차트',
  pillars: '사주팔자', year: '년', month: '월', day: '일', hour: '시', yearPillar: '년주', monthPillar: '월주', dayPillar: '일주', hourPillar: '시주', stem: '천간', branch: '지지', element: '오행', elements: '오행', tenGod: '십성', palace: '궁', palaces: '궁별 명반', stars: '별', planets: '행성', houses: '하우스',
  cards: '카드', tarot: '타로', positionReadings: '자리별 해석', tarotCardReadings: '카드별 해석', cardSynergies: '카드의 연결', timeline: '시기의 흐름', actions: '실천 조언', advice: '조언', caution: '주의점', keyPoints: '핵심', keyTakeaways: '핵심', finalMessage: '마지막 메시지', closingLine: '마지막 메시지', title: '제목', name: '이름', nameKo: '이름', label: '항목', value: '값', score: '점수', grade: '흐름', synthesis: '종합 해석',
  namingPrompt: '작명 해석', generatedResult: '작명 결과', generatedPrompt: '작명 상담문', prashnaResult: '프라슈나 해석', consultingHighlights: '상담 핵심', compatibility: '궁합', sukuyoResult: '숙요 관계', animalReadings: '토템별 해석', lineReadings: '손금별 해석', fingers: '손가락 특징', lines: '손금', mounts: '구의 특징', figures: '도형', shieldChart: '지오맨시 차트', course: '수련 코스', sessions: '수련 과정', routines: '수련 순서', loveDna: '인연 성향', integratedResult: '통합 근거',
};
const bookkeeping = /^(?:_id|id|userId|profileId|inputHash|idempotencyKey|requestId|executionId|executionKey|resultId|sessionId|reportId|createdAt|updatedAt|completedAt|status|state|featureId|featureKey|serviceType|payment.*|purchase.*|order.*|access.*|lock.*|lease.*|metadata|snapshot|generation.*|llm.*|.*Token|.*Hash|provider.*|.*Version|chars|charCount|totalChars|usage.*|attempts|ok|success|archiveSaved|retentionUntil|engineMeta)$/i;
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function Text({ value }: { value: string }) {
  if (/<(?:p|h[1-6]|table|article|section|div|ul|br)\b/i.test(value)) return <div className="max-w-full overflow-x-auto break-words text-base leading-7 [&_img]:max-w-full [&_p]:my-3 [&_td]:p-2 [&_th]:p-2" dangerouslySetInnerHTML={{ __html: sanitizePublicInsightHtml(value, { tables: true }) }} />;
  return <AiResultProse value={value} />;
}
function Structure({ value, field = '' }: { value: unknown; field?: string }) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'string') return <Text value={value} />;
  if (typeof value === 'number' || typeof value === 'boolean') return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    if (field === 'pillars' && value.every(item => typeof object(item).ganji === 'string')) return <SajuPillarTable pillars={value as SajuPillarInput[]} />;
    if (value.every(item => typeof item === 'string' || typeof item === 'number')) return <ul className="list-disc space-y-2 pl-5">{value.map((item,index) => <li key={index}><Structure value={item} /></li>)}</ul>;
    return <div className="space-y-5">{value.map((item,index) => {
      const row = object(item), title = row.title || row.positionLabel || row.nameKo || row.name || row.label;
      const cardId = row.cardId || row.id;
      return <article key={index} className="min-w-0 space-y-3 rounded-[var(--cd-r-card)] border border-[var(--cd-border)] p-4"><h3 className="font-semibold">{typeof title === 'string' ? title : `${labels[field] || '상담 내용'} ${index + 1}`}</h3>{field === 'cards' && typeof cardId === 'string' && typeof row.nameKo === 'string' && <TarotAssetCard cardId={cardId} nameKo={row.nameKo} nameEn={typeof row.nameEn === 'string' ? row.nameEn : ''} orientation={row.orientation === 'reversed' ? 'reversed' : 'upright'} compact />}<Structure value={Object.keys(row).length ? Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'title')) : item} field={field} /></article>;
    })}</div>;
  }
  const entries = Object.entries(object(value)).filter(([key,item]) => !bookkeeping.test(key) && item !== null && item !== undefined && item !== '');
  const scalars = entries.filter(([,item]) => typeof item === 'number' || typeof item === 'boolean' || (typeof item === 'string' && item.length < 90 && !/[\n<>]/.test(item)));
  const nested = entries.filter(entry => !scalars.includes(entry));
  return <div className="min-w-0 space-y-4">
    {!!scalars.length && <div className="max-w-full overflow-x-auto"><table className="w-full text-left text-sm"><tbody>{scalars.map(([key,item]) => <tr key={key} className="border-b border-[var(--cd-border)]"><th className="w-1/3 break-words p-2 align-top font-medium">{labels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2')}</th><td className="break-words p-2">{String(item)}</td></tr>)}</tbody></table></div>}
    {nested.map(([key,item]) => <section key={key} className="min-w-0 space-y-3"><h3 className="text-lg font-semibold">{labels[key] || key.replace(/([a-z])([A-Z])/g, '$1 $2')}</h3><Structure value={item} field={key} /></section>)}
  </div>;
}
function IncompleteBiasReading({ row, notice, noBody }: { row: Record<string, unknown>; notice: string; noBody: string }) {
  // Invalid card snapshots must never expose engine objects or fill missing facts.
  // Older collection saves contain readable reportText/summary without a full VM.
  const content = Object.fromEntries(['reportText', 'summary', 'content', 'text', 'reading', 'answer']
    .filter(key => typeof row[key] === 'string' && String(row[key]).trim())
    .map(key => [key === 'reportText' ? 'report' : key, row[key]]));
  return <div data-saved-bias-incomplete className="space-y-5"><p className="text-sm leading-6">{notice}</p>{Object.keys(content).length ? <Structure value={content} /> : <p>{noBody}</p>}</div>;
}
export default function StoredReading({ source, serviceId, value }: { source: string; serviceId: string; value: unknown }) {
  const locale = useLocale(), c = recordsCopy(locale), row = object(value);
  const canonical = object(row.canonical), vm = object(canonical.viewModel);
  if (source === 'destiny-bias' && canonical.version === 'destiny-bias-record-v1' && Object.prototype.hasOwnProperty.call(canonical,'chemiReport')) {
    if (!isStoredChemiReport(canonical.chemiReport)) return <IncompleteBiasReading row={row} notice={c.formatUnavailable} noBody={c.noBody} />;
    const report = canonical.chemiReport as ChemiReport;
    return <div data-saved-chemi className={`${biasStyles.page} space-y-6 rounded-[var(--cd-r-card)] p-4`} style={{background:'var(--dbk-cream)'}}><ChemiCoreCard report={report} themeKey={String(canonical.themeKey || '')} /><ChemiSections copy={report.copy} /><ChemiReportTabs vm={report.vm} /><ChemiEvidencePanel result={report.result} /></div>;
  }
  if (source === 'destiny-bias' && canonical.version === 'destiny-bias-record-v1' && isStoredBiasViewModel(vm)) {
    const snapshot = vm as DestinyBiasResultViewModel;
    return <><div className={`${biasStyles.page} space-y-6 rounded-[var(--cd-r-card)] p-4`} style={{background:'var(--dbk-cream)'}}><BiasDestinyMainCard vm={snapshot} /><BiasDestinyElementChart vm={snapshot} /><BiasDestinyFiveSections vm={snapshot} /></div><Structure value={vm} /></>;
  }
  if (source === 'destiny-bias') return <IncompleteBiasReading row={row} notice={c.formatUnavailable} noBody={c.noBody} />;
  if (source === 'chat-consultation' && Array.isArray(row.chapters) && Array.isArray(row.manifest)) return <ConsultationResult row={row as ChatConsultation} readOnly onNew={() => window.location.assign('/fortune-chat/')} />;
  if (source === 'fusion' && object(row.result).sajuSection) return <><div className={`${fusionStyles.page} rounded-[var(--cd-r-card)] p-3`}><ol className="space-y-5"><FusionResultThread result={row.result as FusionResult} openSection="" onToggleSection={() => {}} exporting /></ol></div><Structure value={Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'result'))} /></>;
  if (source === 'neo' && row.initialBriefing) return <><SavedNeoDocuments session={row as NeoResultSession} locale={locale as LoadingLocale} /><Structure value={Object.fromEntries(Object.entries(row).filter(([key]) => !['initialBriefing','refinedOrder','question','selectedMethod','topic','compatSummary'].includes(key)))} /></>;
  if (source === 'codex' && Array.isArray(row.chapters)) return <><CodexReader chapters={row.chapters as CodexChapter[]} loveDna={row.loveDna as CodexLoveDna || null} name="" birthLine="" totalCharCount={Number(row.totalCharCount) || 0} sessionId={String(row.id || '')} mode={row.mode === 'compat' ? 'compat' : 'solo'} completed={row.status === 'completed'} /><Structure value={Object.fromEntries(Object.entries(row).filter(([key]) => !['chapters','loveDna'].includes(key)))} /></>;
  if (source === 'nakshatra' && row.decks) return <><AiConsultDecks decks={row.decks as Decks} natal={row.natal as NatalIdentity || null} question={typeof row.question === 'string' ? row.question : undefined} /><Structure value={Object.fromEntries(Object.entries(row).filter(([key]) => !['decks','natal','question'].includes(key)))} /></>;
  const hd = object(row.calculation || object(row.basis).chart);
  if (source.startsWith('human-design') && Array.isArray(hd.activeGates) && Array.isArray(hd.channels)) return <><BodyGraph chart={hd as HdChart} locale={locale as HdLocale} selection={null} onSelect={() => {}} interactive={false} staticRender /><Structure value={value} /></>;
  if (source === 'chat' && Array.isArray(row.messages)) return <ol className="space-y-4">{row.messages.map((message,index) => {
    const entry = object(message), role = entry.role || entry.speaker;
    return <li key={index} className="rounded-[var(--cd-r-card)] border border-[var(--cd-border)] p-4"><p className="mb-2 text-sm font-semibold">{role === 'user' ? '나의 질문' : role === 'system' ? '상담 안내' : row.characterId === 'neo' ? '네오' : '연이'}</p><Structure value={entry.content || entry.text || entry.message} /><Structure value={Object.fromEntries(Object.entries(entry).filter(([key]) => !['content','text','message','speaker','role','kind','id'].includes(key)))} /></li>;
  })}</ol>;
  if (!Object.keys(row).length && typeof value !== 'string') return <p>{c.noBody}</p>;
  return <div data-saved-service={serviceId} className="space-y-6"><Structure value={value} /></div>;
}
