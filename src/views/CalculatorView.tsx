import { startTransition, useEffect, useMemo, useState } from "react";
import SkillSelect from "../components/SkillSelect";
import type { GameDataSet } from "../data/gameData";
import type { CardType, SkillLevel, SkillMeta } from "../types";
import { SKILL_GRADE_COLORS } from "../data/uiColors";
import { normalizeSkillBaseName } from "../utils/skillChangeRollCore";

type SelectedSkillMetaMap = {
  skill1?: SkillMeta;
  skill2?: SkillMeta;
  skill3?: SkillMeta;
};

type MobileSkillDraft = {
  id: string;
  level: SkillLevel;
};

interface CalculatorViewProps {
  gameData: GameDataSet;
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
  setSkill1: (skillId: string) => void;
  setSkill2: (skillId: string) => void;
  setSkill3: (skillId: string) => void;
  setLevel1: (level: SkillLevel) => void;
  setLevel2: (level: SkillLevel) => void;
  setLevel3: (level: SkillLevel) => void;
  getSkillScoreLabel: (score: number | undefined) => string;
}

function getMobileDefaultLevel(cardType: CardType, selectedCount: number): SkillLevel {
  if (cardType === "goldenGlove") {
    return 6;
  }

  return selectedCount === 0 ? 6 : 5;
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
  const currentSkills = useMemo(
    () =>
      [
        {
          id: resolvedSkill1,
          level: level1,
          meta: selectedSkillMeta.skill1,
          score: skillScores.skill1,
          color: rolledSkillColors.skill1,
        },
        {
          id: resolvedSkill2,
          level: level2,
          meta: selectedSkillMeta.skill2,
          score: skillScores.skill2,
          color: rolledSkillColors.skill2,
        },
        {
          id: resolvedSkill3,
          level: level3,
          meta: selectedSkillMeta.skill3,
          score: skillScores.skill3,
          color: rolledSkillColors.skill3,
        },
      ].filter((skill) => skill.id && skill.meta),
    [
      level1,
      level2,
      level3,
      resolvedSkill1,
      resolvedSkill2,
      resolvedSkill3,
      rolledSkillColors.skill1,
      rolledSkillColors.skill2,
      rolledSkillColors.skill3,
      selectedSkillMeta.skill1,
      selectedSkillMeta.skill2,
      selectedSkillMeta.skill3,
      skillScores.skill1,
      skillScores.skill2,
      skillScores.skill3,
    ]
  );
  const [mobileSelectedSkills, setMobileSelectedSkills] = useState<MobileSkillDraft[]>(() =>
    currentSkills.map((skill) => ({
      id: skill.id,
      level: skill.level,
    }))
  );
  const [mobileKeyword, setMobileKeyword] = useState("");
  const [mobilePendingSkillId, setMobilePendingSkillId] = useState("");
  const [mobilePendingLevel, setMobilePendingLevel] = useState<SkillLevel>(
    getMobileDefaultLevel(activeCardType, 0)
  );

  useEffect(() => {
    startTransition(() => {
      setMobileSelectedSkills(
        currentSkills.map((skill) => ({
          id: skill.id,
          level: skill.level,
        }))
      );
    });
  }, [currentSkills]);

  useEffect(() => {
    const nextDefaultLevel = getMobileDefaultLevel(activeCardType, mobileSelectedSkills.length);
    startTransition(() => {
      setMobilePendingLevel(nextDefaultLevel);
    });
  }, [activeCardType, mobileSelectedSkills.length]);

  const mobileExcludedIds = useMemo(
    () => mobileSelectedSkills.map((skill) => skill.id),
    [mobileSelectedSkills]
  );

  const mobileSearchResults = useMemo(() => {
    const lowerKeyword = mobileKeyword.trim().toLowerCase();
    const selectedBaseNames = new Set(
      mobileSelectedSkills
        .map((selectedSkill) => filteredSkills.find((skill) => skill.id === selectedSkill.id))
        .filter((skill): skill is SkillMeta => Boolean(skill))
        .map((skill) => normalizeSkillBaseName(skill.name))
    );

    return filteredSkills.filter((skill) => {
      if (
        mobileExcludedIds.includes(skill.id) ||
        selectedBaseNames.has(normalizeSkillBaseName(skill.name))
      ) {
        return false;
      }

      if (!lowerKeyword) {
        return true;
      }

      return skill.name.toLowerCase().includes(lowerKeyword);
    });
  }, [filteredSkills, mobileExcludedIds, mobileKeyword, mobileSelectedSkills]);

  const mobilePendingSkill = filteredSkills.find((skill) => skill.id === mobilePendingSkillId);
  const mobilePendingScore = mobilePendingSkillId
    ? gameData.scoreTable[mobilePendingSkillId]?.[mobilePendingLevel]
    : undefined;

  const applyMobileSkills = (nextSkills: MobileSkillDraft[]) => {
    setMobileSelectedSkills(nextSkills);

    const [skillA, skillB, skillC] = nextSkills;

    setSkill1(skillA?.id ?? "");
    setLevel1(skillA?.level ?? getMobileDefaultLevel(activeCardType, 0));
    setSkill2(skillB?.id ?? "");
    setLevel2(skillB?.level ?? getMobileDefaultLevel(activeCardType, 1));
    setSkill3(skillC?.id ?? "");
    setLevel3(skillC?.level ?? getMobileDefaultLevel(activeCardType, 2));
  };

  const handleMobileAdd = () => {
    if (!mobilePendingSkillId || mobileSelectedSkills.length >= 3) {
      return;
    }

    const pendingSkill = filteredSkills.find((skill) => skill.id === mobilePendingSkillId);
    const selectedBaseNames = new Set(
      mobileSelectedSkills
        .map((selectedSkill) => filteredSkills.find((skill) => skill.id === selectedSkill.id))
        .filter((skill): skill is SkillMeta => Boolean(skill))
        .map((skill) => normalizeSkillBaseName(skill.name))
    );

    if (pendingSkill && selectedBaseNames.has(normalizeSkillBaseName(pendingSkill.name))) {
      setMobilePendingSkillId("");
      return;
    }

    const nextSkills = [
      ...mobileSelectedSkills,
      { id: mobilePendingSkillId, level: mobilePendingLevel },
    ];

    applyMobileSkills(nextSkills);
    setMobileKeyword("");
    setMobilePendingSkillId("");
    setMobilePendingLevel(getMobileDefaultLevel(activeCardType, nextSkills.length));
  };

  const handleMobileRemove = (index: number) => {
    const nextSkills = mobileSelectedSkills.filter((_, currentIndex) => currentIndex !== index);
    applyMobileSkills(nextSkills);
  };

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
        <div className="mobile-current-skill-list">
          {mobileSelectedSkills.length === 0 ? (
            <div className="mobile-current-skill-empty">등록된 스킬이 없습니다.</div>
          ) : (
            currentSkills.map((skill, index) => (
              <div key={`${skill.id}-${index}`} className="mobile-current-skill-item">
                <div className="mobile-current-skill-copy">
                  <strong style={{ color: skill.color }}>{skill.meta?.name}</strong>
                  <span>
                    {skill.level}레벨 · {skill.score ?? "-"}
                  </span>
                </div>
                <button
                  type="button"
                  className="mobile-current-skill-remove"
                  onClick={() => handleMobileRemove(index)}
                  aria-label={`${skill.meta?.name} 삭제`}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mobile-calc-builder">
        <div className="mobile-calc-search">
          <div className="skill-search-wrap">
            <span className="skill-search-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="ui-icon">
                <path
                  d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm0-2a8 8 0 1 0 4.9 14.33l4.38 4.39 1.42-1.42-4.39-4.38A8 8 0 0 0 10 2Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <input
              type="text"
              placeholder="스킬 검색"
              value={mobileKeyword}
              onChange={(e) => setMobileKeyword(e.target.value)}
            />
          </div>

          {mobilePendingSkill ? (
            <div className="mobile-pending-skill-card">
              <div className="mobile-pending-skill-copy">
                <strong
                  style={{
                    color: SKILL_GRADE_COLORS[mobilePendingSkill.grade] ?? "#111827",
                  }}
                >
                  {mobilePendingSkill.name}
                </strong>
                <span>레벨을 고른 뒤 입력 버튼을 누르세요.</span>
              </div>
              <button
                type="button"
                className="mobile-pending-skill-reset"
                onClick={() => {
                  setMobilePendingSkillId("");
                  setMobileKeyword("");
                }}
              >
                다시 선택
              </button>
            </div>
          ) : (
            <div className="mobile-calc-search-results">
              {mobileSearchResults.length === 0 ? (
                <div className="skill-empty">검색 결과가 없습니다.</div>
              ) : (
                mobileSearchResults.map((skill) => {
                  const color = SKILL_GRADE_COLORS[skill.grade] ?? "#111827";

                  return (
                    <button
                      key={skill.id}
                      type="button"
                      className="mobile-skill-search-option"
                      style={{ color }}
                      onClick={() => setMobilePendingSkillId(skill.id)}
                    >
                      {skill.name}
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="mobile-calc-add-row">
          <select
            value={mobilePendingLevel}
            onChange={(e) => setMobilePendingLevel(Number(e.target.value) as SkillLevel)}
            disabled={!mobilePendingSkillId}
          >
            {[5, 6, 7, 8].map((level) => (
              <option key={level} value={level}>
                {level} 레벨
              </option>
            ))}
          </select>
          <button
            type="button"
            className="toggle-btn active mobile-calc-add-btn"
            onClick={handleMobileAdd}
            disabled={!mobilePendingSkillId || mobileSelectedSkills.length >= 3}
          >
            입력
          </button>
        </div>

        <div className="mobile-calc-add-meta">
          <span>{mobilePendingSkill?.name ?? "스킬을 선택하세요."}</span>
          <strong>{mobilePendingSkillId ? getSkillScoreLabel(mobilePendingScore) : ""}</strong>
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
