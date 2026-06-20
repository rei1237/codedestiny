import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterViewer from "@/components/stories/ChapterViewer";
import { getChapter, getChapterNavigation, getChaptersByStoryId, getStoryById, mockStories } from "@/lib/stories/data";

type ChapterPageProps = {
  params: Promise<{ storyId: string; chapterId: string }> | { storyId: string; chapterId: string };
};

async function resolveParams(params: ChapterPageProps["params"]) {
  return Promise.resolve(params);
}

export function generateStaticParams() {
  return mockStories.flatMap((story) =>
    getChaptersByStoryId(story.slug).map((chapter) => ({
      storyId: story.slug,
      chapterId: chapter.slug,
    })),
  );
}

export async function generateMetadata({ params }: ChapterPageProps): Promise<Metadata> {
  const { storyId, chapterId } = await resolveParams(params);
  const story = getStoryById(storyId);
  const chapter = getChapter(storyId, chapterId);
  if (!story || !chapter) return {};
  return {
    title: `${chapter.title} - ${story.title} | CODE DESTINY NOVEL`,
    description: story.description,
    alternates: {
      canonical: `/stories/${story.slug}/${chapter.slug}`,
    },
  };
}

export default async function StoryChapterPage({ params }: ChapterPageProps) {
  const { storyId, chapterId } = await resolveParams(params);
  const story = getStoryById(storyId);
  const chapter = getChapter(storyId, chapterId);
  if (!story || !chapter) notFound();

  const { prev, next } = getChapterNavigation(storyId, chapterId);
  return <ChapterViewer chapter={chapter} next={next} prev={prev} story={story} />;
}
