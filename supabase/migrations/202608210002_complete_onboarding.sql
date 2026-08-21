alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists onboarding_completed_at timestamptz;

create or replace function public.complete_onboarding(
  p_current_level text,
  p_learning_goal text,
  p_weekly_goal smallint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_cefr text;
  selected_level_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_current_level not in ('A2', 'B1', 'B2', 'not_sure') then
    raise exception 'Invalid current level';
  end if;

  if p_learning_goal not in ('everyday', 'career', 'travel', 'study', 'general') then
    raise exception 'Invalid learning goal';
  end if;

  if p_weekly_goal not in (3, 4, 5, 7) then
    raise exception 'Invalid weekly goal';
  end if;

  selected_cefr := case when p_current_level = 'not_sure' then 'A2' else p_current_level end;

  select id
    into selected_level_id
    from public.levels
   where cefr = selected_cefr;

  if selected_level_id is null then
    raise exception 'Selected level is unavailable';
  end if;

  update public.profiles
     set current_level_id = selected_level_id,
         learning_goal = p_learning_goal,
         weekly_goal = p_weekly_goal,
         onboarding_completed = true,
         onboarding_completed_at = now()
   where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  insert into public.user_level_progress as progress (user_id, level_id, status, started_at)
  values (auth.uid(), selected_level_id, 'available', now())
  on conflict (user_id, level_id) do update
    set status = case
      when progress.status = 'locked' then 'available'::public.course_progress_status
      else progress.status
    end,
    started_at = coalesce(progress.started_at, excluded.started_at),
    updated_at = now();
end;
$$;

revoke all on function public.complete_onboarding(text, text, smallint) from public;
revoke all on function public.complete_onboarding(text, text, smallint) from anon;
grant execute on function public.complete_onboarding(text, text, smallint) to authenticated;
