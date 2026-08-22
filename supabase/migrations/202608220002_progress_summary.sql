insert into public.skills (slug, name)
values ('mixed', 'Mixed')
on conflict (slug) do update set name = excluded.name;

create or replace function public.skill_slug_for_block_type(p_type text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_type in ('fill_gap', 'sentence_builder') then 'grammar'
    when p_type = 'reading_question' then 'reading'
    when p_type = 'listening_question' then 'listening'
    when p_type = 'writing_prompt' then 'writing'
    when p_type = 'speaking_prompt' then 'speaking'
    when p_type = 'quiz' then 'mixed'
    else 'vocabulary'
  end;
$$;

create or replace function public.update_user_skill_stats_from_attempt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_skill_id uuid;
begin
  select skills.id into target_skill_id
  from public.lesson_blocks blocks
  join public.skills skills
    on skills.slug = public.skill_slug_for_block_type(blocks.type)
  where blocks.id = new.block_id;

  if target_skill_id is null then return new; end if;

  insert into public.user_skill_stats (
    user_id, skill_id, attempts, earned_points, possible_points,
    performance_percent, updated_at
  ) values (
    new.user_id,
    target_skill_id,
    1,
    new.score,
    new.max_score,
    case when new.max_score > 0 then round((new.score / new.max_score) * 100, 2) else null end,
    now()
  )
  on conflict (user_id, skill_id) do update set
    attempts = public.user_skill_stats.attempts + 1,
    earned_points = public.user_skill_stats.earned_points + excluded.earned_points,
    possible_points = public.user_skill_stats.possible_points + excluded.possible_points,
    performance_percent = case
      when public.user_skill_stats.possible_points + excluded.possible_points > 0
        then round(
          ((public.user_skill_stats.earned_points + excluded.earned_points) /
          (public.user_skill_stats.possible_points + excluded.possible_points)) * 100,
          2
        )
      else null
    end,
    updated_at = now();

  if new.attempt_number = 1 then
    insert into public.user_activity (
      user_id, activity_date, lesson_blocks_completed, lessons_completed, minutes_active
    ) values (
      new.user_id, current_date, 1, 0, 0
    )
    on conflict (user_id, activity_date) do update set
      lesson_blocks_completed = public.user_activity.lesson_blocks_completed + 1;
  end if;

  return new;
end;
$$;

drop trigger if exists exercise_attempt_updates_skill_stats on public.exercise_attempts;
create trigger exercise_attempt_updates_skill_stats
after insert on public.exercise_attempts
for each row execute function public.update_user_skill_stats_from_attempt();

insert into public.user_skill_stats (
  user_id, skill_id, attempts, earned_points, possible_points,
  performance_percent, updated_at
)
select
  attempts.user_id,
  skills.id,
  count(*)::integer,
  coalesce(sum(attempts.score), 0),
  coalesce(sum(attempts.max_score), 0),
  case
    when coalesce(sum(attempts.max_score), 0) > 0
      then round((sum(attempts.score) / sum(attempts.max_score)) * 100, 2)
    else null
  end,
  now()
from public.exercise_attempts attempts
join public.lesson_blocks blocks on blocks.id = attempts.block_id
join public.skills skills
  on skills.slug = public.skill_slug_for_block_type(blocks.type)
group by attempts.user_id, skills.id
on conflict (user_id, skill_id) do update set
  attempts = excluded.attempts,
  earned_points = excluded.earned_points,
  possible_points = excluded.possible_points,
  performance_percent = excluded.performance_percent,
  updated_at = excluded.updated_at;

create or replace function public.get_progress_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_level_id uuid;
  target_level_id uuid;
  weekly_target integer := 5;
  week_start date := date_trunc('week', current_date)::date;
  weekly_completed integer := 0;
  lessons_completed integer := 0;
  lessons_total integer := 0;
  modules_completed integer := 0;
  modules_total integer := 0;
  levels_completed integer := 0;
  levels_total integer := 0;
  current_modules_completed integer := 0;
  current_modules_total integer := 0;
  overall_progress numeric := 0;
  average_accuracy numeric;
  best_accuracy numeric := 0;
  current_streak integer := 0;
  longest_streak integer := 0;
  current_level jsonb := null;
  course_levels jsonb := '[]'::jsonb;
  course_modules jsonb := '[]'::jsonb;
  course_lessons jsonb := '[]'::jsonb;
  skill_summary jsonb := '[]'::jsonb;
  activity_summary jsonb := '[]'::jsonb;
  milestone_summary jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select profiles.current_level_id, profiles.weekly_goal
  into profile_level_id, weekly_target
  from public.profiles
  where profiles.id = auth.uid();
  weekly_target := greatest(1, coalesce(weekly_target, 5));

  select
    count(*) filter (where progress.status = 'completed'),
    count(*),
    round(avg(progress.accuracy_percent), 2),
    coalesce(max(progress.accuracy_percent), 0)
  into lessons_completed, lessons_total, average_accuracy, best_accuracy
  from public.lessons lessons
  join public.modules modules on modules.id = lessons.module_id
  join public.levels levels on levels.id = modules.level_id
  left join public.user_lesson_progress progress
    on progress.lesson_id = lessons.id and progress.user_id = auth.uid()
  where lessons.status = 'published'
    and modules.status = 'published'
    and levels.status = 'published'
    and lessons.is_required;

  select
    count(*) filter (where progress.status in ('completed', 'mastered')),
    count(*)
  into modules_completed, modules_total
  from public.modules modules
  join public.levels levels on levels.id = modules.level_id
  left join public.user_module_progress progress
    on progress.module_id = modules.id and progress.user_id = auth.uid()
  where modules.status = 'published'
    and levels.status = 'published'
    and modules.is_required;

  select
    count(*) filter (where progress.status in ('completed', 'mastered')),
    count(*),
    round(avg(coalesce(progress.completion_percent, 0)), 2)
  into levels_completed, levels_total, overall_progress
  from public.levels levels
  left join public.user_level_progress progress
    on progress.level_id = levels.id and progress.user_id = auth.uid()
  where levels.status <> 'archived';
  overall_progress := coalesce(overall_progress, 0);

  select levels.id into target_level_id
  from public.levels levels
  left join public.user_level_progress progress
    on progress.level_id = levels.id and progress.user_id = auth.uid()
  where levels.status = 'published'
  order by
    case
      when levels.id = profile_level_id then 0
      when progress.status = 'in_progress' then 1
      when progress.status = 'available' then 2
      else 3
    end,
    levels.order_index
  limit 1;

  if target_level_id is not null then
    select
      count(*) filter (where progress.status in ('completed', 'mastered')),
      count(*)
    into current_modules_completed, current_modules_total
    from public.modules modules
    left join public.user_module_progress progress
      on progress.module_id = modules.id and progress.user_id = auth.uid()
    where modules.level_id = target_level_id
      and modules.status = 'published'
      and modules.is_required;

    select jsonb_build_object(
      'id', levels.id,
      'slug', levels.slug,
      'cefr', levels.cefr,
      'title', levels.title,
      'completionPercent', coalesce(progress.completion_percent, 0),
      'modulesCompleted', current_modules_completed,
      'modulesTotal', current_modules_total
    ) into current_level
    from public.levels levels
    left join public.user_level_progress progress
      on progress.level_id = levels.id and progress.user_id = auth.uid()
    where levels.id = target_level_id;
  end if;

  select count(*) into weekly_completed
  from public.user_activity activity
  where activity.user_id = auth.uid()
    and activity.activity_date between week_start and week_start + 6
    and (
      activity.minutes_active > 0
      or activity.lesson_blocks_completed > 0
      or activity.lessons_completed > 0
    );

  with active_dates as (
    select distinct activity.activity_date
    from public.user_activity activity
    where activity.user_id = auth.uid()
      and activity.activity_date <= current_date
      and (
        activity.minutes_active > 0
        or activity.lesson_blocks_completed > 0
        or activity.lessons_completed > 0
      )
  ), numbered as (
    select
      activity_date,
      activity_date - (row_number() over (order by activity_date))::integer as streak_group
    from active_dates
  ), streaks as (
    select count(*)::integer as days, max(activity_date) as last_date
    from numbered
    group by streak_group
  )
  select
    coalesce(max(days) filter (where last_date >= current_date - 1), 0),
    coalesce(max(days), 0)
  into current_streak, longest_streak
  from streaks;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'entityId', progress.level_id,
      'completionPercent', progress.completion_percent,
      'averageAccuracy', progress.average_accuracy,
      'assessmentScore', progress.assessment_score,
      'status', progress.status
    ) order by levels.order_index
  ), '[]'::jsonb) into course_levels
  from public.user_level_progress progress
  join public.levels levels on levels.id = progress.level_id
  where progress.user_id = auth.uid();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'entityId', progress.module_id,
      'completionPercent', progress.completion_percent,
      'averageAccuracy', progress.average_accuracy,
      'assessmentScore', progress.assessment_score,
      'status', progress.status
    ) order by levels.order_index, modules.order_index
  ), '[]'::jsonb) into course_modules
  from public.user_module_progress progress
  join public.modules modules on modules.id = progress.module_id
  join public.levels levels on levels.id = modules.level_id
  where progress.user_id = auth.uid();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'entityId', progress.lesson_id,
      'completionPercent', progress.completion_percent,
      'accuracyPercent', progress.accuracy_percent,
      'status', progress.status,
      'lastActivityAt', progress.last_activity_at
    ) order by levels.order_index, modules.order_index, lessons.order_index
  ), '[]'::jsonb) into course_lessons
  from public.user_lesson_progress progress
  join public.lessons lessons on lessons.id = progress.lesson_id
  join public.modules modules on modules.id = lessons.module_id
  join public.levels levels on levels.id = modules.level_id
  where progress.user_id = auth.uid();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'slug', skills.slug,
      'name', skills.name,
      'attempts', coalesce(stats.attempts, 0),
      'earnedPoints', coalesce(stats.earned_points, 0),
      'possiblePoints', coalesce(stats.possible_points, 0),
      'performancePercent', stats.performance_percent
    ) order by skills.name
  ), '[]'::jsonb) into skill_summary
  from public.skills skills
  left join public.user_skill_stats stats
    on stats.skill_id = skills.id and stats.user_id = auth.uid();

  with days as (
    select generate_series(current_date - 83, current_date, interval '1 day')::date as activity_date
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'date', to_char(days.activity_date, 'YYYY-MM-DD'),
      'lessonsCompleted', coalesce(activity.lessons_completed, 0),
      'minutesActive', coalesce(activity.minutes_active, 0),
      'intensity', case
        when coalesce(activity.minutes_active, 0) = 0
          and coalesce(activity.lesson_blocks_completed, 0) = 0 then 0
        when coalesce(activity.minutes_active, 0) <= 15 then 1
        when activity.minutes_active <= 30 then 2
        when activity.minutes_active <= 60 then 3
        else 4
      end
    ) order by days.activity_date
  ), '[]'::jsonb) into activity_summary
  from days
  left join public.user_activity activity
    on activity.user_id = auth.uid() and activity.activity_date = days.activity_date;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'slug', achievements.slug,
      'title', achievements.title,
      'description', achievements.description,
      'unlocked', user_achievements.id is not null,
      'unlockedAt', user_achievements.unlocked_at,
      'progressPercent', case
        when user_achievements.id is not null then 100
        else least(100, round(
          (case achievements.condition_type
            when 'lessons_completed' then lessons_completed
            when 'modules_completed' then modules_completed
            when 'levels_completed' then levels_completed
            when 'streak_days' then current_streak
            when 'lesson_accuracy' then best_accuracy
            else 0
          end::numeric / greatest(1, coalesce((achievements.condition_value ->> 'minimum')::numeric, 1))) * 100,
          2
        ))
      end
    ) order by achievements.order_index
  ), '[]'::jsonb) into milestone_summary
  from public.achievements achievements
  left join public.user_achievements user_achievements
    on user_achievements.achievement_id = achievements.id
    and user_achievements.user_id = auth.uid()
  where achievements.is_active;

  return jsonb_build_object(
    'courseProgress', jsonb_build_object(
      'levels', course_levels,
      'modules', course_modules,
      'lessons', course_lessons
    ),
    'overallProgress', overall_progress,
    'averageAccuracy', average_accuracy,
    'lessonsCompleted', lessons_completed,
    'lessonsTotal', lessons_total,
    'modulesCompleted', modules_completed,
    'modulesTotal', modules_total,
    'levelsCompleted', levels_completed,
    'levelsTotal', levels_total,
    'currentLevel', current_level,
    'weeklyGoal', jsonb_build_object(
      'targetDays', weekly_target,
      'completedDays', weekly_completed,
      'remainingDays', greatest(0, weekly_target - weekly_completed),
      'weekStartsOn', to_char(week_start, 'YYYY-MM-DD')
    ),
    'streak', jsonb_build_object(
      'currentDays', current_streak,
      'longestDays', longest_streak
    ),
    'skills', skill_summary,
    'activity', activity_summary,
    'milestones', milestone_summary
  );
end;
$$;

revoke all on function public.get_progress_summary() from public, anon;
grant execute on function public.get_progress_summary() to authenticated;
