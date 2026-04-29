import type { CalculatorMode, CardType, SkillGrade, SkillLevel } from ".";

export type SkillOcrRole = "hitter" | "pitcher";

export type SkillOcrSession = {
  session_token: string;
  username: string;
  display_name: string | null;
  expires_at: string;
};

export type SkillOcrApiSkill = {
  slot: number;
  name: string | null;
  level: number | null;
  matched: boolean;
  raw_text?: string;
  score?: number | null;
  source?: string;
};

export type SkillOcrApiLineupRow = {
  row: number;
  player: string;
  team: string | null;
  position: string | null;
  card_type: string | null;
  skills: SkillOcrApiSkill[];
};

export type SkillOcrApiResponse = {
  ok: boolean;
  request_id: string | null;
  image: {
    path: string;
    width: number | null;
    height: number | null;
  };
  summary: {
    players: number;
    skills: number;
    matched_skills: number;
    unmatched_skills: number;
    unresolved_saved: number;
  };
  role: "all" | SkillOcrRole;
  base_team: string | null;
  lineup: SkillOcrApiLineupRow[];
  warnings: string[];
};

export type SkillOcrSelectedSkill = {
  slot: number;
  rawName: string | null;
  skillId: string | null;
  skillName: string | null;
  grade?: SkillGrade;
  level: SkillLevel;
  score: number;
  matched: boolean;
  alternatives: Array<{
    skillId: string;
    skillName: string;
  }>;
};

export type SkillOcrSelectedPlayer = {
  sourceRow: number;
  selected: boolean;
  playerName: string;
  team: string | null;
  position: string | null;
  cardType: CardType;
  calculatorMode: CalculatorMode;
  skills: SkillOcrSelectedSkill[];
  totalScore: number;
};

export type SkillOcrSavedUpload = {
  id: string;
  role: SkillOcrRole;
  image_name: string | null;
  request_id: string | null;
  raw_response?: SkillOcrApiResponse;
  selected_players: SkillOcrSelectedPlayer[];
  player_count: number;
  total_score: number;
  average_score: number;
  created_at: string;
  updated_at: string;
};
