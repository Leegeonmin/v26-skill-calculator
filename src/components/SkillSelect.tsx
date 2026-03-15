import { useMemo, useState } from "react";
import type { SkillMeta } from "../types";
import { SKILL_GRADE_BY_ID, SKILL_MAP_BY_ID } from "../data/skills";
import { SKILL_GRADE_COLORS } from "../data/uiColors";

interface SkillSelectProps {
  label: string;
  value: string; // 선택된 skill id
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
      const isExcluded =
        excludedSkillIds.includes(skill.id) && skill.id !== value;

      if (isExcluded) return false;

      if (!lowerKeyword) return true;

      return skill.name.toLowerCase().includes(lowerKeyword);
    });
  }, [options, excludedSkillIds, keyword, value]);

  const selectedSkill = SKILL_MAP_BY_ID[value];
  const selectedGrade = SKILL_GRADE_BY_ID[value];
  const selectedColor = selectedGrade
    ? SKILL_GRADE_COLORS[selectedGrade]
    : "#111827";

  return (
    <div
      style={{
        flex: 1,
        minWidth: 220,
        padding: 12,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: disabled ? "#f3f3f3" : "white",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>{label}</h3>

      <input
        type="text"
        placeholder="스킬 검색"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        disabled={disabled}
        style={{
          width: "100%",
          padding: "8px 10px",
          marginBottom: 10,
          border: "1px solid #ccc",
          borderRadius: 6,
        }}
      />

      <div style={{ marginBottom: 8 }}>
        현재 선택:{" "}
        <span
          style={{
            fontWeight: 700,
            color: selectedColor,
          }}
        >
          {selectedSkill?.name ?? "-"}
        </span>
      </div>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        size={10}
        style={{
          width: "100%",
          padding: 8,
          border: "1px solid #ccc",
          borderRadius: 6,
          background: "white",
        }}
      >
        {filteredOptions.map((skill) => {
          const grade = SKILL_GRADE_BY_ID[skill.id];
          const color = grade ? SKILL_GRADE_COLORS[grade] : "#111827";

          return (
            <option
              key={skill.id}
              value={skill.id}
              style={{ color, fontWeight: 600 }}
            >
              {skill.name}
            </option>
          );
        })}
      </select>
    </div>
  );
}

export default SkillSelect;