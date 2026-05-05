import { useEffect, useState } from "react";
import type { SkillOcrSelectedPlayer } from "../types/ocr";
import { getSkillOcrPlayerOdds, type SkillOcrPlayerOdds } from "./skillOcrOdds";

export function useSkillOcrPlayerOdds(player: SkillOcrSelectedPlayer): {
  odds: SkillOcrPlayerOdds | null;
  loading: boolean;
} {
  const [odds, setOdds] = useState<SkillOcrPlayerOdds | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setOdds(null);

    const timer = window.setTimeout(() => {
      if (cancelled) {
        return;
      }

      setOdds(getSkillOcrPlayerOdds(player));
      setLoading(false);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    player.calculatorMode,
    player.cardType,
    player.position,
    player.starterHand,
    player.totalScore,
    player.skills.map((skill) => `${skill.skillId ?? ""}:${skill.level}`).join("|"),
  ]);

  return { odds, loading };
}
