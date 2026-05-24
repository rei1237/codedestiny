export interface VedicChapterSectionLike {
  title?: string;
  body?: string;
}

export interface VedicChapterSampleProps {
  text: string;
  sections: VedicChapterSectionLike[];
}
