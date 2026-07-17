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
        title: "라인업 스킬 인식",
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
        body: "스킬 점수 계산, 고급 스킬 변경권 시뮬레이션, 임팩트 변경 시뮬레이션, 라인업 스킬 인식, 랭킹 챌린지를 제공합니다.",
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
        title: "점수 데이터 출처와 확인일",
        body: "점수 데이터는 컴투스프로야구 V26 갤러리의 스킬점수표 모음(https://gall.dcinside.com/mgallery/board/view/?id=cpyv22&no=1210999&page=1)을 참고했습니다. 현재 코드의 타자·투수 점수는 원문과 대조했으며 마지막 확인일은 2026년 6월 18일입니다. 게임사의 공식 점수표는 아닙니다.",
      },
      {
        title: "입력할 때 확인할 것",
        body: "실제 카드의 보직과 카드 타입을 먼저 맞추고 스킬 3개와 레벨을 입력합니다. 같은 조합도 레벨이 다르면 총점과 희귀도가 달라집니다.",
      },
      {
        title: "역할별 기준",
        body: "타자와 투수는 애초에 비교하는 스킬 풀이 다르고, 투수도 선발과 불펜은 보는 기준이 다릅니다. 투수라고 한 번에 묶어버리면 계산이 애매해질 수 있습니다. 선발 기준으로 봐야 할 조합을 중계나 마무리 기준으로 보면 점수가 이상하게 느껴질 수 있어서, 계산기에서는 보직별로 따로 계산합니다.",
      },
      {
        title: "분기 스킬",
        body: "포수리드는 버프 포함 여부를 나누고, 선봉장은 타순 배치와 주루 구간을 봅니다. 우타킬러와 좌타킬러도 투수 손잡이에 따라 따로 고릅니다.",
      },
      {
        title: "실제 점수 계산 예시",
        body: "타자 6-5-5에서 정밀타격 24.59, 워크에식 20.76, 빅게임헌터 19.00을 더하면 64.35입니다. 선발 6-5-5에서 파이어볼 20.23, 빅게임헌터 18.75, 저니맨 16.07을 더하면 55.05입니다. 임팩트는 고정된 1번을 빼고 2번과 3번 점수만 더합니다.",
      },
      {
        title: "확률과 기대 횟수 계산",
        body: "희귀도는 “이 점수 이상이 얼마나 자주 나오느냐”를 보는 값입니다. 가능한 조합을 전부 놓고, 지금 점수보다 높거나 같은 조합이 어느 정도인지 계산합니다. 골든글러브는 6-6-6, 나머지 카드는 6-5-5를 기준으로 봅니다. 확률이 5%면 기대 횟수는 대략 20회로 볼 수 있지만, 실제로 20번 안에 꼭 나온다는 뜻은 아닙니다. 상위 확률 0.1% 이하는 SR+, 0.5% 이하는 SS, 1.5% 이하는 S, 5% 이하는 A, 12% 이하는 B, 그보다 높으면 C로 표시합니다.",
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
        body: "게임 업데이트나 새 점수 자료가 확인되면 계산기와 이미지 인식이 같은 기준을 쓰도록 함께 수정하고 변경 내역을 공지합니다.",
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
        title: "한 번 굴릴 때 정해지는 것",
        body: "선택한 보직과 카드 타입에서 나올 수 있는 스킬만 후보로 둡니다. 메이저, 마이너, 루키, 아마추어 등급별 가중치로 스킬 계열을 고른 뒤 실제 스킬 하나를 뽑습니다. 철완이나 선봉장처럼 조건만 다른 같은 계열은 한 조합에 두 번 나오지 않도록 제외합니다.",
      },
      {
        title: "1회 실행과 자동 롤의 차이",
        body: "1회 실행은 말 그대로 한 번만 굴려보는 기능입니다. 자동 롤은 목표 등급을 정해놓고, 그 이상이 나올 때까지 계속 돌려보는 기능입니다. 다만 한 번에 무한정 돌리는 건 아니고 최대 5,000회까지만 확인합니다.",
      },
      {
        title: "자동 롤 결과 예시",
        body: "목표를 A로 두고 37번째 조합에서 처음 A가 나왔다면 37회로 표시합니다. 이 값은 이번 실행에서 실제 반복한 횟수이며 확률표의 평균 횟수와는 다릅니다. 5,000회 안에 나오지 않았다고 해서 불가능한 조합이라는 뜻은 아닙니다.",
      },
      {
        title: "임팩트 변경은 1번을 고정합니다",
        body: "임팩트 변경은 보통 1번 스킬을 살려두고 2번, 3번을 바꾸는 상황을 보려고 만든 기능입니다. 그래서 시뮬레이터도 1번은 그대로 두고 나머지 두 칸만 다시 뽑습니다. 고정한 스킬과 같은 계열은 후보에서 빠지고, 나머지 두 칸이 모두 메이저가 될 때까지 반복합니다. 1옵작을 하고 일스변을 돌리는 시뮬레이션이라고 생각하면 됩니다.",
      },
      {
        title: "등급과 기대 횟수를 같이 보는 이유",
        body: "자동 롤 횟수는 한 번의 무작위 실행 결과라 매번 달라집니다. 상위 확률은 가능한 조합 전체에서 현재 점수 이상이 나올 비율이고 기대 횟수는 그 확률의 역수입니다. 상위 확률이 5%면 기대 횟수는 20회지만 실제로는 더 빠르거나 늦을 수 있습니다.",
      },
      {
        title: "결과를 볼 때 주의할 점",
        body: "카드 타입과 보직을 바꾸면 후보 스킬과 가중치가 달라집니다. 짧은 반복 결과만으로 특정 스킬이 더 잘 나온다고 판단하기 어렵고, 사이트 데이터가 게임 업데이트와 다르면 결과도 달라질 수 있습니다. 시뮬레이션은 변경권 결과를 보장하지 않습니다.",
      },
      {
        title: "계산 기준 더 보기",
        body: "점수 합산 방식, 상위 확률, 기대 횟수와 등급 경계는 스킬 점수 계산 기준 페이지에 실제 숫자와 함께 정리했습니다.",
      },
    ],
  },
  {
    path: "/ocr-guide",
    title: "라인업 스킬 인식 사용법 | CPBV LAB",
    description: "라인업 스킬 인식 기능을 사용할 때 필요한 캡처 조건, 저장 방식, 결과 검토 방법입니다.",
    heading: "라인업 스킬 인식 사용법",
    intro: "이미지를 읽어 초기 후보를 채운 뒤 계산기와 같은 기준으로 점수를 다시 계산합니다.",
    sections: [
      {
        title: "지원하는 이미지와 캡처 준비",
        body: "이미지 인식은 캡처 품질이 안 좋으면 바로 흔들립니다. 선수명, 스킬 3개, 레벨 숫자가 한 화면에 잘 보여야 하고, 위아래가 잘리면 첫 선수나 마지막 선수가 빠질 수 있습니다. PNG, JPG, JPEG, WEBP 파일을 올릴 수 있으며, 가능하면 자르거나 압축한 이미지보다 원본 캡처를 올리는 편이 낫습니다.",
        image: {
          src: "/ocr-lineup-example.png",
          alt: "선수명과 스킬 3개가 행별로 보이는 투수 라인업 스킬 인식 예시",
          caption: "선수명, 보직, 스킬 아이콘과 레벨 숫자가 잘리지 않은 캡처 예시",
        },
      },
      {
        title: "업로드부터 결과 확인까지",
        body: "Google 로그인 후 투수 또는 타자 업로드를 선택하면 이미지 인식이 먼저 선수 행과 스킬 칸을 찾아서 후보를 채웁니다. 다만 이 단계에서 바로 정답이라고 보면 안 됩니다. 선수명, 카드 타입, 보직, 스킬명, 레벨을 한 번씩 보고 틀린 값은 저장 전에 고쳐야 합니다.",
      },
      {
        title: "이미지 인식 결과가 이상할 때 먼저 볼 것",
        body: "이미지 위아래가 잘리면 첫 선수나 마지막 선수가 빠질 수 있습니다. 비슷한 아이콘과 작은 글자는 다른 스킬로 연결될 수 있고 흐린 레벨 배지는 숫자를 잘못 읽을 수 있습니다. 조건이 나뉜 스킬과 매칭 실패 항목은 사용자가 직접 골라야 합니다.",
      },
      {
        title: "수정하면 점수도 바로 다시 계산됩니다",
        body: "이미지 인식은 정답을 확정하는 기능이 아니라 입력을 빠르게 채우는 기능입니다. 틀린 값을 고치면 점수도 바로 다시 계산됩니다. 이미지 인식 결과가 조금 틀려도 저장 전에만 제대로 고치면 계산기와 같은 기준으로 선수별 총점과 라인업 평균을 다시 볼 수 있습니다.",
      },
      {
        title: "사용 횟수와 저장되는 기록",
        body: "공개 라인업 인식은 비용이 들어가는 기능이라 Google 로그인 후 제한을 두고 있습니다. 현재는 타자 1회, 투수 1회를 주간 기준으로 사용할 수 있습니다. 결과를 다시 열 수 있도록 파일명, 이미지 인식 응답, 사용자가 고친 선수·스킬 값, 총점과 평균 점수를 스냅샷으로 저장합니다.",
      },
      {
        title: "저장 전 스냅샷과 삭제",
        body: "이미지 인식을 돌리면 검수용 스냅샷이 먼저 만들어집니다. 최종 저장 전이라도 결과를 다시 열어 확인할 수 있게 하려는 용도입니다. 필요 없으면 검수 화면에서 삭제할 수 있고, 저장한 기록이나 계정 관련 정보 삭제가 필요하면 문의 페이지 또는 이메일로 요청할 수 있습니다.",
      },
      {
        title: "올리기 전에 이것만 확인하세요",
        body: "게임 해상도를 높음 또는 최고로 설정하고 선수 행 전체와 스킬 3개가 보이게 세로로 캡처합니다. 자르거나 압축하지 않은 원본 파일을 사용하고 저장 전에 카드 타입, 보직, 스킬명, 레벨을 확인해야 합니다.",
      },
      {
        title: "기능의 한계",
        body: "이미지 인식은 화면 상태에 따라 결과가 꽤 달라질 수 있습니다. 해상도가 낮거나 이미지가 압축됐거나, 새 스킬 아이콘이 추가된 경우에는 인식률이 떨어질 수 있습니다. 이미지 인식 결과만 보고 게임 내 판단을 확정하지 말고, 반복해서 틀리는 항목이 있으면 원본 이미지와 함께 제보해주세요.",
      },
    ],
  },
  {
    path: "/faq",
    title: "자주 묻는 질문 | CPBV LAB",
    description: "CPBV LAB의 스킬 계산기, 시뮬레이터, 이미지 인식 기능을 사용할 때 자주 확인하는 내용을 정리했습니다.",
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
        body: "기본 계산기와 시뮬레이터는 로그인 없이 사용할 수 있고, 저장이나 사용량 제한이 필요한 이미지 인식 기능은 Google 로그인을 요구할 수 있습니다.",
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
        body: "랭킹 기능의 Google 로그인 기본 프로필과 닉네임, 문의 내용, 이미지 인식 파일명과 인식 결과 및 사용자가 수정한 선수·스킬 정보와 계산 점수, 익명 사용 이벤트와 접속 환경 정보를 수집할 수 있습니다.",
      },
      {
        title: "이용 목적",
        body: "수집된 정보는 랭킹 표시, 이미지 인식 기록 확인, 문의 응대, 오류 확인과 서비스 품질 개선을 위해 사용합니다.",
      },
      {
        title: "제3자 서비스",
        body: "로그인과 데이터 저장에 Supabase를, 익명 방문 통계 확인에 Vercel Analytics를 사용합니다. AdSense 적용 시 광고 제공과 부정 사용 방지를 위한 쿠키 또는 유사 기술이 사용될 수 있습니다.",
      },
      {
        title: "광고와 쿠키",
        body: "Google AdSense가 적용되는 경우 Google과 파트너는 광고 제공, 광고 성과 측정과 부정 사용 방지를 위해 쿠키 또는 유사 기술을 사용할 수 있습니다.",
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
    ["/ocr-guide", "라인업 인식 안내"],
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
      (section) => {
        const image = section.image
          ? `<figure class="info-guide-figure"><img class="info-guide-image" src="${escapeHtml(
              section.image.src
            )}" alt="${escapeHtml(section.image.alt)}" loading="lazy" /><figcaption>${escapeHtml(
              section.image.caption
            )}</figcaption></figure>`
          : "";

        return `<article class="info-page-section"><h2>${escapeHtml(
          section.title
        )}</h2><p>${escapeHtml(section.body)}</p>${image}</article>`;
      }
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
