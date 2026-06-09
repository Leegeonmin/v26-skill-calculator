create or replace function public.skill_ocr_delete_public_upload(
  p_upload_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deleted_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  delete from public.skill_ocr_public_uploads upload_row
   where upload_row.id = p_upload_id
     and upload_row.user_id = v_user_id
     and upload_row.is_saved = false
  returning upload_row.id into v_deleted_id;

  if v_deleted_id is null then
    raise exception 'PUBLIC_SKILL_OCR_UPLOAD_NOT_FOUND';
  end if;
end;
$$;

grant execute on function public.skill_ocr_delete_public_upload(uuid) to authenticated;
