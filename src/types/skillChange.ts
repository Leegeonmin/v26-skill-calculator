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
