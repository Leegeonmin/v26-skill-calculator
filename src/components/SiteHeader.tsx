import type { Session } from "@supabase/supabase-js";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { ToolView } from "../types";

type SiteHeaderProps = {
  authDisplayName: string | null;
  authSession: Session | null;
  currentView: ToolView;
  onGoogleLogin: () => void;
  onGoogleLogout: () => void;
  onSelectView: (view: ToolView) => void;
  supabaseReady: boolean;
  idleDevGameEnabled: boolean;
  themeAction?: ReactNode;
};

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="ui-icon">
      <path
        d="M12 4a4.2 4.2 0 1 1 0 8.4A4.2 4.2 0 0 1 12 4Zm0 10.4c4.05 0 7.2 2.15 7.2 4.9V21H4.8v-1.7c0-2.75 3.15-4.9 7.2-4.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

function HeaderIcon({ name }: { name: "calculator" | "chart" | "scan" | "ranking" | "guide" }) {
  if (name === "calculator") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="site-nav-icon">
        <path
          d="M5 2.5h10A1.5 1.5 0 0 1 16.5 4v12A1.5 1.5 0 0 1 15 17.5H5A1.5 1.5 0 0 1 3.5 16V4A1.5 1.5 0 0 1 5 2.5Zm1 3v3h8v-3H6Zm2 5H6v2h2v-2Zm3 0H9v2h2v-2Zm3 0h-2v2h2v-2ZM8 14H6v2h2v-2Zm3 0H9v2h2v-2Zm3 0h-2v2h2v-2Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="site-nav-icon">
        <path
          d="M3 16.5h14v1.5H1.5V2H3v14.5Zm2-1.5v-4h2.5v4H5Zm4 0V8h2.5v7H9Zm4 0V5h2.5v10H13ZM6 8.4 5 7.3 9.1 3.2l2.7 2.7 3.9-3.9v3.1h-1.5V4.6l-2.4 2.4-2.7-2.7L6 8.4Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "scan") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="site-nav-icon">
        <path
          d="M3 6.5V3h3.5v1.5h-2v2H3Zm10.5-3.5H17v3.5h-1.5v-2h-2V3ZM3 13.5h1.5v2h2V17H3v-3.5Zm12.5 2v-2H17V17h-3.5v-1.5h2ZM10 5.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 7.2c2.7 0 4.8 1.35 4.8 3V16H5.2v-.3c0-1.65 2.1-3 4.8-3Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "ranking") {
    return (
      <svg viewBox="0 0 20 20" aria-hidden="true" className="site-nav-icon">
        <path
          d="M3 17.5V3h1.5v13H17v1.5H3Zm3-3v-4h2.5v4H6Zm4 0V6h2.5v8.5H10Zm4 0V8.5h2.5v6H14Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="site-nav-icon">
      <path
        d="M4 3h9.5A2.5 2.5 0 0 1 16 5.5V17H5a2 2 0 0 1-2-2V4a1 1 0 0 1 1-1Zm1 10.2V15h9.5v-1.8H5ZM5 5v6.7h9.5V5.5A1 1 0 0 0 13.5 5H5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function SiteHeader({
  authDisplayName,
  authSession,
  currentView,
  onGoogleLogin,
  onGoogleLogout,
  onSelectView,
  supabaseReady,
  idleDevGameEnabled,
  themeAction,
}: SiteHeaderProps) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);
  const displayName = authDisplayName ?? "Google 사용자";
  const email = authSession?.user.email ?? null;

  useEffect(() => {
    if (!accountMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountMenuOpen]);

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <button type="button" className="site-brand" onClick={() => onSelectView("home")}>
          <img src="/brand/v26-lab-app-icon.svg" alt="" aria-hidden="true" className="site-brand-icon" />
          <span>v26-lab</span>
        </button>
        <nav className="site-primary-nav" aria-label="주요 기능">
          <button type="button" className="site-nav-link" onClick={() => onSelectView("calculator")}>
            <HeaderIcon name="calculator" />
            <span>스킬점수계산</span>
          </button>
          <div className="site-nav-group">
            <button type="button" className="site-nav-link" onClick={() => onSelectView("simulator")}>
              <HeaderIcon name="chart" />
              <span>시뮬레이터</span>
            </button>
            <div className="site-nav-dropdown">
              <button type="button" onClick={() => onSelectView("simulator")}>
                고스변 시뮬
              </button>
              <button type="button" onClick={() => onSelectView("impactChange")}>
                임팩트 변경 시뮬
              </button>
            </div>
          </div>
          <div className="site-nav-group">
            <button type="button" className="site-nav-link" onClick={() => onSelectView("lineupSkillOcr")}>
              <HeaderIcon name="scan" />
              <span>스킬 인식</span>
            </button>
            <div className="site-nav-dropdown">
              <button type="button" onClick={() => onSelectView("lineupSkillOcr")}>
                라인업스킬인식
              </button>
              <button type="button" onClick={() => onSelectView("skillCompareBeta")}>
                고스변 점수비교
              </button>
            </div>
          </div>
          <button type="button" className="site-nav-link" onClick={() => onSelectView("ranking")}>
            <HeaderIcon name="ranking" />
            <span>랭킹</span>
          </button>
          <a className="site-nav-link" href="/skill-score-method">
            <HeaderIcon name="guide" />
            <span>가이드</span>
          </a>
          {idleDevGameEnabled && (
            <a className="site-nav-link site-nav-link-game" href="/idle-dev-game/index.html">
              <HeaderIcon name="chart" />
              <span>타자 키우기</span>
            </a>
          )}
        </nav>
        <div className="site-header-actions">
          {themeAction}
          <div className="home-auth-card" ref={accountMenuRef}>
            {authSession ? (
              <button
                type="button"
                className="home-auth-button home-auth-button-user"
                onClick={() => setAccountMenuOpen((open) => !open)}
                aria-label="계정 메뉴"
                aria-expanded={accountMenuOpen}
              >
                <UserIcon />
                <span>{displayName}</span>
              </button>
            ) : (
              <button
                type="button"
                className="home-auth-button"
                disabled={!supabaseReady}
                onClick={() => {
                  setAccountMenuOpen(false);
                  onGoogleLogin();
                }}
                aria-label="로그인"
              >
                <UserIcon />
                <span>로그인</span>
              </button>
            )}
            {authSession && accountMenuOpen && (
              <div className="home-account-menu" role="menu">
                <div className="home-account-menu-user">
                  <span>로그인 중</span>
                  <strong>{displayName}</strong>
                  {email ? <em>{email}</em> : null}
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onSelectView("lineupSkillOcr");
                  }}
                >
                  라인업 스킬 인식
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onGoogleLogout();
                  }}
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <nav className="site-mobile-nav" aria-label="모바일 주요 기능">
        <button type="button" className={currentView === "calculator" ? "is-active" : undefined} onClick={() => onSelectView("calculator")}>
          스킬점수계산
        </button>
        <button type="button" className={currentView === "simulator" ? "is-active" : undefined} onClick={() => onSelectView("simulator")}>
          고스변 시뮬
        </button>
        <button type="button" className={currentView === "lineupSkillOcr" ? "is-active" : undefined} onClick={() => onSelectView("lineupSkillOcr")}>
          라인업 인식
        </button>
        <button type="button" className={currentView === "skillCompareBeta" ? "is-active" : undefined} onClick={() => onSelectView("skillCompareBeta")}>
          고스변 점수 비교
        </button>
        <button type="button" className={currentView === "ranking" ? "is-active" : undefined} onClick={() => onSelectView("ranking")}>
          랭킹
        </button>
        <a href="/skill-score-method">가이드</a>
        {idleDevGameEnabled && <a href="/idle-dev-game/index.html">타자 키우기</a>}
      </nav>
    </header>
  );
}
