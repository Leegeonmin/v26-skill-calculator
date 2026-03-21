import type { AdminUsageSummary } from "../lib/admin";

type AdminViewProps = {
  unlocked: boolean;
  checkingSession: boolean;
  usernameInput: string;
  passwordInput: string;
  passwordError: string | null;
  stats: AdminUsageSummary | null;
  statsLoading: boolean;
  statsError: string | null;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onUnlock: () => void;
  onLock: () => void;
  onGoHome: () => void;
};

export default function AdminView({
  unlocked,
  checkingSession,
  usernameInput,
  passwordInput,
  passwordError,
  stats,
  statsLoading,
  statsError,
  onUsernameChange,
  onPasswordChange,
  onUnlock,
  onLock,
  onGoHome,
}: AdminViewProps) {
  if (checkingSession) {
    return (
      <div className="admin-view">
        <section className="admin-auth-card">
          <p className="admin-eyebrow">Admin Access</p>
          <h1>관리자 세션 확인 중</h1>
          <p className="admin-copy">저장된 관리자 로그인 상태를 확인하고 있습니다.</p>
        </section>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="admin-view">
        <section className="admin-auth-card">
          <p className="admin-eyebrow">Admin Access</p>
          <h1>관리자 페이지</h1>
          <p className="admin-copy">
            이 페이지는 운영용입니다. 비밀번호를 입력하면 시즌 관리와 참가자 관리 기능을 추가할 수
            있는 관리자 대시보드로 들어갑니다.
          </p>

          <label className="admin-field">
            <span>아이디</span>
            <input
              type="text"
              value={usernameInput}
              onChange={(event) => onUsernameChange(event.target.value)}
              placeholder="관리자 아이디"
              autoComplete="username"
            />
          </label>

          <label className="admin-field">
            <span>비밀번호</span>
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="관리자 비밀번호"
              autoComplete="current-password"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onUnlock();
                }
              }}
            />
          </label>

          {passwordError && <p className="modal-error">{passwordError}</p>}

          <div className="admin-actions">
            <button type="button" className="ghost-btn" onClick={onGoHome}>
              사용자 화면으로
            </button>
            <button type="button" className="primary-btn" onClick={onUnlock}>
              관리자 진입
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-view">
      <div className="admin-header">
        <div>
          <p className="admin-eyebrow">Admin Dashboard</p>
          <h1>운영 대시보드</h1>
          <p className="admin-copy">
            시즌 관리, 참가자 관리, 리더보드 운영 기능을 이곳에 모아둘 수 있습니다.
          </p>
        </div>

        <div className="admin-actions">
          <button type="button" className="ghost-btn" onClick={onGoHome}>
            사용자 화면으로
          </button>
          <button type="button" className="primary-btn" onClick={onLock}>
            관리자 잠금
          </button>
        </div>
      </div>

      <div className="admin-grid">
        <section className="admin-panel">
          <h2>총 이벤트</h2>
          <p className="admin-metric">{statsLoading ? "-" : stats?.total_events ?? 0}</p>
          <p>계산기/시뮬레이터 구간에서 쌓인 총 사용 이벤트 수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>수동 고스변</h2>
          <p className="admin-metric">{statsLoading ? "-" : stats?.advanced_manual_rolls ?? 0}</p>
          <p>고스변 시뮬에서 직접 1회 실행 버튼이 눌린 누적 횟수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>임팩트 자동 롤</h2>
          <p className="admin-metric">{statsLoading ? "-" : stats?.impact_auto_runs ?? 0}</p>
          <p>임팩트 스변 시뮬에서 자동 롤이 실행된 누적 횟수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>타자 vs 투수</h2>
          <p className="admin-metric">
            {statsLoading ? "-" : `${stats?.hitter_events ?? 0} / ${stats?.pitcher_events ?? 0}`}
          </p>
          <p>왼쪽은 타자, 오른쪽은 투수 계열 시뮬레이션 이벤트 수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>S 평균 시도</h2>
          <p className="admin-metric">
            {statsLoading ? "-" : stats?.avg_rolls_to_s?.toFixed(2) ?? "-"}
          </p>
          <p>고스변 자동 롤에서 S를 목표로 했을 때 평균적으로 몇 번이 걸렸는지 보여줍니다.</p>
        </section>

        <section className="admin-panel">
          <h2>SSR+ 평균 시도</h2>
          <p className="admin-metric">
            {statsLoading ? "-" : stats?.avg_rolls_to_ssr_plus?.toFixed(2) ?? "-"}
          </p>
          <p>고스변 자동 롤에서 SSR+를 목표로 했을 때 평균 시도 횟수입니다.</p>
        </section>
      </div>

      {statsError && <p className="modal-error">{statsError}</p>}
    </div>
  );
}
