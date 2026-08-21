import type { SkillMeta } from "../types";
import { normalizeSkillBaseName } from "./skillChangeRollCore";

export type HitterTableSetterRunRange = "142-plus" | "130-141" | "129-below";
export type HitterFiveToolRange =
  | "275-299"
  | "267-274"
  | "250-266"
  | "234-249"
  | "225-233"
  | "200-224";

export const HITTER_TABLE_SETTER_RUN_OPTIONS: Array<{
  value: HitterTableSetterRunRange;
  label: string;
  marker: string;
}> = [
  { value: "142-plus", label: "주루 142+", marker: "주루142+" },
  { value: "130-141", label: "주루 130~141", marker: "주루130~141" },
  { value: "129-below", label: "주루 129이하", marker: "주루129이하" },
];

export const HITTER_FIVE_TOOL_RANGE_OPTIONS: Array<{
  value: HitterFiveToolRange;
  label: string;
  marker: string;
}> = [
  { value: "275-299", label: "275~299", marker: "275299" },
  { value: "267-274", label: "267~274", marker: "267274" },
  { value: "250-266", label: "250~266", marker: "250266" },
  { value: "234-249", label: "234~249", marker: "234249" },
  { value: "225-233", label: "225~233", marker: "225233" },
  { value: "200-224", label: "200~224", marker: "200224" },
];

interface HitterConditionalSkillParams {
  tableSetterRunRange: HitterTableSetterRunRange;
  fiveToolRange: HitterFiveToolRange;
}

export function isHitterConditionalSkillEligible(
  skill: SkillMeta,
  {
    tableSetterRunRange,
    fiveToolRange,
  }: HitterConditionalSkillParams
) {
  const compactName = skill.name.replace(/\s+/g, "");
  if (compactName.includes("타순배치X") || compactName.includes("타선배치X")) {
    return false;
  }

  const baseName = normalizeSkillBaseName(skill.name);

  if (baseName === "선봉장") {
    const runMarker = HITTER_TABLE_SETTER_RUN_OPTIONS.find(
      (option) => option.value === tableSetterRunRange
    )?.marker;

    return skill.name.includes("타순배치,") && Boolean(runMarker && skill.name.includes(runMarker));
  }

  if (baseName === "5툴플레이어") {
    const rangeMarker = HITTER_FIVE_TOOL_RANGE_OPTIONS.find(
      (option) => option.value === fiveToolRange
    )?.marker;

    return Boolean(rangeMarker && skill.name.includes(rangeMarker));
  }

  return true;
}
