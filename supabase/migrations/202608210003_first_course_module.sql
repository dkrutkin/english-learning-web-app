create table public.lesson_block_answers (
  block_id uuid primary key references public.lesson_blocks(id) on delete cascade,
  answer_key jsonb not null,
  max_score numeric(8, 2) not null default 1 check (max_score > 0)
);

create table public.user_lesson_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  current_block_id uuid references public.lesson_blocks(id) on delete set null,
  draft_answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.lesson_block_answers enable row level security;
alter table public.user_lesson_sessions enable row level security;

create policy "Users manage own lesson sessions"
on public.user_lesson_sessions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, insert, update on public.user_lesson_sessions to authenticated;

create trigger user_lesson_sessions_set_updated_at
before update on public.user_lesson_sessions
for each row execute function public.set_updated_at();

do $$
declare
  b1_id uuid;
  v_module_id uuid;
  experiences_id uuid;
  grammar_id uuid;
  reading_id uuid;
  listening_id uuid;
  review_id uuid;
begin
  select id into b1_id from public.levels where cefr = 'B1';

  insert into public.modules (
    level_id, slug, title, description, learning_outcome, icon,
    order_index, estimated_minutes, is_required, status
  ) values (
    b1_id,
    'experiences-and-stories',
    'Experiences and stories',
    'Connect events and share experiences with more detail.',
    'Talk about life experiences, understand short stories and respond naturally.',
    'book-open',
    1,
    105,
    true,
    'published'
  )
  on conflict (level_id, slug) do update set
    title = excluded.title,
    description = excluded.description,
    learning_outcome = excluded.learning_outcome,
    icon = excluded.icon,
    estimated_minutes = excluded.estimated_minutes,
    is_required = excluded.is_required,
    status = excluded.status;

  select id into v_module_id
  from public.modules
  where level_id = b1_id and slug = 'experiences-and-stories';

  insert into public.lessons (
    module_id, slug, title, description, order_index,
    estimated_minutes, is_required, status, version
  ) values
    (v_module_id, 'talking-about-experiences', 'Talking about experiences', 'Build vocabulary for memorable life experiences.', 1, 18, true, 'published', 1),
    (v_module_id, 'present-perfect-essentials', 'Present perfect essentials', 'Connect past experiences to the present.', 2, 22, true, 'published', 1),
    (v_module_id, 'a-life-changing-trip', 'A life-changing trip', 'Read a short story and identify its key details.', 3, 20, true, 'published', 1),
    (v_module_id, 'listening-to-experiences', 'Listening to experiences', 'Follow a conversation about travel and personal change.', 4, 20, true, 'published', 1),
    (v_module_id, 'module-review', 'Module review', 'Review the vocabulary, grammar, reading and listening skills from this module.', 5, 25, true, 'published', 1)
  on conflict (module_id, slug) do update set
    title = excluded.title,
    description = excluded.description,
    order_index = excluded.order_index,
    estimated_minutes = excluded.estimated_minutes,
    is_required = excluded.is_required,
    status = excluded.status,
    version = excluded.version;

  select id into experiences_id from public.lessons where module_id = v_module_id and slug = 'talking-about-experiences';
  select id into grammar_id from public.lessons where module_id = v_module_id and slug = 'present-perfect-essentials';
  select id into reading_id from public.lessons where module_id = v_module_id and slug = 'a-life-changing-trip';
  select id into listening_id from public.lessons where module_id = v_module_id and slug = 'listening-to-experiences';
  select id into review_id from public.lessons where module_id = v_module_id and slug = 'module-review';

  insert into public.lesson_blocks (lesson_id, type, title, content, order_index, is_required, is_graded) values
    (experiences_id, 'intro', 'Your goal', '{"body":"Learn practical words for describing experiences and use them in a short conversation."}', 1, true, false),
    (experiences_id, 'vocabulary', 'Experience vocabulary', '{"items":[{"term":"memorable","definition":"worth remembering","example":"It was a memorable trip."},{"term":"challenging","definition":"difficult in an interesting way","example":"Learning to dive was challenging."},{"term":"achievement","definition":"something you succeed in doing","example":"Finishing the race was a major achievement."},{"term":"opportunity","definition":"a good chance to do something","example":"The project gave me an opportunity to travel."}]}', 2, true, false),
    (experiences_id, 'single_choice', 'Choose the best word', '{"prompt":"Completing my first marathon was a big ___.","options":["achievement","opportunity","journey"],"hint":"Choose the word for something you succeeded in doing."}', 3, true, true),
    (experiences_id, 'summary', 'Key idea', '{"body":"Use specific adjectives and nouns to make descriptions of experiences clearer and more personal."}', 4, true, false),

    (grammar_id, 'intro', 'Connect past and present', '{"body":"Use the present perfect when the experience matters now and the exact past time is not important."}', 1, true, false),
    (grammar_id, 'grammar', 'Present perfect', '{"explanation":"Build the present perfect with have or has and the past participle.","formula":"subject + have / has + past participle","examples":["I have visited Japan.","She has never tried surfing."]}', 2, true, false),
    (grammar_id, 'fill_gap', 'Complete the sentence', '{"prompt":"She ___ never tried surfing.","placeholder":"Type one word","hint":"Use the third-person form of have."}', 3, true, true),
    (grammar_id, 'multiple_choice', 'Choose both correct sentences', '{"prompt":"Which sentences use the present perfect correctly?","options":["I have visited Rome twice.","She has finished the course.","We have went to Spain."]}', 4, true, true),
    (grammar_id, 'summary', 'Remember', '{"body":"Do not use the present perfect with a finished past-time expression such as yesterday or last year."}', 5, true, false),

    (reading_id, 'reading', 'A life-changing trip', '{"body":"Two years ago, Maya accepted a volunteer opportunity in Costa Rica. She had never travelled alone before, so the first week felt challenging. Since then, she has become more independent and has made friends from five countries. Maya says the experience changed how she thinks about home and community."}', 1, true, false),
    (reading_id, 'reading_question', 'Check your understanding', '{"prompt":"What has changed for Maya since the trip?","options":["She has become more independent.","She has stopped travelling.","She has moved permanently to Costa Rica."]}', 2, true, true),
    (reading_id, 'writing_prompt', 'Make it personal', '{"prompt":"Write two sentences about an experience that changed you."}', 3, false, false),
    (reading_id, 'summary', 'Reading strategy', '{"body":"Look for time markers and repeated ideas to connect events with their present results."}', 4, true, false),

    (listening_id, 'listening', 'A conversation about change', '{"instructions":"Read the transcript as a listening simulation for this first release.","transcript":"Leo: Have you ever taken a trip that changed you? Nina: Yes, I have. I spent a month in Canada and learned to be more confident. Leo: What was the most challenging part? Nina: Speaking English every day, but it became easier after the first week."}', 1, true, false),
    (listening_id, 'listening_question', 'Listen for detail', '{"prompt":"What was most challenging for Nina?","options":["Speaking English every day","Finding a place to stay","Travelling alone"]}', 2, true, true),
    (listening_id, 'speaking_prompt', 'Respond aloud', '{"prompt":"Describe one challenging experience and explain what became easier."}', 3, false, false),
    (listening_id, 'summary', 'Listening strategy', '{"body":"Focus on the question word and listen for the phrase that directly answers it."}', 4, true, false),

    (review_id, 'intro', 'Module review', '{"body":"Complete the final quiz to check your vocabulary, grammar, reading and listening skills."}', 1, true, false),
    (review_id, 'quiz', 'Final quiz', '{"prompt":"Choose one answer for every question.","questions":[{"prompt":"Which word means worth remembering?","options":["memorable","challenging","ordinary"]},{"prompt":"Complete: I ___ visited Italy twice.","options":["have","has","am"]},{"prompt":"What has Maya become since her trip?","options":["More independent","Less confident","More isolated"]},{"prompt":"What challenged Nina in Canada?","options":["Speaking English","The weather","Her job"]},{"prompt":"Which sentence is correct?","options":["She has never tried surfing.","She have never tried surfing.","She has never try surfing."]}]}', 2, true, true),
    (review_id, 'summary', 'Module complete', '{"body":"You can now describe experiences, use the present perfect and understand the main details in short stories and conversations."}', 3, true, false)
  on conflict (lesson_id, order_index) do update set
    type = excluded.type,
    title = excluded.title,
    content = excluded.content,
    is_required = excluded.is_required,
    is_graded = excluded.is_graded;

  insert into public.lesson_block_answers (block_id, answer_key, max_score)
  select id, '"achievement"'::jsonb, 1 from public.lesson_blocks where lesson_id = experiences_id and order_index = 3
  on conflict (block_id) do update set answer_key = excluded.answer_key, max_score = excluded.max_score;

  insert into public.lesson_block_answers (block_id, answer_key, max_score)
  select id, '"has"'::jsonb, 1 from public.lesson_blocks where lesson_id = grammar_id and order_index = 3
  on conflict (block_id) do update set answer_key = excluded.answer_key, max_score = excluded.max_score;

  insert into public.lesson_block_answers (block_id, answer_key, max_score)
  select id, '["I have visited Rome twice.","She has finished the course."]'::jsonb, 2 from public.lesson_blocks where lesson_id = grammar_id and order_index = 4
  on conflict (block_id) do update set answer_key = excluded.answer_key, max_score = excluded.max_score;

  insert into public.lesson_block_answers (block_id, answer_key, max_score)
  select id, '"She has become more independent."'::jsonb, 1 from public.lesson_blocks where lesson_id = reading_id and order_index = 2
  on conflict (block_id) do update set answer_key = excluded.answer_key, max_score = excluded.max_score;

  insert into public.lesson_block_answers (block_id, answer_key, max_score)
  select id, '"Speaking English every day"'::jsonb, 1 from public.lesson_blocks where lesson_id = listening_id and order_index = 2
  on conflict (block_id) do update set answer_key = excluded.answer_key, max_score = excluded.max_score;

  insert into public.lesson_block_answers (block_id, answer_key, max_score)
  select id, '["memorable","have","More independent","Speaking English","She has never tried surfing."]'::jsonb, 5 from public.lesson_blocks where lesson_id = review_id and order_index = 2
  on conflict (block_id) do update set answer_key = excluded.answer_key, max_score = excluded.max_score;
end;
$$;

create or replace function public.submit_lesson_answer(
  p_lesson_id uuid,
  p_block_id uuid,
  p_answer jsonb
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
  earned numeric(8, 2) := 0;
  correct boolean;
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
    select count(*)::numeric into earned
    from jsonb_array_elements(expected) as item(value)
    where p_answer @> jsonb_build_array(item.value);
    earned := greatest(0, earned - greatest(0, jsonb_array_length(p_answer) - jsonb_array_length(expected)));
  elsif jsonb_typeof(expected) = 'array' and jsonb_typeof(p_answer) = 'array' then
    select count(*)::numeric into earned
    from jsonb_array_elements(expected) with ordinality as item(value, position)
    where p_answer -> (item.position - 1)::integer = item.value;
  elsif expected = p_answer then
    earned := possible;
  end if;

  correct := earned = possible;

  insert into public.exercise_attempts (
    user_id, lesson_id, block_id, answer, score, max_score, is_correct, attempt_number
  ) values (
    auth.uid(), p_lesson_id, p_block_id, p_answer, earned, possible, correct, 1
  )
  on conflict (user_id, block_id, attempt_number) do update set
    answer = excluded.answer,
    score = excluded.score,
    max_score = excluded.max_score,
    is_correct = excluded.is_correct,
    created_at = now();

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

  return jsonb_build_object('isCorrect', correct, 'score', earned, 'maxScore', possible);
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

  select count(*), coalesce(sum(score), 0), coalesce(sum(max_score), 0)
  into answered_graded, earned, possible
  from public.exercise_attempts attempts
  join public.lesson_blocks blocks on blocks.id = attempts.block_id
  where attempts.user_id = auth.uid()
    and attempts.lesson_id = p_lesson_id
    and attempts.attempt_number = 1
    and blocks.is_required
    and blocks.is_graded;

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

revoke all on function public.submit_lesson_answer(uuid, uuid, jsonb) from public, anon;
grant execute on function public.submit_lesson_answer(uuid, uuid, jsonb) to authenticated;
revoke all on function public.complete_lesson(uuid) from public, anon;
grant execute on function public.complete_lesson(uuid) to authenticated;
