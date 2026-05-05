import { useEffect, useRef, useState } from "react";
import SkillSelect from "../components/SkillSelect";
import SimulatorSkillCard from "../components/SimulatorSkillCard";
import type { SkillLevel, SkillMeta } from "../types";

type SelectedSkillMetaMap = {
  skill1?: SkillMeta;
  skill2?: SkillMeta;
  skill3?: SkillMeta;
};

type RollingPreviewCard = {
  meta?: SkillMeta;
  name: string;
  scoreLabel: string;
  levelLabel?: string;
  fixed?: boolean;
};

interface ImpactSimulatorViewProps {
  resultGradeColor: string;
  judgeGrade: string;
  totalScore: number | string;
  selectedSkillMeta: SelectedSkillMetaMap;
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
  selectedSkillMeta,
  skillScores,
  filteredSkills,
  resolvedSkill1,
  resolvedSkill2,
  resolvedSkill3,
  impactSessionRollCount,
  impactLastSuccessRollCount,
  level2,
  level3,
  setSkill1,
  setLevel2,
  setLevel3,
  resetImpactChangeSession,
  onImpactRoll,
  getSkillScoreLabel,
}: ImpactSimulatorViewProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [rollingPreview, setRollingPreview] = useState<RollingPreviewCard[]>([]);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const hasSimulationResult = impactSessionRollCount > 0;
  const hasFixedSkill = Boolean(resolvedSkill1 && selectedSkillMeta.skill1);
  const occurrenceLabel =
    hasSimulationResult && impactLastSuccessRollCount !== null
      ? `${impactLastSuccessRollCount}번째`
      : "-";

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getRandomSkill = (excludeMajor = false) => {
    const pool = excludeMajor ? filteredSkills.filter((skill) => skill.grade !== "major") : filteredSkills;

    if (pool.length === 0) {
      return undefined;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  };

  const getRandomPreviewScore = () => `${(Math.random() * 10).toFixed(2)}점`;

  const buildRollingPreview = (): RollingPreviewCard[] => {
    const randomSkill2 = getRandomSkill();
    const randomSkill3 = randomSkill2?.grade === "major" ? getRandomSkill(true) : getRandomSkill();

    return [
      {
        meta: selectedSkillMeta.skill1,
        name: selectedSkillMeta.skill1?.name ?? "-",
        scoreLabel: "임팩트 1스킬 고정",
        fixed: true,
      },
      {
        meta: randomSkill2,
        name: randomSkill2?.name ?? "-",
        scoreLabel: getRandomPreviewScore(),
        levelLabel: `Lv.${level2}`,
      },
      {
        meta: randomSkill3,
        name: randomSkill3?.name ?? "-",
        scoreLabel: getRandomPreviewScore(),
        levelLabel: `Lv.${level3}`,
      },
    ];
  };

  const startRolling = (complete: () => void, duration = 720) => {
    if (!hasFixedSkill) {
      return;
    }

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
    }
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    setIsRolling(true);
    setRollingPreview(buildRollingPreview());

    intervalRef.current = window.setInterval(() => {
      setRollingPreview(buildRollingPreview());
    }, 80);

    timeoutRef.current = window.setTimeout(() => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      setRollingPreview([]);
      complete();
      setIsRolling(false);
      timeoutRef.current = null;
    }, duration);
  };

  const previewSkill1 = rollingPreview[0];
  const previewSkill2 = rollingPreview[1];
  const previewSkill3 = rollingPreview[2];

  return (
    <div className="simulator-content-shell">
      <div className="simulation-stack">
        <div className="simulation-actions">
          <div className="impact-fixed-skill impact-fixed-skill-full impact-fixed-skill-compact">
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
            <button
              type="button"
              className="primary-btn simulation-cta-btn"
              onClick={() => startRolling(onImpactRoll)}
              disabled={!hasFixedSkill || isRolling}
            >
              {isRolling ? "변경 중..." : "2, 3번 메이저까지 자동 롤"}
            </button>
          </div>
        </div>

        <div className="simulation-current-score-card">
          <div className="simulation-current-score-main">
            <span>현재 점수</span>
            <strong>{isRolling ? "..." : hasSimulationResult ? totalScore : "-"}</strong>
          </div>
          <div className="simulation-current-score-meta">
            <div className="simulation-current-score-pill">
              <span>등장 횟수</span>
              <strong>{isRolling ? "..." : occurrenceLabel}</strong>
            </div>
          </div>
        </div>

        <div className="mobile-live-summary">
          <div className="mobile-live-summary-head">
            <strong>현재 결과</strong>
            <span style={{ color: hasSimulationResult && !isRolling ? resultGradeColor : "#7b879c" }}>
              {isRolling ? "..." : hasSimulationResult ? judgeGrade : "-"}
            </span>
          </div>
          <div className="mobile-live-summary-stats">
            <div>점수 {isRolling ? "..." : hasSimulationResult ? totalScore : "-"}</div>
            <div>등장 {isRolling ? "..." : occurrenceLabel}</div>
          </div>
          <div className="mobile-simulator-card-list">
            <SimulatorSkillCard
              slot={1}
              label="고정 스킬"
              meta={isRolling ? previewSkill1?.meta : selectedSkillMeta.skill1}
              name={isRolling ? previewSkill1?.name ?? "-" : selectedSkillMeta.skill1?.name ?? "-"}
              scoreLabel={isRolling ? previewSkill1?.scoreLabel ?? "점수 -" : "임팩트 1스킬 고정"}
              fixed
              compact
              hideLabel
            />
            <SimulatorSkillCard
              slot={2}
              label="롤 결과 스킬"
              meta={isRolling ? previewSkill2?.meta : hasSimulationResult ? selectedSkillMeta.skill2 : undefined}
              name={
                isRolling
                  ? previewSkill2?.name ?? "-"
                  : hasSimulationResult
                    ? selectedSkillMeta.skill2?.name ?? "-"
                    : "-"
              }
              scoreLabel={
                isRolling
                  ? previewSkill2?.scoreLabel ?? "점수 -"
                  : hasSimulationResult
                    ? getSkillScoreLabel(skillScores.skill2)
                    : "점수 -"
              }
              levelLabel={isRolling ? previewSkill2?.levelLabel : `Lv.${level2}`}
              hidden={!hasSimulationResult && !isRolling}
              compact
              hideLabel
            />
            <SimulatorSkillCard
              slot={3}
              label="롤 결과 스킬"
              meta={isRolling ? previewSkill3?.meta : hasSimulationResult ? selectedSkillMeta.skill3 : undefined}
              name={
                isRolling
                  ? previewSkill3?.name ?? "-"
                  : hasSimulationResult
                    ? selectedSkillMeta.skill3?.name ?? "-"
                    : "-"
              }
              scoreLabel={
                isRolling
                  ? previewSkill3?.scoreLabel ?? "점수 -"
                  : hasSimulationResult
                    ? getSkillScoreLabel(skillScores.skill3)
                    : "점수 -"
              }
              levelLabel={isRolling ? previewSkill3?.levelLabel : `Lv.${level3}`}
              hidden={!hasSimulationResult && !isRolling}
              compact
              hideLabel
            />
          </div>
        </div>

        <div className="skill-grid">
          <div className="skill-col">
            <SimulatorSkillCard
              slot={1}
              label="고정 스킬"
              meta={isRolling ? previewSkill1?.meta : selectedSkillMeta.skill1}
              name={isRolling ? previewSkill1?.name ?? "-" : selectedSkillMeta.skill1?.name ?? "-"}
              scoreLabel={isRolling ? previewSkill1?.scoreLabel ?? "점수 -" : "임팩트 1스킬 고정"}
              fixed
            />
          </div>

          <div className="skill-col">
            <SimulatorSkillCard
              slot={2}
              label="롤 결과 스킬"
              meta={isRolling ? previewSkill2?.meta : hasSimulationResult ? selectedSkillMeta.skill2 : undefined}
              name={
                isRolling
                  ? previewSkill2?.name ?? "-"
                  : hasSimulationResult
                    ? selectedSkillMeta.skill2?.name ?? "-"
                    : "-"
              }
              scoreLabel={
                isRolling
                  ? previewSkill2?.scoreLabel ?? "점수 -"
                  : hasSimulationResult
                    ? getSkillScoreLabel(skillScores.skill2)
                    : "점수 -"
              }
              levelLabel={isRolling ? previewSkill2?.levelLabel : `Lv.${level2}`}
              hidden={!hasSimulationResult && !isRolling}
              hideLabel
            />
            <select
              value={level2}
              onChange={(e) => setLevel2(Number(e.target.value) as SkillLevel)}
              disabled={isRolling}
            >
              {[5, 6, 7, 8].map((level) => (
                <option key={level} value={level}>
                  {level} 레벨
                </option>
              ))}
            </select>
          </div>

          <div className="skill-col">
            <SimulatorSkillCard
              slot={3}
              label="롤 결과 스킬"
              meta={isRolling ? previewSkill3?.meta : hasSimulationResult ? selectedSkillMeta.skill3 : undefined}
              name={
                isRolling
                  ? previewSkill3?.name ?? "-"
                  : hasSimulationResult
                    ? selectedSkillMeta.skill3?.name ?? "-"
                    : "-"
              }
              scoreLabel={
                isRolling
                  ? previewSkill3?.scoreLabel ?? "점수 -"
                  : hasSimulationResult
                    ? getSkillScoreLabel(skillScores.skill3)
                    : "점수 -"
              }
              levelLabel={isRolling ? previewSkill3?.levelLabel : `Lv.${level3}`}
              hidden={!hasSimulationResult && !isRolling}
              hideLabel
            />
            <select
              value={level3}
              onChange={(e) => setLevel3(Number(e.target.value) as SkillLevel)}
              disabled={isRolling}
            >
              {[5, 6, 7, 8].map((level) => (
                <option key={level} value={level}>
                  {level} 레벨
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
