import { getGameDataSet, type GameDataSet } from "../data/gameData";
import type { CalculatorMode, CardType, SkillLevel, SkillMeta, StarterHand } from "../types";
import type {
  SkillOcrApiLineupRow,
  SkillOcrApiResponse,
  SkillOcrRole,
  SkillOcrSelectedPlayer,
  SkillOcrSelectedSkill,
} from "../types/ocr";
import { getDefaultLevels } from "./toolboxHelpers";

const MAX_SELECTED_PLAYERS = 9;
const OCR_CARD_TYPE_MAP: Record<string, CardType> = {
  impact: "impact",
  signature: "signature",
  golden_glove: "goldenGlove",
  goldenglove: "goldenGlove",
  national: "national",
};

type SkillCandidate = {
  skillId: string;
  skillName: string;
  order: number;
};

export type SkillOcrTransformResult = {
  players: SkillOcrSelectedPlayer[];
  totalScore: number;
  averageScore: number;
};

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[★☆·ㆍ.]/g, "")
    .trim();
}
function getBaseSkillName(value: string | null | undefined): string {
  return normalizeText(value).replace(/\([^)]*\)/g, "");
}

export function normalizeOcrCardType(value: string | null | undefined): CardType {
  const normalized = normalizeText(value);
  return OCR_CARD_TYPE_MAP[normalized] ?? "signature";
}

function normalizeSkillLevel(value: number | null | undefined, fallback: SkillLevel): SkillLevel {
  if (value === 5 || value === 6 || value === 7 || value === 8) {
    return value;
  }

  return fallback;
}

export function getPitcherModeFromPosition(position: string | null | undefined): CalculatorMode {
  const normalized = normalizeText(position);

  if (normalized === "sp") {
    return "starter";
  }

  if (normalized === "cp") {
    return "closer";
  }

  if (normalized === "rp") {
    return "middle";
  }

  return "starter";
}

function getModeForRow(role: SkillOcrRole, row: SkillOcrApiLineupRow): CalculatorMode {
  if (role === "hitter") {
    return "hitter";
  }

  return getPitcherModeFromPosition(row.position);
}

function getDataSetForMode(mode: CalculatorMode, starterHand: StarterHand = "right"): GameDataSet {
  const dataSet =
    mode === "hitter"
      ? getGameDataSet({ playerType: "hitter" })
      : getGameDataSet({ playerType: "pitcher", pitcherRole: mode, starterHand });

  if (!dataSet) {
    throw new Error("스킬 데이터를 불러오지 못했습니다.");
  }

  return dataSet;
}

function findBestSkillCandidate(input: {
  skill: SkillOcrSelectedSkill;
  cardType: CardType;
  dataSet: GameDataSet;
}): SkillCandidate | null {
  const existingSkill =
    input.skill.skillId &&
    input.dataSet.skills.some((skill) => skill.id === input.skill.skillId) &&
    input.dataSet.scoreTable[input.skill.skillId]
      ? {
          skillId: input.skill.skillId,
          skillName:
            input.dataSet.skills.find((skill) => skill.id === input.skill.skillId)?.name ??
            input.skill.skillName ??
            input.skill.rawName ??
            "",
          order: -1,
        }
      : null;

  if (existingSkill) {
    return existingSkill;
  }

  return (
    findSkillCandidates({
      skillName: input.skill.skillName ?? input.skill.rawName,
      cardType: input.cardType,
      level: input.skill.level,
      dataSet: input.dataSet,
    })[0] ?? null
  );
}

function calculatePlayerTotalForDataSet(
  player: SkillOcrSelectedPlayer,
  dataSet: GameDataSet
): number {
  return Number(
    player.skills
      .reduce((sum, skill) => {
        const candidate = findBestSkillCandidate({
          skill,
          cardType: player.cardType,
          dataSet,
        });

        return sum + (candidate ? dataSet.scoreTable[candidate.skillId]?.[skill.level] ?? 0 : 0);
      }, 0)
      .toFixed(2)
  );
}

function calculatePitcherScores(player: SkillOcrSelectedPlayer): SkillOcrSelectedPlayer["pitcherScores"] {
  if (player.calculatorMode === "hitter") {
    return undefined;
  }

  return {
    starterRight: calculatePlayerTotalForDataSet(player, getDataSetForMode("starter", "right")),
    starterLeft: calculatePlayerTotalForDataSet(player, getDataSetForMode("starter", "left")),
    middle: calculatePlayerTotalForDataSet(player, getDataSetForMode("middle")),
    closer: calculatePlayerTotalForDataSet(player, getDataSetForMode("closer")),
  };
}

export function getSkillOcrSkillOptions(player: SkillOcrSelectedPlayer): Array<{
  skillId: string;
  skillName: string;
  grade: SkillMeta["grade"];
}> {
  const dataSet = getDataSetForMode(player.calculatorMode);

  return dataSet.skills
    .filter((skill) => skill.availableCardTypes.includes(player.cardType))
    .sort((first, second) => first.name.localeCompare(second.name, "ko"))
    .map((skill) => ({
      skillId: skill.id,
      skillName: skill.name,
      grade: skill.grade,
    }));
}

function sortCandidates(
  candidates: SkillCandidate[],
  scoreTable: GameDataSet["scoreTable"],
  level: SkillLevel
): SkillCandidate[] {
  return [...candidates].sort((first, second) => {
    const firstPrefersLineupOn =
      first.skillName.includes("타순배치O") || first.skillName.includes("배치O") ? 1 : 0;
    const secondPrefersLineupOn =
      second.skillName.includes("타순배치O") || second.skillName.includes("배치O") ? 1 : 0;

    if (firstPrefersLineupOn !== secondPrefersLineupOn) {
      return secondPrefersLineupOn - firstPrefersLineupOn;
    }

    const firstScore = scoreTable[first.skillId]?.[level] ?? 0;
    const secondScore = scoreTable[second.skillId]?.[level] ?? 0;

    if (firstScore !== secondScore) {
      return secondScore - firstScore;
    }

    return first.order - second.order;
  });
}

function findSkillCandidates(input: {
  skillName: string | null;
  cardType: CardType;
  level: SkillLevel;
  dataSet: GameDataSet;
}): SkillCandidate[] {
  const normalizedName = normalizeText(input.skillName);
  const baseName = getBaseSkillName(input.skillName);

  if (!normalizedName) {
    return [];
  }

  const candidates = input.dataSet.skills
    .map((skill, order) => ({ skill, order }))
    .filter(({ skill }) => {
      const normalizedSkillName = normalizeText(skill.name);
      return normalizedSkillName === normalizedName || getBaseSkillName(skill.name) === baseName;
    });

  const availableCandidates = candidates.filter(({ skill }) =>
    skill.availableCardTypes.includes(input.cardType)
  );
  const sourceCandidates = availableCandidates.length > 0 ? availableCandidates : candidates;

  return sortCandidates(
    sourceCandidates.map(({ skill, order }) => ({
      skillId: skill.id,
      skillName: skill.name,
      order,
    })),
    input.dataSet.scoreTable,
    input.level
  );
}

function buildEmptySkill(slot: number, fallbackLevel: SkillLevel): SkillOcrSelectedSkill {
  return {
    slot,
    rawName: null,
    skillId: null,
    skillName: null,
    level: fallbackLevel,
    score: 0,
    matched: false,
    alternatives: [],
  };
}

function buildSelectedSkill(input: {
  rowSkill: SkillOcrApiLineupRow["skills"][number] | undefined;
  slot: number;
  fallbackLevel: SkillLevel;
  cardType: CardType;
  dataSet: GameDataSet;
}): SkillOcrSelectedSkill {
  if (!input.rowSkill) {
    return buildEmptySkill(input.slot, input.fallbackLevel);
  }

  const level = normalizeSkillLevel(input.rowSkill.level, input.fallbackLevel);
  const candidates = findSkillCandidates({
    skillName: input.rowSkill.name,
    cardType: input.cardType,
    level,
    dataSet: input.dataSet,
  });
  const selectedCandidate = candidates[0] ?? null;
  const score = selectedCandidate ? input.dataSet.scoreTable[selectedCandidate.skillId]?.[level] ?? 0 : 0;
  const selectedMeta = selectedCandidate
    ? input.dataSet.skills.find((skill) => skill.id === selectedCandidate.skillId)
    : undefined;

  return {
    slot: input.slot,
    rawName: input.rowSkill.name,
    skillId: selectedCandidate?.skillId ?? null,
    skillName: selectedCandidate?.skillName ?? input.rowSkill.name,
    grade: selectedMeta?.grade,
    level,
    score,
    matched: Boolean(selectedCandidate),
    alternatives: candidates.map(({ skillId, skillName }) => ({ skillId, skillName })),
  };
}

function getSkillBySlot(row: SkillOcrApiLineupRow, slot: number) {
  return row.skills.find((skill) => skill.slot === slot) ?? row.skills[slot - 1];
}

export function recalculateSkillOcrPlayer(player: SkillOcrSelectedPlayer): SkillOcrSelectedPlayer {
  const dataSet = getDataSetForMode(player.calculatorMode, player.starterHand ?? "right");
  const skills = player.skills.map((skill) => {
    const candidate = findBestSkillCandidate({
      skill,
      cardType: player.cardType,
      dataSet,
    });
    const score = candidate ? dataSet.scoreTable[candidate.skillId]?.[skill.level] ?? 0 : 0;
    const meta: SkillMeta | undefined = candidate
      ? dataSet.skills.find((skillMeta) => skillMeta.id === candidate.skillId)
      : undefined;

    return {
      ...skill,
      skillId: candidate?.skillId ?? null,
      skillName: meta?.name ?? skill.skillName,
      grade: meta?.grade ?? skill.grade,
      score,
      matched: Boolean(candidate),
    };
  });
  const totalScore = Number(
    skills
      .reduce(
        (sum, skill) =>
          sum + (skill.skillId ? dataSet.scoreTable[skill.skillId]?.[skill.level] ?? 0 : 0),
        0
      )
      .toFixed(2)
  );

  return {
    ...player,
    skills,
    totalScore,
    pitcherScores: calculatePitcherScores({
      ...player,
      skills,
      totalScore,
    }),
  };
}

export function calculateSkillOcrSummary(players: SkillOcrSelectedPlayer[]): {
  totalScore: number;
  averageScore: number;
} {
  const selectedPlayers = players.filter((player) => player.selected);
  const totalScore = Number(
    selectedPlayers.reduce((sum, player) => sum + player.totalScore, 0).toFixed(2)
  );
  const averageScore =
    selectedPlayers.length > 0
      ? Number((totalScore / selectedPlayers.length).toFixed(2))
      : 0;

  return { totalScore, averageScore };
}

export function transformSkillOcrResponse(
  response: SkillOcrApiResponse,
  role: SkillOcrRole = response.role === "all" ? "hitter" : response.role
): SkillOcrTransformResult {
  const players = response.lineup.map((row, index) => {
    const calculatorMode = getModeForRow(role, row);
    const dataSet = getDataSetForMode(calculatorMode);
    const cardType = normalizeOcrCardType(row.card_type);
    const defaultLevels = getDefaultLevels(cardType);
    const skills = [1, 2, 3].map((slot) =>
      buildSelectedSkill({
        rowSkill: getSkillBySlot(row, slot),
        slot,
        fallbackLevel: defaultLevels[slot - 1],
        cardType,
        dataSet,
      })
    );
    const player: SkillOcrSelectedPlayer = {
      sourceRow: row.row,
      selected: index < MAX_SELECTED_PLAYERS,
      playerName: row.player,
      team: row.team,
      position: row.position,
      starterHand: role === "pitcher" ? "right" : undefined,
      cardType,
      calculatorMode,
      skills,
      totalScore: 0,
    };

    return recalculateSkillOcrPlayer(player);
  });
  const summary = calculateSkillOcrSummary(players);

  return {
    players,
    ...summary,
  };
}
