import type { CardType } from "../types";

export interface CardThresholdRow {
  score: number;
  percent: number;
}

export type CardThresholdTable = Record<CardType, CardThresholdRow[]>;

export const CARD_THRESHOLDS: CardThresholdTable = {
  impact: [
    { score: 8, percent: 17.59 },
    { score: 10, percent: 11.0 },
    { score: 12, percent: 6.41 },
    { score: 14, percent: 4.32 },
    { score: 16, percent: 2.92 },
    { score: 18, percent: 1.81 },
    { score: 20, percent: 1.03 },
    { score: 22, percent: 0.44 },
    { score: 24, percent: 0.13 },
    { score: 26, percent: 0.083 },
    { score: 28, percent: 0.04 },
    { score: 30, percent: 0.0218 },
    { score: 32, percent: 0.0113 },
    { score: 34, percent: 0.0058 },
  ],

  signature: [
    { score: 20, percent: 37.67 },
    { score: 22, percent: 28.01 },
    { score: 24, percent: 20.42 },
    { score: 26, percent: 14.63 },
    { score: 28, percent: 10.26 },
    { score: 30, percent: 7.0 },
    { score: 32, percent: 4.62 },
    { score: 34, percent: 2.96 },
    { score: 36, percent: 1.83 },
    { score: 38, percent: 1.09 },
    { score: 40, percent: 0.62 },
    { score: 42, percent: 0.336 },
    { score: 44, percent: 0.174 },
    { score: 46, percent: 0.086 },
    { score: 48, percent: 0.041 },
    { score: 50, percent: 0.018 },
  ],

  goldenGlove: [
    { score: 22, percent: 34.92 },
    { score: 24, percent: 26.23 },
    { score: 26, percent: 18.79 },
    { score: 28, percent: 14.08 },
    { score: 30, percent: 9.78 },
    { score: 32, percent: 6.69 },
    { score: 34, percent: 4.55 },
    { score: 36, percent: 2.93 },
    { score: 38, percent: 1.9 },
    { score: 40, percent: 1.12 },
    { score: 42, percent: 0.71 },
    { score: 44, percent: 0.406 },
    { score: 46, percent: 0.205 },
    { score: 48, percent: 0.122 },
    { score: 50, percent: 0.063 },
    { score: 52, percent: 0.034 },
  ],

  national: [
    { score: 22, percent: 34.04 },
    { score: 24, percent: 25.49 },
    { score: 26, percent: 19.41 },
    { score: 28, percent: 13.81 },
    { score: 30, percent: 9.14 },
    { score: 32, percent: 6.13 },
    { score: 34, percent: 3.79 },
    { score: 36, percent: 2.57 },
    { score: 38, percent: 1.34 },
    { score: 40, percent: 0.81 },
    { score: 42, percent: 0.41 },
    { score: 44, percent: 0.24 },
    { score: 46, percent: 0.094 },
    { score: 48, percent: 0.045 },
    { score: 50, percent: 0.024 },
    { score: 52, percent: 0.007 },
  ],
};