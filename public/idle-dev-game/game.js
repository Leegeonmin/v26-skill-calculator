// 야구 선수 키우기 (CPBV Hitter Tycoon) 게임 로직

const STAT_CONFIG = {
  power: { label: '파워(Power)', shortLabel: '파워', baseCost: 16, costScale: 1.2, help: '스윙당 훈련량과 홈런 보상 배율 상승' },
  contact: { label: '정확(Contact)', shortLabel: '정확', baseCost: 10, costScale: 1.18, help: '안타/홈런 확률 상승, 정확 스탯 효율 스킬과 시너지' },
  eye: { label: '선구(Eye)', shortLabel: '선구', baseCost: 14, costScale: 1.18, help: '자동 훈련 효율 상승, 찬스볼 등장 주기 단축/유지 시간 증가' },
  patience: { label: '인내(Patience)', shortLabel: '인내', baseCost: 12, costScale: 1.16, help: '안타 확률과 스윙당 훈련량 소폭 상승' },
  speed: { label: '주루(Speed)', shortLabel: '주루', baseCost: 12, costScale: 1.16, help: '안타 확률 상승, 찬스볼 반응 시간/등장 주기 개선' },
  defense: { label: '수비(Defense)', shortLabel: '수비', baseCost: 12, costScale: 1.16, help: '자동 훈련 효율과 아웃 시 최소 훈련량 보상 상승' }
};

const STAT_KEYS = Object.keys(STAT_CONFIG);
const TRAINING_GAIN_PER_CLICK = 3;
const REDISTRIBUTE_COST = 2000;
const TRAINING_COST_MULTIPLIER_BY_TIER = {
  LIVE: 1,
  IMPACT: 5,
  SIGNATURE: 25,
  'GOLDEN GLOVE': 80
};
const TRAINING_COST_GROWTH = 1.18;
const HOMERUN_SOUND_SRC = 'assets/homerun-crack.mp3';

// 1. 게임 상태 정의 (기본값)
let state = {
  saveVersion: 3,
  tp: 0,
  player: {
    name: '홍타자',
    tier: 'LIVE', // LIVE -> IMPACT -> SIGNATURE -> GOLDEN GLOVE
    league: '루키 리그'
  },
  stats: {
    contact: 0, // 정확
    power: 0,   // 파워
    eye: 0,      // 선구
    patience: 0, // 인내
    speed: 0,    // 주루
    defense: 0   // 수비
  },
  baseStats: {
    contact: 0,
    power: 0,
    eye: 0,
    patience: 0,
    speed: 0,
    defense: 0
  },
  upgrades: {
    active: {},  // 장비 구매 횟수 { itemId: count }
    passive: {}  // 훈련 시설/스태프 구매 횟수 { itemId: count }
  },
  skills: [null, null, null], // [Skill, Skill, Skill]
  synergyCount: 0, // MLB Exit(환생) 횟수 (스톡옵션 주수)
  globalExitCount: 0,
  boostActive: false,
  boostCooldown: 0,
  boostActiveTimeRemaining: 0,
  lockFirstSkill: false
};

// 2. 고스변 스킬 풀 (v26-skill-calculator의 타자 스킬 원본 등급 기준)
const SKILL_NAMES_BY_GRADE = {
  MAJOR: [
    '포수리드(버프포함)', '포수리드', '정밀타격', '좌타해결사(좌타)', '워크에식', '빅게임헌터',
    '저니맨', '오버페이스', '좌타해결사(양타)', '대표타자', '리그탑플레이어', '도전정신(4성)',
    '선봉장(타순배치,주루142+)', '선봉장(타순배치,주루130~141)', '선봉장(타순배치,주루129이하)',
    '컨택트히터(타순배치O)', '배팅머신', '가을사나이', '5툴플레이어(275299)', '5툴플레이어(267274)',
    '대도', '대도(버프X)', '도전정신(5성)', '공포의하위타선(타순배치O)', '순위경쟁', '비FA계약',
    '5툴플레이어(250266)', '5툴플레이어(234249)', '난세의영웅', '홈어드밴티지', '얼리스타트',
    '베스트포지션', '백전노장', '좌타해결사(우타)', '패기(임팩)', '수비안정성(타순배치O)',
    '수비안정성(타순배치X)', '핵타선(타순배치O)', '핵타선(타순배치X)', '5툴플레이어(225233)',
    '5툴플레이어(200224)', '집중력', '결정적한방', '선봉장(타순배치X,주루142+)',
    '선봉장(타순배치X,주루130~141)', '선봉장(타순배치X,주루129이하)', '승부사', '승리의함성',
    '컨택트히터(타순배치X)', '짜릿한손맛', '노림수', '대타스페셜', '리드오프(타순배치O)',
    '공포의하위타선(타순배치X)', '히든카드', '어퍼스윙', '클러치히터', '패기(시그/올스타)',
    '하이볼히터', '리드오프(타순배치X)', '패기(골글)', '빠른발', '리그의강자'
  ],
  MINOR: ['우완킬러', '타선연결', '타점기계', '좌완킬러', '매의눈'],
  ROOKIE: ['테이블세터', '역전의명수', '승부근성', '스윗스팟'],
  AMATEUR: ['초구공략', '변화구킬러', '당겨치기', '밀어치기', '직구킬러', '진검승부', '번트전문']
};

const SKILL_POOL = Object.fromEntries(
  Object.entries(SKILL_NAMES_BY_GRADE).map(([rank, names]) => [
    rank,
    names.map(name => ({
      name,
      rank,
      desc: createSkillDescription(name, rank),
      effect: createSkillEffect(name, rank)
    }))
  ])
);

// 3. 상점 데이터 정의
const SHOP_DATA = {
  active: [
    { id: 'cleats', name: '가벼운 스파이크', desc: '발놀림이 가벼워집니다.', cost: 50, lpc: 1 },
    { id: 'gloves', name: '양피 타격 장갑', desc: '그립감이 개선되어 힘이 잘 전달됩니다.', cost: 300, lpc: 4 },
    { id: 'wrist_guard', name: '아라미드 손목 보호대', desc: '손목 부상을 방지하고 스윙에 확신을 줍니다.', cost: 1500, lpc: 15 },
    { id: 'maple_bat', name: '단풍나무 하드 배트', desc: '단단한 단풍나무 재질로 비거리가 상승합니다.', cost: 8000, lpc: 60 },
    { id: 'custom_bat', name: '커스텀 나노합성 배트', desc: '주문 제작된 가벼운 고반발 배트입니다.', cost: 40000, lpc: 250 },
    { id: 'smart_bat', name: '나노테크 스마트 배트', desc: '스윙 궤적 분석 센서가 달린 미래형 배트.', cost: 250000, lpc: 1200 }
  ],
  passive: [
    { id: 'toss_machine', name: '자동 토스 머신', desc: '일정한 궤적으로 공을 던져줍니다.', cost: 100, lps: 1 },
    { id: 'batting_cage', name: '피칭 머신 배팅 게이지', desc: '더 빠른 구속의 공을 자동으로 연습합니다.', cost: 800, lps: 8 },
    { id: 'coach', name: '1군 타격 코치 고용', desc: '전문적인 코칭으로 자동 훈련을 최적화합니다.', cost: 4000, lps: 45 },
    { id: 'trainer', name: '전담 피지컬 트레이너', desc: '피로 누적을 줄이고 근육 회복 속도를 올립니다.', cost: 20000, lps: 260 },
    { id: 'science_lab', name: '스포츠 바이오 과학 연구실', desc: '모션 캡처 및 AI 분석을 통한 맞춤형 훈련.', cost: 120000, lps: 1500 },
    { id: 'vr_center', name: '초정밀 VR 시뮬레이션 센터', desc: '가상 투수를 상대로 24시간 훈련을 돌립니다.', cost: 1000000, lps: 10000 }
  ]
};

// 4. 카드 등급 및 승급 정보
const TIER_INFO = {
  'LIVE': {
    next: 'IMPACT',
    league: '루키 리그',
    reqTp: 10000,
    reqStats: 25,
    maxStats: 25,
    colorClass: 'card-live',
    badgeClass: 'badge-live'
  },
  'IMPACT': {
    next: 'SIGNATURE',
    league: '마이너 리그',
    reqTp: 100000,
    reqStats: 18,
    maxStats: 18,
    colorClass: 'card-impact',
    badgeClass: 'badge-impact'
  },
  'SIGNATURE': {
    next: 'GOLDEN GLOVE',
    league: 'KBO 프로 리그',
    reqTp: 1000000,
    reqStats: 25,
    maxStats: 25,
    colorClass: 'card-signature',
    badgeClass: 'badge-signature'
  },
  'GOLDEN GLOVE': {
    next: 'MLB EXIT',
    league: '국가대표 & 올스타',
    reqTp: 10000000,
    reqStats: 25,
    maxStats: 25,
    colorClass: 'card-golden',
    badgeClass: 'badge-golden'
  }
};

// 5. 전광판 밈 로그 리스트
const FUNNY_LOGS = [
  '금요일 오후 5시에 연장 훈련을 지시받았습니다... ⚾',
  '관중석의 한 팬이 소리칩니다: "눈 감고 스윙해도 그것보단 잘 치겠다!" 📣',
  '안타를 쳤으나 2루로 뛰던 도중 헬멧이 벗겨져 아웃될 뻔했습니다.',
  '타격 코치가 한숨을 쉽니다: "골반 턴이 아직도 늦어!"',
  '팀 전력분석원이 말합니다: "cpbv-lab 계산기 돌려보니 당신 파워 능력치가 리그 평균 이하입니다."',
  '스파이크에 흙을 털어내며 타석에 집중합니다.',
  '구단주가 방문하여 격려금을 전달했습니다: "훈련량 +10" 💰',
  '바람이 홈에서 외야 쪽으로 강하게 불고 있습니다! 홈런 찬스!',
  '커뮤니티 반응: "어제 경기 9회말 삼진 당한 거 실화냐? ㅡㅡ"',
  '헬멧을 톡톡 치며 투수의 눈빛을 쏘아봅니다.',
  '안타성 타구였으나 외야수의 호수비에 잡혔습니다. 아쉬운 비명!',
  '전담 트레이너의 마사지 덕분에 어깨 뭉침이 해결되었습니다. 💆‍♂️',
  '팀 단장이 연봉 협상을 미루고 있습니다... 열정 페이?',
  '연습 구장에 비가 내리기 시작해 실내 배팅 훈련장으로 이동합니다. 🌧️',
  '커뮤니티 반응: "이 선수 스펙이면 내년 시그니처 카드로 무조건 나옴 ㄹㅇ"',
  '배트에 단내가 날 정도로 스윙 훈련을 계속합니다.'
];

// 법적 문서 원문 데이터
const LEGAL_DOCS = {
  about: `
    <h4>서비스 소개 (About)</h4>
    <p>본 프로젝트는 모바일 야구 시뮬레이션 게임인 '컴투스프로야구V26(CPBV)'의 육성 및 스킬 변경 시스템에 영감을 받아 제작된 <strong>팬 메이드 웹 시뮬레이터 및 클릭커 게임</strong>입니다.</p>
    <p>유저는 신인 타자(LIVE)에서 출발하여 타격 스탯을 강화하고, 장비를 업그레이드하며, 3개의 스킬 슬롯에 골드 스킬을 띄우는 '고스변' 과정을 거쳐 최고의 야구 선수로 성장시킬 수 있습니다.</p>
    <p>본 사이트의 데이터 및 시뮬레이션 규칙은 야구 매니아들의 계산식을 대중적으로 단순화한 것이며, 실제 컴투스 퍼블리싱 게임과 어떠한 공식 제휴 관계도 맺고 있지 않습니다.</p>
  `,
  terms: `
    <h4>이용약관 (Terms of Service)</h4>
    <p><strong>제 1 조 (목적)</strong><br>본 약관은 'CPBV LAB Hitter Tycoon'(이하 '서비스')에서 제공하는 캐주얼 시뮬레이션 게임의 이용 조건을 규정합니다.</p>
    <p><strong>제 2 조 (무상 서비스)</strong><br>본 서비스는 전면 무료로 제공되는 팬 창작물입니다. 게임 내의 훈련량, 장비 구매, 카드 등급 등 모든 재화는 가상의 수치이며 실제 금전적 가치를 가지지 않습니다.</p>
    <p><strong>제 3 조 (데이터 관리)</strong><br>사용자의 게임 기록은 전적으로 웹 브라우저의 로컬 저장소(LocalStorage)에 기록됩니다. 브라우저 캐시 삭제 또는 시크릿 모드 이용 시 데이터가 유실될 수 있으며, 운영자는 로컬 데이터 분실에 따른 복구 책임을 지지 않습니다.</p>
  `,
  privacy: `
    <h4>개인정보처리방침 (Privacy Policy)</h4>
    <p><strong>1. 수집하는 개인정보</strong><br>본 서비스는 회원 가입 절차가 존재하지 않으며, 사용자의 이름(닉네임), 이메일, 연락처 등 어떠한 식별 가능한 <strong>개인정보도 서버에 전송하거나 수집하지 않습니다.</strong></p>
    <p><strong>2. 쿠키 및 로컬 저장소 이용</strong><br>게임 진행 상태(훈련량, 스탯, 구매 장비 정보 등)의 보존을 위해 브라우저의 <strong>LocalStorage</strong> 기능을 사용합니다. 이는 사용자의 기기에 직접 기록되며 서버로 공유되지 않습니다.</p>
    <p><strong>3. 구글 애드센스 및 분석 도구</strong><br>향후 본 서비스는 구글 애드센스 등 서드파티 광고 도구를 장착할 수 있으며, 이 과정에서 광고 최적화를 위해 비식별화된 행동 로그 수집(쿠키 등)이 발생할 수 있습니다. 사용자는 브라우저 설정을 통해 쿠키 수집을 거부할 수 있습니다.</p>
  `,
  contact: `
    <h4>문의하기 (Contact)</h4>
    <p>버그 제보, 건의 사항 또는 저작권 관련 문의는 아래 메일 주소로 보내주시기 바랍니다.</p>
    <p>📧 이메일: <a href="mailto:youngjun940432@gmail.com" style="color:var(--neon-blue);">youngjun940432@gmail.com</a></p>
    <p>피드백을 주시면 검토 후 다음 업데이트 패치노트에 반영하도록 하겠습니다. 감사합니다!</p>
  `
};

// 6. 계산 헬퍼 함수들 (스킬 및 스탯 계산이 녹아있는 로직)

function createSkillEffect(name, rank) {
  const gradePower = { MAJOR: 1.0, MINOR: 0.55, ROOKIE: 0.32, AMATEUR: 0.18 }[rank] || 0.2;
  const compactName = name.replace(/\s+/g, '');

  if (compactName.includes('빠른발') || compactName.includes('리그의강자')) {
    return { type: 'all', val: -(gradePower * 0.3) };
  }

  if (/정밀|컨택트|배팅머신|노림수|스윗스팟|초구|직구|변화구|당겨|밀어|하이볼/.test(name)) {
    return { type: 'lpc', val: gradePower };
  }

  if (/5툴|대도|빠른발|선봉장|리드오프|테이블세터/.test(name)) {
    return { type: 'all', val: gradePower * 0.65 };
  }

  if (/결정적|어퍼|짜릿|클러치|승부사|홈|공포|핵타선|대표타자|리그탑/.test(name)) {
    return { type: 'homerun', val: gradePower * 2.2, chanceBoost: gradePower * 0.018 };
  }

  if (/포수리드|워크에식|저니맨|수비안정성|백전노장|타선연결|타점기계|번트/.test(name)) {
    return { type: 'lps', val: gradePower * 0.8 };
  }

  if (/좌타|우완|좌완|킬러|패기|집중력|매의눈|승부근성/.test(name)) {
    return { type: 'contact_boost', val: gradePower * 0.22 };
  }

  return { type: 'all', val: gradePower * 0.45 };
}

function createSkillDescription(name, rank) {
  const rankLabel = { MAJOR: '메이저', MINOR: '마이너', ROOKIE: '루키', AMATEUR: '아마추어' }[rank] || rank;
  const effect = createSkillEffect(name, rank);

  if (effect.type === 'lpc') return `${rankLabel} 스킬: 스윙당 훈련량 ${formatSignedRoundedPercent(effect.val)}`;
  if (effect.type === 'lps') return `${rankLabel} 스킬: 초당 자동 훈련량 ${formatSignedRoundedPercent(effect.val)}`;
  if (effect.type === 'all') return `${rankLabel} 스킬: 스윙당 훈련량/초당 자동 훈련량 ${formatSignedRoundedPercent(effect.val)}`;
  if (effect.type === 'homerun') return `${rankLabel} 스킬: 홈런 보너스 +${Math.round(effect.val * 100)}%, 홈런 확률 +${(effect.chanceBoost * 100).toFixed(1)}%`;
  if (effect.type === 'contact_boost') return `${rankLabel} 스킬: 정확 스탯 효율 +${Math.round(effect.val * 100)}%`;
  return `${rankLabel} 스킬`;
}

function getAdvancedRollWeights(slotIndex) {
  const weightsByTier = {
    LIVE: [
      { AMATEUR: 58, ROOKIE: 35, MINOR: 7 },
      { AMATEUR: 62, ROOKIE: 32, MINOR: 6 },
      { AMATEUR: 65, ROOKIE: 30, MINOR: 5 }
    ],
    IMPACT: [
      { ROOKIE: 58, MINOR: 34, MAJOR: 8 },
      { AMATEUR: 10, ROOKIE: 55, MINOR: 30, MAJOR: 5 },
      { AMATEUR: 15, ROOKIE: 55, MINOR: 27, MAJOR: 3 }
    ],
    SIGNATURE: [
      { MINOR: 82, MAJOR: 18 },
      { ROOKIE: 15, MINOR: 70, MAJOR: 15 },
      { ROOKIE: 20, MINOR: 68, MAJOR: 12 }
    ],
    'GOLDEN GLOVE': [
      { MAJOR: 100 },
      { MINOR: 72, MAJOR: 28 },
      { MINOR: 78, MAJOR: 22 }
    ]
  };

  const tierWeights = weightsByTier[state.player.tier] || weightsByTier.LIVE;
  return tierWeights[slotIndex] || tierWeights[tierWeights.length - 1];
}

function getSkillEffectFamily(skill) {
  if (!skill?.effect) return 'unknown';
  if (skill.effect.type === 'all') return skill.effect.val < 0 ? 'penalty' : 'all';
  return skill.effect.type;
}

function pickWeightedSkill(slotIndex, excludedNames = new Set(), excludedEffectFamilies = new Set()) {
  const weights = getAdvancedRollWeights(slotIndex);
  const candidates = Object.entries(weights).flatMap(([rank, weight]) =>
    (SKILL_POOL[rank] || [])
      .filter(skill => !excludedNames.has(normalizeSkillFamily(skill.name)))
      .filter(skill => !excludedEffectFamilies.has(getSkillEffectFamily(skill)))
      .map(skill => ({ skill, weight }))
  );

  const fallbackCandidates = candidates.length > 0 ? candidates : Object.entries(weights).flatMap(([rank, weight]) =>
    (SKILL_POOL[rank] || [])
      .filter(skill => !excludedNames.has(normalizeSkillFamily(skill.name)))
      .map(skill => ({ skill, weight }))
  );

  const totalWeight = fallbackCandidates.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) return null;

  let random = Math.random() * totalWeight;
  for (const entry of fallbackCandidates) {
    random -= entry.weight;
    if (random <= 0) return { ...entry.skill };
  }

  return { ...fallbackCandidates[fallbackCandidates.length - 1].skill };
}

function normalizeSkillFamily(name) {
  const compactName = name.replace(/\s+/g, '');
  const aliasRules = [
    [/^포수리드/, '포수리드'],
    [/^도전정신/, '도전정신'],
    [/^패기/, '패기'],
    [/^대도/, '대도'],
    [/^5툴플레이어/, '5툴플레이어'],
    [/^컨택트히터/, '컨택트히터'],
    [/^공포의하위타선/, '공포의하위타선'],
    [/^리드오프/, '리드오프'],
    [/^선봉장/, '선봉장'],
    [/^수비안정성/, '수비안정성'],
    [/^핵타선/, '핵타선'],
    [/^좌타해결사/, '좌타해결사']
  ];

  const match = aliasRules.find(([pattern]) => pattern.test(compactName));
  return match ? match[1] : compactName;
}

function getSkillRankShort(rank) {
  return { MAJOR: 'M', MINOR: 'm', ROOKIE: 'R', AMATEUR: 'A' }[rank] || rank[0] || '-';
}

// 현재의 스윙당 훈련량 계산
function getSwingTrainingAmount() {
  let baseLpc = 1;
  const stats = combineStats();
  
  // 장비 스탯 추가
  SHOP_DATA.active.forEach(item => {
    const qty = state.upgrades.active[item.id] || 0;
    baseLpc += item.lpc * qty;
  });

  baseLpc += stats.contact * 0.35;
  baseLpc += stats.power * 0.75;
  baseLpc += stats.patience * 0.2;

  // 스킬에 의한 스윙당 훈련량 배율 계산
  let lpcMult = 1.0;
  state.skills.forEach(skill => {
    if (!skill) return;
    if (skill.effect.type === 'lpc') lpcMult += skill.effect.val;
    if (skill.effect.type === 'all') lpcMult += skill.effect.val;
    if (skill.effect.type === 'contact_boost') {
      // 정확 스탯 효율 증가 버프
      baseLpc += stats.contact * 0.35 * skill.effect.val;
    }
  });

  // AI 부스터 활성화 시 x2
  if (state.boostActive) {
    lpcMult += 1.0;
  }

  return Math.max(1, Math.floor(baseLpc * Math.max(0.1, lpcMult)));
}

// 현재의 초당 자동 훈련량 계산
function getAutoTrainingPerSecond() {
  let baseLps = 0;
  const stats = combineStats();

  // 자동화 장치/스태프 스탯 추가
  SHOP_DATA.passive.forEach(item => {
    const qty = state.upgrades.passive[item.id] || 0;
    baseLps += item.lps * qty;
  });

  // 스킬 및 스탯에 의한 배율
  let lpsMult = 1.0;
  
  // 선구 스탯에 따른 자동 훈련 시너지 (레벨당 +2%)
  lpsMult += stats.eye * 0.02;
  lpsMult += stats.defense * 0.015;

  // 스킬 버프
  state.skills.forEach(skill => {
    if (!skill) return;
    if (skill.effect.type === 'lps') lpsMult += skill.effect.val;
    if (skill.effect.type === 'all') lpsMult += skill.effect.val;
  });

  // 시너지(환생) 버프: 1회당 +100% (x2, x3 ...)
  lpsMult += state.synergyCount * 1.0;

  // AI 부스터 활성화 시 x2
  if (state.boostActive) {
    lpsMult += 1.0;
  }

  return Math.floor(baseLps * Math.max(0.1, lpsMult));
}

// 업그레이드 아이템의 기하급수적 가격 계산
function getItemCost(baseCost, count) {
  return Math.floor(baseCost * Math.pow(1.15, count));
}

// 스탯 강화 가격 계산
function getStatUpgradeCost(statName, currentLevel) {
  const config = STAT_CONFIG[statName];
  if (!config) return 0;
  return Math.floor(config.baseCost * Math.pow(config.costScale, currentLevel - 1));
}

function getTotalStatLevel(stats = state.stats) {
  return STAT_KEYS.reduce((sum, key) => sum + (stats[key] || 0), 0);
}

function getTrainingLevel(stats = state.stats) {
  return Math.floor(getTotalStatLevel(stats) / TRAINING_GAIN_PER_CLICK);
}

function getMaxTotalStatLevel(maxTrainingLevel) {
  return maxTrainingLevel * TRAINING_GAIN_PER_CLICK;
}

function getTrainingCost() {
  const tierMultiplier = TRAINING_COST_MULTIPLIER_BY_TIER[state.player.tier] || 1;
  return Math.floor(10 * tierMultiplier * Math.pow(TRAINING_COST_GROWTH, getTrainingLevel()));
}

function formatPercent(value) {
  return Number(value).toFixed(2);
}

function formatSignedPercent(value) {
  const numericValue = Number(value);
  return `${numericValue > 0 ? '+' : ''}${numericValue.toFixed(2)}%`;
}

function formatSignedRoundedPercent(value) {
  const percentValue = Math.round(Number(value) * 100);
  return `${percentValue > 0 ? '+' : ''}${percentValue}%`;
}

function createFreshStats() {
  return STAT_KEYS.reduce((stats, key) => {
    stats[key] = 0;
    return stats;
  }, {});
}

function combineStats(baseStats = state.baseStats, currentStats = state.stats) {
  return STAT_KEYS.reduce((stats, key) => {
    stats[key] = (baseStats?.[key] || 0) + (currentStats?.[key] || 0);
    return stats;
  }, {});
}

// 고스변 비용 계산
function getSkillRollCost() {
  // 기본 훈련량 1,000이며, 카드 등급 및 환생 횟수에 따라 다소 조율 가능하나 1,000으로 고정
  const costByTier = {
    LIVE: 1000,
    IMPACT: 5000,
    SIGNATURE: 25000,
    'GOLDEN GLOVE': 100000
  };

  return costByTier[state.player.tier] || costByTier.LIVE;
}

// 7. 실시간 타격(클릭) 판정 알고리즘
function swingBat(isCritical = false) {
  const currentLpc = getSwingTrainingAmount();
  const stats = combineStats();
  let gainedTp = 0;
  let resultText = '';
  let resultClass = '';
  let logText = '';

  // 1) 홈런 확률 계산 (정확도 레벨이 영향을 줌)
  // 정확 1렙당 0.1%씩 홈런률 증가 (기본 1%에서 시작)
  let homerunChance = 0.01 + stats.contact * 0.0015 + stats.power * 0.0005;
  
  // 스킬 보너스
  state.skills.forEach(skill => {
    if (skill && skill.effect.type === 'homerun') {
      homerunChance += skill.effect.chanceBoost || 0;
    }
  });

  if (isCritical) {
    homerunChance = 0.40; // 실투 클릭 시 홈런 확률 40%로 폭등
  }

  // 2) 안타 확률 계산 (정확/인내/주루가 출루 품질에 영향)
  let hitChance = 0.15 + stats.contact * 0.005 + stats.patience * 0.002 + stats.speed * 0.001;

  const rand = Math.random();

  if (rand < homerunChance) {
    // 홈런
    // 파워 스탯에 따른 홈런 배율 계산 (기본 5배 + 파워렙당 0.5배 추가)
    let homerunMultiplier = 4 + stats.power * 0.12;
    
    // 스킬 보너스
    state.skills.forEach(skill => {
      if (skill && skill.effect.type === 'homerun') {
        homerunMultiplier += skill.effect.val;
      }
    });

    gainedTp = Math.floor(currentLpc * homerunMultiplier);
    resultText = '홈런!';
    resultClass = 'homerun-float';
    logText = `[장외 홈런!] 투수의 빠른 패스트볼을 받아쳐 펜스를 넘겼습니다! (훈련량 +${gainedTp.toLocaleString()})`;
  } else if (rand < homerunChance + hitChance) {
    // 안타 / 장타 / 번트 안타
    const hitRand = Math.random();
    const buntChance = Math.min(0.06, 0.006 + stats.speed * 0.0012 + stats.eye * 0.0006);
    if (hitRand < buntChance) {
      gainedTp = Math.max(1, Math.floor(currentLpc * 0.8));
      resultText = '번트 안타!';
      logText = `[번트 안타] 3루 라인에 절묘하게 공을 굴렸습니다. 빠른 발로 1루 세이프! (훈련량 +${gainedTp.toLocaleString()})`;
    } else if (hitRand < 0.10 + buntChance) {
      gainedTp = currentLpc * 3;
      resultText = '3루타!';
      logText = `[3루타!] 외야 펜스를 직격하는 깊숙한 타구를 보냈습니다. (훈련량 +${gainedTp.toLocaleString()})`;
    } else if (hitRand < 0.35 + buntChance) {
      gainedTp = currentLpc * 2;
      resultText = '2루타!';
      logText = `[2루타!] 우중간을 완전히 갈라놓는 깔끔한 장타를 날렸습니다. (훈련량 +${gainedTp.toLocaleString()})`;
    } else {
      gainedTp = currentLpc;
      resultText = '안타!';
      logText = `[안타] 투수의 실투를 결대로 밀어쳐 1루 주자를 진루시켰습니다. (훈련량 +${gainedTp.toLocaleString()})`;
    }
  } else {
    // 볼넷 / 번트 실패 / 파울 / 삼진
    const outRand = Math.random();
    const defenseFloor = 0.1 + stats.defense * 0.003;
    gainedTp = Math.max(1, Math.floor(currentLpc * defenseFloor));
    const walkChance = Math.min(0.32, 0.12 + stats.eye * 0.006 + stats.patience * 0.003);
    const buntOutChance = Math.min(0.08, 0.01 + stats.speed * 0.0008);

    if (outRand < walkChance) {
      gainedTp = Math.max(1, Math.floor(currentLpc * 0.45));
      resultText = '볼넷';
      logText = `[볼넷] 풀카운트 승부 끝에 낮은 변화구를 골라냈습니다. 출루 훈련량 획득. (훈련량 +${gainedTp.toLocaleString()})`;
    } else if (outRand < walkChance + buntOutChance) {
      gainedTp = Math.max(1, Math.floor(currentLpc * 0.08));
      resultText = '번트';
      logText = `[번트] 희생번트를 시도했지만 투수 정면으로 향했습니다. 작전 수행 훈련량 획득. (훈련량 +${gainedTp.toLocaleString()})`;
    } else if (outRand < walkChance + buntOutChance + 0.32) {
      resultText = '볼넷';
      logText = `[볼넷] 끈질긴 커트 끝에 투수를 흔들었습니다. 선구 훈련량 획득. (훈련량 +${gainedTp.toLocaleString()})`;
    } else {
      resultText = '안타!';
      logText = `[안타] 빗맞은 타구가 내야 빈 곳으로 흘렀습니다. 기본 훈련량 획득. (훈련량 +${gainedTp.toLocaleString()})`;
    }
  }

  // 훈련량 지급
  state.tp += gainedTp;

  // 전광판 로그 남기기
  addLog(logText, (resultText.includes('홈런') ? 'homerun' : (resultText.includes('안타') || resultText.includes('루타') || resultText.includes('볼넷') ? 'special' : '')));

  // 중앙 9분할 그리드에 타격 텍스트 효과 띄우기
  showHitEffectText(resultText, resultClass);

  return { gainedTp, resultText, isHomerun: resultText.includes('홈런') };
}

// 8. 화면 이펙트 구현
function showHitEffectText(text, extraClass = '') {
  const el = document.getElementById('hit-effect-text');
  el.textContent = text;
  el.className = 'hit-effect-text animate-hit';
  if (extraClass) el.classList.add(extraClass);

  // 애니메이션 리셋을 위해 이전 엘리먼트를 복제 후 교체
  const newEl = el.cloneNode(true);
  el.parentNode.replaceChild(newEl, el);
}

// 마우스 타격 시 마우스 좌표에 떠다니는 텍스트 생성
function trimAudioBuffer(audioContext, audioBuffer, threshold = 0.018, paddingSeconds = 0.012) {
  const sampleRate = audioBuffer.sampleRate;
  const padding = Math.floor(sampleRate * paddingSeconds);
  let firstSoundIndex = audioBuffer.length;
  let lastSoundIndex = 0;

  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex++) {
    const data = audioBuffer.getChannelData(channelIndex);

    for (let i = 0; i < data.length; i++) {
      if (Math.abs(data[i]) >= threshold) {
        firstSoundIndex = Math.min(firstSoundIndex, i);
        break;
      }
    }

    for (let i = data.length - 1; i >= 0; i--) {
      if (Math.abs(data[i]) >= threshold) {
        lastSoundIndex = Math.max(lastSoundIndex, i);
        break;
      }
    }
  }

  if (firstSoundIndex >= lastSoundIndex) return audioBuffer;

  const start = Math.max(0, firstSoundIndex - padding);
  const end = Math.min(audioBuffer.length, lastSoundIndex + padding);
  const frameCount = Math.max(1, end - start);
  const trimmedBuffer = audioContext.createBuffer(audioBuffer.numberOfChannels, frameCount, sampleRate);

  for (let channelIndex = 0; channelIndex < audioBuffer.numberOfChannels; channelIndex++) {
    const sourceData = audioBuffer.getChannelData(channelIndex);
    trimmedBuffer.getChannelData(channelIndex).set(sourceData.subarray(start, end));
  }

  return trimmedBuffer;
}

async function loadHomerunSound(audioContext) {
  if (playBatHitSound.homerunBuffer) return playBatHitSound.homerunBuffer;
  if (playBatHitSound.homerunLoadPromise) return playBatHitSound.homerunLoadPromise;

  playBatHitSound.homerunLoadPromise = fetch(HOMERUN_SOUND_SRC)
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load ${HOMERUN_SOUND_SRC}`);
      return response.arrayBuffer();
    })
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(audioBuffer => {
      playBatHitSound.homerunBuffer = trimAudioBuffer(audioContext, audioBuffer);
      return playBatHitSound.homerunBuffer;
    })
    .catch(error => {
      console.warn('Home run sound load failed:', error);
      playBatHitSound.homerunLoadPromise = null;
      return null;
    });

  return playBatHitSound.homerunLoadPromise;
}

function playHomerunSoundFromBuffer(audioContext, audioBuffer) {
  const now = audioContext.currentTime;
  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  const compressor = audioContext.createDynamicsCompressor();

  source.buffer = audioBuffer;
  gain.gain.setValueAtTime(0.95, now);
  compressor.threshold.setValueAtTime(-16, now);
  compressor.knee.setValueAtTime(18, now);
  compressor.ratio.setValueAtTime(4, now);
  compressor.attack.setValueAtTime(0.002, now);
  compressor.release.setValueAtTime(0.12, now);

  source.connect(gain).connect(compressor).connect(audioContext.destination);
  source.start(now);
}

function playBatHitSound(isHomerun = false) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = playBatHitSound.audioContext || new AudioContextClass();
  playBatHitSound.audioContext = audioContext;
  if (audioContext.state === 'suspended') audioContext.resume();

  const now = audioContext.currentTime;

  if (!playBatHitSound.homerunBuffer && !playBatHitSound.homerunLoadPromise) {
    loadHomerunSound(audioContext);
  }

  if (isHomerun) {
    if (playBatHitSound.homerunBuffer) {
      playHomerunSoundFromBuffer(audioContext, playBatHitSound.homerunBuffer);
      return;
    }

    loadHomerunSound(audioContext).then(audioBuffer => {
      if (audioBuffer) {
        playHomerunSoundFromBuffer(audioContext, audioBuffer);
      } else {
        playSynthHomerunFallback(audioContext, now);
      }
    });
    return;
  }

  const body = audioContext.createOscillator();
  const click = audioContext.createOscillator();
  const bodyGain = audioContext.createGain();
  const clickGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(1250, now);

  body.type = 'triangle';
  body.frequency.setValueAtTime(210, now);
  body.frequency.exponentialRampToValueAtTime(110, now + 0.12);
  bodyGain.gain.setValueAtTime(0.18, now);
  bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

  click.type = 'square';
  click.frequency.setValueAtTime(920, now);
  clickGain.gain.setValueAtTime(0.09, now);
  clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  body.connect(bodyGain).connect(filter).connect(audioContext.destination);
  click.connect(clickGain).connect(audioContext.destination);
  body.start(now);
  click.start(now);
  body.stop(now + 0.28);
  click.stop(now + 0.05);
}

function playSynthHomerunFallback(audioContext, now) {
    const crack = audioContext.createOscillator();
    const boom = audioContext.createOscillator();
    const cheer = audioContext.createOscillator();
    const snap = audioContext.createBufferSource();
    const crackGain = audioContext.createGain();
    const boomGain = audioContext.createGain();
    const cheerGain = audioContext.createGain();
    const snapGain = audioContext.createGain();
    const snapFilter = audioContext.createBiquadFilter();
    const boomFilter = audioContext.createBiquadFilter();
    const snapBuffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * 0.045), audioContext.sampleRate);
    const snapData = snapBuffer.getChannelData(0);

    for (let i = 0; i < snapData.length; i++) {
      const fade = 1 - (i / snapData.length);
      snapData[i] = (Math.random() * 2 - 1) * fade;
    }

    boomFilter.type = 'lowpass';
    boomFilter.frequency.setValueAtTime(760, now);

    snap.buffer = snapBuffer;
    snapFilter.type = 'bandpass';
    snapFilter.frequency.setValueAtTime(2600, now);
    snapFilter.Q.setValueAtTime(5.5, now);
    snapGain.gain.setValueAtTime(0.22, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    crack.type = 'square';
    crack.frequency.setValueAtTime(1850, now);
    crack.frequency.exponentialRampToValueAtTime(690, now + 0.07);
    crackGain.gain.setValueAtTime(0.26, now);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    boom.type = 'triangle';
    boom.frequency.setValueAtTime(185, now);
    boom.frequency.exponentialRampToValueAtTime(52, now + 0.42);
    boomGain.gain.setValueAtTime(0.4, now);
    boomGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

    cheer.type = 'sawtooth';
    cheer.frequency.setValueAtTime(440, now + 0.08);
    cheer.frequency.exponentialRampToValueAtTime(880, now + 0.32);
    cheerGain.gain.setValueAtTime(0.001, now);
    cheerGain.gain.linearRampToValueAtTime(0.09, now + 0.12);
    cheerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    snap.connect(snapFilter).connect(snapGain).connect(audioContext.destination);
    crack.connect(crackGain).connect(audioContext.destination);
    boom.connect(boomGain).connect(boomFilter).connect(audioContext.destination);
    cheer.connect(cheerGain).connect(audioContext.destination);

    snap.start(now);
    crack.start(now);
    boom.start(now);
    cheer.start(now + 0.08);
    snap.stop(now + 0.05);
    crack.stop(now + 0.08);
    boom.stop(now + 0.48);
    cheer.stop(now + 0.45);
}

function createFloatingText(e, amount, isHomerun = false) {
  const container = document.getElementById('strike-zone');
  const rect = container.getBoundingClientRect();
  
  const isInsideStrikeZone =
    e.clientX >= rect.left &&
    e.clientX <= rect.right &&
    e.clientY >= rect.top &&
    e.clientY <= rect.bottom;

  const x = isInsideStrikeZone ? e.clientX - rect.left : rect.width / 2 + (Math.random() * 60 - 30);
  const y = isInsideStrikeZone ? e.clientY - rect.top : rect.height / 2 + (Math.random() * 60 - 30);

  const floatText = document.createElement('div');
  floatText.className = 'floating-text';
  if (isHomerun) floatText.classList.add('homerun-float');
  floatText.textContent = `훈련량 +${amount.toLocaleString()}`;
  floatText.style.left = `${x}px`;
  floatText.style.top = `${y}px`;

  container.appendChild(floatText);

  // 1초 뒤 요소 파괴
  setTimeout(() => {
    floatText.remove();
  }, 800);
}

// 9. 고스변 (스킬 재부여) 엔진
function rollSkills() {
  const cost = getSkillRollCost();
  if (state.tp < cost) {
    addLog('[고스변 실패] 훈련량이 부족합니다.', 'text-muted');
    return;
  }

  state.tp -= cost;

  let newSkills = [null, null, null];
  const excludedFamilies = new Set();
  const excludedEffectFamilies = new Set();
  const shouldLockFirstSkill = state.player.tier === 'IMPACT' && state.lockFirstSkill && state.skills[0];

  for (let i = 0; i < 3; i++) {
    if (i === 0 && shouldLockFirstSkill) {
      newSkills[i] = state.skills[0];
      excludedFamilies.add(normalizeSkillFamily(state.skills[0].name));
      excludedEffectFamilies.add(getSkillEffectFamily(state.skills[0]));
      continue;
    }

    const skillObj = pickWeightedSkill(i, excludedFamilies, excludedEffectFamilies);
    if (skillObj) {
      excludedFamilies.add(normalizeSkillFamily(skillObj.name));
      excludedEffectFamilies.add(getSkillEffectFamily(skillObj));
    }
    newSkills[i] = skillObj;
  }

  state.skills = newSkills;
  
  // 고스변 연출 (슬롯 스피닝)
  animateSkillRolls({ lockedFirstSlot: shouldLockFirstSkill });

  addLog(`[고스변] V26 타자 스킬 풀 기준 고급 스킬 변경 완료${shouldLockFirstSkill ? ' (1옵 잠금)' : ''}: [${newSkills[0].name}(${newSkills[0].rank}) / ${newSkills[1].name}(${newSkills[1].rank}) / ${newSkills[2].name}(${newSkills[2].rank})]`);
  
  saveGame();
}

// 스킬 롤링 애니메이션 시각화
function animateSkillRolls(options = {}) {
  const lockedFirstSlot = options.lockedFirstSlot || false;
  const btn = document.getElementById('btn-roll-skills');
  btn.disabled = true;

  const slots = [
    document.getElementById('skill-slot-1'),
    document.getElementById('skill-slot-2'),
    document.getElementById('skill-slot-3')
  ];

  let frameCount = 0;
  const maxFrames = 15;
  
  const interval = setInterval(() => {
    slots.forEach((slot, index) => {
      if (lockedFirstSlot && index === 0) {
        slot.classList.add('locked');
        return;
      }

      // 최종 결과 획득 전 랜덤 셔플
      const randomSkill = pickWeightedSkill(index) || SKILL_POOL.AMATEUR[0];
      const randomRank = randomSkill.rank;

      const rankBadge = slot.querySelector('.skill-rank');
      const nameSpan = slot.querySelector('.skill-name');
      const descSpan = slot.querySelector('.skill-desc');

      rankBadge.className = `skill-rank rank-${randomRank.toLowerCase()}`;
      rankBadge.textContent = getSkillRankShort(randomRank);
      nameSpan.textContent = randomSkill.name;
      descSpan.textContent = randomSkill.desc;
    });

    frameCount++;
    if (frameCount >= maxFrames) {
      clearInterval(interval);
      // 최종 결과 세팅
      slots.forEach((slot, index) => {
        const finalSkill = state.skills[index];
        const rankBadge = slot.querySelector('.skill-rank');
        const nameSpan = slot.querySelector('.skill-name');
        const descSpan = slot.querySelector('.skill-desc');

        slot.classList.toggle('locked', lockedFirstSlot && index === 0);

        rankBadge.className = `skill-rank rank-${finalSkill.rank.toLowerCase()}`;
        rankBadge.textContent = getSkillRankShort(finalSkill.rank);
        nameSpan.textContent = finalSkill.name;
        descSpan.textContent = finalSkill.desc;
        
        // 메이저 스킬 장착 시 강조
        if (finalSkill.rank === 'MAJOR') {
          slot.style.borderColor = 'var(--neon-gold)';
          setTimeout(() => slot.style.borderColor = '', 1000);
        }
      });
      
      btn.disabled = false;
      updateUI();
    }
  }, 80);
}

// 10. 실투 찬스볼 스포너 시스템
let chanceBallTimer = null;
function startChanceBallSpawner() {
  if (chanceBallTimer) clearInterval(chanceBallTimer);
  const stats = combineStats();

  // 선구 레벨 및 스킬이 주기에 영향 (기본 18초 주기)
  // 선구 1렙당 0.2초씩 주기 단축, 스킬 '해결사' 등이 추가 보너스
  let baseInterval = 18000;
  let intervalReduction = stats.eye * 300 + stats.speed * 120; // 최대 10초까지 감소 가능
  let spawnInterval = Math.max(8000, baseInterval - intervalReduction);

  chanceBallTimer = setInterval(() => {
    // 40% 확률로 찬스볼 출현
    if (Math.random() < 0.40) {
      spawnChanceBall();
    }
  }, spawnInterval);
}

function spawnChanceBall() {
  const target = document.getElementById('baseball-target');
  const stats = combineStats();
  if (!target.classList.contains('hidden')) return; // 이미 떠있으면 스킵

  // 1~9분할 셀 중 임의로 하나 선택
  const cellIndex = Math.floor(Math.random() * 9) + 1;
  const cell = document.querySelector(`.cell-${cellIndex}`);
  
  // 셀 내 중앙 좌표 계산
  const strikeZone = document.getElementById('strike-zone');
  const zoneRect = strikeZone.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  const x = (cellRect.left - zoneRect.left) + cellRect.width / 2;
  const y = (cellRect.top - zoneRect.top) + cellRect.height / 2;

  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
  target.classList.remove('hidden');

  addLog('⚾ [투수 실투!] 한가운데로 몰리는 느린 변화구가 들어옵니다. 빨리 터치하세요!', 'special');

  // 3.5초(선구 능력치에 따라 소폭 증가 가능) 내에 클릭 안 하면 사라짐
  let despawnTime = 3000 + (stats.eye * 100) + (stats.speed * 60);
  setTimeout(() => {
    target.classList.add('hidden');
  }, despawnTime);
}

// 11. 승급 및 환생 (Exit) 시스템
function promoteCard() {
  const currentTier = state.player.tier;
  const info = TIER_INFO[currentTier];
  if (!info) return;

  const currentTrainingLevel = getTrainingLevel();

  if (state.tp < info.reqTp || currentTrainingLevel < info.reqStats) {
    addLog('[승급 거절] 아직 승급 자격을 갖추지 못했습니다.', 'text-muted');
    return;
  }

  state.tp -= info.reqTp;

  if (info.next === 'MLB EXIT') {
    // 메이저리그 성공 모달 팝업
    triggerMLBExit();
  } else {
    // 일반 카드 승급 처리
    state.player.tier = info.next;
    state.player.league = TIER_INFO[info.next].league;
    
    // 승급 시 현재 등급 훈련치를 기존 누적 스탯으로 편입하고, 새 등급 추가분만 0부터 다시 올린다.
    state.baseStats = combineStats();
    state.stats = createFreshStats();
    state.upgrades = { active: {}, passive: {} };
    
    // 스톡옵션 (시너지 보너스) 1개 획득
    state.synergyCount += 1;

    addLog(`🎉 축하합니다! 선수가 [${state.player.tier}] 등급으로 승급하였습니다. 영구 초당 자동 훈련량 보너스를 획득했습니다!`, 'homerun');
    
    saveGame();
    updateUI();
  }
}

// 12. 메이저리그 진출 (최종 Exit 엔딩)
function triggerMLBExit() {
  // 모달 데이터 입력
  document.getElementById('modal-player-name').textContent = state.player.name;
  
  // 시너지 보너스 연산
  const earnedSynergy = 10; // MLB 진출 성공 시 한 번에 10주의 스톡옵션(시너지) 증정
  state.synergyCount += earnedSynergy;
  
  document.getElementById('modal-synergy-count').textContent = state.synergyCount;
  document.getElementById('modal-synergy-boost').textContent = `+${state.synergyCount * 100}%`;

  // 누적 엑시트 유저 카운터 1 증가
  state.globalExitCount += 1;
  document.getElementById('global-exit-count').textContent = state.globalExitCount.toLocaleString();

  // 모달 표시
  const modal = document.getElementById('exit-modal');
  modal.classList.remove('hidden');
  saveGame();
  updateUI();
}

// 게임 하드 리셋 (MLB Exit 성공 후 다시 신인부터)
function resetGameToLive() {
  state.player.tier = 'LIVE';
  state.player.league = TIER_INFO['LIVE'].league;
  state.tp = 0;
  state.baseStats = createFreshStats();
  state.stats = createFreshStats();
  state.upgrades = { active: {}, passive: {} };
  state.skills = [null, null, null]; // 스킬도 초기화

  // 모달 닫기
  document.getElementById('exit-modal').classList.add('hidden');

  addLog('⚾ 새로운 유망주 선수를 발탁했습니다! 훈련을 거듭하여 다시 메이저리그에 도전하세요.', 'special');
  
  saveGame();
  updateUI();
}

function resetAllProgress() {
  const confirmed = confirm('모든 진행 상태를 초기화할까요? 훈련량, 스탯, 장비, 스킬, 승급 기록이 모두 삭제됩니다.');
  if (!confirmed) return;

  const preservedGlobalExitCount = state.globalExitCount;
  state = {
    saveVersion: 3,
    tp: 0,
    player: {
      name: '홍타자',
      tier: 'LIVE',
      league: TIER_INFO['LIVE'].league
    },
    stats: createFreshStats(),
    baseStats: createFreshStats(),
    upgrades: { active: {}, passive: {} },
    skills: [null, null, null],
    synergyCount: 0,
    globalExitCount: preservedGlobalExitCount,
    boostActive: false,
    boostCooldown: 0,
    boostActiveTimeRemaining: 0,
    lockFirstSkill: false
  };

  localStorage.removeItem('cpbv_hitter_save');
  document.getElementById('exit-modal').classList.add('hidden');
  document.getElementById('selection-modal').classList.add('hidden');
  document.querySelector('.boost-title').textContent = '타격 코칭 가동';
  document.querySelector('.boost-subtitle').textContent = '10초간 훈련 효율 2배';
  document.getElementById('boost-cooldown-bar').style.width = '0%';

  startChanceBallSpawner();
  updateUI();
  addLog('게임 진행 상태를 초기화했습니다. 새 타자의 훈련을 시작하세요.', 'special');
}

function placeConsoleBesideRedistribute() {
  const mainGrid = document.querySelector('.main-grid');
  const leftPanel = document.querySelector('.left-panel');
  const consolePanel = document.querySelector('.bottom-console');
  if (!mainGrid || !leftPanel || !consolePanel || consolePanel.parentElement === mainGrid) return;

  const row = document.querySelector('.training-tools-row');
  if (row) {
    const redistributor = row.querySelector('.redistribute-controller');
    if (redistributor) row.parentNode.insertBefore(redistributor, row);
    row.remove();
  }

  leftPanel.insertAdjacentElement('afterend', consolePanel);
}

async function loadPublicGameStats() {
  try {
    const response = await fetch('/api/idle-dev-game/stats', {
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) return;

    const stats = await response.json();
    const mlbSuccessCount = Number(stats.mlbSuccessCount ?? stats.mlb_success_count ?? 0);
    if (!Number.isFinite(mlbSuccessCount) || mlbSuccessCount < 0) return;

    state.globalExitCount = Math.floor(mlbSuccessCount);
    document.getElementById('global-exit-count').textContent = state.globalExitCount.toLocaleString();
  } catch (error) {
    console.warn('Public game stats load failed:', error);
  }
}

// 13. UI 드로잉 및 갱신 (Rendering)
function updateUI() {
  // 1) 훈련량 및 스윙당/초당 자동 훈련량 갱신
  const currentLpc = getSwingTrainingAmount();
  const currentLps = getAutoTrainingPerSecond();
  
  document.getElementById('total-tp').textContent = Math.floor(state.tp).toLocaleString();
  document.getElementById('current-lps').innerHTML = `${currentLps.toLocaleString()} <span class="unit">훈련량/초</span>`;
  document.getElementById('current-lpc').innerHTML = `${currentLpc.toLocaleString()} <span class="unit">훈련량</span>`;

  // 2) 프로필 카드 갱신
  const card = document.getElementById('player-card');
  const badge = document.getElementById('card-tier-badge');
  const name = document.getElementById('player-name');
  const league = document.getElementById('player-league');

  // 카드 등급별 css 클래스 갱신
  card.className = '';
  const tierInfo = TIER_INFO[state.player.tier];
  card.classList.add(tierInfo.colorClass);

  badge.className = `tier-badge ${tierInfo.badgeClass}`;
  badge.textContent = state.player.tier;
  name.textContent = state.player.name;
  league.textContent = state.player.league;

  // 3) 6대 스탯 레벨 및 훈련 가격 갱신
  const combinedStats = combineStats();
  STAT_KEYS.forEach(key => {
    const valueEl = document.getElementById(`val-${key}`);
    if (!valueEl) return;
    const currentGain = state.stats[key] || 0;
    const totalValue = combinedStats[key] || 0;
    valueEl.textContent = currentGain > 0 ? `${totalValue} (+${currentGain})` : totalValue;
  });

  const totalStatsLevel = getTotalStatLevel();
  const trainingLevel = getTrainingLevel();
  const maxTrainingLevel = tierInfo.maxStats;
  document.getElementById('training-level-summary').innerHTML = `${trainingLevel} <span class="unit">/ ${maxTrainingLevel}</span>`;
  document.getElementById('training-level-sub').textContent = `Lv.${trainingLevel}/${maxTrainingLevel}`;

  const trainingCost = getTrainingCost();
  document.getElementById('cost-training-text').textContent = `훈련량 ${trainingCost.toLocaleString()}`;
  document.getElementById('btn-do-training').disabled = state.tp < trainingCost || trainingLevel >= maxTrainingLevel;
  const canRedistribute = state.tp >= REDISTRIBUTE_COST && totalStatsLevel > 0;
  const redistributeButton = document.getElementById('btn-run-redistribute');
  const redistributeController = document.querySelector('.redistribute-controller');
  redistributeButton.disabled = !canRedistribute;
  redistributeButton.classList.toggle('ready', canRedistribute);
  redistributeController?.classList.toggle('ready', canRedistribute);
  enforceMainStatSelection();

  // 4) 장비 & 훈련 샵 동적 렌더링
  renderShopItems();

  // 5) 고스변 탭 렌더링
  const skillCost = getSkillRollCost();
  document.getElementById('skill-roll-cost').textContent = skillCost.toLocaleString();
  document.getElementById('btn-roll-skills').disabled = (state.tp < skillCost);

  const lockOption = document.getElementById('impact-lock-option');
  const lockCheckbox = document.getElementById('lock-first-skill');
  const canLockFirstSkill = state.player.tier === 'IMPACT' && Boolean(state.skills[0]);
  lockOption.classList.toggle('available', state.player.tier === 'IMPACT');
  lockCheckbox.disabled = !canLockFirstSkill;
  lockCheckbox.checked = Boolean(state.lockFirstSkill && canLockFirstSkill);
  if (state.player.tier !== 'IMPACT' || !canLockFirstSkill) {
    state.lockFirstSkill = false;
  }
  renderSkillSlots();

  // 현재 적용 스킬 버프 요약 목록
  const buffsList = document.getElementById('skill-buffs-list');
  buffsList.innerHTML = '';
  
  let hasSkills = false;
  let buffsMap = { lpc: 0, lps: 0, homerun: 0, chance: 0, contact: 0 };
  
  state.skills.forEach(skill => {
    if (!skill) return;
    hasSkills = true;
    if (skill.effect.type === 'lpc') buffsMap.lpc += (skill.effect.val * 100);
    if (skill.effect.type === 'lps') buffsMap.lps += (skill.effect.val * 100);
    if (skill.effect.type === 'all') {
      buffsMap.lpc += (skill.effect.val * 100);
      buffsMap.lps += (skill.effect.val * 100);
    }
    if (skill.effect.type === 'homerun') {
      buffsMap.homerun += (skill.effect.val * 100);
      if (skill.effect.chanceBoost) buffsMap.chance += (skill.effect.chanceBoost * 100);
    }
    if (skill.effect.type === 'contact_boost') buffsMap.contact += (skill.effect.val * 100);
  });

  if (!hasSkills) {
    buffsList.innerHTML = '<li>스킬 보너스가 없습니다.</li>';
  } else {
    if (buffsMap.lpc !== 0) buffsList.innerHTML += `<li>스윙당 훈련량 ${formatSignedPercent(buffsMap.lpc)}</li>`;
    if (buffsMap.lps !== 0) buffsList.innerHTML += `<li>초당 자동 훈련량 ${formatSignedPercent(buffsMap.lps)}</li>`;
    if (buffsMap.homerun !== 0) buffsList.innerHTML += `<li>홈런 보너스 배율 ${formatSignedPercent(buffsMap.homerun)}</li>`;
    if (buffsMap.chance !== 0) buffsList.innerHTML += `<li>홈런 발생 확률 ${formatSignedPercent(buffsMap.chance)}</li>`;
    if (buffsMap.contact !== 0) buffsList.innerHTML += `<li>정확 스탯 효율 ${formatSignedPercent(buffsMap.contact)}</li>`;
  }

  // 6) 승급 탭 조건 렌더링
  const nextTier = tierInfo.next;
  const nextPreview = document.getElementById('next-tier-preview');
  const reqTp = document.getElementById('req-tp');
  const reqTpCurrent = document.getElementById('req-tp-current');
  const reqStatsSum = document.getElementById('req-stats-sum');
  const reqStatsSumCurrent = document.getElementById('req-stats-sum-current');
  const btnPromote = document.getElementById('btn-exit-promote');

  if (nextTier === 'MLB EXIT') {
    nextPreview.textContent = 'MLB행';
    nextPreview.className = 'badge neon-gold';
  } else {
    nextPreview.textContent = nextTier;
    nextPreview.className = `badge ${TIER_INFO[nextTier]?.badgeClass || ''}`;
  }

  const currentTrainingLevel = getTrainingLevel();
  
  reqTp.textContent = tierInfo.reqTp.toLocaleString();
  reqTpCurrent.textContent = Math.floor(state.tp).toLocaleString();
  if (state.tp >= tierInfo.reqTp) {
    reqTpCurrent.className = 'neon-text';
  } else {
    reqTpCurrent.className = '';
  }

  reqStatsSum.textContent = `Lv.${tierInfo.reqStats}`;
  reqStatsSumCurrent.textContent = `Lv.${currentTrainingLevel}`;
  if (currentTrainingLevel >= tierInfo.reqStats) {
    reqStatsSumCurrent.className = 'neon-text';
  } else {
    reqStatsSumCurrent.className = '';
  }

  const meetsRequirements = (state.tp >= tierInfo.reqTp && currentTrainingLevel >= tierInfo.reqStats);
  btnPromote.disabled = !meetsRequirements;
  if (meetsRequirements) {
    btnPromote.className = 'btn-exit-promote active-ready';
  } else {
    btnPromote.className = 'btn-exit-promote disabled';
  }
}

function renderSkillSlots() {
  const slots = [
    document.getElementById('skill-slot-1'),
    document.getElementById('skill-slot-2'),
    document.getElementById('skill-slot-3')
  ];

  slots.forEach((slot, index) => {
    const skill = state.skills[index];
    const rankBadge = slot.querySelector('.skill-rank');
    const nameSpan = slot.querySelector('.skill-name');
    const descSpan = slot.querySelector('.skill-desc');
    const isLocked = index === 0 && state.player.tier === 'IMPACT' && state.lockFirstSkill && Boolean(skill);

    slot.classList.toggle('locked', isLocked);

    if (!skill) {
      rankBadge.className = 'skill-rank rank-none';
      rankBadge.textContent = '-';
      nameSpan.textContent = '스킬 없음';
      descSpan.textContent = '고스변을 진행해 스킬을 장착하세요.';
      return;
    }

    rankBadge.className = `skill-rank rank-${skill.rank.toLowerCase()}`;
    rankBadge.textContent = getSkillRankShort(skill.rank);
    nameSpan.textContent = skill.name;
    descSpan.textContent = skill.desc;
  });
}

// 상점 아이템 리스트 렌더링
function renderShopItems() {
  const activeContainer = document.getElementById('active-upgrades-list');
  const passiveContainer = document.getElementById('passive-upgrades-list');
  
  activeContainer.innerHTML = '';
  passiveContainer.innerHTML = '';

  // 타격 장비
  SHOP_DATA.active.forEach(item => {
    const purchased = state.upgrades.active[item.id] || 0;
    const currentCost = getItemCost(item.cost, purchased);
    const itemEl = document.createElement('div');
    itemEl.className = 'shop-item';
    itemEl.innerHTML = `
      <div class="item-info">
        <span class="item-title">${item.name} <span class="stat-level">[x${purchased}]</span></span>
        <span class="item-desc">${item.desc} (스윙당 훈련량 +${item.lpc})</span>
      </div>
      <button class="glass-btn btn-buy" data-type="active" data-id="${item.id}" ${state.tp < currentCost ? 'disabled' : ''}>
        훈련량 ${currentCost.toLocaleString()}
      </button>
    `;
    activeContainer.appendChild(itemEl);
  });

  // 자동 훈련 시설
  SHOP_DATA.passive.forEach(item => {
    const purchased = state.upgrades.passive[item.id] || 0;
    const currentCost = getItemCost(item.cost, purchased);
    const itemEl = document.createElement('div');
    itemEl.className = 'shop-item';
    itemEl.innerHTML = `
      <div class="item-info">
        <span class="item-title">${item.name} <span class="stat-level">[x${purchased}]</span></span>
        <span class="item-desc">${item.desc} (초당 자동 훈련량 +${item.lps})</span>
      </div>
      <button class="glass-btn btn-buy" data-type="passive" data-id="${item.id}" ${state.tp < currentCost ? 'disabled' : ''}>
        훈련량 ${currentCost.toLocaleString()}
      </button>
    `;
    passiveContainer.appendChild(itemEl);
  });

  // 상점 구매 이벤트 리스너 재부여
  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const type = btn.getAttribute('data-type');
      const id = btn.getAttribute('data-id');
      buyItem(type, id);
    });
  });
}

// 상점 아이템 구매 처리
function buyItem(type, id) {
  const item = SHOP_DATA[type].find(i => i.id === id);
  const purchased = state.upgrades[type][id] || 0;
  const cost = getItemCost(item.cost, purchased);

  if (state.tp < cost) return;

  state.tp -= cost;
  state.upgrades[type][id] = purchased + 1;

  if (type === 'active') {
    addLog(`[상점] 장비 [${item.name}]을(를) 구매했습니다. 스윙 훈련 파워가 증가합니다! 🏏`);
  } else {
    addLog(`[상점] 자동 훈련 시스템 [${item.name}]을(를) 구축했습니다. 초당 훈련량 증가! 🏫`);
  }

  saveGame();
  updateUI();
}

function trainRandomStat() {
  const cost = getTrainingCost();
  const tierInfo = TIER_INFO[state.player.tier];
  const maxTrainingLevel = tierInfo.maxStats;
  const maxTotalStatLevel = getMaxTotalStatLevel(maxTrainingLevel);

  if (getTrainingLevel() >= maxTrainingLevel) {
    addLog(`[훈련 제한] ${state.player.tier} 등급의 훈련 한도 Lv.${maxTrainingLevel}에 도달했습니다. 승급을 준비하세요.`, 'text-muted');
    return;
  }

  if (state.tp < cost) {
    addLog('[훈련 실패] 훈련량이 부족합니다.', 'text-muted');
    return;
  }

  state.tp -= cost;
  const gains = {};

  const availableGain = Math.min(TRAINING_GAIN_PER_CLICK, maxTotalStatLevel - getTotalStatLevel());

  for (let i = 0; i < availableGain; i++) {
    const lowestLevel = Math.min(...STAT_KEYS.map(statKey => state.stats[statKey] ?? 0));
    const weightedPool = [];
    STAT_KEYS.forEach(key => {
      const level = state.stats[key] ?? 0;
      const weight = level === lowestLevel ? 3 : 1;
      for (let j = 0; j < weight; j++) weightedPool.push(key);
    });

    const selectedStat = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    state.stats[selectedStat] = (state.stats[selectedStat] ?? 0) + 1;
    gains[selectedStat] = (gains[selectedStat] || 0) + 1;
  }

  const gainSummary = Object.entries(gains)
    .map(([key, amount]) => `${STAT_CONFIG[key].shortLabel} +${amount}`)
    .join(', ');

  addLog(`[훈련] 스탯 훈련 1회로 총 ${availableGain}레벨이 성장했습니다. (${gainSummary})`);

  if (gains.eye || gains.speed) {
    startChanceBallSpawner();
  }

  saveGame();
  updateUI();
}

function redistributeTraining() {
  if (state.tp < REDISTRIBUTE_COST) {
    addLog('[훈재분 실패] 훈련량이 부족합니다.', 'text-muted');
    return;
  }

  const extraLevels = getTotalStatLevel();
  if (extraLevels <= 0) {
    addLog('[훈재분 실패] 재분배할 추가 훈련 레벨이 없습니다.', 'text-muted');
    return;
  }

  const preferredStats = Array.from(document.querySelectorAll('input[name="redist-stat"]:checked')).map(input => input.value);
  const weightedPool = [];
  STAT_KEYS.forEach(key => {
    const weight = preferredStats.includes(key) ? 4 : 1;
    for (let i = 0; i < weight; i++) weightedPool.push(key);
  });

  const nextStats = createFreshStats();
  for (let i = 0; i < extraLevels; i++) {
    const selectedStat = weightedPool[Math.floor(Math.random() * weightedPool.length)];
    nextStats[selectedStat] += 1;
  }

  state.tp -= REDISTRIBUTE_COST;

  openComparisonModal({
    title: '훈련 재분배 결과',
    subtitle: '현재 총 훈련 레벨은 유지하면서 선택한 스탯에 더 높은 확률로 다시 배분했습니다.',
    beforeItems: formatStatsForComparison(state.stats),
    afterItems: formatStatsForComparison(nextStats),
    onApply: () => {
      state.stats = nextStats;
      addLog('[훈재분] 새 훈련 분포를 적용했습니다. 선택 스탯 중심으로 성장 방향이 재설정되었습니다.', 'special');
      startChanceBallSpawner();
      saveGame();
      updateUI();
    },
    onKeep: () => {
      addLog('[훈재분] 기존 훈련 분포를 유지했습니다. 훈재분 비용은 소모되었습니다.', 'text-muted');
      saveGame();
      updateUI();
    }
  });

  updateUI();
}

function formatStatsForComparison(stats) {
  return STAT_KEYS.map(key => ({
    label: STAT_CONFIG[key].shortLabel,
    value: `Lv.${stats[key] || 0}`
  }));
}

function areStatsEqual(a, b) {
  return STAT_KEYS.every(key => (a[key] || 0) === (b[key] || 0));
}

function formatCurrentGainForComparison(stats) {
  return STAT_KEYS.map(key => ({
    label: STAT_CONFIG[key].shortLabel,
    value: `+${stats[key] || 0}`
  }));
}

function getMainStatSelectionLimit() {
  return state.player.tier === 'SIGNATURE' ? 2 : 1;
}

function enforceMainStatSelection(changedInput = null) {
  const allInputs = Array.from(document.querySelectorAll('input[name="redist-stat"]'));
  const checkedInputs = allInputs.filter(input => input.checked);
  const limit = getMainStatSelectionLimit();
  const autoPickOrder = ['speed', 'defense', 'power', 'contact', 'eye', 'patience'];

  if (state.player.tier === 'SIGNATURE' && checkedInputs.length < limit) {
    const inputsByValue = new Map(allInputs.map(input => [input.value, input]));
    autoPickOrder.forEach(key => {
      const input = inputsByValue.get(key);
      if (input && allInputs.filter(item => item.checked).length < limit) {
        input.checked = true;
      }
    });
  }

  const nextCheckedInputs = allInputs.filter(input => input.checked);
  if (nextCheckedInputs.length <= limit) return;

  const inputsToKeep = changedInput?.checked
    ? [changedInput, ...nextCheckedInputs.filter(input => input !== changedInput)].slice(0, limit)
    : nextCheckedInputs.slice(0, limit);

  nextCheckedInputs.forEach(input => {
    input.checked = inputsToKeep.includes(input);
  });
}

function createRedistributedCurrentStats(currentStats, mainStats) {
  const currentTierStatPoints = getTotalStatLevel(currentStats);
  const bundles = Array.from({ length: STAT_KEYS.length }, () => 0);

  for (let i = 0; i < currentTierStatPoints; i++) {
    bundles[Math.floor(Math.random() * bundles.length)] += 1;
  }

  const sortedBundles = [...bundles].sort((a, b) => a - b);
  const nextStats = createFreshStats();

  mainStats.forEach((key, index) => {
    nextStats[key] = sortedBundles[index] || 0;
  });

  const remainingBundles = sortedBundles.slice(mainStats.length);
  const remainingStats = STAT_KEYS
    .filter(key => !mainStats.includes(key))
    .sort(() => Math.random() - 0.5);

  remainingBundles.forEach((amount, index) => {
    nextStats[remainingStats[index]] = amount;
  });

  return nextStats;
}

function redistributeCurrentTierTraining() {
  if (state.tp < REDISTRIBUTE_COST) {
    addLog('[훈재분 실패] 훈련량이 부족합니다.', 'text-muted');
    return;
  }

  const currentTierStatPoints = getTotalStatLevel(state.stats);
  if (currentTierStatPoints <= 0) {
    addLog('[훈재분 실패] 이번 등급에서 새로 올린 훈련치가 없습니다.', 'text-muted');
    return;
  }

  const mainStatLimit = state.player.tier === 'SIGNATURE' ? 2 : 1;
  enforceMainStatSelection();
  const mainStats = Array.from(document.querySelectorAll('input[name="redist-stat"]:checked'))
    .map(input => input.value)
    .filter((key, index, arr) => STAT_KEYS.includes(key) && arr.indexOf(key) === index)
    .slice(0, mainStatLimit);

  let nextStats = createRedistributedCurrentStats(state.stats, mainStats);
  let rerollCount = 0;
  while (areStatsEqual(nextStats, state.stats) && rerollCount < 100) {
    nextStats = createRedistributedCurrentStats(state.stats, mainStats);
    rerollCount++;
  }

  state.tp -= REDISTRIBUTE_COST;

  openComparisonModal({
    title: '훈련 재분배 결과',
    subtitle: '이번 등급에서 새로 올린 괄호 안 훈련치만 재분배했습니다. 선택한 주능력치에는 가장 작은 묶음이 배정됩니다.',
    beforeItems: formatCurrentGainForComparison(state.stats),
    afterItems: formatCurrentGainForComparison(nextStats),
    onApply: () => {
      state.stats = nextStats;
      addLog('[훈재분 완료] 이번 등급 추가 훈련치만 다시 배분했습니다.', 'special');
      startChanceBallSpawner();
      saveGame();
      updateUI();
    },
    onKeep: () => {
      addLog('[훈재분 취소] 기존 추가 훈련 분포를 유지했습니다. 훈재분 비용은 소모되었습니다.', 'text-muted');
      saveGame();
      updateUI();
    }
  });

  updateUI();
}

function openComparisonModal({ title, subtitle, beforeItems, afterItems, onApply, onKeep }) {
  const modal = document.getElementById('selection-modal');
  const titleEl = document.getElementById('selection-modal-title');
  const subtitleEl = document.getElementById('selection-modal-subtitle');
  const beforeList = document.getElementById('before-values-list');
  const afterList = document.getElementById('after-values-list');
  const keepBtn = document.getElementById('btn-keep-before');
  const applyBtn = document.getElementById('btn-apply-after');

  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  beforeList.innerHTML = beforeItems.map(item => `<div class="comparison-stat-line"><span>${item.label}</span><span class="val">${item.value}</span></div>`).join('');
  afterList.innerHTML = afterItems.map(item => `<div class="comparison-stat-line highlight"><span>${item.label}</span><span class="val">${item.value}</span></div>`).join('');

  const closeModal = () => {
    modal.classList.add('hidden');
    keepBtn.onclick = null;
    applyBtn.onclick = null;
  };

  keepBtn.onclick = () => {
    closeModal();
    onKeep?.();
  };

  applyBtn.onclick = () => {
    closeModal();
    onApply?.();
  };

  modal.classList.remove('hidden');
}

// 스탯 레벨업 강화 구매 처리
function upgradeStat(statName) {
  const level = state.stats[statName];
  const cost = getStatUpgradeCost(statName, level);

  if (state.tp < cost) return;

  state.tp -= cost;
  state.stats[statName] = level + 1;

  const statKorean = statName === 'contact' ? '정확(Contact)' : statName === 'power' ? '파워(Power)' : '선구(Eye)';
  addLog(`[강화] 선수의 [${statKorean}] 능력을 레벨업했습니다. (Lv.${level} -> Lv.${level + 1}) 💪`);

  if (statName === 'eye') {
    // 선구 레벨업 시 스포너 대기시간 갱신을 위해 재시작
    startChanceBallSpawner();
  }

  saveGame();
  updateUI();
}

// 실시간 터미널 로그 추가
function addLog(text, type = '') {
  const logsContainer = document.getElementById('console-logs');
  const logLine = document.createElement('div');
  logLine.className = 'log-line';
  if (type) logLine.classList.add(type);
  
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  logLine.innerHTML = `<span class="text-muted">[${time}]</span> ${text}`;
  
  logsContainer.appendChild(logLine);
  
  // 50개 이상 쌓이면 오래된 것 삭제
  if (logsContainer.children.length > 50) {
    logsContainer.removeChild(logsContainer.firstChild);
  }

  // 자동 스크롤
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

// 주기적인 가상 시뮬레이션 로그 생성기
function startLogTicker() {
  setInterval(() => {
    // 25% 확률로 밈 로그 생성
    if (Math.random() < 0.25) {
      const randomLog = FUNNY_LOGS[Math.floor(Math.random() * FUNNY_LOGS.length)];
      addLog(randomLog, 'text-muted');
    }
  }, 10000);
}

// 14. AI 부스터 타격 코칭 제어
function triggerAI_CoachingBoost() {
  if (state.boostCooldown > 0 || state.boostActive) return;

  state.boostActive = true;
  state.boostActiveTimeRemaining = 10; // 10초간 활성
  state.boostCooldown = 40; // 쿨타임 총 40초 (10초 지속 + 30초 대기)

  const btn = document.getElementById('btn-boost');
  const bar = document.getElementById('boost-cooldown-bar');
  const title = document.querySelector('.boost-title');
  const subtitle = document.querySelector('.boost-subtitle');

  btn.classList.add('boost-active');
  title.textContent = '코칭 적용 중';
  subtitle.textContent = '스윙/자동 훈련 효율 2배';
  bar.style.width = '100%';
  
  addLog('🤖 [부스터 가동] AI 타격 코칭이 시작되었습니다! 10초간 스윙당 훈련량과 초당 자동 훈련량이 2배로 증가합니다!', 'special');

  // 지속 시간 카운트다운 루프
  const activeInterval = setInterval(() => {
    state.boostActiveTimeRemaining--;
    
    // 남은 시간 쿨타임 바 깎기
    bar.style.width = `${(state.boostActiveTimeRemaining / 10) * 100}%`;

    if (state.boostActiveTimeRemaining <= 0) {
      clearInterval(activeInterval);
      state.boostActive = false;
      btn.classList.remove('boost-active');
      title.textContent = '재가동 대기';
      addLog('🤖 AI 타격 코칭 버프 지속 시간이 끝났습니다. CPU 냉각을 개시합니다.', 'text-muted');
      updateUI();
      startCooldownCountdown();
    }
  }, 1000);

  updateUI();
}

function startCooldownCountdown() {
  const bar = document.getElementById('boost-cooldown-bar');
  const title = document.querySelector('.boost-title');
  const subtitle = document.querySelector('.boost-subtitle');
  
  const cooldownInterval = setInterval(() => {
    state.boostCooldown--;
    
    // 쿨타임 대기 상태 (30초 동안 쿨타임 바 차오름)
    const elapsed = 30 - state.boostCooldown;
    bar.style.width = `${(elapsed / 30) * 100}%`;
    title.textContent = `재가동 대기`;
    subtitle.textContent = `${state.boostCooldown}초 후 사용 가능`;

    if (state.boostCooldown <= 0) {
      clearInterval(cooldownInterval);
      title.textContent = '타격 코칭 가동';
      subtitle.textContent = '10초간 훈련 효율 2배';
      bar.style.width = '0%';
      addLog('🤖 AI 코칭 디바이스 충전 완료. 다시 사용할 수 있습니다!', 'special');
    }
  }, 1000);
}

// 15. 세이브 & 로드 (LocalStorage)
function saveGame() {
  state.saveVersion = 3;
  localStorage.setItem('cpbv_hitter_save', JSON.stringify(state));
}

function loadGame() {
  const saved = localStorage.getItem('cpbv_hitter_save');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // 복원 시 데이터 유실 방지를 위한 병합
      const restoredStats = { ...createFreshStats(), ...(parsed.stats || {}) };
      const restoredBaseStats = { ...createFreshStats(), ...(parsed.baseStats || {}) };
      if ((parsed.saveVersion || 0) < 3 && STAT_KEYS.every(key => restoredStats[key] >= 1)) {
        STAT_KEYS.forEach(key => {
          restoredStats[key] = Math.max(0, restoredStats[key] - 1);
        });
      }

      state = {
        ...state,
        ...parsed,
        saveVersion: 3,
        tp: Math.max(Number(parsed.tp) || 0, 0),
        player: { ...state.player, ...(parsed.player || {}) },
        stats: restoredStats,
        baseStats: restoredBaseStats,
        upgrades: {
          active: { ...(parsed.upgrades?.active || {}) },
          passive: { ...(parsed.upgrades?.passive || {}) }
        },
        skills: Array.isArray(parsed.skills)
          ? parsed.skills.map(skill => skill ? {
            ...skill,
            desc: createSkillDescription(skill.name, skill.rank),
            effect: createSkillEffect(skill.name, skill.rank)
          } : null)
          : state.skills
      };
      addLog('💾 로컬 브라우저 세이브 파일로부터 훈련 일지를 복원했습니다.', 'special');
    } catch (e) {
      addLog('❌ 세이브 파일을 불러오는 중 오류가 발생했습니다. 초기화 데이터로 대체합니다.', 'text-muted');
    }
  }
}

// 16. 이벤트 리스너 바인딩
function initEventListeners() {
  // 스윙 버튼 클릭
  const swingBtn = document.getElementById('btn-swing');
  swingBtn.addEventListener('mousedown', (e) => {
    const swingResult = swingBat();
    playBatHitSound(swingResult.isHomerun);
    createFloatingText(e, swingResult.gainedTp, swingResult.isHomerun);
    saveGame();
    updateUI();
  });

  // 아무 키나 누르면 타석 스윙 (입력 필드 예외처리)
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    
    // 스윙 실행 (좌표를 모니터 스윙 존 중앙으로 계산해 가상 마우스 이벤트 생성)
    const container = document.getElementById('strike-zone');
    const rect = container.getBoundingClientRect();
    const mockEvent = {
      clientX: rect.left + rect.width / 2 + (Math.random() * 40 - 20),
      clientY: rect.top + rect.height / 2 + (Math.random() * 40 - 20)
    };

    const swingResult = swingBat();
    playBatHitSound(swingResult.isHomerun);
    createFloatingText(mockEvent, swingResult.gainedTp, swingResult.isHomerun);
    
    // 버튼 눌림 시각 효과
    swingBtn.classList.add('active');
    setTimeout(() => swingBtn.classList.remove('active'), 80);

    saveGame();
    updateUI();
  });

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') e.preventDefault();
  });

  // 실투 찬스볼 클릭
  const chanceBall = document.getElementById('baseball-target');
  chanceBall.addEventListener('click', (e) => {
    e.stopPropagation();
    chanceBall.classList.add('hidden');
    const swingResult = swingBat(true); // 크리티컬 홈런 스윙 강제
    playBatHitSound(swingResult.isHomerun);
    createFloatingText(e, swingResult.gainedTp, swingResult.isHomerun);
    saveGame();
    updateUI();
  });

  // 6대 스탯 훈련 및 재분배
  document.getElementById('btn-do-training').addEventListener('click', trainRandomStat);
  document.getElementById('btn-run-redistribute').addEventListener('click', redistributeCurrentTierTraining);
  document.querySelectorAll('input[name="redist-stat"]').forEach(input => {
    input.addEventListener('change', () => enforceMainStatSelection(input));
  });

  // AI 부스터 코칭 클릭
  document.getElementById('btn-boost').addEventListener('click', triggerAI_CoachingBoost);

  // 고스변 클릭
  document.getElementById('btn-roll-skills').addEventListener('click', rollSkills);

  // 카드 승급 클릭
  document.getElementById('btn-exit-promote').addEventListener('click', promoteCard);

  // 엔딩 모달 리셋 클릭
  document.getElementById('btn-reset-game').addEventListener('click', resetGameToLive);
  document.getElementById('btn-reset-progress').addEventListener('click', resetAllProgress);

  document.getElementById('lock-first-skill').addEventListener('change', (e) => {
    state.lockFirstSkill = e.target.checked;
    saveGame();
    updateUI();
  });

  // 탭 전환 핸들러
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });

  // 선수 이름 편집 핸들러
  const nameWrap = document.querySelector('.player-name-wrap');
  nameWrap.addEventListener('click', () => {
    const newName = prompt('선수의 새 이름을 입력하세요 (최대 6자):', state.player.name);
    if (newName && newName.trim() !== '') {
      state.player.name = newName.trim().substring(0, 6);
      addLog(`[선수 등록] 타자의 이름이 [${state.player.name}](으)로 변경되었습니다.`, 'special');
      saveGame();
      updateUI();
    }
  });

  // 하단 법적 문서 및 모달 바인딩
  const legalModal = document.getElementById('legal-modal');
  const legalTitle = document.getElementById('legal-title');
  const legalBody = document.getElementById('legal-body');
  const closeLegalBtn = document.getElementById('btn-close-legal');

  function openLegalModal(docType) {
    legalTitle.textContent = docType === 'about' ? '서비스 소개' : docType === 'terms' ? '이용약관' : docType === 'privacy' ? '개인정보처리방침' : '문의하기';
    legalBody.innerHTML = LEGAL_DOCS[docType];
    legalModal.classList.remove('hidden');
  }

  document.getElementById('link-about').addEventListener('click', (e) => { e.preventDefault(); openLegalModal('about'); });
  document.getElementById('link-terms').addEventListener('click', (e) => { e.preventDefault(); openLegalModal('terms'); });
  document.getElementById('link-privacy').addEventListener('click', (e) => { e.preventDefault(); openLegalModal('privacy'); });
  document.getElementById('link-contact').addEventListener('click', (e) => { e.preventDefault(); openLegalModal('contact'); });

  closeLegalBtn.addEventListener('click', () => {
    legalModal.classList.add('hidden');
  });

  // 오버레이 클릭 시 닫기
  legalModal.addEventListener('click', (e) => {
    if (e.target === legalModal) legalModal.classList.add('hidden');
  });
}

// 17. 앱 시작 진입점
function initApp() {
  loadGame();
  placeConsoleBesideRedistribute();
  initEventListeners();
  
  // 게임 루프: 100ms마다 초당 자동 훈련량 정밀 연산 및 업데이트
  setInterval(() => {
    const lps = getAutoTrainingPerSecond();
    if (lps > 0) {
      state.tp += (lps / 10);
      updateUI();
    }
  }, 100);

  // 자동 백업 세이브 루프: 5초마다 자동 저장
  setInterval(() => {
    saveGame();
  }, 5000);

  startChanceBallSpawner();
  startLogTicker();
  loadPublicGameStats();
  
  updateUI();
  addLog('⚾ KBO 타자 훈련장에 체크인했습니다. 배트를 휘둘러 타격을 연마하세요!', 'special');
}

// 윈도우 로드 완료 시 구동
window.addEventListener('load', initApp);
