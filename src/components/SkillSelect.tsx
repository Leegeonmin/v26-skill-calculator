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
          padding: "10px 12px",
          marginBottom: 10,
          border: "1px solid #ccc",
          borderRadius: 8,
          fontSize: 16,
        }}
      />

      <div style={{ marginBottom: 8 }}>
        현재 선택: <span style={{ fontWeight: 700, color: selectedColor }}>{selectedSkill?.name ?? "-"}</span>
      </div>

      <div
        style={{
          minHeight: 260,
          maxHeight: 260,
          overflowY: "auto",
          border: "1px solid #ccc",
          borderRadius: 8,
          background: "white",
          padding: 6,
        }}
      >
        {filteredOptions.length === 0 ? (
          <div style={{ padding: 8, color: "#6b7280", fontSize: 14 }}>검색 결과가 없습니다.</div>
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
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  marginBottom: 6,
                  borderRadius: 8,
                  border: isSelected ? `2px solid ${color}` : "1px solid #e5e7eb",
                  background: isSelected ? "#f9fafb" : "white",
                  color,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: disabled ? "not-allowed" : "pointer",
                }}
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
