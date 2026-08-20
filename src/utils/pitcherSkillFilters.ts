import type { CalculatorMode, PitcherStaminaRange, SkillMeta } from "../types";
import { normalizeSkillBaseName } from "./skillChangeRollCore";

const STAMINA_RANGE_LABELS: Record<PitcherStaminaRange, string> = {
  "140-149": "140~149",
  "134-139": "134~139",
  "120-133": "120~133",
  "117-119": "117~119",
  "100-116": "100~116",
};

export const PITCHER_STAMINA_RANGE_OPTIONS: Array<{ value: PitcherStaminaRange; label: string }> = [
  { value: "140-149", label: "140~149" },
  { value: "134-139", label: "134~139" },
  { value: "120-133", label: "120~133" },
  { value: "117-119", label: "117~119" },
  { value: "100-116", label: "100~116" },
];

export function isPitcherStaminaSkillEligible(
  skill: SkillMeta,
  mode: CalculatorMode,
  staminaRange: PitcherStaminaRange
) {
  if (mode === "hitter" || normalizeSkillBaseName(skill.name) !== "철완") {
    return true;
  }

  return skill.name.includes(STAMINA_RANGE_LABELS[staminaRange]);
}
