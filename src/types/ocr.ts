import type { CalculatorMode, CardType, SkillGrade, SkillLevel, StarterHand } from ".";

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
  icon_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  text_roi?: [number, number, number, number];
  level_roi?: [number, number, number, number];
  level_rule?: {
    green_pixels: number;
    white_pixels: number;
    left_bottom: number;
    top: number;
    right: number;
  };
};

export type SkillOcrApiLineupRow = {
  row: number;
  player: string;
  team: string | null;
  position: string | null;
  card_type: string | null;
  skills: SkillOcrApiSkill[];
  player_raw_text?: string;
  player_roi?: [number, number, number, number];
  team_raw_text?: string;
  team_roi?: [number, number, number, number];
  position_raw_text?: string;
  position_roi?: [number, number, number, number] | null;
  base_team?: string | null;
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
  starterHand?: StarterHand;
  cardType: CardType;
  calculatorMode: CalculatorMode;
  skills: SkillOcrSelectedSkill[];
  totalScore: number;
  pitcherScores?: {
    starterRight: number;
    starterLeft: number;
    middle: number;
    closer: number;
  };
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

export type SkillChangeSkill = {
  slot: number;
  name: string | null;
  level: number | null;
};

export type SkillChangeResponse = {
  ok: boolean;
  request_id: string | null;
  image: {
    path: string;
    width: number;
    height: number;
  };
  left: SkillChangeSkill[];
  right: SkillChangeSkill[];
  debug_artifacts?: {
    overview_image?: string;
  };
};
