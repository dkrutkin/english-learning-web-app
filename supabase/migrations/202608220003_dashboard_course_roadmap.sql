create or replace function public.get_course_roadmap()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  roadmap jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', levels.id,
        'slug', levels.slug,
        'cefr', levels.cefr,
        'title', levels.title,
        'description', levels.description,
        'order_index', levels.order_index,
        'illustration_url', levels.illustration_url,
        'status', levels.status
      ) order by levels.order_index
    ),
    '[]'::jsonb
  ) into roadmap
  from public.levels levels
  where levels.status <> 'archived';

  return roadmap;
end;
$$;

create or replace function public.get_lesson_review(p_lesson_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  lesson_accuracy numeric;
  review_items jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select progress.accuracy_percent
  into lesson_accuracy
  from public.user_lesson_progress progress
  join public.lessons lessons on lessons.id = progress.lesson_id
  where progress.user_id = auth.uid()
    and progress.lesson_id = p_lesson_id
    and progress.status = 'completed'
    and lessons.status = 'published';

  if lesson_accuracy is null then raise exception 'Completed lesson not found'; end if;

  with best_attempts as (
    select distinct on (attempts.block_id)
      attempts.block_id,
      attempts.score,
      attempts.max_score,
      attempts.is_correct,
      attempts.answer,
      attempts.attempt_number
    from public.exercise_attempts attempts
    where attempts.user_id = auth.uid()
      and attempts.lesson_id = p_lesson_id
    order by attempts.block_id, attempts.score desc, attempts.attempt_number asc
  ), review_rows as (
    select
      blocks.id,
      coalesce(blocks.title, 'Exercise') as title,
      case
        when blocks.type in ('fill_gap', 'sentence_builder') then 'grammar'
        when blocks.type = 'reading_question' then 'reading'
        when blocks.type = 'listening_question' then 'listening'
        when blocks.type = 'writing_prompt' then 'writing'
        when blocks.type = 'speaking_prompt' then 'speaking'
        when blocks.type = 'quiz' then 'mixed'
        else 'vocabulary'
      end as skill,
      coalesce(best.is_correct, false) as is_correct,
      best.score,
      best.max_score,
      best.answer,
      answers.answer_key,
      blocks.order_index
    from public.lesson_blocks blocks
    join best_attempts best on best.block_id = blocks.id
    left join public.lesson_block_answers answers on answers.block_id = blocks.id
    where blocks.lesson_id = p_lesson_id
      and blocks.is_required
      and blocks.is_graded
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'blockId', id,
        'title', title,
        'skill', skill,
        'isCorrect', is_correct,
        'score', score,
        'maxScore', max_score,
        'userAnswer', answer,
        'correctAnswer', answer_key
      ) order by order_index
    ),
    '[]'::jsonb
  ) into review_items
  from review_rows;

  return jsonb_build_object(
    'lessonId', p_lesson_id,
    'accuracyPercent', lesson_accuracy,
    'items', review_items
  );
end;
$$;

revoke all on function public.get_course_roadmap() from public, anon;
revoke all on function public.get_lesson_review(uuid) from public, anon;
grant execute on function public.get_course_roadmap() to authenticated;
grant execute on function public.get_lesson_review(uuid) to authenticated;
