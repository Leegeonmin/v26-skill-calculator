import type { CardType } from "../../../types";

export interface CardThresholdRow {
  score: number;
  percent: number;
}

export type CardThresholdTable = Record<CardType, CardThresholdRow[]>;

const IMPACT_THRESHOLDS = [
  { score: 10, percent: 13.83 },
  { score: 12, percent: 9.47 },
  { score: 14, percent: 6.77 },
  { score: 16, percent: 4.73 },
  { score: 18, percent: 2.94 },
  { score: 20, percent: 1.59 },
  { score: 22, percent: 0.82 },
  { score: 24, percent: 0.46 },
  { score: 26, percent: 0.25 },
  { score: 28, percent: 0.13 },
  { score: 30, percent: 0.053 },
  { score: 32, percent: 0.031 },
  { score: 34, percent: 0.017 },
  { score: 36, percent: 0.0071 },
];

const SIGNATURE_THRESHOLDS = [
  { score: 24, percent: 35.81 },
  { score: 26, percent: 26.98 },
  { score: 28, percent: 20.28 },
  { score: 30, percent: 14.97 },
  { score: 32, percent: 11.03 },
  { score: 34, percent: 7.64 },
  { score: 36, percent: 5.08 },
  { score: 38, percent: 3.29 },
  { score: 40, percent: 2.13 },
  { score: 42, percent: 1.35 },
  { score: 44, percent: 0.85 },
  { score: 46, percent: 0.52 },
  { score: 48, percent: 0.28 },
  { score: 50, percent: 0.14 },
  { score: 52, percent: 0.08 },
  { score: 54, percent: 0.05 },
];

export const MIDDLE_CARD_THRESHOLDS: CardThresholdTable = {
  impact: IMPACT_THRESHOLDS,
  signature: SIGNATURE_THRESHOLDS,
  goldenGlove: SIGNATURE_THRESHOLDS,
  national: SIGNATURE_THRESHOLDS,
};
