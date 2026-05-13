import type { ReactNode } from "react";

type InfoPageKey = "about" | "guide" | "privacy" | "contact";

type InfoPage = {
  eyebrow: string;
  title: string;
  description: string;
  sections: Array<{
    title: string;
    body: ReactNode;
  }>;
};

const INFO_PAGES: Record<InfoPageKey, InfoPage> = {
  about: {
    eyebrow: "About",
    title: "V26 스킬 계산기 소개",
    description:
      "V26 스킬 계산기는 야구 게임 이용자가 스킬 조합을 빠르게 비교하고 기록할 수 있도록 만든 비공식 팬 도구입니다.",
    sections: [
      {
        title: "제공하는 기능",
        body: (
          <ul>
            <li>타자, 선발, 중계, 마무리 스킬 조합 점수 계산</li>
            <li>카드 타입별 기준 점수와 판정 등급 확인</li>
            <li>고급스킬변경권과 임팩트 스킬 변경 시뮬레이션</li>
          </ul>
        ),
      },
      {
        title: "운영 기준",
        body: (
          <p>
            계산기는 입력한 카드 타입, 포지션, 스킬 레벨을 기준으로 동일한 조건의 조합을
            비교할 수 있도록 구성했습니다. 단순 점수만 보여주는 대신 등급, 상위 확률,
            목표 등급까지의 예상 시도 횟수를 함께 제공해 사용자가 결과를 해석할 수 있게 돕습니다.
          </p>
        ),
      },
      {
        title: "비공식 안내",
        body: (
          <p>
            이 웹사이트는 게임사와 공식 제휴되어 있지 않은 비공식 팬 제작 도구입니다. 사이트에
            표시되는 계산 결과는 참고용이며, 실제 게임 업데이트나 데이터 변경에 따라 달라질 수
            있습니다.
          </p>
        ),
      },
    ],
  },
  guide: {
    eyebrow: "Guide",
    title: "사용 가이드",
    description:
      "스킬 계산기와 시뮬레이터를 처음 사용하는 사용자를 위한 기본 사용 방법입니다.",
    sections: [
      {
        title: "스킬 점수 계산",
        body: (
          <ol>
            <li>타자 또는 투수 보직을 선택합니다.</li>
            <li>카드 타입과 스킬 3개, 레벨을 입력합니다.</li>
            <li>결과 영역에서 총점, 판정 등급, 고스변 희귀도를 확인합니다.</li>
          </ol>
        ),
      },
      {
        title: "시뮬레이터",
        body: (
          <p>
            고스변 시뮬은 고급스킬변경권 결과를 가정해 점수를 비교합니다. 임팩트 변경 시뮬은
            1번 스킬을 고정하고 2, 3번 스킬 조건을 만족할 때까지의 예상 시도 횟수를 확인합니다.
          </p>
        ),
      },
      {
        title: "결과 해석",
        body: (
          <p>
            등급은 선택한 카드와 포지션 기준표에 따라 달라집니다. 같은 총점이라도 타자와
            투수, 선발과 불펜의 기준이 다를 수 있으므로 결과 화면의 기준 타입을 함께 확인하는
            것이 좋습니다. 자동 롤 결과는 확률 기반 참고값이며 실제 게임 결과를 보장하지 않습니다.
          </p>
        ),
      },
      {
        title: "OCR 사용 전 확인",
        body: (
          <p>
            라인업 스킬 인식은 화면 캡처 상태에 따라 결과가 달라질 수 있습니다. 선수명과
            스킬명이 잘 보이도록 캡처하고, 인식 후에는 카드 타입과 포지션이 맞는지 직접
            확인한 뒤 저장하는 방식으로 사용하는 것을 권장합니다.
          </p>
        ),
      },
    ],
  },
  privacy: {
    eyebrow: "Privacy",
    title: "개인정보처리방침",
    description:
      "V26 스킬 계산기에서 수집하거나 저장할 수 있는 정보와 그 사용 목적을 안내합니다.",
    sections: [
      {
        title: "수집하는 정보",
        body: (
          <ul>
            <li>랭킹 기능 사용 시 Google 로그인 기본 프로필 정보와 닉네임</li>
            <li>문의 제출 시 사용자가 직접 입력한 연락처와 문의 내용</li>
            <li>서비스 개선을 위한 익명 사용 이벤트, 접속 환경, 페이지 성능 정보</li>
          </ul>
        ),
      },
      {
        title: "이용 목적",
        body: (
          <p>
            수집된 정보는 랭킹 표시, 문의 응대, 오류 확인, 서비스 품질 개선을 위해 사용됩니다.
            사용자가 입력하지 않은 민감한 개인정보를 의도적으로 수집하지 않습니다.
          </p>
        ),
      },
      {
        title: "제3자 서비스",
        body: (
          <p>
            이 사이트는 Supabase, Vercel Analytics, Vercel Speed Insights를 사용합니다. 향후
            Google AdSense가 적용되면 광고 제공과 부정 사용 방지를 위해 쿠키 또는 유사 기술이
            사용될 수 있습니다.
          </p>
        ),
      },
      {
        title: "문의 및 삭제 요청",
        body: (
          <p>
            저장된 문의 삭제 요청은 문의 페이지 또는 이메일
            <a href="mailto:leeqwezxcasd@gmail.com"> leeqwezxcasd@gmail.com</a>로 보낼 수 있습니다.
          </p>
        ),
      },
    ],
  },
  contact: {
    eyebrow: "Contact",
    title: "문의",
    description:
      "버그 제보, 기능 요청, 데이터 수정 요청이 있으면 아래 안내를 통해 보내주세요.",
    sections: [
      {
        title: "문의 방법",
        body: (
          <p>
            메인 화면의 공지사항 위젯에서 문의 내용을 저장할 수 있습니다. 이메일 문의는
            <a href="mailto:leeqwezxcasd@gmail.com"> leeqwezxcasd@gmail.com</a>로 보내주세요.
          </p>
        ),
      },
      {
        title: "빠른 확인을 위한 작성 예시",
        body: (
          <ul>
            <li>문제가 발생한 화면 또는 기능</li>
            <li>선택한 카드 타입, 스킬명, 레벨</li>
            <li>기대했던 결과와 실제 표시된 결과</li>
            <li>모바일/PC 여부와 브라우저 정보</li>
          </ul>
        ),
      },
    ],
  },
};

type InfoPageViewProps = {
  page: InfoPageKey;
  themeAction?: ReactNode;
  onGoHome: () => void;
};

export default function InfoPageView({ page, themeAction, onGoHome }: InfoPageViewProps) {
  const content = INFO_PAGES[page];

  return (
    <main className="info-page" aria-labelledby="info-page-title">
      <div className="page-toolbar info-page-toolbar">
        <div className="page-title-block">
          <span className="page-kicker">{content.eyebrow}</span>
          <h1 id="info-page-title">{content.title}</h1>
          <p>{content.description}</p>
        </div>
        <div className="page-toolbar-actions">
          {themeAction}
          <button type="button" className="ghost-btn page-home-btn" onClick={onGoHome}>
            홈으로
          </button>
        </div>
      </div>

      <section className="info-page-card">
        {content.sections.map((section) => (
          <article key={section.title} className="info-page-section">
            <h2>{section.title}</h2>
            <div>{section.body}</div>
          </article>
        ))}
      </section>
    </main>
  );
}

export type { InfoPageKey };
