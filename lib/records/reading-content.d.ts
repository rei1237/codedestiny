export type SavedSection = {title:string;body:string};
export function asRecord(value:unknown):Record<string,unknown>;
export function asList(value:unknown):unknown[];
export function storedText(value:unknown):string;
export function readingLabel(key:string,locale?:string):string;
export function parseSavedText(value:unknown):unknown;
export function readingSections(value:unknown,options?:{locale?:string;omit?:string[];fields?:string[];labels?:Record<string,string>}):SavedSection[];


export function savedReadingModel(value:unknown):unknown;
