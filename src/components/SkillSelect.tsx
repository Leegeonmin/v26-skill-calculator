import { useMemo, useState } from "react";
import type { SkillMeta } from "../types";
import { SKILL_GRADE_COLORS, SKILL_GRADE_DARK_COLORS } from "../data/uiColors";
import { normalizeSkillBaseName } from "../utils/skillChangeRollCore";

interface SkillSelectProps {
  label: string;
  value: string;
  options: SkillMeta[];
  excludedSkillIds?: string[];
  onChange: (skillId: string) => void;
  disabled?: boolean;
  metaText?: string;
  slotNumber?: number;
  collapseOnMobileAfterSelect?: boolean;
}

function SkillSelect({
  label,
  value,
  options,
  excludedSkillIds = [],
  onChange,
  disabled = false,
  metaText,
  slotNumber,
  collapseOnMobileAfterSelect = false,
}: SkillSelectProps) {
  const [keyword, setKeyword] = useState("");
  const [isMobileCollapsed, setIsMobileCollapsed] = useState(false);

  const filteredOptions = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();
    const excludedBaseNames = new Set(
      excludedSkillIds
        .map((skillId) => options.find((skill) => skill.id === skillId))
        .filter((skill): skill is SkillMeta => Boolean(skill))
        .map((skill) => normalizeSkillBaseName(skill.name))
    );

    return options.filter((skill) => {
      const isExcluded =
        skill.id !== value &&
        (excludedSkillIds.includes(skill.id) ||
          excludedBaseNames.has(normalizeSkillBaseName(skill.name)));
      if (isExcluded) return false;
      if (!lowerKeyword) return true;
      return skill.name.toLowerCase().includes(lowerKeyword);
    });
  }, [options, excludedSkillIds, keyword, value]);

  const selectedSkill = options.find((skill) => skill.id === value);
  const selectedGrade = selectedSkill?.grade;
  const selectedColor = selectedGrade ? SKILL_GRADE_COLORS[selectedGrade] : "#111827";
  const canCollapseSelection = collapseOnMobileAfterSelect && Boolean(selectedSkill);
  const selectedDarkColor = selectedGrade ? SKILL_GRADE_DARK_COLORS[selectedGrade] : "#b9c5d8";

  return (
    <div
      className={`skill-select ${disabled ? "disabled" : ""} ${
        canCollapseSelection && isMobileCollapsed ? "mobile-collapsed" : ""
      }`}
    >
      <div className="skill-select-head">
        <div className="skill-select-head-main">
          {slotNumber ? <span className="skill-slot-badge">{slotNumber}</span> : null}
          <h3>{label}</h3>
        </div>
        {metaText ? <span className="skill-score-pill">{metaText}</span> : null}
      </div>

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
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className="selected-skill-row">
        <p>현재 선택:</p>
        <span
          className="skill-grade-text"
          style={
            {
              "--skill-grade-color": selectedSkill ? selectedColor : "#7b879c",
              "--skill-grade-dark-color": selectedSkill ? selectedDarkColor : "#b9c5d8",
            } as import("react").CSSProperties
          }
        >
          {selectedSkill?.name ?? "선택 안 됨"}
        </span>
        {metaText ? <small>{metaText.replace("점수 ", "기본 점수 ")}</small> : null}
        {canCollapseSelection ? (
          <button
            type="button"
            className="skill-select-reselect-btn"
            onClick={() => setIsMobileCollapsed(false)}
            disabled={disabled}
          >
            다시 선택
          </button>
        ) : null}
      </div>

      <div className="skill-result-list">
        {filteredOptions.length === 0 ? (
          <div className="skill-empty">검색 결과가 없습니다.</div>
        ) : (
          filteredOptions.map((skill) => {
            const color = SKILL_GRADE_COLORS[skill.grade] ?? "#111827";
            const darkColor = SKILL_GRADE_DARK_COLORS[skill.grade] ?? "#f8fbff";
            const isSelected = skill.id === value;

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => {
                  onChange(skill.id);
                  setKeyword("");
                  if (collapseOnMobileAfterSelect) setIsMobileCollapsed(true);
                }}
                disabled={disabled}
                className={`skill-option ${isSelected ? "selected" : ""}`}
                style={
                  {
                    "--skill-option-color": color,
                    "--skill-option-dark-color": darkColor,
                  } as import("react").CSSProperties
                }
              >
                {skill.name}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SkillSelect;
