import SkillSelect from "../components/SkillSelect";
import type { CardType, SkillLevel, SkillMeta } from "../types";
import type { ResultGrade } from "../utils/judge";

type SelectedSkillMetaMap = {
  skill1?: SkillMeta;
  skill2?: SkillMeta;
  skill3?: SkillMeta;
};

interface AdvancedSimulatorViewProps {
  activeCardType: CardType;
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
  level1: SkillLevel;
  level2: SkillLevel;
  level3: SkillLevel;
  simRollCount: number;
  simBestScore: number | null;
  simLastMessage: string;
  targetGrade: ResultGrade;
  targetGradeOptions: Array<{ value: ResultGrade; label: string }>;
  setTargetGrade: (grade: ResultGrade) => void;
  setSkill1: (skillId: string) => void;
  setLevel1: (level: SkillLevel) => void;
  setLevel2: (level: SkillLevel) => void;
  setLevel3: (level: SkillLevel) => void;
  onRollOnce: () => void;
  onAutoRoll: () => void;
  getSkillScoreLabel: (score: number | undefined) => string;
}

export default function AdvancedSimulatorView({
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
  simRollCount,
  simBestScore,
  simLastMessage,
  targetGrade,
  targetGradeOptions,
  setTargetGrade,
  setSkill1,
  setLevel1,
  setLevel2,
  setLevel3,
  onRollOnce,
  onAutoRoll,
  getSkillScoreLabel,
}: AdvancedSimulatorViewProps) {
  const hasSimulationResult = simRollCount > 0;

  return (
    <div className="simulation-stack">
      <div className="simulation-actions">
        <div className="simulation-action-buttons">
          <button type="button" className="roll-btn" onClick={onRollOnce}>
            고급스킬변경권 1회 사용
          </button>
          <button type="button" className="roll-btn auto-roll-btn" onClick={onAutoRoll}>
            목표 달성까지 자동 롤
          </button>
        </div>
        <div className="auto-roll-compact">
          <label htmlFor="target-grade">목표 판정등급</label>
          <div className="auto-roll-controls">
            <select
              id="target-grade"
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value as ResultGrade)}
            >
              {targetGradeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="simulation-summary">
        <span>이번 세션 사용 횟수 <strong>{simRollCount}회</strong></span>
        <span>최고 점수 <strong>{simBestScore ?? "-"}</strong></span>
      </div>

      <p className="tool-note tool-note-strong">{simLastMessage}</p>

      <div className="mobile-live-summary">
        <div className="mobile-live-summary-head">
          <strong>현재 결과</strong>
          <span style={{ color: hasSimulationResult ? resultGradeColor : "#7b879c" }}>
            {hasSimulationResult ? judgeGrade : "-"}
          </span>
        </div>
        <div className="mobile-live-summary-stats">
          <div>점수 {hasSimulationResult ? totalScore : "-"}</div>
          <div>확률 {hasSimulationResult ? matchedPercentLabel : "-"}</div>
        </div>
        <div className="mobile-skill-chip-list">
          <span className="mobile-skill-chip" style={{ color: rolledSkillColors.skill1 }}>
            {hasSimulationResult ? selectedSkillMeta.skill1?.name ?? "-" : "-"} ·{" "}
            {hasSimulationResult ? skillScores.skill1 ?? "-" : "-"}
          </span>
          <span className="mobile-skill-chip" style={{ color: rolledSkillColors.skill2 }}>
            {hasSimulationResult ? selectedSkillMeta.skill2?.name ?? "-" : "-"} ·{" "}
            {hasSimulationResult ? skillScores.skill2 ?? "-" : "-"}
          </span>
          <span className="mobile-skill-chip" style={{ color: rolledSkillColors.skill3 }}>
            {hasSimulationResult ? selectedSkillMeta.skill3?.name ?? "-" : "-"} ·{" "}
            {hasSimulationResult ? skillScores.skill3 ?? "-" : "-"}
          </span>
        </div>
      </div>

      {activeCardType === "impact" && (
        <div className="impact-fixed-skill">
          <SkillSelect
            label="임팩트 고정 스킬"
            value={resolvedSkill1}
            options={filteredSkills}
            excludedSkillIds={[resolvedSkill2, resolvedSkill3]}
            onChange={setSkill1}
          />
        </div>
      )}

      <div className="skill-grid">
        <div className="skill-col">
          <div className="rolled-skill-card">
            <div className="rolled-skill-label">
              {activeCardType === "impact" ? "고정 스킬 1" : "롤 결과 스킬 1"}
            </div>
            <strong style={{ color: rolledSkillColors.skill1 }}>
              {hasSimulationResult ? selectedSkillMeta.skill1?.name ?? "-" : "-"}
            </strong>
            <div className="rolled-skill-score">
              {hasSimulationResult ? getSkillScoreLabel(skillScores.skill1) : "점수 -"}
            </div>
          </div>
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
          <div className="rolled-skill-card">
            <div className="rolled-skill-label">롤 결과 스킬 2</div>
            <strong style={{ color: rolledSkillColors.skill2 }}>
              {hasSimulationResult ? selectedSkillMeta.skill2?.name ?? "-" : "-"}
            </strong>
            <div className="rolled-skill-score">
              {hasSimulationResult ? getSkillScoreLabel(skillScores.skill2) : "점수 -"}
            </div>
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
              {hasSimulationResult ? selectedSkillMeta.skill3?.name ?? "-" : "-"}
            </strong>
            <div className="rolled-skill-score">
              {hasSimulationResult ? getSkillScoreLabel(skillScores.skill3) : "점수 -"}
            </div>
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
