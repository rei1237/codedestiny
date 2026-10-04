"use client";

import { ArrowDown, ArrowRight, ArrowUpRight, Check, Pause } from "lucide-react";
import type { LoadingLocale } from "@/constants/loadingMessages";
import { toDisplayText } from "@/lib/llm-text";
import LlmParagraphs from "@/components/fortune/LlmParagraphs";
import type { NeoBriefing, NeoRefinedOrder } from "../NeoOperationRoomResultPage";
import { neoWarRoomAssets } from "../data/assets";
import { getNeoVisualCopy } from "../data/visual-copy";
import NeoWarRoomAssetImage from "./NeoWarRoomAssetImage";
import styles from "../neo-operation-room-result.module.css";

/** Excerpts only shorten the briefing. Every original field remains in the chapter reader. */
export function neoBriefingExcerpt(value: unknown, max = 220): string {
  const text = toDisplayText(value).trim();
  if (text.length <= max) return text;
  const paragraph = text.split(/\n\s*\n/)[0];
  if (paragraph.length <= max) return `${paragraph}…`;
  const words = Array.from(paragraph);
  return `${words.slice(0, max).join("").trimEnd()}…`;
}

export function NeoBriefingArt({ pose, priority = false }: { pose: "explain" | "caution" | "encourage"; priority?: boolean }) {
  return <NeoWarRoomAssetImage asset={neoWarRoomAssets.briefing[pose]} alt="" fallbackSrc="/neo-operation-room/sprites/transparent/neo-transparent-s1-f01.webp"
    width={480} height={720} fill={false} priority={priority} loading={priority ? "eager" : "lazy"}
    sizes="(max-width: 680px) 112px, 200px" style={{ background: "transparent" }} className={styles.briefingArt} imageClassName={styles.briefingArtImage} />;
}

function Text({ value }: { value: unknown }) {
  const text = neoBriefingExcerpt(value);
  return text ? <LlmParagraphs text={text} /> : null;
}

function Points({ values }: { values?: string[] }) {
  const items = (values || []).map(item => toDisplayText(item)).filter(Boolean);
  return items.length ? <ul>{items.map((item, index) => <li key={index}>{neoBriefingExcerpt(item, 160)}</li>)}</ul> : null;
}

export default function NeoVisualBriefing({ briefing, refined, locale }: {
  briefing: NeoBriefing;
  refined: NeoRefinedOrder | null;
  locale: LoadingLocale;
}) {
  const copy = getNeoVisualCopy(locale);
  const repeated = briefing.repeatedChoice || briefing.repeatedPattern;
  const friction = briefing.misalignedFlow || briefing.currentProblem;
  const pattern = [
    { label: copy.repeated, text: repeated?.description },
    { label: copy.pressure, text: friction?.description },
    { label: copy.strategy, text: briefing.originalStrategy?.description },
  ].filter(item => toDisplayText(item.text));
  const strengths = briefing.innateStrength?.strongPoints?.filter(item => toDisplayText(item)) || [];
  const cautions = briefing.innateStrength?.weakPoints?.filter(item => toDisplayText(item)) || [];
  const mutual = briefing.mutualRead;
  const sides = [
    { label: copy.towardPartner, data: mutual?.towardPartner },
    { label: copy.towardMe, data: mutual?.towardMe },
  ].filter(item => toDisplayText(item.data?.description) || item.data?.signals?.length);
  const conflict = briefing.conflictPattern;
  const refinedSteps = refined?.actionAlternatives?.filter(item => toDisplayText(item.action)) || [];
  const missions = briefing.sevenDayMission?.filter(item => toDisplayText(item.mission)) || [];
  const relationSteps = briefing.relationStrategy?.steps?.filter(item => toDisplayText(item.doThis) || toDisplayText(item.avoidThis)) || [];
  const forbidden = refined?.forbiddenAction || briefing.forbiddenAction;
  const closing = refined?.tsundereClosing || briefing.tsundereClosing || briefing.nextStepPrompt;
  const hasVisuals = strengths.length || cautions.length || pattern.length || sides.length || refinedSteps.length || missions.length || relationSteps.length || toDisplayText(forbidden?.reason) || toDisplayText(closing) || briefing.topicTiming?.windows?.length || briefing.methodEvidence?.length;
  if (!hasVisuals) return null;
  return (
    <section className={styles.visualBriefing} aria-label={copy.title} data-neo-pdf-page>
      {(strengths.length || cautions.length) ? (
        <section className={styles.strengthComparison}>
          {strengths.length ? <div><h2><Check aria-hidden="true" />{copy.strengths}</h2><Points values={strengths} /></div> : null}
          {cautions.length ? <div><h2><Pause aria-hidden="true" />{copy.cautions}</h2><Points values={cautions} /></div> : null}
        </section>
      ) : null}
      {pattern.length ? (
        <section className={styles.patternSection}>
          <h2>{copy.pattern}</h2>
          <ol className={styles.patternFlow}>
            {pattern.map((item, index) => <li key={item.label}><h3>{item.label}</h3><Text value={item.text} />
              {index < pattern.length - 1 ? <ArrowRight className={styles.flowArrow} aria-hidden="true" /> : null}</li>)}
          </ol>
        </section>
      ) : null}
      {sides.length ? (
        <section className={styles.relationshipSection}>
          <h2>{copy.relationship}</h2>
          <div className={styles.relationshipMap}>
            {sides.map(side => <div key={side.label}><h3><ArrowUpRight aria-hidden="true" />{side.label}</h3><Text value={side.data?.description} /><Points values={side.data?.signals} /></div>)}
          </div>
          {mutual?.coreKeyword ? <p className={styles.relationshipKeyword}>{toDisplayText(mutual.coreKeyword)}</p> : null}
        </section>
      ) : null}
      {conflict?.dialogue?.length ? (
        <section className={styles.dialogueSection}>
          <h2>{copy.dialogue}</h2>
          <ol className={styles.dialogueLines}>{conflict.dialogue.filter(item => toDisplayText(item.line)).map((line, index) =>
            <li key={index} data-side={index % 2 ? "right" : "left"}><strong>{toDisplayText(line.speaker)}</strong><Text value={line.line} /></li>)}</ol>
          {conflict.resolution ? <div className={styles.dialogueResolution}><ArrowDown aria-hidden="true" /><Text value={conflict.resolution} /></div> : null}
        </section>
      ) : null}
      {(refinedSteps.length || missions.length || relationSteps.length) ? (
        <section className={styles.missionSection}>
          <h2>{refinedSteps.length ? copy.timing : copy.mission}</h2>
          <ol className={styles.actionTimeline}>
            {refinedSteps.length ? refinedSteps.map((step, index) => <li key={index}><h3>{toDisplayText(step.timing) || copy.steps}</h3><Text value={step.action} />{step.rationale ? <p className={styles.timelineReason}>{neoBriefingExcerpt(step.rationale, 160)}</p> : null}</li>)
              : relationSteps.length ? relationSteps.map((step, index) => <li key={index}><h3>{toDisplayText(step.stage) || copy.steps}</h3><Text value={step.doThis} />{step.avoidThis ? <p className={styles.timelineReason}>{neoBriefingExcerpt(step.avoidThis, 160)}</p> : null}</li>)
                : missions.map((step, index) => <li key={index}><h3>{locale === "en" ? `${copy.day} ${step.day || index + 1}` : `${step.day || index + 1}${copy.day}`}</h3><Text value={step.mission} /></li>)}
          </ol>
        </section>
      ) : null}
      {briefing.topicTiming?.windows?.length ? <section className={styles.timingWindows}><h2>{toDisplayText(briefing.topicTiming.title) || copy.timing}</h2><Points values={briefing.topicTiming.windows} /></section> : null}
      {toDisplayText(forbidden?.reason) ? (
        <section className={styles.neoGuidance} data-pose="caution">
          <NeoBriefingArt pose="caution" /><div><h2>{toDisplayText(forbidden?.title) || copy.caution}</h2><Text value={forbidden?.reason} /></div>
        </section>
      ) : null}
      {(refined?.verdictBasis || briefing.methodEvidence?.length) ? (
        <section className={styles.evidenceSection}><h2>{copy.evidence}</h2>
          {refined?.verdictBasis ? <Text value={refined.verdictBasis} /> : briefing.methodEvidence?.map((item, index) =>
            <div key={index}><h3>{toDisplayText(item.label)}</h3><Text value={item.summary} /></div>)}
        </section>
      ) : null}
      {toDisplayText(closing) ? <section className={styles.neoGuidance} data-pose="encourage"><NeoBriefingArt pose="encourage" /><div><h2>{copy.closing}</h2><Text value={closing} /></div></section> : null}
    </section>
  );
}
