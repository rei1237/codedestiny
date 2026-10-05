"use client";
import { ArrowUpRight } from 'lucide-react';
import { RECORD_SERVICES } from '@/lib/records/service-registry';
import { useLocale } from '@/lib/i18n/useT';
import { recordsCopy } from '@/lib/records/copy';
import { PriceBadge } from '@/app/components/PriceBadge';
import RecordFrame, { recordButton } from '@/app/records/RecordFrame';
import styles from '@/app/records/records.module.css';

const hubTranslations: Record<string, Record<string, [string, string, string]>> = {
  en: {
    'new-year': ['Year Ahead Consultation', 'When you want to plan your choices and understand the year’s changing rhythm', 'Year overview and advice for each period'],
    karma: ['Patterns of Destiny', 'When you want to reflect on repeated patterns and the meaning of your choices', 'Evidence-based chapters and integrated reading'],
    'love-secret': ['Love Insights', 'When you want to understand your relationship habits and a specific concern', 'Saju-based guidance on your relationship question'],
    'life-book': ['Book of Life', 'When you want to read your temperament and direction over a longer horizon', 'Saju-based life chapter report'],
    tea: ['Yeoni’s Fortune Tea House', 'When you want to calmly untangle a complicated situation', 'Question-led guidance · saved cards or birth chart'],
    neo: ['Neo’s Strategy Room', 'When you want to break a pattern and decide your next action', 'Situation briefing and practical strategy'],
    fusion: ['Fusion Fortune', 'When you want to examine your situation through multiple traditions', 'Six separate readings and a synthesis report'],
    codex: ['Master Book of Connections', 'When you want to understand your relationship patterns or compatibility', 'Personal or compatibility edition · chapter report'],
  },
  ja: {
    tea: ['ヨニの運命の茶屋', '複雑な気持ちや状況を落ち着いて整理したいとき', '質問に沿った解釈と行動のヒント・カードや命式'],
    neo: ['ネオの戦略室', '繰り返す問題を見直し、次の行動を決めたいとき', '状況の整理と実践的な戦略'],
    fusion: ['超融合占い', '複数の占術で今の状況を深く見つめたいとき', '六つの体系別解釈と総合レポート'],
    codex: ['マスター縁の書', '自分の縁のパターンや二人の関係が気になるとき', '個人版または相性版・章別レポート'],
  },
  'zh-CN': {
    tea: ['延伊的命运茶屋', '心绪复杂，想平静地梳理自己的处境时', '围绕问题的解读与行动建议·命盘或卡牌'],
    neo: ['尼奥的策略室', '想打破反复出现的问题，明确下一步行动时', '处境分析与实践策略'],
    fusion: ['超融合运势', '想通过不同占卜体系深入了解自己的处境时', '六种体系的独立解读与综合报告'],
    codex: ['大师姻缘之书', '想了解自己的关系模式或两人的缘分时', '个人版或合盘版·章节报告'],
  },
  'zh-TW': {
    tea: ['延伊的命運茶屋', '心緒複雜，想平靜地梳理自己的處境時', '圍繞問題的解讀與行動建議·命盤或卡牌'],
    neo: ['尼奧的策略室', '想打破反覆出現的問題，明確下一步行動時', '處境分析與實踐策略'],
    fusion: ['超融合運勢', '想透過不同占卜體系深入了解自己的處境時', '六種體系的獨立解讀與綜合報告'],
    codex: ['大師姻緣之書', '想了解自己的關係模式或兩人的緣分時', '個人版或合盤版·章節報告'],
  },
};
export default function ConsultationHub() {
  const locale = useLocale(), c = recordsCopy(locale);
  const renderService = (service: typeof RECORD_SERVICES[number]) => {
    const [name, description, format] = locale === 'ko' ? [service.name, service.description, service.format] : hubTranslations[locale]?.[service.id] || hubTranslations.en[service.id];
    return <article key={service.id} className={styles.consultation} data-service={service.id}>
      <div className={styles.consultArt}><img src={service.image} alt="" width="640" height="360" loading="lazy" /></div>
      <div className={styles.consultCopy}><h2>{name}</h2><p className={styles.consultDescription}>{description}</p><p className={styles.consultFormat}>{format}</p>
        <div className={styles.consultActions}><div className="space-y-1 text-sm font-semibold"><p>{c.price} {service.id === 'codex' && (locale === 'ko' ? '개인판 ' : 'Personal ')}<PriceBadge featureKey={service.featureKey} className="font-semibold text-[var(--cd-accent)]" /></p>{service.id === 'codex' && <p>{locale === 'ko' ? '궁합판 ' : 'Compatibility '}<PriceBadge featureKey="master-love-codex-compat" className="font-semibold text-[var(--cd-accent)]" /></p>}</div><a className={recordButton} href={service.href}>{c.detail}<ArrowUpRight size={16} aria-hidden /></a></div>
      </div>
    </article>;
  };
  return <RecordFrame title={c.hubTitle} lead={c.hubLead} view="hub">
    <div className={styles.featured}>{RECORD_SERVICES.filter(service => service.featured).map(renderService)}</div>
    <div className={styles.secondary}>{RECORD_SERVICES.filter(service => service.hub && !service.featured).map(renderService)}</div>
    <section className={styles.characters}><h2>{c.characters}</h2><p>{c.charactersLead}</p><div className={styles.characterLinks}><a className={recordButton} href="/fortune-chat/?character=yeoni"><img src="/images/fortune-tea-house/flower-pig-honey-hug.webp" alt="" width="48" height="48" loading="lazy" />{c.yeoni}<ArrowUpRight size={16} aria-hidden /></a><a className={recordButton} href="/fortune-chat/?character=neo"><img src="/neo-operation-room/lion-seal-loading.webp" alt="" width="48" height="48" loading="lazy" />{c.neo}<ArrowUpRight size={16} aria-hidden /></a></div></section>
  </RecordFrame>;
}
