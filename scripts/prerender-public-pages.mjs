import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const templatePath = path.join(distDir, "index.html");
const siteOrigin = "https://www.cpbv-lab.com";

const pages = [
  {
    path: "/",
    title: "V26 스킬 계산기 | 타자투수 스킬 점수 계산",
    description:
      "V26 스킬 계산기에서 타자와 투수의 스킬 점수, 기준표 확률, 등급을 계산하고 고스변 시뮬과 임팩트 변경 시뮬까지 확인할 수 있습니다.",
    heading: "v26-lab",
    intro: "스킬 조합을 계산하고, 변경권을 쓰기 전에 먼저 굴려보세요.",
    sections: [
      {
        title: "계산기",
        body: "타자, 선발, 중계, 마무리 보직을 나눠 카드 타입과 스킬 레벨별 점수를 계산합니다.",
      },
      {
        title: "시뮬레이터",
        body: "고급 스킬 변경권과 임팩트 변경 결과를 미리 돌려보고 목표 등급까지의 난이도를 확인합니다.",
      },
      {
        title: "라인업 OCR",
        body: "라인업 이미지를 인식한 뒤 선수별 스킬 점수와 평균 점수를 같은 기준으로 다시 계산합니다.",
      },
      {
        title: "결과 해석",
        body: "총점뿐 아니라 상위 확률, 기대 시도 횟수, 등급 기준을 함께 보여줘 조합의 희귀도를 읽기 쉽게 합니다.",
      },
    ],
  },
  {
    path: "/about",
    title: "V26 스킬 계산기 소개 | CPBV LAB",
    description:
      "V26 스킬 계산기는 야구 게임 이용자가 스킬 조합을 빠르게 비교하고 기록할 수 있도록 만든 비공식 팬 도구입니다.",
    heading: "V26 스킬 계산기 소개",
    intro:
      "타자, 투수, 카드 타입, 스킬 레벨을 같은 조건으로 맞춰 계산하고 고스변 결과를 비교할 수 있습니다.",
    sections: [
      {
        title: "제공하는 기능",
        body: "스킬 점수 계산, 고급 스킬 변경권 시뮬레이션, 임팩트 변경 시뮬레이션, 라인업 OCR, 랭킹 챌린지를 제공합니다.",
      },
      {
        title: "운영 기준",
        body: "단순 점수만 보여주지 않고 등급, 상위 확률, 목표 등급까지의 예상 시도 횟수를 함께 제공해 결과를 해석할 수 있게 합니다.",
      },
      {
        title: "비공식 안내",
        body: "이 사이트는 게임사와 공식 제휴되어 있지 않은 비공식 팬 제작 도구이며 계산 결과는 참고용입니다.",
      },
    ],
  },
  {
    path: "/skill-score-method",
    title: "V26 스킬 점수 계산 기준 | CPBV LAB",
    description:
      "V26 스킬 점수 계산기가 타자, 선발, 중계, 마무리 스킬 점수를 어떤 기준으로 나누고 해석하는지 정리했습니다.",
    heading: "V26 스킬 점수 계산 기준",
    intro:
      "카드 타입, 보직, 스킬 레벨을 맞춘 뒤 총점과 희귀도를 같은 기준으로 비교합니다.",
    sections: [
      {
        title: "계산 흐름",
        body: "타자, 선발, 중계, 마무리 중 실제 보직을 먼저 고르고, 카드 타입에 맞는 스킬만 보여준 뒤 세 스킬 점수를 더합니다.",
      },
      {
        title: "입력할 때 확인할 것",
        body: "실제 카드의 보직과 카드 타입을 먼저 맞추고 스킬 3개와 레벨을 입력합니다. 같은 조합도 레벨이 다르면 총점과 희귀도가 달라집니다.",
      },
      {
        title: "역할별 기준",
        body: "타자와 투수는 보는 기준이 다르고, 투수도 선발과 불펜의 스킬 풀이 달라서 보직별로 따로 계산합니다.",
      },
      {
        title: "분기 스킬",
        body: "포수리드는 버프 포함 여부를 나누고, 선봉장은 타순 배치와 주루 구간을 봅니다. 우타킬러와 좌타킬러도 투수 손잡이에 따라 따로 고릅니다.",
      },
      {
        title: "총점과 희귀도",
        body: "총점은 세 스킬 점수를 더한 값이고, 상위 확률과 기대 시도 횟수는 이 조합이 어느 정도 보기 어려운지 감을 잡는 값입니다.",
      },
      {
        title: "결과가 다를 때",
        body: "예상한 점수와 다르면 보직, 카드 타입, 스킬 레벨과 조건이 붙은 분기 스킬을 먼저 확인합니다.",
      },
      {
        title: "사용 흐름",
        body: "현재 조합의 점수와 희귀도를 확인한 뒤 목표 등급을 정하고, 시뮬레이터에서 변경권 사용 난이도를 비교합니다.",
      },
      {
        title: "점수표 업데이트",
        body: "게임 업데이트나 새 점수 자료가 확인되면 계산기와 OCR이 같은 기준을 쓰도록 함께 수정하고 변경 내역을 공지합니다.",
      },
      {
        title: "비공식 안내",
        body: "CPBV LAB은 비공식 팬 제작 도구입니다. 계산 결과는 게임 안에서 선택할 때 참고하는 자료로 봐주세요.",
      },
    ],
  },
  {
    path: "/simulator-guide",
    title: "시뮬레이터 사용법 | CPBV LAB",
    description: "고급 스킬 변경권 시뮬레이터와 임팩트 변경 시뮬레이터의 차이, 결과 해석 방법을 안내합니다.",
    heading: "시뮬레이터 사용법",
    intro: "변경권을 실제로 쓰기 전에 목표 등급과 조합 난이도를 가늠하는 참고 도구입니다.",
    sections: [
      {
        title: "고스변 시뮬",
        body: "고급 스킬 변경권을 사용했을 때 나올 수 있는 조합을 가정해 점수와 등급을 확인합니다.",
      },
      {
        title: "임팩트 변경 시뮬",
        body: "1번 스킬을 고정하고 2번과 3번 스킬이 원하는 조건을 만족할 때까지 필요한 예상 시도 횟수를 확인합니다.",
      },
      {
        title: "확률 결과의 한계",
        body: "자동 롤 결과는 확률 기반 시뮬레이션이므로 실제 게임 결과를 보장하지 않습니다.",
      },
    ],
  },
  {
    path: "/ocr-guide",
    title: "라인업 OCR 사용법 | CPBV LAB",
    description: "라인업 스킬 인식 기능을 사용할 때 필요한 캡처 조건, 저장 방식, 결과 검토 방법입니다.",
    heading: "라인업 OCR 사용법",
    intro: "이미지를 읽어 초기 후보를 채운 뒤 계산기와 같은 기준으로 점수를 다시 계산합니다.",
    sections: [
      {
        title: "캡처 준비",
        body: "선수명, 카드 타입, 스킬명이 선명하게 보이는 이미지를 사용해야 하며 흐리거나 잘린 이미지는 오인식될 수 있습니다.",
      },
      {
        title: "인식 후 검토",
        body: "저장하기 전에 선수 포지션, 카드 타입, 스킬명, 레벨을 직접 확인하고 잘못된 항목은 화면에서 수정합니다.",
      },
      {
        title: "사용 제한",
        body: "공개 라인업 OCR은 서버 비용과 오남용 방지를 위해 사용 횟수 제한이 있을 수 있습니다.",
      },
    ],
  },
  {
    path: "/faq",
    title: "자주 묻는 질문 | CPBV LAB",
    description: "CPBV LAB의 스킬 계산기, 시뮬레이터, OCR 기능을 사용할 때 자주 확인하는 내용을 정리했습니다.",
    heading: "자주 묻는 질문",
    intro: "계산 결과는 조합 비교를 돕는 참고값이며 실제 게임 결과를 보장하지 않습니다.",
    sections: [
      {
        title: "스킬 점수는 실제 성능을 그대로 의미하나요?",
        body: "아닙니다. 스킬 점수는 여러 조합을 같은 기준으로 비교하기 위한 참고 지표입니다.",
      },
      {
        title: "고스변 기대 횟수는 어떻게 해석해야 하나요?",
        body: "같은 조건에서 목표 등급 이상의 조합을 얻기까지 평균적으로 어느 정도 시도가 필요한지 보여주는 값입니다.",
      },
      {
        title: "로그인이 꼭 필요한 기능은 무엇인가요?",
        body: "기본 계산기와 시뮬레이터는 로그인 없이 사용할 수 있고, 저장이나 사용량 제한이 필요한 OCR 기능은 Google 로그인을 요구할 수 있습니다.",
      },
    ],
  },
  {
    path: "/privacy",
    title: "개인정보처리방침 | CPBV LAB",
    description: "V26 스킬 계산기에서 수집하거나 저장할 수 있는 정보와 그 사용 목적을 안내합니다.",
    heading: "개인정보처리방침",
    intro: "서비스 운영, 문의 응대, 오류 확인, 품질 개선을 위해 필요한 범위의 정보만 사용합니다.",
    sections: [
      {
        title: "수집하는 정보",
        body: "랭킹 기능의 Google 로그인 기본 프로필, 문의 내용, 익명 사용 이벤트와 접속 환경 정보를 수집할 수 있습니다.",
      },
      {
        title: "제3자 서비스",
        body: "Supabase, Vercel Analytics, Vercel Speed Insights를 사용하며 AdSense 적용 시 광고 제공을 위한 쿠키가 사용될 수 있습니다.",
      },
      {
        title: "문의 및 삭제 요청",
        body: "저장된 문의 삭제 요청은 문의 페이지 또는 이메일로 보낼 수 있습니다.",
      },
    ],
  },
  {
    path: "/terms",
    title: "이용약관 및 면책 안내 | CPBV LAB",
    description: "CPBV LAB 도구를 사용할 때 적용되는 기본 이용 조건과 계산 결과의 한계를 안내합니다.",
    heading: "이용약관 및 면책 안내",
    intro: "CPBV LAB은 비공식 팬 제작 도구이며 계산 결과는 참고 자료입니다.",
    sections: [
      {
        title: "서비스 성격",
        body: "게임사, 리그, 선수 단체와 공식 제휴되어 있지 않으며 사이트 내 명칭은 기능 설명 목적으로 사용됩니다.",
      },
      {
        title: "결과의 한계",
        body: "계산 결과, 등급, 상위 확률, 기대 시도 횟수는 사이트 내부 기준과 확률 계산에 따른 참고값입니다.",
      },
      {
        title: "사용자 책임",
        body: "게임 내 재화 사용, 카드 선택, 변경권 사용 여부는 사용자가 직접 판단해야 합니다.",
      },
    ],
  },
  {
    path: "/contact",
    title: "문의 | CPBV LAB",
    description: "버그 제보, 기능 요청, 데이터 수정 요청이 있으면 문의 안내를 통해 보내주세요.",
    heading: "문의",
    intro: "오류를 제보할 때는 화면, 카드 타입, 스킬명, 레벨, 기대한 결과를 함께 적어주면 확인이 빠릅니다.",
    sections: [
      {
        title: "문의 방법",
        body: "메인 화면의 공지사항 위젯에서 문의 내용을 저장하거나 이메일 leeqwezxcasd@gmail.com으로 보낼 수 있습니다.",
      },
      {
        title: "작성 예시",
        body: "문제가 발생한 기능, 선택한 카드 타입, 스킬명, 레벨, 모바일 또는 PC 여부와 브라우저 정보를 함께 적어주세요.",
      },
    ],
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderPageContent(page) {
  const links = [
    ["/about", "소개"],
    ["/skill-score-method", "스킬 점수 기준"],
    ["/simulator-guide", "시뮬레이터 안내"],
    ["/ocr-guide", "OCR 안내"],
    ["/faq", "FAQ"],
    ["/privacy", "개인정보처리방침"],
    ["/terms", "이용약관"],
    ["/contact", "문의"],
  ];

  return [
    '<main class="info-page prerender-page" aria-labelledby="prerender-title">',
    '<div class="page-toolbar info-page-toolbar">',
    '<div class="page-title-block">',
    '<span class="page-kicker">CPBV LAB</span>',
    `<h1 id="prerender-title">${escapeHtml(page.heading)}</h1>`,
    `<p>${escapeHtml(page.intro)}</p>`,
    "</div>",
    "</div>",
    '<section class="info-page-card">',
    ...page.sections.map(
      (section) =>
        `<article class="info-page-section"><h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(
          section.body
        )}</p></article>`
    ),
    "</section>",
    '<nav class="home-site-links" aria-label="사이트 정보">',
    ...links.map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`),
    "</nav>",
    "</main>",
  ].join("");
}

function replaceOrAppendMeta(html, selector, tag) {
  const [attribute, value] = selector;
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta\\s+[^>]*${attribute}=["']${escapedValue}["'][^>]*>`, "i");
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

function setCanonical(html, href) {
  const tag = `<link rel="canonical" href="${href}" />`;
  return /<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(html)
    ? html.replace(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function renderHtml(template, page) {
  const canonicalUrl = `${siteOrigin}${page.path === "/" ? "/" : page.path}`;
  let html = template;
  html = html.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(page.title)}</title>`);
  html = replaceOrAppendMeta(
    html,
    ["name", "description"],
    `<meta name="description" content="${escapeHtml(page.description)}" />`
  );
  html = replaceOrAppendMeta(
    html,
    ["property", "og:title"],
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`
  );
  html = replaceOrAppendMeta(
    html,
    ["property", "og:description"],
    `<meta property="og:description" content="${escapeHtml(page.description)}" />`
  );
  html = replaceOrAppendMeta(
    html,
    ["property", "og:url"],
    `<meta property="og:url" content="${canonicalUrl}" />`
  );
  html = replaceOrAppendMeta(
    html,
    ["name", "twitter:title"],
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`
  );
  html = replaceOrAppendMeta(
    html,
    ["name", "twitter:description"],
    `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`
  );
  html = setCanonical(html, canonicalUrl);
  return html.replace('<div id="root"></div>', `<div id="root">${renderPageContent(page)}</div>`);
}

const template = await readFile(templatePath, "utf8");

await Promise.all(
  pages.map(async (page) => {
    const html = renderHtml(template, page);
    if (page.path === "/") {
      await writeFile(templatePath, html);
      return;
    }

    const outputDir = path.join(distDir, page.path.slice(1));
    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "index.html"), html);
  })
);

console.log(`Prerendered ${pages.length} public pages.`);
