import type {
  AdminIdleGameRankingEntry,
  AdminOcrBreakdown,
  AdminToolBreakdown,
  AdminUsageSummary,
} from "../lib/admin";

type AdminViewProps = {
  unlocked: boolean;
  checkingSession: boolean;
  usernameInput: string;
  passwordInput: string;
  passwordError: string | null;
  stats: AdminUsageSummary | null;
  statsLoading: boolean;
  statsError: string | null;
  homeChangeMessage: string;
  homeChangeSaving: boolean;
  homeChangeStatus: "idle" | "saved" | "error";
  homeChangeError: string | null;
  idleDevGameEnabled: boolean;
  idleDevGameSaving: boolean;
  idleDevGameStatus: "idle" | "saved" | "error";
  idleDevGameError: string | null;
  idleGameRankings: AdminIdleGameRankingEntry[];
  idleGameRankingsLoading: boolean;
  idleGameRankingsError: string | null;
  idleGameRankingBusyId: string | null;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onUnlock: () => void;
  onLock: () => void;
  onGoHome: () => void;
  onHomeChangeMessageChange: (value: string) => void;
  onSaveHomeChangeMessage: () => void;
  onIdleDevGameEnabledChange: (value: boolean) => void;
  onSaveIdleDevGameSetting: () => void;
  onUpdateIdleGameRanking: (
    entry: AdminIdleGameRankingEntry,
    moderationStatus: AdminIdleGameRankingEntry["moderation_status"]
  ) => void;
};

const toolLabels: Record<string, string> = {
  tool_view: "화면 진입",
  advanced_manual_roll: "고스변 수동",
  advanced_auto_roll: "고스변 자동",
  impact_auto_roll: "임팩트 자동",
  ocr_lineup_recognize: "라인업 이미지 인식",
  ocr_skill_compare_recognize: "스킬 화면 인식",
};

function formatNumber(value: number | null | undefined) {
  return value == null ? "-" : value.toLocaleString("ko-KR");
}

function formatDecimal(value: number | null | undefined) {
  return value == null ? "-" : value.toFixed(2);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getToolLabel(tool: string) {
  return toolLabels[tool] ?? tool;
}

function getIdleRankingStatusLabel(status: AdminIdleGameRankingEntry["moderation_status"]) {
  if (status === "hidden") return "닉네임 숨김";
  if (status === "excluded") return "랭킹 제외";
  return "노출";
}

function formatSeconds(value: number | null | undefined) {
  if (value == null) return "-";
  return `${Math.round(value).toLocaleString("ko-KR")}초`;
}

function renderOcrRows(stats: AdminUsageSummary | null, statsLoading: boolean) {
  if (statsLoading) {
    return (
      <tr>
        <td colSpan={6}>이미지 인식 통계를 불러오는 중입니다.</td>
      </tr>
    );
  }

  if (!stats?.ocr_breakdown?.length) {
    return (
      <tr>
        <td colSpan={6}>아직 이미지 인식 사용 기록이 없습니다.</td>
      </tr>
    );
  }

  return stats.ocr_breakdown.map((item: AdminOcrBreakdown) => (
    <tr key={item.label}>
      <td>{item.label}</td>
      <td>{formatNumber(item.request_count)}</td>
      <td>
        {stats.ocr_total_requests > 0
          ? `${((item.request_count / stats.ocr_total_requests) * 100).toFixed(1)}%`
          : "-"}
      </td>
      <td>{formatNumber(item.unique_sessions)}</td>
      <td>{formatNumber(item.saved_count)}</td>
      <td>{formatDateTime(item.last_seen_at)}</td>
    </tr>
  ));
}

function renderBreakdownRows(stats: AdminUsageSummary | null, statsLoading: boolean) {
  if (statsLoading) {
    return (
      <tr>
        <td colSpan={4}>통계를 불러오는 중입니다.</td>
      </tr>
    );
  }

  if (!stats?.tool_breakdown?.length) {
    return (
      <tr>
        <td colSpan={4}>아직 표시할 사용 기록이 없습니다.</td>
      </tr>
    );
  }

  return stats.tool_breakdown.map((item: AdminToolBreakdown) => (
    <tr key={item.tool}>
      <td>{getToolLabel(item.tool)}</td>
      <td>{formatNumber(item.event_count)}</td>
      <td>{formatNumber(item.unique_sessions)}</td>
      <td>{formatDateTime(item.last_seen_at)}</td>
    </tr>
  ));
}

function renderInquiryRows(stats: AdminUsageSummary | null, statsLoading: boolean) {
  if (statsLoading) {
    return (
      <tr>
        <td colSpan={4}>문의를 불러오는 중입니다.</td>
      </tr>
    );
  }

  if (!stats?.recent_inquiries?.length) {
    return (
      <tr>
        <td colSpan={4}>최근 문의가 없습니다.</td>
      </tr>
    );
  }

  return stats.recent_inquiries.map((inquiry) => (
    <tr key={inquiry.id}>
      <td>{formatDateTime(inquiry.created_at)}</td>
      <td>{inquiry.contact || "-"}</td>
      <td className="admin-message-cell">{inquiry.message}</td>
      <td>
        {inquiry.page_url ? (
          <a href={inquiry.page_url} target="_blank" rel="noreferrer">
            열기
          </a>
        ) : (
          "-"
        )}
      </td>
    </tr>
  ));
}

function renderIdleRankingRows({
  rankings,
  loading,
  busyId,
  onUpdate,
}: {
  rankings: AdminIdleGameRankingEntry[];
  loading: boolean;
  busyId: string | null;
  onUpdate: AdminViewProps["onUpdateIdleGameRanking"];
}) {
  if (loading) {
    return (
      <tr>
        <td colSpan={8}>타자 키우기 공식 랭킹을 불러오는 중입니다.</td>
      </tr>
    );
  }

  if (rankings.length === 0) {
    return (
      <tr>
        <td colSpan={8}>아직 공식 MLB 달성 랭킹 기록이 없습니다.</td>
      </tr>
    );
  }

  return rankings.map((entry) => {
    const busy = busyId === entry.entry_id;
    return (
      <tr key={entry.entry_id} className={entry.moderation_status !== "visible" ? "admin-muted-row" : undefined}>
        <td>{entry.rank ?? "-"}</td>
        <td>{entry.display_name}</td>
        <td>{entry.email ?? "-"}</td>
        <td>{formatSeconds(entry.score)}</td>
        <td>{formatDateTime(entry.achieved_at)}</td>
        <td>{getIdleRankingStatusLabel(entry.moderation_status)}</td>
        <td className="admin-message-cell">{entry.moderation_note ?? "-"}</td>
        <td>
          <div className="admin-row-actions">
            <button
              type="button"
              className="ghost-btn"
              disabled={busy || entry.moderation_status === "visible"}
              onClick={() => onUpdate(entry, "visible")}
            >
              복구
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={busy || entry.moderation_status === "hidden"}
              onClick={() => onUpdate(entry, "hidden")}
            >
              이름 숨김
            </button>
            <button
              type="button"
              className="ghost-btn"
              disabled={busy || entry.moderation_status === "excluded"}
              onClick={() => onUpdate(entry, "excluded")}
            >
              제외
            </button>
          </div>
        </td>
      </tr>
    );
  });
}

export default function AdminView({
  unlocked,
  checkingSession,
  usernameInput,
  passwordInput,
  passwordError,
  stats,
  statsLoading,
  statsError,
  homeChangeMessage,
  homeChangeSaving,
  homeChangeStatus,
  homeChangeError,
  idleDevGameEnabled,
  idleDevGameSaving,
  idleDevGameStatus,
  idleDevGameError,
  idleGameRankings,
  idleGameRankingsLoading,
  idleGameRankingsError,
  idleGameRankingBusyId,
  onUsernameChange,
  onPasswordChange,
  onUnlock,
  onLock,
  onGoHome,
  onHomeChangeMessageChange,
  onSaveHomeChangeMessage,
  onIdleDevGameEnabledChange,
  onSaveIdleDevGameSetting,
  onUpdateIdleGameRanking,
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
            이 페이지는 운영용입니다. 비밀번호를 입력하면 사용량, 자동 롤 성과, 문의 내역을
            확인할 수 있는 관리자 대시보드로 들어갑니다.
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
            한국시간 오늘 0시 이후 사용량과 기능별 사용 비중을 먼저 보고, 저장/스냅샷 누적 지표를 함께 확인합니다.
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

      <section className="admin-panel admin-setting-panel">
        <div className="admin-section-head">
          <div>
            <p className="admin-eyebrow">Home</p>
            <h2>메인 공지사항</h2>
          </div>
          <p>비워서 저장하면 메인 화면의 공지사항 배지가 숨겨집니다.</p>
        </div>

        <label className="admin-field">
          <span>표시 메시지</span>
          <textarea
            value={homeChangeMessage}
            onChange={(event) => onHomeChangeMessageChange(event.target.value)}
            placeholder="메인 왼쪽 위에 표시할 메시지를 입력하세요."
            rows={3}
            maxLength={240}
          />
        </label>

        <div className="admin-setting-actions">
          <span>{homeChangeMessage.length}/240</span>
          <button
            type="button"
            className="primary-btn"
            onClick={onSaveHomeChangeMessage}
            disabled={homeChangeSaving}
          >
            {homeChangeSaving ? "저장 중..." : "저장"}
          </button>
        </div>
        {homeChangeStatus === "saved" && <p className="notice-form-success">저장됐습니다.</p>}
        {homeChangeStatus === "error" && homeChangeError && <p className="modal-error">{homeChangeError}</p>}
      </section>

      <section className="admin-panel admin-setting-panel">
        <div className="admin-section-head">
          <div>
            <p className="admin-eyebrow">Idle Game</p>
            <h2>타자 키우기 운영</h2>
          </div>
          <p>끄면 헤더 링크와 첫 진입 모달이 숨겨지고 게임 API는 공식 집계를 받지 않습니다.</p>
        </div>

        <label className="admin-field admin-checkbox-field">
          <input
            type="checkbox"
            checked={idleDevGameEnabled}
            onChange={(event) => onIdleDevGameEnabledChange(event.target.checked)}
          />
          <span>타자 키우기 기능 활성화</span>
        </label>

        <div className="admin-setting-actions">
          <span>{idleDevGameEnabled ? "현재 설정: 노출" : "현재 설정: 비노출"}</span>
          <button
            type="button"
            className="primary-btn"
            onClick={onSaveIdleDevGameSetting}
            disabled={idleDevGameSaving}
          >
            {idleDevGameSaving ? "저장 중..." : "저장"}
          </button>
        </div>
        {idleDevGameStatus === "saved" && <p className="notice-form-success">저장됐습니다.</p>}
        {idleDevGameStatus === "error" && idleDevGameError && <p className="modal-error">{idleDevGameError}</p>}
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-section-head">
          <div>
            <p className="admin-eyebrow">Idle Ranking</p>
            <h2>타자 키우기 공식 랭킹 관리</h2>
          </div>
          <p>MLB 달성시간 기준 공식 랭킹입니다. 문제 기록은 제외하고, 부적절한 이름은 숨길 수 있습니다.</p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>순위</th>
                <th>이름</th>
                <th>이메일</th>
                <th>달성시간</th>
                <th>달성일</th>
                <th>상태</th>
                <th>메모</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {renderIdleRankingRows({
                rankings: idleGameRankings,
                loading: idleGameRankingsLoading,
                busyId: idleGameRankingBusyId,
                onUpdate: onUpdateIdleGameRanking,
              })}
            </tbody>
          </table>
        </div>
        {idleGameRankingsError && <p className="modal-error">{idleGameRankingsError}</p>}
      </section>

      <div className="admin-grid admin-metric-grid">
        <section className="admin-panel">
          <h2>오늘 사용량</h2>
          <p className="admin-metric">{statsLoading ? "-" : formatNumber(stats?.today_events)}</p>
          <p>한국시간 오늘 0시 이후 쌓인 전체 이벤트 수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>고유 세션</h2>
          <p className="admin-metric">{statsLoading ? "-" : formatNumber(stats?.unique_sessions)}</p>
          <p>한국시간 오늘 기준으로 중복을 제거한 방문 세션 수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>오늘 이미지 인식 호출</h2>
          <p className="admin-metric">
            {statsLoading ? "-" : formatNumber(stats?.ocr_total_requests)}
          </p>
          <p>한국시간 오늘 0시 이후 외부 이미지 인식 API를 호출한 횟수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>전체 이미지 인식 저장</h2>
          <p className="admin-metric">
            {statsLoading ? "-" : formatNumber(stats?.ocr_saved_uploads)}
          </p>
          <p>라인업 스킬 인식 결과를 사용자가 저장한 누적 횟수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>타자 vs 투수</h2>
          <p className="admin-metric">
            {statsLoading
              ? "-"
              : `${formatNumber(stats?.hitter_events)} / ${formatNumber(stats?.pitcher_events)}`}
          </p>
          <p>한국시간 오늘 기준입니다. 왼쪽은 타자, 오른쪽은 투수 계열 이벤트 수입니다.</p>
        </section>

        <section className="admin-panel">
          <h2>S / SR+ 평균</h2>
          <p className="admin-metric">
            {statsLoading
              ? "-"
              : `${formatDecimal(stats?.avg_rolls_to_s)} / ${formatDecimal(
                  stats?.avg_rolls_to_ssr_plus
                )}`}
          </p>
          <p>한국시간 오늘 고스변 자동 롤에서 목표 등급까지 걸린 평균 시도 횟수입니다.</p>
        </section>
      </div>

      <section className="admin-panel admin-table-panel">
        <div className="admin-section-head">
          <div>
            <p className="admin-eyebrow">Image Scan Cost</p>
            <h2>오늘 이미지 인식 사용량</h2>
          </div>
          <p>호출/세션/최근 사용은 한국시간 오늘 기준입니다. 저장과 스냅샷은 현재까지의 누적 기준입니다.</p>
        </div>

        <div className="admin-grid admin-grid-compact">
          <section className="admin-subpanel">
            <span>오늘 라인업 스킬 인식</span>
            <strong>{statsLoading ? "-" : formatNumber(stats?.ocr_lineup_requests)}</strong>
            <p>
              투수 {statsLoading ? "-" : formatNumber(stats?.ocr_pitcher_requests)} / 타자{" "}
              {statsLoading ? "-" : formatNumber(stats?.ocr_hitter_requests)}
            </p>
          </section>
          <section className="admin-subpanel">
            <span>오늘 스킬 화면 인식</span>
            <strong>{statsLoading ? "-" : formatNumber(stats?.ocr_skill_compare_requests)}</strong>
            <p>고급 스킬 변경권 점수 비교에서 발생한 인식 요청입니다.</p>
          </section>
          <section className="admin-subpanel">
            <span>전체 저장된 라인업</span>
            <strong>{statsLoading ? "-" : formatNumber(stats?.ocr_saved_uploads)}</strong>
            <p>
              투수 {statsLoading ? "-" : formatNumber(stats?.ocr_saved_pitcher_uploads)} / 타자{" "}
              {statsLoading ? "-" : formatNumber(stats?.ocr_saved_hitter_uploads)}
            </p>
          </section>
          <section className="admin-subpanel">
            <span>오늘 공개 라인업 스킬 인식</span>
            <strong>{statsLoading ? "-" : formatNumber(stats?.ocr_public_lineup_requests)}</strong>
            <p>Google 로그인 사용자의 공개 라인업 인식 요청입니다.</p>
          </section>
          <section className="admin-subpanel">
            <span>전체 공개 인식 스냅샷</span>
            <strong>{statsLoading ? "-" : formatNumber(stats?.ocr_public_snapshots)}</strong>
            <p>
              저장 {statsLoading ? "-" : formatNumber(stats?.ocr_public_saved_uploads)} / 미저장{" "}
              {statsLoading ? "-" : formatNumber(stats?.ocr_public_pending_uploads)}
            </p>
          </section>
          <section className="admin-subpanel">
            <span>전체 공개 저장 라인업</span>
            <strong>{statsLoading ? "-" : formatNumber(stats?.ocr_public_saved_uploads)}</strong>
            <p>
              투수 {statsLoading ? "-" : formatNumber(stats?.ocr_public_saved_pitcher_uploads)} / 타자{" "}
              {statsLoading ? "-" : formatNumber(stats?.ocr_public_saved_hitter_uploads)}
            </p>
          </section>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>오늘 호출</th>
                <th>오늘 비중</th>
                <th>오늘 세션</th>
                <th>전체 저장</th>
                <th>최근 사용</th>
              </tr>
            </thead>
            <tbody>{renderOcrRows(stats, statsLoading)}</tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-section-head">
          <div>
            <p className="admin-eyebrow">Usage</p>
            <h2>오늘 기능별 사용량</h2>
          </div>
          <p>한국시간 오늘 이벤트 수와 고유 세션 기준으로 어떤 기능이 주로 쓰이는지 확인합니다.</p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>기능</th>
                <th>이벤트</th>
                <th>세션</th>
                <th>최근 사용</th>
              </tr>
            </thead>
            <tbody>{renderBreakdownRows(stats, statsLoading)}</tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel admin-table-panel">
        <div className="admin-section-head">
          <div>
            <p className="admin-eyebrow">Inbox</p>
            <h2>최근 문의</h2>
          </div>
          <p>공지/문의 창으로 들어온 최신 메시지입니다.</p>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>등록일</th>
                <th>연락처</th>
                <th>내용</th>
                <th>페이지</th>
              </tr>
            </thead>
            <tbody>{renderInquiryRows(stats, statsLoading)}</tbody>
          </table>
        </div>
      </section>

      {statsError && <p className="modal-error">{statsError}</p>}
    </div>
  );
}
