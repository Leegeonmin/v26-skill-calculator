import type { ReactNode } from "react";

type InfoPageKey =
  | "about"
  | "guide"
  | "methodology"
  | "calculatorGuide"
  | "simulatorGuide"
  | "ocrGuide"
  | "faq"
  | "privacy"
  | "contact";

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
  methodology: {
    eyebrow: "Method",
    title: "계산 기준 안내",
    description:
      "CPBV LAB에서 스킬 점수와 등급을 해석하는 기본 방식과 결과를 볼 때 주의할 점을 정리했습니다.",
    sections: [
      {
        title: "점수 계산의 목적",
        body: (
          <p>
            스킬 점수는 서로 다른 조합을 같은 기준으로 비교하기 위한 참고 지표입니다. 카드 타입,
            선수 포지션, 스킬 레벨을 함께 입력하면 조합의 총점을 계산하고, 같은 조건에서 어느
            정도의 희귀도인지 확인할 수 있도록 구성했습니다.
          </p>
        ),
      },
      {
        title: "포지션별 기준",
        body: (
          <p>
            타자와 투수는 사용하는 스킬 풀과 평가 기준이 다릅니다. 투수도 선발, 중계, 마무리에
            따라 필요한 스킬 가치가 달라질 수 있어 각 보직을 별도로 선택하도록 했습니다. 같은
            스킬명이라도 입력한 보직에 따라 결과 해석이 달라질 수 있습니다.
          </p>
        ),
      },
      {
        title: "등급과 확률",
        body: (
          <p>
            등급은 조합을 빠르게 읽기 위한 요약값이며 절대적인 성능 보증이 아닙니다. 상위 확률과
            기대 시도 횟수는 기준 데이터와 확률 계산을 바탕으로 한 참고값입니다. 실제 게임 내
            업데이트, 이벤트, 데이터 변경에 따라 체감 결과와 다를 수 있습니다.
          </p>
        ),
      },
    ],
  },
  calculatorGuide: {
    eyebrow: "Calculator",
    title: "스킬 계산기 사용법",
    description:
      "타자와 투수 스킬 점수 계산기를 사용할 때 입력해야 하는 항목과 결과 화면을 읽는 방법입니다.",
    sections: [
      {
        title: "입력 순서",
        body: (
          <ol>
            <li>타자 또는 투수 보직을 먼저 선택합니다.</li>
            <li>시그니처, 골든글러브, 국가대표, 임팩트 등 카드 타입을 선택합니다.</li>
            <li>스킬 3개와 각 스킬 레벨을 입력한 뒤 결과 점수와 등급을 확인합니다.</li>
          </ol>
        ),
      },
      {
        title: "결과 화면에서 볼 것",
        body: (
          <p>
            총점은 조합의 기준값이고, 등급은 해당 점수를 빠르게 분류하기 위한 표시입니다. 함께
            표시되는 상위 확률과 기대 시도 횟수를 보면 같은 점수라도 어느 정도로 얻기 어려운
            조합인지 비교할 수 있습니다.
          </p>
        ),
      },
      {
        title: "자주 생기는 입력 실수",
        body: (
          <p>
            투수 보직을 잘못 선택하거나 카드 타입을 실제 카드와 다르게 선택하면 결과가 달라집니다.
            계산 결과가 예상과 다르다면 먼저 카드 타입, 보직, 스킬 레벨이 실제 조건과 같은지
            확인하는 것이 좋습니다.
          </p>
        ),
      },
    ],
  },
  simulatorGuide: {
    eyebrow: "Simulator",
    title: "시뮬레이터 사용법",
    description:
      "고급 스킬 변경권 시뮬레이터와 임팩트 변경 시뮬레이터의 차이, 결과 해석 방법을 안내합니다.",
    sections: [
      {
        title: "고스변 시뮬",
        body: (
          <p>
            고스변 시뮬은 고급 스킬 변경권을 사용했을 때 나올 수 있는 조합을 가정해 점수와 등급을
            확인하는 기능입니다. 1회 결과를 빠르게 확인하거나, 목표 등급을 정해 자동으로 반복
            시뮬레이션할 수 있습니다.
          </p>
        ),
      },
      {
        title: "임팩트 변경 시뮬",
        body: (
          <p>
            임팩트 변경 시뮬은 1번 스킬을 고정하고 2번과 3번 스킬이 원하는 조건을 만족할 때까지
            필요한 예상 시도 횟수를 확인하는 도구입니다. 특정 메이저 스킬 조합을 노릴 때 참고용으로
            사용할 수 있습니다.
          </p>
        ),
      },
      {
        title: "확률 결과의 한계",
        body: (
          <p>
            자동 롤 결과는 확률 기반 시뮬레이션입니다. 짧은 시도에서는 운에 따라 결과가 크게
            달라질 수 있고, 실제 게임 내 확률표나 업데이트가 변경되면 사이트 결과도 함께 달라질 수
            있습니다.
          </p>
        ),
      },
    ],
  },
  ocrGuide: {
    eyebrow: "OCR",
    title: "라인업 OCR 사용법",
    description:
      "라인업 스킬 인식 기능을 사용할 때 필요한 캡처 조건, 저장 방식, 결과 검토 방법입니다.",
    sections: [
      {
        title: "캡처 준비",
        body: (
          <p>
            선수명, 카드 타입, 스킬명이 화면에 선명하게 보이는 이미지를 사용해야 합니다. 화면이
            흐리거나 일부가 잘려 있으면 스킬명 또는 레벨이 잘못 인식될 수 있습니다.
          </p>
        ),
      },
      {
        title: "인식 후 검토",
        body: (
          <p>
            OCR 결과는 자동 판독 결과이므로 저장하기 전에 선수 포지션, 카드 타입, 스킬명, 레벨을
            직접 확인하는 것이 좋습니다. 잘못 인식된 항목은 화면에서 수정한 뒤 점수와 평균을 다시
            확인할 수 있습니다.
          </p>
        ),
      },
      {
        title: "사용 제한",
        body: (
          <p>
            공개 라인업 OCR은 서버 비용과 오남용 방지를 위해 사용 횟수 제한이 있습니다. 제한은
            서비스 상황에 따라 조정될 수 있으며, 저장된 결과는 사용자가 이전 기록을 확인하고 비교하는
            용도로 활용됩니다.
          </p>
        ),
      },
    ],
  },
  faq: {
    eyebrow: "FAQ",
    title: "자주 묻는 질문",
    description:
      "CPBV LAB의 스킬 계산기, 시뮬레이터, OCR 기능을 사용할 때 자주 확인하는 내용을 정리했습니다.",
    sections: [
      {
        title: "스킬 점수는 실제 성능을 그대로 의미하나요?",
        body: (
          <p>
            스킬 점수는 여러 조합을 같은 기준으로 비교하기 위한 참고 지표입니다. 실제 경기 결과는
            선수 능력치, 컨디션, 상대 카드, 게임 내 밸런스 조정에 따라 달라질 수 있으므로 점수는
            조합을 고르는 보조 기준으로 보는 것이 좋습니다.
          </p>
        ),
      },
      {
        title: "고스변 기대 횟수는 어떻게 해석해야 하나요?",
        body: (
          <p>
            기대 횟수는 같은 조건에서 목표 등급 이상의 조합을 얻기까지 평균적으로 어느 정도 시도가
            필요한지 보여주는 값입니다. 확률 기반 값이라 실제로는 더 빨리 나오거나 훨씬 늦게 나올 수
            있습니다.
          </p>
        ),
      },
      {
        title: "임팩트 변경 시뮬은 언제 쓰면 좋나요?",
        body: (
          <p>
            임팩트 카드에서 1번 스킬을 유지한 채 2번과 3번 스킬을 노릴 때 사용하면 좋습니다. 원하는
            메이저 스킬 조합이 얼마나 어려운지 확인하고, 변경권 사용 계획을 세울 때 참고할 수
            있습니다.
          </p>
        ),
      },
      {
        title: "타자와 투수는 왜 따로 선택하나요?",
        body: (
          <p>
            타자, 선발, 중계, 마무리는 중요하게 보는 스킬과 조합 기준이 다릅니다. 같은 스킬 이름이
            포함되어도 포지션과 보직에 따라 해석이 달라질 수 있어 계산 전에 역할을 먼저 선택하도록
            구성했습니다.
          </p>
        ),
      },
      {
        title: "OCR 결과가 틀리면 어떻게 해야 하나요?",
        body: (
          <p>
            OCR은 이미지 상태에 영향을 많이 받습니다. 선수명, 카드 타입, 스킬명, 레벨이 잘 보이는
            캡처를 사용하고, 인식 후에는 저장 전에 각 항목을 직접 확인하는 것이 좋습니다. 잘못 인식된
            항목은 화면에서 수정한 뒤 다시 계산할 수 있습니다.
          </p>
        ),
      },
      {
        title: "사이트의 계산 기준은 고정인가요?",
        body: (
          <p>
            게임 업데이트나 데이터 변경이 있으면 기준도 바뀔 수 있습니다. CPBV LAB은 계산기와
            시뮬레이터를 참고용 도구로 제공하며, 변경 사항이 확인되면 사이트 데이터와 안내 내용을
            함께 보정합니다.
          </p>
        ),
      },
      {
        title: "로그인이 꼭 필요한 기능은 무엇인가요?",
        body: (
          <p>
            기본 계산기와 시뮬레이터는 로그인 없이 사용할 수 있습니다. 라인업 OCR처럼 저장, 사용량
            제한, 사용자 기록 확인이 필요한 기능은 Google 로그인을 요구할 수 있습니다.
          </p>
        ),
      },
      {
        title: "문의나 오류 제보는 어디로 보내나요?",
        body: (
          <p>
            문의 페이지나 이메일 <a href="mailto:leeqwezxcasd@gmail.com">leeqwezxcasd@gmail.com</a>로
            보낼 수 있습니다. 오류를 제보할 때는 사용한 카드 타입, 포지션, 스킬명, 기대한 결과를 함께
            적어주면 확인이 빠릅니다.
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
