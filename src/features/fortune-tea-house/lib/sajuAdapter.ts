import type { FortuneTeaHouseConsultRequest, FortuneTeaSajuSnapshot, FortuneTeaHouseConsultResponse } from "../data/consult";
import * as shared from "@/lib/fortune-tea-house/saju-result-adapter.mjs";
export type FortuneTeaSajuBirthParts = {
  name?: string;
  isLeapMonth?: boolean;
  timezone?: string;
  longitude?: number;
  birthDate?: string;
  birthTime?: string;
  birthTimeUnknown?: boolean;
  calendarType?: "solar" | "lunar";
  gender?: string;
};


export const buildFortuneTeaSajuSnapshot = shared.buildFortuneTeaSajuSnapshot as (request: FortuneTeaHouseConsultRequest) => FortuneTeaSajuSnapshot;
export const buildFortuneTeaSajuSnapshotFromParts = shared.buildFortuneTeaSajuSnapshotFromParts as (parts: FortuneTeaSajuBirthParts) => FortuneTeaSajuSnapshot;
export const buildSajuResultSection = shared.buildSajuResultSection as (snapshot: FortuneTeaSajuSnapshot, request?: FortuneTeaHouseConsultRequest) => FortuneTeaHouseConsultResponse["saju"];
