"use client";
import { fusionParagraphs, fusionSubchapters } from "@/lib/fusion-premium-report";
import type { Section } from "./fusion-thread";
import styles from "./fusion-fortune.module.css";
import Image from "next/image";
import { FUSION_NARRATOR_BY_KEY } from "@/lib/fusion-premium-report";
import { masterProfiles } from "@/components/fortune/master-profiles";
export function FusionSectionBody({ section, sectionKey }: { section: Pick<Section, "content" | "subchapters">; sectionKey: string }) {
  const chapters = fusionSubchapters(section) as { title: string; paragraphs: string[] }[];
  const narratorKey = FUSION_NARRATOR_BY_KEY[(sectionKey === "timing" ? "timingAndAction" : sectionKey) as keyof typeof FUSION_NARRATOR_BY_KEY] as keyof typeof masterProfiles;
  const master = masterProfiles[narratorKey];
  const portrait = master ? <figure className={styles.chapterPortrait} aria-hidden="true"><Image src={master.portrait} alt="" width={600} height={720} loading="lazy" /></figure> : null;
  const paragraphs = (items: string[], illustrated = false) => items.map((paragraph, i) => <div key={i}>
    <p className={`my-4 max-w-[72ch] whitespace-pre-wrap ${styles.reading} text-[var(--fx-ink-2)]`}>{paragraph}</p>
    {illustrated && i === Math.floor((items.length - 1) / 2) ? portrait : null}
  </div>);
  if (!chapters.length) return <>{paragraphs(fusionParagraphs(section), true)}</>;
  return <><ol className="my-6 grid list-none gap-1 border-y border-white/15 py-4 pl-0">
    {chapters.map((chapter,index)=><li key={index}><a className="block min-h-11 py-2 text-sm leading-relaxed text-[var(--fx-ink-2)] underline decoration-white/30 underline-offset-4 hover:text-[var(--fx-ink-1)] focus-visible:outline focus-visible:outline-2" href={`#fusion-sub-${sectionKey}-${index}`}>{chapter.title}</a></li>)}
  </ol>{chapters.map((chapter, index) => <section key={index} id={`fusion-sub-${sectionKey}-${index}`} className="scroll-mt-24 py-3" tabIndex={-1}>
    <h4 className="mb-5 mt-6 font-display text-lg leading-relaxed text-[var(--fx-ink-1)]">{chapter.title}</h4>
    {paragraphs(chapter.paragraphs, index === 0)}
  </section>)}</>;
}
