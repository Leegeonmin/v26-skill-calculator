import { useEffect, useRef, useState } from "react";
import SkillSelect from "../components/SkillSelect";
import SimulatorSkillCard from "../components/SimulatorSkillCard";
import type { CardType, SkillLevel, SkillMeta } from "../types";
import type { ResultGrade } from "../utils/judge";

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

interface AdvancedSimulatorViewProps {
  modeLabel: string;
  cardTypeLabel: string;
  hitterPositionLabel?: string | null;
  activeCardType: CardType;
  resultGradeColor: string;
  judgeGrade: string;
  totalScore: number | string;
  matchedPercentLabel: string;
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
  level1: SkillLevel;
  level2: SkillLevel;
  level3: SkillLevel;
  simRollCount: number;
  simAutoRollOccurrenceCount: number | null;
  targetGrade: ResultGrade;
  targetGradeOptions: Array<{ value: ResultGrade; label: string }>;
  setTargetGrade: (grade: ResultGrade) => void;
  setSkill1: (skillId: string) => void;
  setLevel1: (level: SkillLevel) => void;
  setLevel2: (level: SkillLevel) => void;
  setLevel3: (level: SkillLevel) => void;
  onBackToSetup: () => void;
  onRollOnce: () => void;
  onAutoRoll: () => void;
  getSkillScoreLabel: (score: number | undefined) => string;
}

export default function AdvancedSimulatorView({
  modeLabel,
  cardTypeLabel,
  hitterPositionLabel,
  activeCardType,
  resultGradeColor,
  judgeGrade,
  totalScore,
  matchedPercentLabel,
  selectedSkillMeta,
  skillScores,
  filteredSkills,
  resolvedSkill1,
  resolvedSkill2,
  resolvedSkill3,
  level1,
  level2,
  level3,
  simRollCount,
  simAutoRollOccurrenceCount,
  targetGrade,
  targetGradeOptions,
  setTargetGrade,
  setSkill1,
  setLevel1,
  setLevel2,
  setLevel3,
  onBackToSetup,
  onRollOnce,
  onAutoRoll,
  getSkillScoreLabel,
}: AdvancedSimulatorViewProps) {
  const [isRolling, setIsRolling] = useState(false);
  const [rollingPreview, setRollingPreview] = useState<RollingPreviewCard[]>([]);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const hasSimulationResult = simRollCount > 0;
  const occurrenceLabel =
    hasSimulationResult && simAutoRollOccurrenceCount !== null
      ? `${simAutoRollOccurrenceCount}번째`
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

  const getRandomSkill = () => {
    if (filteredSkills.length === 0) {
      return undefined;
    }

    return filteredSkills[Math.floor(Math.random() * filteredSkills.length)];
  };

  const getRandomPreviewScore = () => `${(Math.random() * 10).toFixed(2)}점`;

  const buildRollingPreview = (): RollingPreviewCard[] => {
    const randomSkill1 = getRandomSkill();
    const randomSkill2 = getRandomSkill();
    const randomSkill3 = getRandomSkill();

    return [
      activeCardType === "impact"
        ? {
            meta: selectedSkillMeta.skill1,
            name: selectedSkillMeta.skill1?.name ?? "-",
            scoreLabel: "임팩트 고정",
            levelLabel: `Lv.${level1}`,
            fixed: true,
          }
        : {
            meta: randomSkill1,
            name: randomSkill1?.name ?? "-",
            scoreLabel: getRandomPreviewScore(),
            levelLabel: `Lv.${level1}`,
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

  const startRolling = (complete: () => void, duration = 640) => {
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
    <div className="simulation-stack">
      <div className="simulation-setup-summary">
        <div className="simulation-setup-summary-copy">
          <strong>현재 시뮬 설정</strong>
          <div className="simulation-setup-summary-tags">
            <span>{modeLabel}</span>
            {hitterPositionLabel ? <span>{hitterPositionLabel}</span> : null}
            <span>{cardTypeLabel}</span>
          </div>
        </div>
        <button type="button" className="ghost-btn" onClick={onBackToSetup}>
          설정 변경
        </button>
      </div>

      <div className="simulation-actions">
        <div className="simulation-action-buttons">
          <button
            type="button"
            className="primary-btn simulation-cta-btn"
            onClick={() => startRolling(onRollOnce)}
            disabled={isRolling}
          >
            <span className="mobile-hidden-label">
              {isRolling ? "롤링 중..." : "고스변 1회 사용"}
            </span>
            <span className="desktop-hidden-label">{isRolling ? "롤링중" : "고스변1회"}</span>
          </button>
          <button
            type="button"
            className="primary-btn auto-roll-btn simulation-cta-btn"
            onClick={() => startRolling(onAutoRoll, 720)}
            disabled={isRolling}
          >
            <span className="mobile-hidden-label">
              {isRolling ? "롤링 중..." : "목표 등급까지 자동 롤"}
            </span>
            <span className="desktop-hidden-label">{isRolling ? "롤링중" : "자동롤"}</span>
          </button>
        </div>
        <div className="auto-roll-compact">
          <label htmlFor="target-grade">목표 예정등급</label>
          <div className="auto-roll-controls">
            <select
              id="target-grade"
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value as ResultGrade)}
              disabled={isRolling}
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

      <div className="simulation-current-score-card">
        <div className="simulation-current-score-main">
          <span>현재 점수</span>
          <strong>{isRolling ? "..." : hasSimulationResult ? totalScore : "-"}</strong>
        </div>
        <div className="simulation-current-score-meta">
          <div className="simulation-current-score-pill">
            <span>기준표 확률</span>
            <strong>{isRolling ? "롤링 중" : hasSimulationResult ? matchedPercentLabel : "-"}</strong>
          </div>
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
          <div>확률 {isRolling ? "롤링 중" : hasSimulationResult ? matchedPercentLabel : "-"}</div>
          <div>등장 {isRolling ? "..." : occurrenceLabel}</div>
        </div>
        <div className="mobile-simulator-card-list">
          <SimulatorSkillCard
            slot={1}
            label={activeCardType === "impact" ? "고정 스킬" : "롤 결과 스킬"}
            meta={isRolling ? previewSkill1?.meta : hasSimulationResult ? selectedSkillMeta.skill1 : undefined}
            name={
              isRolling
                ? previewSkill1?.name ?? "-"
                : hasSimulationResult
                  ? selectedSkillMeta.skill1?.name ?? "-"
                  : "-"
            }
            scoreLabel={
              isRolling
                ? previewSkill1?.scoreLabel ?? "점수 -"
                : hasSimulationResult
                  ? getSkillScoreLabel(skillScores.skill1)
                  : "점수 -"
            }
            levelLabel={isRolling ? previewSkill1?.levelLabel : `Lv.${level1}`}
            fixed={isRolling ? previewSkill1?.fixed : activeCardType === "impact"}
            hidden={!hasSimulationResult && !isRolling}
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
          <SimulatorSkillCard
            slot={1}
            label={activeCardType === "impact" ? "고정 스킬" : "롤 결과 스킬"}
            meta={isRolling ? previewSkill1?.meta : hasSimulationResult ? selectedSkillMeta.skill1 : undefined}
            name={
              isRolling
                ? previewSkill1?.name ?? "-"
                : hasSimulationResult
                  ? selectedSkillMeta.skill1?.name ?? "-"
                  : "-"
            }
            scoreLabel={
              isRolling
                ? previewSkill1?.scoreLabel ?? "점수 -"
                : hasSimulationResult
                  ? getSkillScoreLabel(skillScores.skill1)
                  : "점수 -"
            }
            levelLabel={isRolling ? previewSkill1?.levelLabel : `Lv.${level1}`}
            fixed={isRolling ? previewSkill1?.fixed : activeCardType === "impact"}
            hidden={!hasSimulationResult && !isRolling}
            hideLabel
          />
          <select
            value={level1}
            onChange={(e) => setLevel1(Number(e.target.value) as SkillLevel)}
            disabled={activeCardType === "impact" || isRolling}
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
  );
}
