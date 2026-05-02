alter table public.skill_ocr_public_uploads
  add column if not exists is_saved boolean not null default true;

alter table public.skill_ocr_public_uploads
  drop constraint if exists skill_ocr_public_uploads_player_count_check;

drop function if exists public.skill_ocr_create_public_snapshot(text, text, text, jsonb, jsonb, numeric, numeric);
drop function if exists public.skill_ocr_finalize_public_upload(uuid, text, text, text, jsonb, jsonb, numeric, numeric);
drop function if exists public.skill_ocr_list_public_uploads(integer);

create or replace function public.skill_ocr_create_public_snapshot(
  p_role text,
  p_image_name text,
  p_request_id text,
  p_raw_response jsonb,
  p_selected_players jsonb,
  p_total_score numeric,
  p_average_score numeric
)
returns table (
  id uuid,
  upload_role text,
  is_saved boolean,
  image_name text,
  request_id text,
  raw_response jsonb,
  selected_players jsonb,
  player_count integer,
  total_score numeric,
  average_score numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_count integer;
  v_upload public.skill_ocr_public_uploads;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_role not in ('hitter', 'pitcher') then
    raise exception 'INVALID_SKILL_OCR_ROLE';
  end if;

  v_player_count := case
    when jsonb_typeof(coalesce(p_selected_players, '[]'::jsonb)) = 'array'
      then jsonb_array_length(coalesce(p_selected_players, '[]'::jsonb))
    else 0
  end;

  insert into public.skill_ocr_public_uploads (
    user_id,
    role,
    is_saved,
    image_name,
    request_id,
    raw_response,
    selected_players,
    player_count,
    total_score,
    average_score
  ) values (
    v_user_id,
    p_role,
    false,
    nullif(p_image_name, ''),
    nullif(p_request_id, ''),
    coalesce(p_raw_response, '{}'::jsonb),
    coalesce(p_selected_players, '[]'::jsonb),
    v_player_count,
    coalesce(p_total_score, 0),
    coalesce(p_average_score, 0)
  )
  returning * into v_upload;

  return query
  select
    v_upload.id,
    v_upload.role,
    v_upload.is_saved,
    v_upload.image_name,
    v_upload.request_id,
    v_upload.raw_response,
    v_upload.selected_players,
    v_upload.player_count,
    v_upload.total_score,
    v_upload.average_score,
    v_upload.created_at,
    v_upload.updated_at;
end;
$$;

create or replace function public.skill_ocr_finalize_public_upload(
  p_upload_id uuid,
  p_role text,
  p_image_name text,
  p_request_id text,
  p_raw_response jsonb,
  p_selected_players jsonb,
  p_total_score numeric,
  p_average_score numeric
)
returns table (
  id uuid,
  upload_role text,
  is_saved boolean,
  image_name text,
  request_id text,
  raw_response jsonb,
  selected_players jsonb,
  player_count integer,
  total_score numeric,
  average_score numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_player_count integer;
  v_upload public.skill_ocr_public_uploads;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if p_role not in ('hitter', 'pitcher') then
    raise exception 'INVALID_SKILL_OCR_ROLE';
  end if;

  v_player_count := case
    when jsonb_typeof(coalesce(p_selected_players, '[]'::jsonb)) = 'array'
      then jsonb_array_length(coalesce(p_selected_players, '[]'::jsonb))
    else 0
  end;

  update public.skill_ocr_public_uploads upload_row
     set role = p_role,
         is_saved = true,
         image_name = nullif(p_image_name, ''),
         request_id = nullif(p_request_id, ''),
         raw_response = coalesce(p_raw_response, '{}'::jsonb),
         selected_players = coalesce(p_selected_players, '[]'::jsonb),
         player_count = v_player_count,
         total_score = coalesce(p_total_score, 0),
         average_score = coalesce(p_average_score, 0),
         updated_at = now()
   where upload_row.id = p_upload_id
     and upload_row.user_id = v_user_id
  returning * into v_upload;

  if v_upload.id is null then
    raise exception 'PUBLIC_SKILL_OCR_UPLOAD_NOT_FOUND';
  end if;

  return query
  select
    v_upload.id,
    v_upload.role,
    v_upload.is_saved,
    v_upload.image_name,
    v_upload.request_id,
    v_upload.raw_response,
    v_upload.selected_players,
    v_upload.player_count,
    v_upload.total_score,
    v_upload.average_score,
    v_upload.created_at,
    v_upload.updated_at;
end;
$$;

create or replace function public.skill_ocr_list_public_uploads(
  p_limit integer default 20
)
returns table (
  id uuid,
  upload_role text,
  is_saved boolean,
  image_name text,
  request_id text,
  raw_response jsonb,
  selected_players jsonb,
  player_count integer,
  total_score numeric,
  average_score numeric,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  return query
  select
    upload_row.id,
    upload_row.role,
    upload_row.is_saved,
    upload_row.image_name,
    upload_row.request_id,
    upload_row.raw_response,
    upload_row.selected_players,
    upload_row.player_count,
    upload_row.total_score,
    upload_row.average_score,
    upload_row.created_at,
    upload_row.updated_at
  from public.skill_ocr_public_uploads upload_row
  where upload_row.user_id = v_user_id
  order by upload_row.created_at desc
  limit least(greatest(coalesce(p_limit, 20), 1), 100);
end;
$$;

grant execute on function public.skill_ocr_create_public_snapshot(text, text, text, jsonb, jsonb, numeric, numeric) to authenticated;
grant execute on function public.skill_ocr_finalize_public_upload(uuid, text, text, text, jsonb, jsonb, numeric, numeric) to authenticated;
grant execute on function public.skill_ocr_list_public_uploads(integer) to authenticated;
