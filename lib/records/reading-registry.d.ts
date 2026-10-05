export type ReadingView = { family:string;entry:string;fields:string[] };
export const READING_SOURCES: Readonly<Record<string,ReadingView>>;
export const READING_FEATURES: Readonly<Record<string,ReadingView>>;
export function readingView(source:string,serviceId:string):ReadingView;

