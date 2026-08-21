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
    and blocks.is_graded
    and lessons.status = 'published';

  if expected is null then raise exception 'Graded block not found'; end if;

  if block_type = 'fill_gap'
    and jsonb_typeof(expected) = 'string'
    and jsonb_typeof(p_answer) = 'string'
    and lower(trim(expected #>> '{}')) = lower(trim(p_answer #>> '{}')) then
    raw_earned := possible;
  elsif block_type = 'multiple_choice'
    and jsonb_typeof(expected) = 'array'
    and jsonb_typeof(p_answer) = 'array' then
    select count(*)::numeric into raw_earned
    from jsonb_array_elements(expected) as item(value)
    where p_answer @> jsonb_build_array(item.value);
    raw_earned := greatest(
      0,
      raw_earned - greatest(0, jsonb_array_length(p_answer) - jsonb_array_length(expected))
    );
  elsif jsonb_typeof(expected) = 'array' and jsonb_typeof(p_answer) = 'array' then
    select count(*)::numeric into raw_earned
    from jsonb_array_elements(expected) with ordinality as item(value, position)
    where p_answer -> (item.position - 1)::integer = item.value;
  elsif expected = p_answer then
    raw_earned := possible;
  end if;

  correct := raw_earned = possible;
  earned := case
    when p_used_hint and raw_earned > 0 then round(raw_earned * 0.8, 2)
    else raw_earned
  end;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(auth.uid()::text || p_block_id::text, 0)
  );

  select coalesce(max(attempt_number), 0) + 1 into next_attempt
  from public.exercise_attempts
  where user_id = auth.uid() and block_id = p_block_id;

  if next_attempt > 3 then raise exception 'Maximum number of attempts reached'; end if;

  insert into public.exercise_attempts (
    user_id, lesson_id, block_id, answer, score, max_score, is_correct, used_hint, attempt_number
  ) values (
    auth.uid(), p_lesson_id, p_block_id, p_answer, earned, possible,
    correct, p_used_hint, next_attempt
  );

  insert into public.user_lesson_progress (
    user_id, lesson_id, status, current_block_id, started_at, last_activity_at
  ) values (
    auth.uid(), p_lesson_id, 'in_progress', p_block_id, now(), now()
  )
  on conflict (user_id, lesson_id) do update set
    status = case
      when public.user_lesson_progress.status = 'completed'
        then 'completed'::public.learning_progress_status
      else 'in_progress'::public.learning_progress_status
    end,
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

revoke all on function public.submit_lesson_answer(uuid, uuid, jsonb, boolean) from public, anon;
grant execute on function public.submit_lesson_answer(uuid, uuid, jsonb, boolean) to authenticated;
