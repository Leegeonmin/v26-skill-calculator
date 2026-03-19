import SkillSelect from "../components/SkillSelect";
import type { GameDataSet } from "../data/gameData";
import type { CardType, SkillLevel, SkillMeta } from "../types";

type SelectedSkillMetaMap = {
  skill1?: SkillMeta;
  skill2?: SkillMeta;
  skill3?: SkillMeta;
};

interface CalculatorViewProps {
  gameData: GameDataSet;
  activeCardType: CardType;
  resultGradeColor: string;
  judgeGrade: string;
  totalScore: number;
  matchedPercentLabel: string;
  selectedSkillMeta: SelectedSkillMetaMap;
  rolledSkillColors: {
    skill1: string;
    skill2: string;
    skill3: string;
  };
  skillScores: {
    skill1?: number;
    skill2?: number;
    skill3?: number;
  };
  filteredSkills: SkillMeta[];
  resolvedSkill1: string;
  resolvedSkill2: string;
  resolvedSkill3: string;
  level1: SkillLevel;
  level2: SkillLevel;
  level3: SkillLevel;
  setSkill1: (skillId: string) => void;
  setSkill2: (skillId: string) => void;
  setSkill3: (skillId: string) => void;
  setLevel1: (level: SkillLevel) => void;
  setLevel2: (level: SkillLevel) => void;
  setLevel3: (level: SkillLevel) => void;
  getSkillScoreLabel: (score: number | undefined) => string;
}

export default function CalculatorView({
  gameData,
  activeCardType,
  resultGradeColor,
  judgeGrade,
  totalScore,
  matchedPercentLabel,
  selectedSkillMeta,
  rolledSkillColors,
  skillScores,
  filteredSkills,
  resolvedSkill1,
  resolvedSkill2,
  resolvedSkill3,
  level1,
  level2,
  level3,
  setSkill1,
  setSkill2,
  setSkill3,
  setLevel1,
  setLevel2,
  setLevel3,
  getSkillScoreLabel,
}: CalculatorViewProps) {
  return (
    <>
      <div className="mobile-live-summary">
        <div className="mobile-live-summary-head">
          <strong>현재 결과</strong>
          <span style={{ color: resultGradeColor }}>{judgeGrade}</span>
        </div>
        <div className="mobile-live-summary-stats">
          <div>점수 {gameData ? totalScore : "-"}</div>
          <div>확률 {matchedPercentLabel}</div>
        </div>
        <div className="mobile-skill-chip-list">
          <span className="mobile-skill-chip" style={{ color: rolledSkillColors.skill1 }}>
            {selectedSkillMeta.skill1?.name ?? "-"} · {skillScores.skill1 ?? "-"}
          </span>
          <span className="mobile-skill-chip" style={{ color: rolledSkillColors.skill2 }}>
            {selectedSkillMeta.skill2?.name ?? "-"} · {skillScores.skill2 ?? "-"}
          </span>
          <span className="mobile-skill-chip" style={{ color: rolledSkillColors.skill3 }}>
            {selectedSkillMeta.skill3?.name ?? "-"} · {skillScores.skill3 ?? "-"}
          </span>
        </div>
      </div>

      <div className="skill-grid">
        <div className="skill-col">
          <SkillSelect
            label={activeCardType === "impact" ? "스킬 1 (고정)" : "스킬 1"}
            value={resolvedSkill1}
            options={filteredSkills}
            slotNumber={1}
            excludedSkillIds={[resolvedSkill2, resolvedSkill3]}
            onChange={setSkill1}
            metaText={getSkillScoreLabel(skillScores.skill1)}
          />
          <select
            value={level1}
            onChange={(e) => setLevel1(Number(e.target.value) as SkillLevel)}
            disabled={activeCardType === "impact"}
          >
            {[5, 6, 7, 8].map((level) => (
              <option key={level} value={level}>
                {level} 레벨
              </option>
            ))}
          </select>
        </div>

        <div className="skill-col">
          <SkillSelect
            label="스킬 2"
            value={resolvedSkill2}
            options={filteredSkills}
            slotNumber={2}
            excludedSkillIds={[resolvedSkill1, resolvedSkill3]}
            onChange={setSkill2}
            metaText={getSkillScoreLabel(skillScores.skill2)}
          />
          <select value={level2} onChange={(e) => setLevel2(Number(e.target.value) as SkillLevel)}>
            {[5, 6, 7, 8].map((level) => (
              <option key={level} value={level}>
                {level} 레벨
              </option>
            ))}
          </select>
        </div>

        <div className="skill-col">
          <SkillSelect
            label="스킬 3"
            value={resolvedSkill3}
            options={filteredSkills}
            slotNumber={3}
            excludedSkillIds={[resolvedSkill1, resolvedSkill2]}
            onChange={setSkill3}
            metaText={getSkillScoreLabel(skillScores.skill3)}
          />
          <select value={level3} onChange={(e) => setLevel3(Number(e.target.value) as SkillLevel)}>
            {[5, 6, 7, 8].map((level) => (
              <option key={level} value={level}>
                {level} 레벨
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
