import type { ReactNode } from "react";
import type { ToolView } from "../types";

type ToolSeoContent = {
  title: string;
  intro: ReactNode;
  sections: Array<{
    title: string;
    body: ReactNode;
  }>;
  faq: Array<{
    question: string;
    answer: string;
  }>;
};

const DEFAULT_FAQ = [
  {
    question: "V26 스킬 계산기는 무엇을 계산하나요?",
    answer:
      "타자와 투수 카드의 스킬 조합 점수와 등급을 계산합니다. 카드 타입별 점수 차이와 고스변 희귀도도 함께 확인할 수 있습니다.",
  },
  {
    question: "고스변 시뮬은 어떤 용도인가요?",
    answer:
      "고급 스킬 변경권 사용 결과를 빠르게 확인하는 시뮬레이터입니다. 1회 사용 결과와 목표 등급까지 자동 롤 결과를 함께 볼 수 있습니다.",
  },
  {
    question: "임팩트 변경 시뮬은 무엇을 확인하나요?",
    answer:
      "임팩트 카드에서 1번 스킬을 고정한 상태로 2번과 3번 스킬이 원하는 조건에 도달하는지 시뮬레이션합니다.",
  },
  {
    question: "타자와 투수 계산 기준은 같은가요?",
    answer:
      "기본 계산 방식은 같지만 사용되는 스킬 데이터와 기준표는 타자, 선발, 중계, 마무리마다 다르게 적용됩니다.",
  },
];

const DEFAULT_CONTENT: ToolSeoContent = {
  title: "V26 스킬 계산기 안내",
  intro: (
    <>
      <p>
        V26 스킬 계산기는 타자와 투수 카드의 스킬 점수와 등급을 빠르게 확인하기 위한 계산기다.
        시그니처, 골든글러브, 국가대표, 임팩트 카드 기준을 함께 비교할 수 있다.
      </p>
      <p>
        고스변 시뮬에서는 고급 스킬 변경권 결과를 1회 사용 또는 목표 등급까지 자동 롤로 확인할
        수 있고, 임팩트 변경 시뮬에서는 1번 고정 스킬 기준으로 2번과 3번 스킬 조합을 확인할 수
        있다.
      </p>
    </>
  ),
  sections: [],
  faq: DEFAULT_FAQ,
};

const TOOL_CONTENT: Partial<Record<ToolView, ToolSeoContent>> = {
  calculator: {
    title: "스킬 점수 계산기 사용 가이드",
    intro: (
      <>
        <p>
          스킬 점수 계산기는 보유 카드의 보직, 카드 타입, 스킬 3개와 레벨을 넣어 현재 조합의
          총점과 등급을 확인하는 도구입니다. 스킬점수의 합과 이 보직, 카드 타입에서 스킬 구성이 상위 몇퍼센트의 확률인지 기대 시도 횟수가 얼만지 
          계산하여 보여줍니다.
        </p>
        <p>
          타자, 선발, 중계, 마무리는 등장하는 스킬 풀과 평가 기준이 다르다.(워크에식 같은 경우 중계투수에겐 좋지만 마무리에게는 좋지않음 - 연장에 갈경우 추가효과가 사라지기때문에)
          그래서 계산을 시작할 때 실제 카드의 역할을 먼저 맞춰야 하고, 시그니처, 골든글러브, 국가대표, 임팩트 같은 카드 타입도 실제 카드와 동일하게 선택해야 합니다.
        </p>
      </>
    ),
    sections: [
      {
        title: "사용자가 스킬 입력 전 입력해야할 값",
        body: (
          <ol>
            <li>먼저 타자, 선발, 중계, 마무리 중 카드의 보직을 선택합니다.</li>
            <li>카드 타입을 시그니처, 골든글러브, 국가대표, 임팩트 등 실제 카드 기준으로 맞춥니다.</li>
            <li>1번, 2번, 3번 스킬과 각 레벨을 입력합니다.</li>
            <li>총점, 등급, 상위 확률, 기대 시도 횟수를 함께 확인합니다.</li>
          </ol>
        ),
      },
      {
        title: "결과 점수 해석",
        body: (
          <p>
            총점은 입력한 세 스킬의 평가값을 합산한 값입니다. 등급은 그 점수를 빠르게 분류하기 위한
            표시이고, 상위 확률은 같은 조건의 가능한 조합 중 현재 점수 이상이 나올 비율을 뜻합니다.
            기대 시도 횟수는 그 확률을 기준으로 평균적으로 몇 번 정도 시도해야 비슷한 점수 이상을
            볼 수 있는지 보여주는 참고값입니다.
          </p>
        ),
      },
      {
        title: "같은 스킬도 조건에 따라 점수가 달라지는 이유",
        body: (
          <p>
            같은 스킬 이름이라도 타자와 투수에서 보는 기준이 다르고, 선발과 불펜에서도 우선순위가
            다를 수 있습니다. 카드 타입에 따라 나올 수 있는 스킬 후보도 달라지므로, 보직이나 카드
            타입을 잘못 고르면 실제 카드와 다른 결과가 나올 수 있으니 확인해주세요.
          </p>
        ),
      },
      {
        title: "계산 예시",
        body: (
          <ul>
            <li>타자 카드에서 6-5-5 조합은 같은 스킬이라도 카드 타입이 다르면 등급과 기대횟수가 다르게 나옵니다.</li>
            <li>중계나 마무리 기준으로 좋은 조합이 선발투수 기준에서도 항상 같은 등급으로 나오지는 않습니다.(예를 들어서 흐름끊기나 긴급투입같은 스킬)</li>
            <li>임팩트 카드는 보통 1번스킬을 잠구고 돌리기 때문에 1번 스킬을 포함한 점수와 제외한 점수를 함께 봐야 변경 결과를 비교하기 쉽습니다.</li>
          </ul>
        ),
      },
      {
        title: "자주 틀리는 부분",
        body: (
          <p>
            가장 흔한 실수는 투수 보직을 잘못 고르거나, 카드 타입을 실제 카드와 다르게 선택하는
            것입니다. 결과가 예상과 다르면 먼저 보직, 카드 타입, 스킬 레벨을 다시 확인하고, 이미지
            인식으로 가져온 결과라면 인식된 스킬 이름과 레벨이 맞는지도 확인해야합니다.
          </p>
        ),
      },
    ],
    faq: [
      {
        question: "스킬 점수 계산기는 실제 게임 성적 결과를 보장하는지?",
        answer:
          "아니요. 계산기는 스킬 조합을 비교하기 위한 참고 도구입니다. 당연히 스킬점수가 높고 기대횟수가 많다면 더 좋음 성적을 낼 수 있겠지만, 게임 업데이트, 데이터 수정, 실제 경기 환경에 따라 체감 결과는 달라질 수 있습니다.",
      },
      {
        question: "총점만 높으면 무조건 좋은 조합인가요?",
        answer:
          "총점은 중요한 기준이지만 유일한 기준은 아닙니다. 카드 보직, 현재 목표, 변경권 보유량, 상위 확률과 기대 시도 횟수를 함께 보는 것이 좋습니다.",
      },
      {
        question: "타자와 투수 점수를 같은 기준으로 비교해도 되나요?",
        answer:
          "권장하지 않습니다. 타자, 선발, 중계, 마무리는 사용하는 스킬 데이터와 평가 기준이 다르기 때문에 같은 보직 안에서 비교하는 것이 더 정확합니다.",
      },
      {
        question: "이미지 인식 결과도 같은 기준으로 계산되나요?",
        answer:
          "네. 이미지 인식은 입력을 빠르게 채우는 기능이고, 최종 점수는 계산기와 같은 기준으로 다시 계산됩니다. 이미지 인식이 정확하지 않기 때문에 저장 전에는 스킬명과 레벨을 직접 확인하는 것이 좋습니다.",
      },
    ],
  },
};

function getToolSeoContent(toolView: ToolView) {
  return TOOL_CONTENT[toolView] ?? DEFAULT_CONTENT;
}

export function getToolSeoStructuredData(toolView: ToolView) {
  const content = getToolSeoContent(toolView);

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  });
}

export default function ToolSeoPanel({ toolView }: { toolView: ToolView }) {
  const content = getToolSeoContent(toolView);

  return (
    <section className="panel panel-main panel-wide seo-panel seo-panel-deferred" aria-labelledby="seo-guide-title">
      <div className="seo-copy">
        <h2 id="seo-guide-title">{content.title}</h2>
        {content.intro}
      </div>

      {content.sections.length > 0 && (
        <div className="seo-section-list">
          {content.sections.map((section) => (
            <article key={section.title} className="seo-section-item">
              <h3>{section.title}</h3>
              {section.body}
            </article>
          ))}
        </div>
      )}

      <div className="seo-faq">
        <h3>자주 묻는 질문</h3>
        <div className="seo-faq-list">
          {content.faq.map((item) => (
            <article key={item.question} className="seo-faq-item">
              <h4>{item.question}</h4>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: getToolSeoStructuredData(toolView) }}
      />
    </section>
  );
}
