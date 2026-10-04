import type { DestinyBiasResultViewModel } from '../../app/saju/destiny-bias/lib/types';
import type { ChemiReport } from '../../app/saju/destiny-bias/engine/chemiReportBridge';

/** Validates the legacy archive's main card, element chart and sections only. */
export declare function isStoredBiasViewModel(value: unknown): value is DestinyBiasResultViewModel;
/** Validates every component and expandable panel used by the Chemi archive. */
export declare function isStoredChemiReport(value: unknown): value is ChemiReport;
