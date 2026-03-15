import type { CardType } from "../../../types";

export interface CardThresholdRow {
  score: number;
  percent: number;
}

export type CardThresholdTable = Record<CardType, CardThresholdRow[]>;

const IMPACT_THRESHOLDS = [
  { score: 10, percent: 14.06 },
  { score: 12, percent: 9.87 },
  { score: 14, percent: 7.33 },
  { score: 16, percent: 5.15 },
  { score: 18, percent: 3.19 },
  { score: 20, percent: 1.77 },
  { score: 22, percent: 0.94 },
  { score: 24, percent: 0.53 },
  { score: 26, percent: 0.27 },
  { score: 28, percent: 0.15 },
  { score: 30, percent: 0.066 },
  { score: 32, percent: 0.039 },
  { score: 34, percent: 0.02 },
  { score: 36, percent: 0.011 },
];

const SIGNATURE_THRESHOLDS = [
  { score: 24, percent: 36.05 },
  { score: 26, percent: 27.74 },
  { score: 28, percent: 21.36 },
  { score: 30, percent: 16.12 },
  { score: 32, percent: 12.08 },
  { score: 34, percent: 8.61 },
  { score: 36, percent: 5.92 },
  { score: 38, percent: 4.02 },
  { score: 40, percent: 2.73 },
  { score: 42, percent: 1.83 },
  { score: 44, percent: 1.17 },
  { score: 46, percent: 0.73 },
  { score: 48, percent: 0.42 },
  { score: 50, percent: 0.25 },
  { score: 52, percent: 0.14 },
  { score: 54, percent: 0.08 },
];

const NATIONAL_THRESHOLDS = [
  { score: 26, percent: 34.03 },
  { score: 28, percent: 27.26 },
  { score: 30, percent: 21.47 },
  { score: 32, percent: 16.69 },
  { score: 34, percent: 12.69 },
  { score: 36, percent: 9.27 },
  { score: 38, percent: 6.65 },
  { score: 40, percent: 4.69 },
  { score: 42, percent: 3.22 },
  { score: 44, percent: 2.14 },
  { score: 46, percent: 1.38 },
  { score: 48, percent: 0.86 },
  { score: 50, percent: 0.52 },
  { score: 52, percent: 0.31 },
  { score: 54, percent: 0.19 },
  { score: 56, percent: 0.11 },
];

const ALLSTAR_THRESHOLDS = [
  { score: 34, percent: 37.01 },
  { score: 36, percent: 30.82 },
  { score: 38, percent: 25.16 },
  { score: 40, percent: 20.12 },
  { score: 42, percent: 15.73 },
  { score: 44, percent: 12.03 },
  { score: 46, percent: 8.99 },
  { score: 48, percent: 6.6 },
  { score: 50, percent: 4.79 },
  { score: 52, percent: 3.39 },
  { score: 54, percent: 2.33 },
  { score: 56, percent: 1.56 },
  { score: 58, percent: 1.01 },
  { score: 60, percent: 0.63 },
  { score: 62, percent: 0.38 },
  { score: 64, percent: 0.22 },
];

export const CLOSER_CARD_THRESHOLDS: CardThresholdTable = {
  impact: IMPACT_THRESHOLDS,
  signature: SIGNATURE_THRESHOLDS,
  goldenGlove: ALLSTAR_THRESHOLDS,
  national: NATIONAL_THRESHOLDS,
};
