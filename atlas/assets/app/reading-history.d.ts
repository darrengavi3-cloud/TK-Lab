export interface ReadingCheckpoint {hash:string;title:string;scroll:number;drawerScroll?:number;at?:number}
export const READING_HISTORY_KEY: string;
export function readingHistorySnapshot(): string;
export function parseReadingHistory(raw:string): ReadingCheckpoint[];
export function rememberReading(entry:ReadingCheckpoint): void;
export function clearReadingHistory(): void;
export function safeReadingReturn(input:string|null,origin:string):string;
