import fixtures from '../../../__tests__/fixtures/ops-hq-fake-cols.cjs';
const { createOpsCols } = fixtures;
export const BUSINESS_ID = 'code-destiny';
export const cols = createOpsCols();
export async function openOpsCollections() { return cols; }
export function isDuplicateKeyError(error) { return Number(error?.code) === 11000; }
