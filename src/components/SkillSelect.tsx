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
}

function SkillSelect({
  label,
  value,
  options,
  excludedSkillIds = [],
  onChange,
  disabled = false,
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
      <h3>{label}</h3>

      <input
        type="text"
        placeholder="스킬 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        disabled={disabled}
      />

      <div className="selected-skill-row">
        현재 선택: <span style={{ color: selectedColor }}>{selectedSkill?.name ?? "-"}</span>
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
                style={{ color, borderColor: isSelected ? color : "#dde4f0" }}
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
