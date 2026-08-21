alter table public.user_lesson_sessions
  add column if not exists completion_percent numeric(5, 2) not null default 0
    check (completion_percent between 0 and 100),
  add column if not exists active_seconds integer not null default 0
    check (active_seconds >= 0),
  add column if not exists started_at timestamptz not null default now(),
  add column if not exists completed_at timestamptz,
  add column if not exists revision bigint not null default 0
    check (revision >= 0);

create or replace function public.save_lesson_session(
  p_lesson_id uuid,
  p_current_block_id uuid,
  p_draft_answers jsonb,
  p_attempts jsonb,
  p_feedback jsonb,
  p_used_hints jsonb,
  p_score numeric,
  p_possible_score numeric,
  p_completion_percent numeric,
  p_active_seconds integer,
  p_started_at timestamptz,
  p_completed_at timestamptz,
  p_expected_revision bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_session public.user_lesson_sessions%rowtype;
  saved_session public.user_lesson_sessions%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_draft_answers) <> 'object' then raise exception 'draft_answers must be an object'; end if;
  if jsonb_typeof(p_attempts) <> 'object' then raise exception 'attempts must be an object'; end if;
  if jsonb_typeof(p_feedback) <> 'object' then raise exception 'feedback must be an object'; end if;
  if jsonb_typeof(p_used_hints) <> 'array' then raise exception 'used_hints must be an array'; end if;
  if p_score < 0 or p_possible_score < 0 then raise exception 'Scores cannot be negative'; end if;
  if p_completion_percent < 0 or p_completion_percent > 100 then raise exception 'Invalid completion percent'; end if;
  if p_active_seconds < 0 then raise exception 'Active seconds cannot be negative'; end if;

  if not exists (
    select 1 from public.lessons
    where id = p_lesson_id and status = 'published'
  ) then raise exception 'Published lesson not found'; end if;

  if p_current_block_id is not null and not exists (
    select 1 from public.lesson_blocks
    where id = p_current_block_id and lesson_id = p_lesson_id
  ) then raise exception 'Lesson block does not belong to lesson'; end if;

  select * into current_session
  from public.user_lesson_sessions
  where user_id = auth.uid() and lesson_id = p_lesson_id
  for update;

  if found then
    if current_session.revision <> p_expected_revision then
      raise exception 'Session revision conflict';
    end if;

    update public.user_lesson_sessions set
      current_block_id = p_current_block_id,
      draft_answers = p_draft_answers,
      attempts = p_attempts,
      feedback = p_feedback,
      used_hints = p_used_hints,
      score = p_score,
      possible_score = p_possible_score,
      completion_percent = p_completion_percent,
      active_seconds = greatest(active_seconds, p_active_seconds),
      started_at = least(started_at, p_started_at),
      completed_at = coalesce(completed_at, p_completed_at),
      revision = revision + 1,
      updated_at = now()
    where user_id = auth.uid() and lesson_id = p_lesson_id
    returning * into saved_session;
  else
    if p_expected_revision <> 0 then raise exception 'Session revision conflict'; end if;

    insert into public.user_lesson_sessions (
      user_id, lesson_id, current_block_id, draft_answers, attempts, feedback,
      used_hints, score, possible_score, completion_percent, active_seconds,
      started_at, completed_at, revision
    ) values (
      auth.uid(), p_lesson_id, p_current_block_id, p_draft_answers, p_attempts,
      p_feedback, p_used_hints, p_score, p_possible_score, p_completion_percent,
      p_active_seconds, p_started_at, p_completed_at, 1
    )
    returning * into saved_session;
  end if;

  insert into public.user_lesson_progress (
    user_id, lesson_id, status, completion_percent, current_block_id,
    started_at, last_activity_at, completed_at
  ) values (
    auth.uid(), p_lesson_id,
    case when p_completed_at is null then 'in_progress'::public.learning_progress_status else 'completed'::public.learning_progress_status end,
    p_completion_percent, p_current_block_id, p_started_at, now(), p_completed_at
  )
  on conflict (user_id, lesson_id) do update set
    status = case
      when public.user_lesson_progress.status = 'completed' or p_completed_at is not null
        then 'completed'::public.learning_progress_status
      else 'in_progress'::public.learning_progress_status
    end,
    completion_percent = greatest(public.user_lesson_progress.completion_percent, excluded.completion_percent),
    current_block_id = excluded.current_block_id,
    started_at = least(public.user_lesson_progress.started_at, excluded.started_at),
    last_activity_at = excluded.last_activity_at,
    completed_at = coalesce(public.user_lesson_progress.completed_at, excluded.completed_at);

  return to_jsonb(saved_session) - 'user_id';
end;
$$;

revoke all on function public.save_lesson_session(
  uuid, uuid, jsonb, jsonb, jsonb, jsonb, numeric, numeric,
  numeric, integer, timestamptz, timestamptz, bigint
) from public, anon;
grant execute on function public.save_lesson_session(
  uuid, uuid, jsonb, jsonb, jsonb, jsonb, numeric, numeric,
  numeric, integer, timestamptz, timestamptz, bigint
) to authenticated;
