import { IconGlyph } from "../components/AppChrome";
import type { ReactNode } from "react";
import type { ToolView } from "../types";

type HomeViewProps = {
  onSelectView: (view: Exclude<ToolView, "home">) => void;
  themeAction?: ReactNode;
};

const HOME_WIDGETS: Array<{
  view: Exclude<ToolView, "home">;
  icon: "trophy" | "calculator" | "sparkles" | "flame";
  title: string;
  description: string;
  meta: string;
}> = [
  {
    view: "calculator",
    icon: "calculator",
    title: "스킬 점수 계산기",
    description: "카드의 스킬 점수 계산",
    meta: "Skill Score",
  },
  {
    view: "simulator",
    icon: "sparkles",
    title: "고스변 시뮬",
    description: "인게임 내에 고급스킬변경권과 같은 기능 + 원하는 등급까지 자동 롤",
    meta: "Advanced Roll",
  },
  {
    view: "impactChange",
    icon: "flame",
    title: "임팩트 변경 시뮬",
    description: "나는 일반 스킬 변경권으로 몇번을 돌려야 2메가 뜰까?",
    meta: "Impact Roll",
  },
  {
    view: "ranking",
    icon: "trophy",
    title: "고스변 랭킹챌린지",
    description: "하루 한 번 기록하고 이번 주 최고 점수 경쟁",
    meta: "Leaderboard",
  },
];

export default function HomeView({ onSelectView, themeAction }: HomeViewProps) {
  return (
    <main className="home-stage" aria-labelledby="home-title">
      <div className="home-gradient-aura" aria-hidden="true" />
      <section className="home-hero">
        {themeAction && <div className="home-hero-action">{themeAction}</div>}
        <div className="home-hero-mark" aria-hidden="true">
          <IconGlyph name="sparkles" className="ui-icon" />
        </div>
        <div className="home-hero-copy">
          <h1 id="home-title">v26-lab</h1>
          <p>계산기, 시뮬레이터, 랭킹챌린지를 한 화면에서 바로 선택하세요.</p>
        </div>
      </section>

      <section className="home-widget-grid" aria-label="도구 선택">
        {HOME_WIDGETS.map((widget) => (
          <button
            key={widget.view}
            type="button"
            className={`home-widget home-widget-${widget.view}`}
            onClick={() => onSelectView(widget.view)}
          >
            <span className="home-widget-icon" aria-hidden="true">
              <IconGlyph name={widget.icon} className="ui-icon" />
            </span>
            <span className="home-widget-copy">
              <span className="home-widget-meta">{widget.meta}</span>
              <strong>{widget.title}</strong>
              <span>{widget.description}</span>
            </span>
            <span className="home-widget-arrow" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="ui-icon">
                <path
                  d="M9.29 6.71 13.59 11H4v2h9.59l-4.3 4.29 1.42 1.42L17.41 12l-6.7-6.71-1.42 1.42Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </button>
        ))}
      </section>
    </main>
  );
}
