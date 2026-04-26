import { useMemo, useState } from "react";
import type { SkillMeta } from "../types";
import { SKILL_GRADE_COLORS } from "../data/uiColors";

interface SkillSelectProps {
  label: string;
  value: string;
  options: SkillMeta[];
  excludedSkillIds?: string[];
  onChange: (skillId: string) => void;
  disabled?: boolean;
  metaText?: string;
  slotNumber?: number;
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
}: SkillSelectProps) {
  const [keyword, setKeyword] = useState("");

  const filteredOptions = useMemo(() => {
    const lowerKeyword = keyword.trim().toLowerCase();

    return options.filter((skill) => {
      const isExcluded = excludedSkillIds.includes(skill.id) && skill.id !== value;
      if (isExcluded) return false;
      if (!lowerKeyword) return true;
      return skill.name.toLowerCase().includes(lowerKeyword);
    });
  }, [options, excludedSkillIds, keyword, value]);

  const selectedSkill = options.find((skill) => skill.id === value);
  const selectedGrade = selectedSkill?.grade;
  const selectedColor = selectedGrade ? SKILL_GRADE_COLORS[selectedGrade] : "#111827";

  return (
    <div className={`skill-select ${disabled ? "disabled" : ""}`}>
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
        <span style={{ color: selectedSkill ? selectedColor : "#7b879c" }}>
          {selectedSkill?.name ?? "선택 안 됨"}
        </span>
        {metaText ? <small>{metaText.replace("점수 ", "기본 점수 ")}</small> : null}
      </div>

      <div className="skill-result-list">
        {filteredOptions.length === 0 ? (
          <div className="skill-empty">검색 결과가 없습니다.</div>
        ) : (
          filteredOptions.map((skill) => {
            const color = SKILL_GRADE_COLORS[skill.grade] ?? "#111827";
            const isSelected = skill.id === value;

            return (
              <button
                key={skill.id}
                type="button"
                onClick={() => onChange(skill.id)}
                disabled={disabled}
                className={`skill-option ${isSelected ? "selected" : ""}`}
                style={{ color, borderColor: "#dde4f0" }}
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
