export const STORY_GENRES = ["명리학", "타로", "자미두수", "점성술", "숙요점"] as const;

export type StoryGenre = (typeof STORY_GENRES)[number];
export type StoryStatus = "ongoing" | "completed";

export interface IStory {
  _id: string;
  title: string;
  slug: string;
  description: string;
  coverImage?: string;
  genre: StoryGenre[];
  tags: string[];
  author: string;
  status: StoryStatus;
  totalChapters: number;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface IChapter {
  _id: string;
  storyId: string;
  slug: string;
  chapterNumber: number;
  title: string;
  content: string;
  wordCount: number;
  viewCount: number;
  publishedAt: string;
  createdAt: string;
}

export interface ChapterNav {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  title: string;
  href: string;
}

export interface Bookmark {
  storyId: string;
  chapterId: string;
  chapterNumber: number;
  scrollPosition: number;
  note?: string;
  createdAt: string;
}

export interface IReadingProgress {
  storyId: string;
  lastChapterId: string;
  lastChapterNumber: number;
  scrollPosition: number;
  bookmarks: Bookmark[];
  updatedAt: string;
}
