do $$
declare
  target_module_id uuid;
  assessment_lesson_id uuid;
begin
  select modules.id into target_module_id
  from public.modules modules
  join public.levels levels on levels.id = modules.level_id
  where levels.cefr = 'B1' and modules.slug = 'experiences-and-stories';

  if target_module_id is not null then
    insert into public.lessons (
      module_id, slug, title, description, order_index,
      estimated_minutes, is_required, status, version
    ) values (
      target_module_id,
      'level-assessment',
      'B1 level assessment',
      'Check the core vocabulary, grammar, reading and listening skills from this level.',
      6,
      30,
      false,
      'published',
      1
    )
    on conflict (module_id, slug) do update set
      title = excluded.title,
      description = excluded.description,
      order_index = excluded.order_index,
      estimated_minutes = excluded.estimated_minutes,
      is_required = excluded.is_required,
      status = excluded.status,
      version = excluded.version;

    select id into assessment_lesson_id
    from public.lessons
    where module_id = target_module_id and slug = 'level-assessment';

    insert into public.lesson_blocks (
      lesson_id, type, title, content, order_index, is_required, is_graded
    ) values
      (
        assessment_lesson_id,
        'intro',
        'Your B1 checkpoint',
        '{"body":"Complete this assessment to finish the published B1 learning path. You need 85% for mastery."}',
        1,
        true,
        false
      ),
      (
        assessment_lesson_id,
        'quiz',
        'B1 level assessment',
        '{"prompt":"Choose one answer for every question.","questions":[{"prompt":"Which word describes something worth remembering?","options":["memorable","ordinary","temporary"]},{"prompt":"Complete: She ___ never tried surfing.","options":["has","have","is"]},{"prompt":"Which sentence connects an experience to the present?","options":["I have visited Rome twice.","I visit Rome yesterday.","I am visit Rome twice."]},{"prompt":"What helped Nina after the first week?","options":["Speaking English became easier.","She stopped speaking English.","She changed her job."]},{"prompt":"Which response clearly expresses an experience?","options":["It was challenging, but I learned a lot.","Experience is thing.","Yesterday tomorrow travel."]}]}',
        2,
        true,
        true
      )
    on conflict (lesson_id, order_index) do update set
      type = excluded.type,
      title = excluded.title,
      content = excluded.content,
      is_required = excluded.is_required,
      is_graded = excluded.is_graded;

    insert into public.lesson_block_answers (block_id, answer_key, max_score)
    select
      id,
      '["memorable","has","I have visited Rome twice.","Speaking English became easier.","It was challenging, but I learned a lot."]'::jsonb,
      5
    from public.lesson_blocks
    where lesson_id = assessment_lesson_id and order_index = 2
    on conflict (block_id) do update set
      answer_key = excluded.answer_key,
      max_score = excluded.max_score;
  end if;
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
  parent_level_id uuid;
  lesson_slug text;
  lesson_order integer;
  module_order integer;
  level_order integer;
  lesson_kind text := 'lesson';
  required_graded integer;
  answered_graded integer;
  earned numeric := 0;
  possible numeric := 0;
  accuracy numeric := 100;
  required_lessons integer;
  completed_lessons integer;
  module_percent numeric := 0;
  module_done boolean := false;
  module_mastered boolean := false;
  module_assessment numeric;
  module_status public.course_progress_status := 'in_progress';
  required_modules integer;
  completed_modules integer;
  level_assessment_lesson_id uuid;
  level_assessment_done boolean := false;
  level_percent numeric := 0;
  level_done boolean := false;
  level_mastered boolean := false;
  level_assessment numeric;
  level_status public.course_progress_status := 'in_progress';
  was_completed boolean := false;
  was_module_done boolean := false;
  was_level_done boolean := false;
  next_lesson jsonb := null;
  next_module jsonb := null;
  next_level jsonb := null;
  answer_review jsonb := '[]'::jsonb;
  skill_breakdown jsonb := '[]'::jsonb;
  unlocked text[] := '{}';
  completed_total integer := 0;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select lessons.module_id, lessons.slug, lessons.order_index,
         modules.level_id, modules.order_index, levels.order_index
  into parent_module_id, lesson_slug, lesson_order,
       parent_level_id, module_order, level_order
  from public.lessons lessons
  join public.modules modules on modules.id = lessons.module_id
  join public.levels levels on levels.id = modules.level_id
  where lessons.id = p_lesson_id and lessons.status = 'published';

  if parent_module_id is null then raise exception 'Published lesson not found'; end if;

  lesson_kind := case
    when lesson_slug = 'level-assessment' then 'level_assessment'
    when lesson_slug = 'module-review' then 'module_assessment'
    else 'lesson'
  end;

  select count(*) into required_graded
  from public.lesson_blocks
  where lesson_id = p_lesson_id and is_required and is_graded;

  with best_attempts as (
    select distinct on (attempts.block_id)
      attempts.block_id, attempts.score, attempts.max_score, attempts.is_correct,
      attempts.answer, attempts.attempt_number
    from public.exercise_attempts attempts
    where attempts.user_id = auth.uid() and attempts.lesson_id = p_lesson_id
    order by attempts.block_id, attempts.score desc, attempts.attempt_number asc
  )
  select count(*), coalesce(sum(score), 0), coalesce(sum(max_score), 0)
  into answered_graded, earned, possible
  from best_attempts;

  if answered_graded < required_graded then
    raise exception 'Complete all required exercises first';
  end if;
  if possible > 0 then accuracy := round((earned / possible) * 100, 2); end if;

  with best_attempts as (
    select distinct on (attempts.block_id)
      attempts.block_id, attempts.score, attempts.max_score, attempts.is_correct,
      attempts.answer, attempts.attempt_number
    from public.exercise_attempts attempts
    where attempts.user_id = auth.uid() and attempts.lesson_id = p_lesson_id
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
    where blocks.lesson_id = p_lesson_id and blocks.is_required and blocks.is_graded
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
  ) into answer_review
  from review_rows;

  with review_rows as (
    select
      case
        when blocks.type in ('fill_gap', 'sentence_builder') then 'grammar'
        when blocks.type = 'reading_question' then 'reading'
        when blocks.type = 'listening_question' then 'listening'
        when blocks.type = 'writing_prompt' then 'writing'
        when blocks.type = 'speaking_prompt' then 'speaking'
        when blocks.type = 'quiz' then 'mixed'
        else 'vocabulary'
      end as skill,
      best.score,
      best.max_score
    from public.lesson_blocks blocks
    join lateral (
      select attempts.score, attempts.max_score
      from public.exercise_attempts attempts
      where attempts.user_id = auth.uid()
        and attempts.lesson_id = p_lesson_id
        and attempts.block_id = blocks.id
      order by attempts.score desc, attempts.attempt_number asc
      limit 1
    ) best on true
    where blocks.lesson_id = p_lesson_id and blocks.is_required and blocks.is_graded
  ), skill_rows as (
    select skill, sum(score) as score, sum(max_score) as max_score
    from review_rows
    group by skill
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'skill', skill,
        'score', score,
        'maxScore', max_score,
        'accuracyPercent', case when max_score > 0 then round((score / max_score) * 100, 2) else 100 end
      ) order by skill
    ),
    '[]'::jsonb
  ) into skill_breakdown
  from skill_rows;

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

  select jsonb_build_object('slug', slug, 'title', title) into next_lesson
  from public.lessons
  where module_id = parent_module_id and status = 'published' and order_index > lesson_order
  order by order_index
  limit 1;

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

  module_percent := case
    when required_lessons = 0 then 0
    else round((completed_lessons::numeric / required_lessons) * 100, 2)
  end;
  module_done := required_lessons > 0 and completed_lessons = required_lessons;

  select status in ('completed', 'mastered') into was_module_done
  from public.user_module_progress
  where user_id = auth.uid() and module_id = parent_module_id;

  select assessment_score into module_assessment
  from public.user_module_progress
  where user_id = auth.uid() and module_id = parent_module_id;
  if lesson_kind = 'module_assessment' then module_assessment := accuracy; end if;

  module_mastered := module_done and coalesce(module_assessment, 0) >= 85;
  module_status := case
    when module_mastered then 'mastered'::public.course_progress_status
    when module_done then 'completed'::public.course_progress_status
    else 'in_progress'::public.course_progress_status
  end;

  insert into public.user_module_progress (
    user_id, module_id, completion_percent, average_accuracy, assessment_score,
    status, started_at, completed_at
  ) values (
    auth.uid(), parent_module_id, module_percent, accuracy, module_assessment,
    module_status, now(), case when module_done then now() else null end
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
    assessment_score = coalesce(excluded.assessment_score, public.user_module_progress.assessment_score),
    status = excluded.status,
    started_at = coalesce(public.user_module_progress.started_at, excluded.started_at),
    completed_at = coalesce(public.user_module_progress.completed_at, excluded.completed_at);

  if module_done then
    select jsonb_build_object('slug', slug, 'title', title) into next_module
    from public.modules
    where level_id = parent_level_id and status = 'published' and order_index > module_order
    order by order_index
    limit 1;

    insert into public.user_module_progress (user_id, module_id, status)
    select auth.uid(), id, 'available'::public.course_progress_status
    from public.modules
    where level_id = parent_level_id and status = 'published' and order_index > module_order
    order by order_index
    limit 1
    on conflict (user_id, module_id) do update set
      status = case
        when public.user_module_progress.status = 'locked' then 'available'::public.course_progress_status
        else public.user_module_progress.status
      end;
  end if;

  select count(*) into required_modules
  from public.modules
  where level_id = parent_level_id and is_required and status = 'published';

  select count(*) into completed_modules
  from public.modules modules
  join public.user_module_progress progress
    on progress.module_id = modules.id and progress.user_id = auth.uid()
  where modules.level_id = parent_level_id
    and modules.is_required
    and modules.status = 'published'
    and progress.status in ('completed', 'mastered');

  level_percent := case
    when required_modules = 0 then 0
    else round((completed_modules::numeric / required_modules) * 100, 2)
  end;
  select lessons.id into level_assessment_lesson_id
  from public.lessons lessons
  join public.modules modules on modules.id = lessons.module_id
  where modules.level_id = parent_level_id
    and lessons.slug = 'level-assessment'
    and lessons.status = 'published'
  limit 1;

  if level_assessment_lesson_id is not null then
    select progress.status = 'completed' into level_assessment_done
    from public.user_lesson_progress progress
    where progress.user_id = auth.uid()
      and progress.lesson_id = level_assessment_lesson_id;
  end if;

  level_done := required_modules > 0
    and completed_modules = required_modules
    and level_assessment_lesson_id is not null
    and coalesce(level_assessment_done, false);

  select status in ('completed', 'mastered') into was_level_done
  from public.user_level_progress
  where user_id = auth.uid() and level_id = parent_level_id;

  select assessment_score into level_assessment
  from public.user_level_progress
  where user_id = auth.uid() and level_id = parent_level_id;

  if lesson_kind = 'level_assessment' then
    level_assessment := accuracy;
  elsif level_assessment is null then
    select round(avg(assessment_score), 2) into level_assessment
    from public.user_module_progress progress
    join public.modules modules on modules.id = progress.module_id
    where progress.user_id = auth.uid()
      and modules.level_id = parent_level_id
      and modules.is_required
      and progress.assessment_score is not null;
  end if;

  level_mastered := level_done and coalesce(level_assessment, 0) >= 85;
  level_status := case
    when level_mastered then 'mastered'::public.course_progress_status
    when level_done then 'completed'::public.course_progress_status
    else 'in_progress'::public.course_progress_status
  end;

  insert into public.user_level_progress (
    user_id, level_id, completion_percent, average_accuracy, assessment_score,
    status, started_at, completed_at
  ) values (
    auth.uid(), parent_level_id, level_percent, accuracy, level_assessment,
    level_status, now(), case when level_done then now() else null end
  )
  on conflict (user_id, level_id) do update set
    completion_percent = excluded.completion_percent,
    average_accuracy = (
      select round(avg(progress.average_accuracy), 2)
      from public.user_module_progress progress
      join public.modules modules on modules.id = progress.module_id
      where progress.user_id = auth.uid()
        and modules.level_id = parent_level_id
        and progress.average_accuracy is not null
    ),
    assessment_score = excluded.assessment_score,
    status = excluded.status,
    started_at = coalesce(public.user_level_progress.started_at, excluded.started_at),
    completed_at = coalesce(public.user_level_progress.completed_at, excluded.completed_at);

  if level_done then
    select jsonb_build_object('slug', slug, 'title', title) into next_level
    from public.levels
    where status = 'published' and order_index > level_order
    order by order_index
    limit 1;

    insert into public.user_level_progress (user_id, level_id, status)
    select auth.uid(), id, 'available'::public.course_progress_status
    from public.levels
    where status = 'published' and order_index > level_order
    order by order_index
    limit 1
    on conflict (user_id, level_id) do update set
      status = case
        when public.user_level_progress.status = 'locked' then 'available'::public.course_progress_status
        else public.user_level_progress.status
      end;
  end if;

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

  if accuracy = 100 then
    insert into public.user_achievements (user_id, achievement_id)
    select auth.uid(), id from public.achievements where slug = 'perfect-lesson'
    on conflict (user_id, achievement_id) do nothing;
    if found then unlocked := array_append(unlocked, 'perfect-lesson'); end if;
  end if;

  select count(*) into completed_total
  from public.user_lesson_progress
  where user_id = auth.uid() and status = 'completed';
  if completed_total >= 5 then
    insert into public.user_achievements (user_id, achievement_id)
    select auth.uid(), id from public.achievements where slug = 'getting-started'
    on conflict (user_id, achievement_id) do nothing;
    if found then unlocked := array_append(unlocked, 'getting-started'); end if;
  end if;

  if module_done and not coalesce(was_module_done, false) then
    insert into public.user_achievements (user_id, achievement_id)
    select auth.uid(), id from public.achievements where slug = 'first-module'
    on conflict (user_id, achievement_id) do nothing;
    if found then unlocked := array_append(unlocked, 'first-module'); end if;
  end if;

  if level_done and not coalesce(was_level_done, false) then
    insert into public.user_achievements (user_id, achievement_id)
    select auth.uid(), id from public.achievements where slug = 'level-complete'
    on conflict (user_id, achievement_id) do nothing;
    if found then unlocked := array_append(unlocked, 'level-complete'); end if;
  end if;

  return jsonb_build_object(
    'lessonCompleted', true,
    'lessonKind', lesson_kind,
    'score', earned,
    'possibleScore', possible,
    'accuracyPercent', accuracy,
    'skillBreakdown', skill_breakdown,
    'answerReview', answer_review,
    'nextLesson', next_lesson,
    'moduleCompleted', module_done,
    'moduleMastered', module_mastered,
    'moduleCompletionPercent', module_percent,
    'moduleAssessmentScore', module_assessment,
    'moduleStatus', module_status,
    'moduleSealAwarded', module_done and not coalesce(was_module_done, false),
    'nextModule', next_module,
    'levelCompleted', level_done,
    'levelMastered', level_mastered,
    'levelCompletionPercent', level_percent,
    'levelAssessmentScore', level_assessment,
    'levelStatus', level_status,
    'levelEmblemAwarded', level_done and not coalesce(was_level_done, false),
    'nextLevel', next_level,
    'unlockedAchievements', to_jsonb(unlocked)
  );
end;
$$;

revoke all on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;
