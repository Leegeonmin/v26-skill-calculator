# 고스변 랭킹 아키텍처 제안

## 목표

이 문서는 `고스변 랭킹` 기능을 현재 Vite + React 프론트엔드 프로젝트에 안전하게 추가하기 위한 1차 설계안이다.

이번 범위는 아래를 포함한다.

- Google 로그인
- 시즌 참가
- 시즌 내 카테고리 잠금
- 하루 1회 고급스킬변경권 사용
- 기존 결과 유지 / 변경 결과 채택
- 현재 시즌 랭킹 집계

이번 범위는 아래를 제외한다.

- 경품/보상 지급
- 휴대폰 인증
- 중복 계정 완전 차단
- 선발 외 투수 포지션 확장

## 시즌 규칙

초기 요구사항에는 `매주 월요일 00:00 KST ~ 일요일 23:59:59 KST`가 있었지만,
최신 기준은 다음과 같이 정리한다.

- 첫 시즌 생성 시점부터 7일이 한 시즌이다.
- 시즌은 고정 주간 캘린더가 아니라 `starts_at ~ ends_at`를 가진 명시적 기간이다.
- 다음 시즌은 이전 시즌 종료 후 새 7일 구간으로 생성된다.
- 모든 날짜 계산 기준 시간대는 `Asia/Seoul`이다.

즉 이번 구현은 "월요일 시작 시즌"이 아니라 "생성 시점 기준 7일 시즌"을 진실 소스로 사용한다.

## 현재 코드베이스에서 재사용할 대상

### 점수 계산

- `src/utils/calculate.ts`
- `src/utils/judge.ts`

현재 스킬 세트 점수 계산 및 판정 로직은 새 기능에서도 그대로 재사용한다.

### 데이터셋 라우팅

- `src/data/gameData.ts`

카테고리별 데이터셋 선택은 이 계층을 재사용한다.

랭킹 기능 범위에서는 아래 두 카테고리만 사용한다.

- `hitter`
- `pitcher_starter`

내부 구현상 `pitcher_starter`는 기존 `starter` 데이터셋을 재사용한다.

### 고스변 결과 생성

- `src/utils/simulateAdvancedSkillChange.ts`

하루 1회 고스변 실행 결과를 만들 때 기존 시뮬레이션 로직을 재사용한다.

## 아키텍처 방향

### 원칙

- 프론트 상태만으로 시즌/일일 제한을 강제하지 않는다.
- 신뢰성이 필요한 규칙은 DB와 서버 계층에서 강제한다.
- 기존 계산 로직은 최대한 그대로 재사용한다.
- 프론트는 UI와 상태 표시, 서버는 규칙 집행 역할로 분리한다.

### 제안 구조

1. 프론트엔드: React + Supabase Client
2. 인증: Supabase Auth (Google provider only)
3. DB: Supabase Postgres
4. 규칙 강제:
   - DB constraint
   - RLS
   - RPC 함수 또는 서버 라우트
5. 계산 로직:
   - 기존 TypeScript 계산 함수 재사용
   - 최종 저장은 서버 계층에서 수행

## 권장 구현 구조

### 프론트

- `src/views/RankingView.tsx`
- `src/components/ranking/SeasonInfoCard.tsx`
- `src/components/ranking/SeasonJoinCard.tsx`
- `src/components/ranking/DailyRollCard.tsx`
- `src/components/ranking/RollComparisonCard.tsx`
- `src/components/ranking/LeaderboardCard.tsx`

### 공통 로직

- `src/lib/supabase.ts`
- `src/lib/ranking/types.ts`
- `src/lib/ranking/season.ts`
- `src/lib/ranking/repository.ts`
- `src/lib/ranking/useRanking.ts`

### Supabase

- `supabase/migrations/*.sql`
- 필요 시 `supabase/seed.sql`

## 권장 데이터 모델

### 1. profiles

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  provider text not null default 'google',
  created_at timestamptz not null default now()
);
```

### 2. seasons

```sql
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('upcoming', 'active', 'ended')),
  created_at timestamptz not null default now()
);
```

### 3. season_entries

```sql
create table public.season_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  season_id uuid not null references public.seasons(id) on delete cascade,
  category text not null check (category in ('hitter', 'pitcher_starter')),
  current_skills jsonb not null,
  current_score numeric not null,
  score_reached_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, season_id)
);
```

### 4. daily_roll_logs

```sql
create table public.daily_roll_logs (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.season_entries(id) on delete cascade,
  roll_date_kst date not null,
  before_skills jsonb not null,
  rolled_skills jsonb not null,
  selected_result text not null check (selected_result in ('keep', 'replace')),
  final_skills jsonb not null,
  final_score numeric not null,
  created_at timestamptz not null default now(),
  unique (entry_id, roll_date_kst)
);
```

## JSON 구조 제안

`current_skills`, `before_skills`, `rolled_skills`, `final_skills`는 아래 구조를 공통 사용한다.

```json
{
  "mode": "hitter",
  "cardType": "signature",
  "skillIds": ["skill_1", "skill_2", "skill_3"],
  "skillLevels": [6, 5, 5]
}
```

투수 선발은 `mode: "starter"`로 통일한다.

## 규칙 강제 방식

### 시즌당 1엔트리

- `season_entries unique(user_id, season_id)`로 강제

### 하루 1회 사용

- `daily_roll_logs unique(entry_id, roll_date_kst)`로 강제

### 카테고리 변경 불가

- 시즌 엔트리 생성 이후에는 `category`를 수정하지 않는다.
- 프론트에서 숨기는 것만으로 끝내지 않고, DB update를 허용하지 않거나 RPC 경로에서 차단한다.

### 동점 처리

랭킹 정렬 기준:

```sql
order by current_score desc, score_reached_at asc
```

즉 점수가 같으면 먼저 도달한 사용자가 상위다.

## KST 기준 처리

프론트가 날짜를 결정하지 않는다.

모든 `오늘 사용 가능 여부`는 DB 또는 서버 함수에서 아래 기준으로 계산한다.

```sql
timezone('Asia/Seoul', now())::date
```

## 권장 RPC

### `get_or_create_current_season()`

- 현재 활성 시즌 반환
- 활성 시즌이 없고 마지막 시즌이 종료되었으면 새 7일 시즌 생성

### `join_current_season(p_category, p_initial_skills, p_initial_score)`

- 현재 시즌 참가
- 시즌당 1엔트리 제약 검사

### `submit_daily_roll_result(...)`

- 오늘 사용 이력 검사
- `before_skills`, `rolled_skills`, `selected_result`, `final_skills`, `final_score` 저장
- `season_entries` 현재 상태 갱신

### `get_leaderboard(p_category)`

- 카테고리별 랭킹 조회
- 내 순위/내 점수 포함 가능

## UI 흐름

### 로그인 전

- Google 로그인 버튼

### 로그인 후, 시즌 미참가

- 현재 시즌 정보
- 카테고리 선택
- 시즌 참가 버튼

### 참가 후, 오늘 미사용

- 현재 저장 스킬 세트 표시
- 오늘 사용 가능 여부 표시
- 고스변 실행 버튼

### 롤 결과 확인

- 기존 세트
- 변경 세트
- 점수 비교
- 유지 / 교체

### 확정 후

- 오늘 사용 완료 표시
- 내 점수
- 내 순위
- 카테고리별 랭킹

## PostHog 이벤트

추가 이벤트:

- `ranking_viewed`
- `season_joined`
- `daily_rank_roll_started`
- `daily_rank_roll_completed`
- `rank_result_kept`
- `rank_result_replaced`

권장 속성:

- `season_id`
- `category`
- `score_before`
- `score_after`
- `selected_result`

## 현재 단계에서 남아 있는 제품 결정

구현 전에 사실상 확정이 필요한 점:

1. 시즌 엔트리의 초기 스킬 세트는 무엇인가
2. 랭킹 시즌에서 사용할 카드 타입은 고정인가

현재 요구사항에는 카드 타입 선택이 명시되어 있지 않으므로,
1차 구현은 아래 가정이 가장 무난하다.

- 랭킹 모드의 카드 타입은 `signature` 고정
- 시즌 참가 시 초기 스킬 세트는 기본값 또는 1회 초기 서버 생성값 중 하나를 채택

이 부분은 구현 직전에 한 번 더 고정하는 것이 좋다.

## 구현 단계 제안

1. Supabase 연동 기본 골격 추가
2. 마이그레이션과 RLS 작성
3. 시즌/엔트리/일일 사용 RPC 추가
4. 랭킹 뷰 UI 추가
5. 테스트와 README 정리
