type AdminViewProps = {
  unlocked: boolean;
  checkingSession: boolean;
  usernameInput: string;
  passwordInput: string;
  passwordError: string | null;
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
          <p className="admin-copy">이 페이지는 운영자 전용입니다.</p>

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
          <p className="admin-eyebrow">Admin Access</p>
          <h1>관리자 페이지</h1>
          <p className="admin-copy">현재 활성화된 관리자 기능이 없습니다.</p>
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
    </div>
  );
}
