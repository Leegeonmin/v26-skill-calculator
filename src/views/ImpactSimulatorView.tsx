import SkillSelect from "../components/SkillSelect";
import type { SkillLevel, SkillMeta } from "../types";

type SelectedSkillMetaMap = {
  skill1?: SkillMeta;
  skill2?: SkillMeta;
  skill3?: SkillMeta;
};

interface ImpactSimulatorViewProps {
  resultGradeColor: string;
  judgeGrade: string;
  totalScore: number | string;
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
  impactSessionRollCount: number;
  impactLastSuccessRollCount: number | null;
  impactLastMessage: string;
  level2: SkillLevel;
  level3: SkillLevel;
  setSkill1: (skillId: string) => void;
  setLevel2: (level: SkillLevel) => void;
  setLevel3: (level: SkillLevel) => void;
  resetImpactChangeSession: () => void;
  onImpactRoll: () => void;
  getSkillScoreLabel: (score: number | undefined) => string;
}

export default function ImpactSimulatorView({
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
  impactSessionRollCount,
  impactLastSuccessRollCount,
  impactLastMessage,
  level2,
  level3,
  setSkill1,
  setLevel2,
  setLevel3,
  resetImpactChangeSession,
  onImpactRoll,
  getSkillScoreLabel,
}: ImpactSimulatorViewProps) {
  return (
    <div className="simulation-stack">
      <div className="simulation-actions">
        <div className="impact-fixed-skill impact-fixed-skill-full">
          <SkillSelect
            label="고정 스킬 1"
            value={resolvedSkill1}
            options={filteredSkills}
            excludedSkillIds={[resolvedSkill2, resolvedSkill3]}
            onChange={(nextSkillId) => {
              setSkill1(nextSkillId);
              resetImpactChangeSession();
            }}
            metaText="임팩트 1스킬 고정"
          />
        </div>

        <div className="simulation-action-buttons simulation-action-buttons-single">
          <button type="button" className="roll-btn" onClick={onImpactRoll}>
            2, 3번 메이저까지 자동 롤
          </button>
        </div>
      </div>

      <div className="simulation-summary">
        <span>누적 사용 횟수 <strong>{impactSessionRollCount}회</strong></span>
        <span>마지막 성공 횟수 <strong>{impactLastSuccessRollCount ?? "-"}</strong></span>
      </div>

      <p className="tool-note tool-note-strong">{impactLastMessage}</p>

      <div className="mobile-live-summary">
        <div className="mobile-live-summary-head">
          <strong>현재 결과</strong>
          <span style={{ color: resultGradeColor }}>{judgeGrade}</span>
        </div>
        <div className="mobile-live-summary-stats">
          <div>점수 {totalScore}</div>
          <div>확률 {matchedPercentLabel}</div>
        </div>
        <div className="mobile-skill-chip-list">
          <span className="mobile-skill-chip" style={{ color: rolledSkillColors.skill1 }}>
            {selectedSkillMeta.skill1?.name ?? "-"} · 고정
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
          <div className="rolled-skill-card">
            <div className="rolled-skill-label">고정 스킬 1</div>
            <strong style={{ color: rolledSkillColors.skill1 }}>
              {selectedSkillMeta.skill1?.name ?? "-"}
            </strong>
            <div className="rolled-skill-score">임팩트 1스킬 고정</div>
          </div>
        </div>

        <div className="skill-col">
          <div className="rolled-skill-card">
            <div className="rolled-skill-label">롤 결과 스킬 2</div>
            <strong style={{ color: rolledSkillColors.skill2 }}>
              {selectedSkillMeta.skill2?.name ?? "-"}
            </strong>
            <div className="rolled-skill-score">{getSkillScoreLabel(skillScores.skill2)}</div>
          </div>
          <select value={level2} onChange={(e) => setLevel2(Number(e.target.value) as SkillLevel)}>
            {[5, 6, 7, 8].map((level) => (
              <option key={level} value={level}>
                {level} 레벨
              </option>
            ))}
          </select>
        </div>

        <div className="skill-col">
          <div className="rolled-skill-card">
            <div className="rolled-skill-label">롤 결과 스킬 3</div>
            <strong style={{ color: rolledSkillColors.skill3 }}>
              {selectedSkillMeta.skill3?.name ?? "-"}
            </strong>
            <div className="rolled-skill-score">{getSkillScoreLabel(skillScores.skill3)}</div>
          </div>
          <select value={level3} onChange={(e) => setLevel3(Number(e.target.value) as SkillLevel)}>
            {[5, 6, 7, 8].map((level) => (
              <option key={level} value={level}>
                {level} 레벨
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
