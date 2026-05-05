import { IconGlyph } from "../components/AppChrome";
import { type CSSProperties, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { ToolView } from "../types";

type HomeViewProps = {
  onSelectView: (view: Exclude<ToolView, "home">) => void;
  themeAction?: ReactNode;
  authSession: Session | null;
  authDisplayName: string | null;
  supabaseReady: boolean;
  homeChangeMessage: string;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
};

type HomeWidget = {
  view: Exclude<ToolView, "home">;
  icon: "trophy" | "calculator" | "sparkles" | "compare" | "zap" | "users" | "flame" | "scan";
  title: string;
  description: string;
  meta: string;
};

type HomeWidgetSection = {
  id: string;
  title: string;
  description: string;
  grouped: boolean;
  widgets: HomeWidget[];
};

const HOME_WIDGET_SECTIONS: HomeWidgetSection[] = [
  {
    id: "calculator",
    title: "계산기",
    description: "직접 계산하거나 고스변 화면을 비교합니다.",
    grouped: true,
    widgets: [
      {
        view: "calculator",
        icon: "calculator",
        title: "스킬 점수 계산기",
        description: "카드의 스킬 점수 계산",
        meta: "Skill Score",
      },
      {
        view: "skillCompareBeta",
        icon: "compare",
        title: "고스변 점수 비교",
        description: "고스변 화면의 기존/변경 후보 스킬을 좌우로 비교합니다.",
        meta: "SKILL CHANGE DIFF",
      },
      {
        view: "lineupSkillOcr",
        icon: "users",
        title: "라인업 스킬 인식",
        description: "Google 로그인 후 주 1회씩 타자/투수 라인업 스킬 점수를 인식합니다.",
        meta: "LINEUP SKILL",
      },
    ],
  },
  {
    id: "simulators",
    title: "시뮬레이터",
    description: "스킬 변경권 결과를 돌려보고 목표까지 걸리는 횟수를 확인합니다.",
    grouped: true,
    widgets: [
      {
        view: "simulator",
        icon: "sparkles",
        title: "고스변 시뮬",
        description: "인게임 내 고급스킬변경권과 같은 기능 + 원하는 등급까지 자동 롤",
        meta: "Advanced Roll",
      },
      {
        view: "impactChange",
        icon: "zap",
        title: "임팩트 변경 시뮬",
        description: "나는 일반 스킬 변경권으로 몇번을 돌려야 2메가 뜰까?",
        meta: "Impact Roll",
      },
    ],
  },
  {
    id: "challenge",
    title: "랭킹 챌린지",
    description: "하루 한 번 기록하고 이번 주 최고 점수를 경쟁합니다.",
    grouped: false,
    widgets: [
      {
        view: "ranking",
        icon: "trophy",
        title: "고스변 랭킹챌린지",
        description: "하루 한 번 기록하고 이번 주 최고 점수 경쟁",
        meta: "Leaderboard",
      },
    ],
  },
];

// Shared with NoticeView; keep this colocated with the home announcement source.
// eslint-disable-next-line react-refresh/only-export-components
export const NOTICE_ITEMS = [
  {
    date: "2026.05.05",
    title: "고스변 확률 계산과 라인업 OCR 등급 표시 개선",
    body: "스킬 점수 계산기, 고스변 점수 비교, 라인업 스킬 인식에 상위 확률과 등급 정보를 추가하고 자동롤 및 호버 UI를 다듬었습니다.",
  },
  {
    date: "2026.05.02",
    title: "라인업 스킬 인식 공개 베타 추가",
    body: "Google 로그인 사용자에게 주 1회 타자/투수 라인업 OCR을 제공하고, 미저장 스냅샷 복구와 최근 기록 복사 기능을 추가했습니다.",
  },
  {
    date: "2026.05.02",
    title: "관리자 OCR 통계 세분화",
    body: "관리자 대시보드에서 공개 라인업 OCR, tyrant 라인업 OCR, 스킬 비교 OCR, 공개 스냅샷 저장/미저장 현황을 나눠 확인할 수 있게 했습니다.",
  },
  {
    date: "2026.05.02",
    title: "메인 화면 디자인 리뉴얼",
    body: "홈 화면 위젯 배치, 글래스모피즘 카드, 애니메이션 배경, 그라데이션 타이틀과 호버 효과를 적용했습니다.",
  },
  {
    date: "2026.05.02",
    title: "홈 화면 위젯 그룹 정리",
    body: "계산기와 시뮬레이터 위젯을 용도별로 묶고, PC와 모바일 화면에서 각 도구를 더 쉽게 구분할 수 있게 정리했습니다.",
  },
  {
    date: "2026.05.02",
    title: "관리자 OCR 사용량 통계 추가",
    body: "관리자 대시보드에서 라인업 OCR, 투수/타자 OCR, 고스변 점수 비교 OCR 호출량과 저장 횟수를 확인할 수 있게 했습니다.",
  },
  {
    date: "2026.04.30",
    title: "스킬 점수표 업데이트",
    body: "타자 점수표를 최신 기준으로 개편하고, 투수 보직별 누락 스킬을 0점 항목까지 포함해 보강했습니다.",
  },
  {
    date: "2026.04.30",
    title: "공지사항 메뉴 추가",
    body: "업데이트 내역과 문의 저장 기능을 메인 화면에서 바로 확인할 수 있게 했습니다.",
  },
];

export default function HomeView({
  onSelectView,
  themeAction,
  authSession,
  authDisplayName,
  supabaseReady,
  homeChangeMessage,
  onGoogleLogin,
  onGoogleLogout,
}: HomeViewProps) {
  const visibleHomeChangeMessage = homeChangeMessage.trim();

  return (
    <main className="home-stage" aria-labelledby="home-title">
      <div className="home-gradient-aura" aria-hidden="true" />
      <div className="home-particle-field" aria-hidden="true">
        {Array.from({ length: 18 }, (_, index) => (
          <span key={index} style={{ "--particle-index": index } as CSSProperties} />
        ))}
      </div>
      {visibleHomeChangeMessage && (
        <aside className="home-change-note" aria-label="공지사항">
          <span>공지사항</span>
          <strong>{visibleHomeChangeMessage}</strong>
        </aside>
      )}
      <section className="home-hero">
        <div className="home-hero-action">
          {themeAction}
          <div className="home-auth-card">
            {authSession ? (
              <>
                <span>{authDisplayName ?? "Google 사용자"}</span>
                <button type="button" className="ghost-btn" onClick={onGoogleLogout}>
                  로그아웃
                </button>
            </>
          ) : (
            <button
              type="button"
              className="primary-btn"
              disabled={!supabaseReady}
              onClick={onGoogleLogin}
            >
              Google 로그인
            </button>
          )}
        </div>
        </div>
        <div className="home-hero-copy">
          <h1 id="home-title">v26-lab</h1>
          <p>계산기, 시뮬레이터, 랭킹챌린지를 한 화면에서 바로 선택하세요.</p>
        </div>
      </section>

      <section className="home-widget-sections" aria-label="도구 선택">
        {HOME_WIDGET_SECTIONS.map((section) => (
          <section
            key={section.id}
            className={`home-widget-section home-widget-section-${section.id}${
              section.grouped ? " home-widget-section-grouped" : ""
            }`}
          >
            <div className="home-widget-section-head">
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </div>
            <div className="home-widget-grid">
              {section.widgets.map((widget) => (
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
                    <span
                      className={`home-widget-meta${
                        widget.view === "skillCompareBeta" || widget.view === "lineupSkillOcr"
                          ? " home-widget-beta"
                          : ""
                      }`}
                    >
                      {widget.meta}
                    </span>
                    <strong>
                      {widget.title}
                      {(widget.view === "skillCompareBeta" ||
                        widget.view === "lineupSkillOcr") && <em>베타</em>}
                    </strong>
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
            </div>
          </section>
        ))}

        <section className="home-widget-section home-widget-section-notice">
          <div className="home-widget-section-head">
            <h2>공지사항</h2>
            <p>업데이트 내역과 문의를 확인합니다.</p>
          </div>
          <div className="home-widget-grid">
            <button
              type="button"
              className="home-widget home-widget-notice"
              onClick={() => onSelectView("notice")}
            >
              <span className="home-widget-icon" aria-hidden="true">
                <IconGlyph name="notice" className="ui-icon" />
              </span>
              <span className="home-widget-copy">
                <span className="home-widget-meta">Notice</span>
                <strong>공지사항</strong>
                <span>업데이트 내역 확인과 버그/기능 문의를 보낼 수 있습니다.</span>
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
          </div>
        </section>
      </section>

      <nav className="home-site-links" aria-label="사이트 정보">
        <a href="/about">소개</a>
        <a href="/guide">사용 가이드</a>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/contact">문의</a>
      </nav>
    </main>
  );
}
