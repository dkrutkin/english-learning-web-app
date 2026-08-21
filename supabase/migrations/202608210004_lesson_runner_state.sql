alter table public.user_lesson_sessions
  add column if not exists attempts jsonb not null default '{}'::jsonb,
  add column if not exists feedback jsonb not null default '{}'::jsonb,
  add column if not exists used_hints jsonb not null default '[]'::jsonb,
  add column if not exists score numeric(8, 2) not null default 0 check (score >= 0),
  add column if not exists possible_score numeric(8, 2) not null default 0 check (possible_score >= 0);

drop function if exists public.submit_lesson_answer(uuid, uuid, jsonb);

create or replace function public.submit_lesson_answer(
  p_lesson_id uuid,
  p_block_id uuid,
  p_answer jsonb,
  p_used_hint boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected jsonb;
  possible numeric(8, 2);
  block_type text;
  raw_earned numeric(8, 2) := 0;
  earned numeric(8, 2) := 0;
  correct boolean;
  next_attempt integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select answers.answer_key, answers.max_score, blocks.type
  into expected, possible, block_type
  from public.lesson_block_answers answers
  join public.lesson_blocks blocks on blocks.id = answers.block_id
  join public.lessons lessons on lessons.id = blocks.lesson_id
  where answers.block_id = p_block_id
    and blocks.lesson_id = p_lesson_id
    and lessons.status = 'published';

  if expected is null then raise exception 'Graded block not found'; end if;

  if block_type = 'multiple_choice' and jsonb_typeof(expected) = 'array' and jsonb_typeof(p_answer) = 'array' then
    select count(*)::numeric into raw_earned
    from jsonb_array_elements(expected) as item(value)
    where p_answer @> jsonb_build_array(item.value);
    raw_earned := greatest(0, raw_earned - greatest(0, jsonb_array_length(p_answer) - jsonb_array_length(expected)));
  elsif jsonb_typeof(expected) = 'array' and jsonb_typeof(p_answer) = 'array' then
    select count(*)::numeric into raw_earned
    from jsonb_array_elements(expected) with ordinality as item(value, position)
    where p_answer -> (item.position - 1)::integer = item.value;
  elsif expected = p_answer then
    raw_earned := possible;
  end if;

  correct := raw_earned = possible;
  earned := case when p_used_hint and raw_earned > 0 then round(raw_earned * 0.8, 2) else raw_earned end;

  select coalesce(max(attempt_number), 0) + 1 into next_attempt
  from public.exercise_attempts
  where user_id = auth.uid() and block_id = p_block_id;
  if next_attempt > 3 then raise exception 'Maximum number of attempts reached'; end if;

  insert into public.exercise_attempts (
    user_id, lesson_id, block_id, answer, score, max_score, is_correct, used_hint, attempt_number
  ) values (
    auth.uid(), p_lesson_id, p_block_id, p_answer, earned, possible, correct, p_used_hint, next_attempt
  );

  insert into public.user_lesson_progress (
    user_id, lesson_id, status, current_block_id, started_at, last_activity_at
  ) values (
    auth.uid(), p_lesson_id, 'in_progress', p_block_id, now(), now()
  )
  on conflict (user_id, lesson_id) do update set
    status = case when public.user_lesson_progress.status = 'completed' then 'completed'::public.learning_progress_status else 'in_progress'::public.learning_progress_status end,
    current_block_id = excluded.current_block_id,
    started_at = coalesce(public.user_lesson_progress.started_at, excluded.started_at),
    last_activity_at = excluded.last_activity_at;

  return jsonb_build_object(
    'isCorrect', correct,
    'score', earned,
    'maxScore', possible,
    'attemptNumber', next_attempt,
    'usedHint', p_used_hint
  );
end;
$$;

create or replace function public.complete_lesson(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_module_id uuid;
  required_graded integer;
  answered_graded integer;
  earned numeric := 0;
  possible numeric := 0;
  accuracy numeric := 100;
  required_lessons integer;
  completed_lessons integer;
  module_percent numeric;
  module_done boolean;
  was_completed boolean := false;
  unlocked text[] := '{}';
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select module_id into parent_module_id
  from public.lessons
  where id = p_lesson_id and status = 'published';
  if parent_module_id is null then raise exception 'Published lesson not found'; end if;

  select count(*) into required_graded
  from public.lesson_blocks
  where lesson_id = p_lesson_id and is_required and is_graded;

  with best_attempts as (
    select distinct on (attempts.block_id)
      attempts.block_id, attempts.score, attempts.max_score
    from public.exercise_attempts attempts
    join public.lesson_blocks blocks on blocks.id = attempts.block_id
    where attempts.user_id = auth.uid()
      and attempts.lesson_id = p_lesson_id
      and blocks.is_required
      and blocks.is_graded
    order by attempts.block_id, attempts.score desc, attempts.attempt_number desc
  )
  select count(*), coalesce(sum(score), 0), coalesce(sum(max_score), 0)
  into answered_graded, earned, possible
  from best_attempts;

  if answered_graded < required_graded then raise exception 'Complete all required exercises first'; end if;
  if possible > 0 then accuracy := round((earned / possible) * 100, 2); end if;

  select status = 'completed' into was_completed
  from public.user_lesson_progress
  where user_id = auth.uid() and lesson_id = p_lesson_id;

  insert into public.user_lesson_progress (
    user_id, lesson_id, status, completion_percent, accuracy_percent,
    started_at, last_activity_at, completed_at
  ) values (
    auth.uid(), p_lesson_id, 'completed', 100, accuracy, now(), now(), now()
  )
  on conflict (user_id, lesson_id) do update set
    status = 'completed',
    completion_percent = 100,
    accuracy_percent = excluded.accuracy_percent,
    started_at = coalesce(public.user_lesson_progress.started_at, excluded.started_at),
    last_activity_at = excluded.last_activity_at,
    completed_at = coalesce(public.user_lesson_progress.completed_at, excluded.completed_at);

  select count(*) into required_lessons
  from public.lessons
  where module_id = parent_module_id and is_required and status = 'published';

  select count(*) into completed_lessons
  from public.lessons lessons
  join public.user_lesson_progress progress
    on progress.lesson_id = lessons.id and progress.user_id = auth.uid()
  where lessons.module_id = parent_module_id
    and lessons.is_required
    and lessons.status = 'published'
    and progress.status = 'completed';

  module_percent := case when required_lessons = 0 then 0 else round((completed_lessons::numeric / required_lessons) * 100, 2) end;
  module_done := required_lessons > 0 and completed_lessons = required_lessons;

  insert into public.user_module_progress (
    user_id, module_id, completion_percent, average_accuracy, status, started_at, completed_at
  ) values (
    auth.uid(), parent_module_id, module_percent, accuracy,
    case when module_done then 'completed'::public.course_progress_status else 'in_progress'::public.course_progress_status end,
    now(), case when module_done then now() else null end
  )
  on conflict (user_id, module_id) do update set
    completion_percent = excluded.completion_percent,
    average_accuracy = (
      select round(avg(progress.accuracy_percent), 2)
      from public.user_lesson_progress progress
      join public.lessons lessons on lessons.id = progress.lesson_id
      where progress.user_id = auth.uid()
        and lessons.module_id = parent_module_id
        and progress.status = 'completed'
    ),
    status = excluded.status,
    started_at = coalesce(public.user_module_progress.started_at, excluded.started_at),
    completed_at = coalesce(public.user_module_progress.completed_at, excluded.completed_at);

  if not coalesce(was_completed, false) then
    insert into public.user_activity (user_id, activity_date, lessons_completed, minutes_active)
    select auth.uid(), current_date, 1, estimated_minutes
    from public.lessons where id = p_lesson_id
    on conflict (user_id, activity_date) do update set
      lessons_completed = public.user_activity.lessons_completed + 1,
      minutes_active = public.user_activity.minutes_active + excluded.minutes_active;
  end if;

  insert into public.user_achievements (user_id, achievement_id)
  select auth.uid(), id from public.achievements where slug = 'first-step'
  on conflict (user_id, achievement_id) do nothing;
  if found then unlocked := array_append(unlocked, 'first-step'); end if;

  if module_done then
    insert into public.user_achievements (user_id, achievement_id)
    select auth.uid(), id from public.achievements where slug = 'first-module'
    on conflict (user_id, achievement_id) do nothing;
    if found then unlocked := array_append(unlocked, 'first-module'); end if;
  end if;

  return jsonb_build_object(
    'lessonCompleted', true,
    'moduleCompleted', module_done,
    'moduleCompletionPercent', module_percent,
    'accuracyPercent', accuracy,
    'unlockedAchievements', to_jsonb(unlocked)
  );
end;
$$;

revoke all on function public.submit_lesson_answer(uuid, uuid, jsonb, boolean) from public, anon;
grant execute on function public.submit_lesson_answer(uuid, uuid, jsonb, boolean) to authenticated;
revoke all on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;
