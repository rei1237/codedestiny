import type { SajuNewYearChapterBase } from "../common.types";

export type SajuNewYearChapterIIISections = {
  yearlyWealthOverview?: string;
  regularWealthAnalysis?: string;
  sideWealthAnalysis?: string;
  fixedIncomeFlow?: string;
  sideIncomeBonusInvestment?: string;
  easyIncomeTiming?: string;
  largeExpenseTiming?: string;
  favorableInvestmentExpansion?: string;
  lossRiskFlow?: string;
  contractMoneyPromiseCautions?: string;
  wealthSupportingElements?: string;
  wealthBlockingElements?: string;
  moneySavingMethod?: string;
  moneyHabitToAvoid?: string;
  oneLineStrategy?: string;
};

export type SajuNewYearChapterIIIWealth = SajuNewYearChapterBase<
  "III",
  SajuNewYearChapterIIISections
>;
