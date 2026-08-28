import type { LineupSkillSelectedPlayer } from "../types/lineup";
import { getLineupSkillPlayerOdds, type LineupSkillPlayerOdds } from "./lineupOdds";

export function useLineupPlayerOdds(player: LineupSkillSelectedPlayer): {
  odds: LineupSkillPlayerOdds | null;
  loading: boolean;
} {
  return {
    odds: getLineupSkillPlayerOdds(player),
    loading: false,
  };
}
