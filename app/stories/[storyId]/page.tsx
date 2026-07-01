import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChapterList, { ContinueReadingButton, StoryProgressPanel } from "@/components/stories/ChapterList";
import { estimateReadingMinutes, getChaptersByStoryId, getFirstChapterHref, getStories, getStoryById } from "@/lib/stories/data";
import styles from "./story-detail.module.css";

type StoryPageProps = {
  params: Promise<{ storyId: string }> | { storyId: string };
};

const STORY_DETAIL_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    metadataTitleSuffix: "CODE DESTINY NOVEL",
    metadataDescription: (description: string, chapters: number) =>
      `${description} ${chapters}화 전체 무료 공개로 운명과 선택을 따라가는 Code Destiny 연재소설입니다.`,
    backLink: "← CODE DESTINY NOVEL",
    kicker: "Free Serial Story",
    published: (chapters: number) => `${chapters}화 공개`,
    free: "무료 공개",
    estimated: (minutes: number) => `예상 ${minutes}분`,
    home: "홈 바로가기",
    start: "처음부터 읽기",
    chapterList: "챕터 목록",
    chapterCount: (chapters: number) => `전체 무료 공개 · ${chapters}화`,
  },
  en: {
    metadataTitleSuffix: "CODE DESTINY NOVEL",
    metadataDescription: (description: string, chapters: number) =>
      `${description} All ${chapters} chapters are free in this Code Destiny serial about fate and choice.`,
    backLink: "← CODE DESTINY NOVEL",
    kicker: "Free Serial Story",
    published: (chapters: number) => `${chapters} chapters open`,
    free: "Free",
    estimated: (minutes: number) => `About ${minutes} min`,
    home: "Go Home",
    start: "Start from the beginning",
    chapterList: "Chapter List",
    chapterCount: (chapters: number) => `All chapters free · ${chapters} chapters`,
  },
  ja: {
    metadataTitleSuffix: "CODE DESTINY NOVEL",
    metadataDescription: (description: string, chapters: number) =>
      `${description} 全${chapters}話を無料公開中。運命と選択を追うCode Destinyの連載小説です。`,
    backLink: "← CODE DESTINY NOVEL",
    kicker: "Free Serial Story",
    published: (chapters: number) => `${chapters}話公開`,
    free: "無料公開",
    estimated: (minutes: number) => `目安 ${minutes}分`,
    home: "ホームへ",
    start: "最初から読む",
    chapterList: "チャプター一覧",
    chapterCount: (chapters: number) => `全話無料公開 · ${chapters}話`,
  },
} as const;

const storyDetailCopy = STORY_DETAIL_PAGE_TEXT_TRANSLATIONS.ko;

async function resolveParams(params: StoryPageProps["params"]) {
  return Promise.resolve(params);
}

export function generateStaticParams() {
  return getStories().map((story) => ({ storyId: story.slug }));
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { storyId } = await resolveParams(params);
  const story = getStoryById(storyId);
  if (!story) return {};
  return {
    title: `${story.title} | ${storyDetailCopy.metadataTitleSuffix}`,
    description: storyDetailCopy.metadataDescription(story.description, story.totalChapters),
    alternates: {
      canonical: `/stories/${story.slug}`,
    },
  };
}

export default async function StoryDetailPage({ params }: StoryPageProps) {
  const { storyId } = await resolveParams(params);
  const story = getStoryById(storyId);
  if (!story) notFound();

  const chapters = getChaptersByStoryId(story.slug);
  const firstHref = getFirstChapterHref(story.slug);
  const genres = Array.isArray(story.genre) ? story.genre : [];
  const tags = Array.isArray(story.tags) ? story.tags : [];
  const totalMinutes = chapters.reduce((sum, chapter) => sum + estimateReadingMinutes(chapter.wordCount), 0);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link className={styles.backLink} href="/stories">
          {storyDetailCopy.backLink}
        </Link>

        <section className={styles.detailHero} aria-labelledby="storyTitle">
          <div className={styles.detailCover}>
            {story.coverImage ? <img src={story.coverImage} alt="" loading="lazy" decoding="async" /> : null}
          </div>
          <div className={styles.detailCopy}>
            <span className={styles.kicker}>{storyDetailCopy.kicker}</span>
            <h1 className={styles.detailTitle} id="storyTitle">
              {story.title}
            </h1>
            <div className={styles.detailMeta}>
              <span>{story.author}</span>
              {genres.map((genre) => (
                <span className={styles.genrePill} key={genre}>
                  {genre}
                </span>
              ))}
              {tags.map((tag) => (
                <span className={styles.tagPill} key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <p className={styles.description}>{story.description}</p>
            <div className={styles.detailSummaryRow}>
              <span>{storyDetailCopy.published(story.totalChapters)}</span>
              <span>{storyDetailCopy.free}</span>
              <span>{storyDetailCopy.estimated(totalMinutes)}</span>
            </div>
            <StoryProgressPanel chapters={chapters} story={story} />
            <div className={styles.actions}>
              <Link href="/">{storyDetailCopy.home}</Link>
              <Link href={firstHref}>{storyDetailCopy.start}</Link>
              <ContinueReadingButton fallbackHref={firstHref} story={story} />
            </div>
          </div>
        </section>

        <section aria-labelledby="chapterListTitle">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="chapterListTitle">{storyDetailCopy.chapterList}</h2>
              <p>{storyDetailCopy.chapterCount(chapters.length)}</p>
            </div>
          </div>
          <ChapterList chapters={chapters} story={story} />
        </section>
      </div>
    </main>
  );
}
