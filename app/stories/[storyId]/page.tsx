import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChapterList, { ContinueReadingButton, StoryProgressPanel } from "@/components/stories/ChapterList";
import { estimateReadingMinutes, getChaptersByStoryId, getFirstChapterHref, getStoryById, mockStories } from "@/lib/stories/data";
import styles from "../stories.module.css";

type StoryPageProps = {
  params: Promise<{ storyId: string }> | { storyId: string };
};

async function resolveParams(params: StoryPageProps["params"]) {
  return Promise.resolve(params);
}

export function generateStaticParams() {
  return mockStories.map((story) => ({ storyId: story.slug }));
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { storyId } = await resolveParams(params);
  const story = getStoryById(storyId);
  if (!story) return {};
  return {
    title: `${story.title} | CODE DESTINY NOVEL`,
    description: `${story.description} ${story.totalChapters}화 전체 무료 공개로 운명과 선택을 따라가는 Code Destiny 연재소설입니다.`,
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
  const totalMinutes = chapters.reduce((sum, chapter) => sum + estimateReadingMinutes(chapter.wordCount), 0);

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <Link className={styles.backLink} href="/stories">
          ← CODE DESTINY NOVEL
        </Link>

        <section className={styles.detailHero} aria-labelledby="storyTitle">
          <div className={styles.detailCover}>
            {story.coverImage ? <img src={story.coverImage} alt="" loading="lazy" decoding="async" /> : null}
          </div>
          <div className={styles.detailCopy}>
            <span className={styles.kicker}>Free Serial Story</span>
            <h1 className={styles.detailTitle} id="storyTitle">
              {story.title}
            </h1>
            <div className={styles.detailMeta}>
              <span>{story.author}</span>
              {story.genre.map((genre) => (
                <span className={styles.genrePill} key={genre}>
                  {genre}
                </span>
              ))}
              {story.tags.map((tag) => (
                <span className={styles.tagPill} key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <p className={styles.description}>{story.description}</p>
            <div className={styles.detailSummaryRow}>
              <span>{story.totalChapters}화 공개</span>
              <span>무료 공개</span>
              <span>예상 {totalMinutes}분</span>
            </div>
            <StoryProgressPanel chapters={chapters} story={story} />
            <div className={styles.actions}>
              <Link href="/">홈 바로가기</Link>
              <Link href={firstHref}>처음부터 읽기</Link>
              <ContinueReadingButton fallbackHref={firstHref} story={story} />
            </div>
          </div>
        </section>

        <section aria-labelledby="chapterListTitle">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="chapterListTitle">챕터 목록</h2>
              <p>전체 무료 공개 · {chapters.length}화</p>
            </div>
          </div>
          <ChapterList chapters={chapters} story={story} />
        </section>
      </div>
    </main>
  );
}
