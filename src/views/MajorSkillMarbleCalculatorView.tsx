import { useEffect, useMemo, useState } from "react";
import SkillSelect from "../components/SkillSelect";
import type {
  CalculatorMode,
  CardType,
  HitterBattingSide,
  HitterPositionGroup,
  PitcherStaminaRange,
  SkillLevel,
  SkillMeta,
  StarterHand,
} from "../types";
import type { GameDataSet } from "../data/gameData";
import { SKILL_GRADE_COLORS } from "../data/uiColors";
import { getDefaultLevels } from "../lib/toolboxHelpers";
import { normalizeSkillBaseName } from "../utils/skillChangeRollCore";
import {
  isPitcherStaminaSkillEligible,
  PITCHER_STAMINA_RANGE_OPTIONS,
} from "../utils/pitcherSkillFilters";

interface MajorSkillMarbleCalculatorViewProps {
  mode: CalculatorMode;
  cardType: CardType;
  cardTypeOptions: Array<{ value: CardType; label: string }>;
  hitterPositionGroup: HitterPositionGroup;
  hitterBattingSide: HitterBattingSide;
  starterHand: StarterHand;
  pitcherStaminaRange: PitcherStaminaRange;
  gameData: GameDataSet;
  filteredSkills: SkillMeta[];
  selectedSkillMeta: {
    skill1: SkillMeta | undefined;
    skill2: SkillMeta | undefined;
    skill3: SkillMeta | undefined;
  };
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
  onModeChange: (nextMode: CalculatorMode) => void;
  onHitterBattingSideChange: (nextSide: HitterBattingSide) => void;
  onStarterHandChange: (nextHand: StarterHand) => void;
  onPitcherStaminaRangeChange: (nextRange: PitcherStaminaRange) => void;
  onCardTypeChange: (nextCardType: CardType) => void;
}

type ChangeSlot = 1 | 2 | 3;

type CandidateSkill = {
  skill: SkillMeta;
  score: number;
};

const SLOT_LEVELS: SkillLevel[] = [5, 6, 7, 8];

function formatScore(score: number) {
  return score.toLocaleString("ko-KR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function isCatcherLead(skill: SkillMeta) {
  return normalizeSkillBaseName(skill.name) === "포수리드";
}

function isWorkhorse(skill: SkillMeta) {
  return skill.name.replace(/\s+/g, "").startsWith("마당쇠");
}

function getSkillsForPlayerSide(
  skills: SkillMeta[],
  mode: CalculatorMode,
  battingSide: HitterBattingSide,
  starterHand: StarterHand,
  staminaRange: PitcherStaminaRange
) {
  const nonCatcherLeadSkills = skills.filter((skill) => !isCatcherLead(skill));

  if (mode !== "hitter") {
    return nonCatcherLeadSkills.filter((skill) => {
      if (mode === "starter" && isWorkhorse(skill)) {
        return false;
      }
      if (!isPitcherStaminaSkillEligible(skill, mode, staminaRange)) {
        return false;
      }
      if (skill.name.includes("(좌투)")) {
        return starterHand === "left";
      }
      if (skill.name.includes("(우투)")) {
        return starterHand === "right";
      }

      return true;
    });
  }

  return nonCatcherLeadSkills.filter((skill) => {
    if (skill.name.includes("(좌타)")) {
      return battingSide === "left";
    }
    if (skill.name.includes("(우타)")) {
      return battingSide === "right";
    }
    if (skill.name.includes("(양타)")) {
      return battingSide === "switch";
    }

    return true;
  });
}

function getSkillScore(gameData: GameDataSet, skillId: string, level: SkillLevel) {
  return gameData.scoreTable[skillId]?.[level] ?? 0;
}

function getFilteredSkillReplacement(skill: SkillMeta | undefined, skillPool: SkillMeta[]) {
  if (!skill) {
    return "";
  }

  if (skillPool.some((candidate) => candidate.id === skill.id)) {
    return skill.id;
  }

  const baseName = normalizeSkillBaseName(skill.name);
  return skillPool.find((candidate) => normalizeSkillBaseName(candidate.name) === baseName)?.id ?? "";
}

function getSlotData(input: {
  slot: ChangeSlot;
  selectedSkillMeta: MajorSkillMarbleCalculatorViewProps["selectedSkillMeta"];
  resolvedSkill1: string;
  resolvedSkill2: string;
  resolvedSkill3: string;
  level1: SkillLevel;
  level2: SkillLevel;
  level3: SkillLevel;
}) {
  if (input.slot === 1) {
    return {
      skill: input.selectedSkillMeta.skill1,
      skillId: input.resolvedSkill1,
      level: input.level1,
    };
  }
  if (input.slot === 2) {
    return {
      skill: input.selectedSkillMeta.skill2,
      skillId: input.resolvedSkill2,
      level: input.level2,
    };
  }

  return {
    skill: input.selectedSkillMeta.skill3,
    skillId: input.resolvedSkill3,
    level: input.level3,
  };
}

function CandidateList({ title, items }: { title: string; items: CandidateSkill[] }) {
  return (
    <section className="major-marble-list-section">
      <div className="major-marble-list-head">
        <h3>{title}</h3>
        <span>{items.length.toLocaleString("ko-KR")}개</span>
      </div>
      <div className="major-marble-list">
        {items.length === 0 ? (
          <p className="major-marble-empty">해당 스킬이 없습니다.</p>
        ) : (
          items.map(({ skill, score }) => {
            const color = SKILL_GRADE_COLORS[skill.grade] ?? "var(--text)";

            return (
              <div key={skill.id} className="major-marble-row">
                <strong style={{ color }}>{skill.name}</strong>
                <span>{formatScore(score)}</span>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

function LevelSelect({
  label,
  level,
  onChange,
}: {
  label: string;
  level: SkillLevel;
  onChange: (level: SkillLevel) => void;
}) {
  return (
    <label className="skill-marble-inline-level">
      {label}
      <select value={level} onChange={(event) => onChange(Number(event.target.value) as SkillLevel)}>
        {SLOT_LEVELS.map((item) => (
          <option key={item} value={item}>
            Lv.{item}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function MajorSkillMarbleCalculatorView({
  mode,
  cardType,
  cardTypeOptions,
  hitterBattingSide,
  starterHand,
  pitcherStaminaRange,
  gameData,
  filteredSkills,
  selectedSkillMeta,
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
  onModeChange,
  onHitterBattingSideChange,
  onStarterHandChange,
  onPitcherStaminaRangeChange,
  onCardTypeChange,
}: MajorSkillMarbleCalculatorViewProps) {
  const [changeSlot, setChangeSlot] = useState<ChangeSlot>(1);
  const skillPool = useMemo(
    () => getSkillsForPlayerSide(filteredSkills, mode, hitterBattingSide, starterHand, pitcherStaminaRange),
    [filteredSkills, hitterBattingSide, mode, pitcherStaminaRange, starterHand]
  );

  useEffect(() => {
    const nextSkill1 = getFilteredSkillReplacement(selectedSkillMeta.skill1, skillPool);
    const nextSkill2 = getFilteredSkillReplacement(selectedSkillMeta.skill2, skillPool);
    const nextSkill3 = getFilteredSkillReplacement(selectedSkillMeta.skill3, skillPool);

    if (resolvedSkill1 !== nextSkill1) {
      setSkill1(nextSkill1);
    }
    if (resolvedSkill2 !== nextSkill2) {
      setSkill2(nextSkill2);
    }
    if (resolvedSkill3 !== nextSkill3) {
      setSkill3(nextSkill3);
    }
  }, [
    resolvedSkill1,
    resolvedSkill2,
    resolvedSkill3,
    selectedSkillMeta.skill1,
    selectedSkillMeta.skill2,
    selectedSkillMeta.skill3,
    setSkill1,
    setSkill2,
    setSkill3,
    skillPool,
  ]);

  const changeSlotData = getSlotData({
    slot: changeSlot,
    selectedSkillMeta,
    resolvedSkill1,
    resolvedSkill2,
    resolvedSkill3,
    level1,
    level2,
    level3,
  });
  const currentScore =
    changeSlotData.skillId && changeSlotData.skill?.grade === "major"
      ? getSkillScore(gameData, changeSlotData.skillId, changeSlotData.level)
      : null;
  const marbleResultLevel = getDefaultLevels(cardType)[changeSlot - 1];
  const selectedBaseNames = [selectedSkillMeta.skill1, selectedSkillMeta.skill2, selectedSkillMeta.skill3].map(
    (skill) => (skill ? normalizeSkillBaseName(skill.name) : "")
  );
  const otherSlotBaseNames = new Set(
    selectedBaseNames.filter((baseName, index) => baseName && index !== changeSlot - 1)
  );
  const candidates = useMemo<CandidateSkill[]>(() => {
    if (currentScore == null) {
      return [];
    }

    return skillPool
      .filter((skill) => {
        if (skill.grade !== "major") {
          return false;
        }
        if (skill.id === changeSlotData.skillId) {
          return false;
        }
        if (otherSlotBaseNames.has(normalizeSkillBaseName(skill.name))) {
          return false;
        }

        return gameData.scoreTable[skill.id]?.[marbleResultLevel] != null;
      })
      .map((skill) => ({
        skill,
        score: getSkillScore(gameData, skill.id, marbleResultLevel),
      }))
      .filter((candidate) => candidate.score !== currentScore);
  }, [changeSlotData.skillId, currentScore, gameData, marbleResultLevel, otherSlotBaseNames, skillPool]);
  const higherSkills = candidates
    .filter((candidate) => candidate.score > (currentScore ?? 0))
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
  const lowerSkills = candidates
    .filter((candidate) => candidate.score < (currentScore ?? 0))
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
  const battingSideLabel =
    hitterBattingSide === "switch" ? "양타" : hitterBattingSide === "left" ? "좌타" : "우타";

  return (
    <div className="major-marble-shell">
      <section className="major-marble-hero">
        <div>
          <span>Major Marble</span>
          <h2>메이저 스킬 마블 계산기</h2>
          <p>스킬 3개를 입력하고, 그중 메이저 스킬 하나를 다른 메이저 후보와 비교합니다.</p>
        </div>
        <div className="major-marble-mode-note">
          <strong>{changeSlotData.skill?.name ?? `${changeSlot}번 스킬 선택`}</strong>
          <span>{currentScore == null ? "메이저 스킬 필요" : `${formatScore(currentScore)}점`}</span>
          <small>후보는 Lv.{marbleResultLevel} 기준</small>
        </div>
      </section>

      <section className="major-marble-controls">
        <div className="control-section">
          <label>대상</label>
          <div className="toggle-row toggle-row-modes">
            {[
              ["hitter", "타자"],
              ["starter", "선발"],
              ["middle", "중계"],
              ["closer", "마무리"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`toggle-btn ${mode === value ? "active" : ""}`}
                onClick={() => onModeChange(value as CalculatorMode)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-section">
          <label>카드 타입</label>
          <div className="toggle-row toggle-row-cards">
            {cardTypeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`toggle-btn ${cardType === option.value ? "active" : ""}`}
                onClick={() => onCardTypeChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-section">
          <label>{mode === "hitter" ? "타석" : "투구손"}</label>
          {mode === "hitter" ? (
            <div className="toggle-row skill-marble-hand-row">
              <button
                type="button"
                className={`toggle-btn ${hitterBattingSide === "left" ? "active" : ""}`}
                onClick={() => onHitterBattingSideChange("left")}
              >
                좌타
              </button>
              <button
                type="button"
                className={`toggle-btn ${hitterBattingSide === "right" ? "active" : ""}`}
                onClick={() => onHitterBattingSideChange("right")}
              >
                우타
              </button>
              <button
                type="button"
                className={`toggle-btn ${hitterBattingSide === "switch" ? "active" : ""}`}
                onClick={() => onHitterBattingSideChange("switch")}
              >
                양타
              </button>
            </div>
          ) : (
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${starterHand === "left" ? "active" : ""}`}
                onClick={() => onStarterHandChange("left")}
              >
                좌투
              </button>
              <button
                type="button"
                className={`toggle-btn ${starterHand === "right" ? "active" : ""}`}
                onClick={() => onStarterHandChange("right")}
              >
                우투
              </button>
            </div>
          )}
        </div>

        {mode !== "hitter" && (
          <div className="control-section">
            <label>지구력 구간</label>
            <select
              className="skill-marble-filter-select"
              value={pitcherStaminaRange}
              onChange={(event) => onPitcherStaminaRangeChange(event.target.value as PitcherStaminaRange)}
            >
              {PITCHER_STAMINA_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="major-marble-skill-panel">
        <div className="major-marble-slot-tabs" aria-label="변경할 메이저 스킬 슬롯">
          {[1, 2, 3].map((slot) => {
            const slotData = getSlotData({
              slot: slot as ChangeSlot,
              selectedSkillMeta,
              resolvedSkill1,
              resolvedSkill2,
              resolvedSkill3,
              level1,
              level2,
              level3,
            });
            const canChange = slotData.skill?.grade === "major";

            return (
              <button
                key={slot}
                type="button"
                className={`major-marble-slot-tab ${changeSlot === slot ? "active" : ""}`}
                onClick={() => setChangeSlot(slot as ChangeSlot)}
                disabled={!canChange}
              >
                {slot}번 변경
                <span>{canChange ? "메이저" : "선택 불가"}</span>
              </button>
            );
          })}
        </div>

        <div className="skill-marble-skill-grid">
          <div className="skill-marble-slot-card">
            <SkillSelect
              label="1번 스킬"
              value={resolvedSkill1}
              options={skillPool}
              excludedSkillIds={[resolvedSkill2, resolvedSkill3]}
              onChange={setSkill1}
              metaText={mode === "hitter" ? `${battingSideLabel} 기준` : "스킬 선택"}
              slotNumber={1}
            />
            <LevelSelect label="1번 레벨" level={level1} onChange={setLevel1} />
          </div>
          <div className="skill-marble-slot-card">
            <SkillSelect
              label="2번 스킬"
              value={resolvedSkill2}
              options={skillPool}
              excludedSkillIds={[resolvedSkill1, resolvedSkill3]}
              onChange={setSkill2}
              metaText={mode === "hitter" ? `${battingSideLabel} 기준` : "스킬 선택"}
              slotNumber={2}
            />
            <LevelSelect label="2번 레벨" level={level2} onChange={setLevel2} />
          </div>
          <div className="skill-marble-slot-card">
            <SkillSelect
              label="3번 스킬"
              value={resolvedSkill3}
              options={skillPool}
              excludedSkillIds={[resolvedSkill1, resolvedSkill2]}
              onChange={setSkill3}
              metaText={mode === "hitter" ? `${battingSideLabel} 기준` : "스킬 선택"}
              slotNumber={3}
            />
            <LevelSelect label="3번 레벨" level={level3} onChange={setLevel3} />
          </div>
        </div>
      </section>

      <section className="major-marble-summary-grid">
        <div>
          <span>더 높은 점수 스킬</span>
          <strong>{currentScore == null ? "-" : higherSkills.length.toLocaleString("ko-KR")}</strong>
        </div>
        <div>
          <span>더 낮은 점수 스킬</span>
          <strong>{currentScore == null ? "-" : lowerSkills.length.toLocaleString("ko-KR")}</strong>
        </div>
      </section>

      {currentScore == null ? (
        <div className="major-marble-empty-state">메이저 스킬이 들어간 슬롯을 선택하면 후보 목록이 표시됩니다.</div>
      ) : (
        <div className="major-marble-results">
          <CandidateList title="높은 점수 스킬" items={higherSkills} />
          <CandidateList title="낮은 점수 스킬" items={lowerSkills} />
        </div>
      )}
    </div>
  );
}
