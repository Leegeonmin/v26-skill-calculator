import type { SkillOcrSelectedPlayer } from "../types/ocr";
import { getSkillOcrPlayerOdds, type SkillOcrPlayerOdds } from "./skillOcrOdds";

export function useSkillOcrPlayerOdds(player: SkillOcrSelectedPlayer): {
  odds: SkillOcrPlayerOdds | null;
  loading: boolean;
} {
  return {
    odds: getSkillOcrPlayerOdds(player),
    loading: false,
  };
}
