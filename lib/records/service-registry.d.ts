export type RecordService = {
  id: string; name: string; model: string; href: string; resultPath: string; featureKey: string;
  group: string; idField: string; collection?: string; character?: string; featured?: boolean;
  description?: string; format?: string; image?: string; hub?: boolean; dynamic?: boolean; where?: Record<string, unknown>;
};
export const RECORD_SERVICES: readonly RecordService[];
export function recordService(id: string): RecordService | undefined;
export function savedRecordPath(source: string, id: string): string;
export const SAVED_FEATURES: Readonly<Record<string, { name: string; href: string; group: string }>>;
