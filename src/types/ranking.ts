export type RankingCategory = "hitter" | "pitcher_starter";

export type StoredSkillSet = {
  mode: "hitter" | "starter";
  cardType: "impact" | "signature" | "goldenGlove" | "national";
  skillIds: [string, string, string];
  skillLevels: [number, number, number];
};

export type SeasonStatus = "upcoming" | "active" | "ended";

export type Season = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status: SeasonStatus;
  created_at: string;
};

export type SeasonEntry = {
  id: string;
  user_id: string;
  season_id: string;
  category: RankingCategory;
  current_skills: StoredSkillSet;
  current_score: number;
  score_reached_at: string;
  created_at: string;
  updated_at: string;
};

export type DailyRollLog = {
  id: string;
  entry_id: string;
  roll_date_kst: string;
  before_skills: StoredSkillSet;
  rolled_skills: StoredSkillSet;
  selected_result: "keep" | "replace";
  final_skills: StoredSkillSet;
  final_score: number;
  created_at: string;
};

export type PendingDailyRoll = {
  id: string;
  entry_id: string;
  roll_date_kst: string;
  before_skills: StoredSkillSet;
  before_score: number;
  rolled_skills: StoredSkillSet;
  rolled_score: number;
  created_at: string;
};

export type RankingRow = {
  entry_id: string;
  season_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  category: RankingCategory;
  current_skills: StoredSkillSet;
  current_score: number;
  score_reached_at: string;
  rank_position: number;
};
