create or replace function public.evaluate_user_achievements()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  lessons_completed integer := 0;
  modules_completed integer := 0;
  levels_completed integer := 0;
  longest_streak integer := 0;
  best_accuracy numeric := 0;
  unlocked jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select count(*) into lessons_completed
  from public.user_lesson_progress
  where user_id = current_user_id and status = 'completed';

  select count(*) into modules_completed
  from public.user_module_progress
  where user_id = current_user_id and status in ('completed', 'mastered');

  select count(*) into levels_completed
  from public.user_level_progress
  where user_id = current_user_id and status in ('completed', 'mastered');

  select coalesce(max(accuracy_percent), 0) into best_accuracy
  from public.user_lesson_progress
  where user_id = current_user_id and status = 'completed';

  select coalesce(max(streak_length), 0) into longest_streak
  from (
    select count(*)::integer as streak_length
    from (
      select activity_date,
        activity_date - (row_number() over (order by activity_date))::integer as streak_group
      from public.user_activity
      where user_id = current_user_id and minutes_active > 0
    ) active_days
    group by streak_group
  ) streaks;

  with eligible as (
    select achievement.id
    from public.achievements achievement
    where achievement.is_active
      and case achievement.condition_type
        when 'lessons_completed' then lessons_completed >= coalesce((achievement.condition_value ->> 'minimum')::numeric, 1)
        when 'modules_completed' then modules_completed >= coalesce((achievement.condition_value ->> 'minimum')::numeric, 1)
        when 'levels_completed' then levels_completed >= coalesce((achievement.condition_value ->> 'minimum')::numeric, 1)
        when 'streak_days' then longest_streak >= coalesce((achievement.condition_value ->> 'minimum')::numeric, 1)
        when 'lesson_accuracy' then best_accuracy >= coalesce((achievement.condition_value ->> 'minimum')::numeric, 100)
        else false
      end
  ), inserted as (
    insert into public.user_achievements (user_id, achievement_id)
    select current_user_id, eligible.id from eligible
    on conflict (user_id, achievement_id) do nothing
    returning achievement_id, unlocked_at
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', achievement.id,
    'slug', achievement.slug,
    'title', achievement.title,
    'description', achievement.description,
    'category', achievement.category,
    'icon', achievement.icon,
    'unlockedAt', inserted.unlocked_at
  ) order by achievement.order_index), '[]'::jsonb)
  into unlocked
  from inserted
  join public.achievements achievement on achievement.id = inserted.achievement_id;

  return unlocked;
end;
$$;

revoke all on function public.evaluate_user_achievements() from public, anon;
grant execute on function public.evaluate_user_achievements() to authenticated;

create or replace function public.get_achievements_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  lessons_completed integer := 0;
  modules_completed integer := 0;
  levels_completed integer := 0;
  longest_streak integer := 0;
  best_accuracy numeric := 0;
  achievement_items jsonb := '[]'::jsonb;
  module_seals jsonb := '[]'::jsonb;
  level_emblems jsonb := '[]'::jsonb;
  timeline_items jsonb := '[]'::jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.evaluate_user_achievements();

  select count(*) into lessons_completed from public.user_lesson_progress
  where user_id = current_user_id and status = 'completed';
  select count(*) into modules_completed from public.user_module_progress
  where user_id = current_user_id and status in ('completed', 'mastered');
  select count(*) into levels_completed from public.user_level_progress
  where user_id = current_user_id and status in ('completed', 'mastered');
  select coalesce(max(accuracy_percent), 0) into best_accuracy from public.user_lesson_progress
  where user_id = current_user_id and status = 'completed';
  select coalesce(max(streak_length), 0) into longest_streak from (
    select count(*)::integer as streak_length from (
      select activity_date,
        activity_date - (row_number() over (order by activity_date))::integer as streak_group
      from public.user_activity where user_id = current_user_id and minutes_active > 0
    ) active_days group by streak_group
  ) streaks;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', achievement.id,
    'slug', achievement.slug,
    'title', achievement.title,
    'description', achievement.description,
    'category', achievement.category,
    'icon', achievement.icon,
    'unlocked', user_achievement.id is not null,
    'unlockedAt', user_achievement.unlocked_at,
    'currentValue', case achievement.condition_type
      when 'lessons_completed' then lessons_completed
      when 'modules_completed' then modules_completed
      when 'levels_completed' then levels_completed
      when 'streak_days' then longest_streak
      when 'lesson_accuracy' then best_accuracy
      else 0 end,
    'targetValue', coalesce((achievement.condition_value ->> 'minimum')::numeric, 1),
    'progressPercent', least(100, round((case achievement.condition_type
      when 'lessons_completed' then lessons_completed
      when 'modules_completed' then modules_completed
      when 'levels_completed' then levels_completed
      when 'streak_days' then longest_streak
      when 'lesson_accuracy' then best_accuracy
      else 0 end::numeric / greatest(1, coalesce((achievement.condition_value ->> 'minimum')::numeric, 1))) * 100))
  ) order by achievement.order_index), '[]'::jsonb) into achievement_items
  from public.achievements achievement
  left join public.user_achievements user_achievement
    on user_achievement.achievement_id = achievement.id and user_achievement.user_id = current_user_id
  where achievement.is_active;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', module.id, 'slug', module.slug, 'title', module.title,
    'level', level.cefr, 'status', progress.status,
    'awardedAt', progress.completed_at, 'score', progress.assessment_score
  ) order by level.order_index, module.order_index), '[]'::jsonb) into module_seals
  from public.user_module_progress progress
  join public.modules module on module.id = progress.module_id
  join public.levels level on level.id = module.level_id
  where progress.user_id = current_user_id and progress.status in ('completed', 'mastered');

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', level.id, 'slug', level.slug, 'title', level.title,
    'level', level.cefr, 'status', progress.status,
    'awardedAt', progress.completed_at, 'score', progress.assessment_score
  ) order by level.order_index), '[]'::jsonb) into level_emblems
  from public.user_level_progress progress
  join public.levels level on level.id = progress.level_id
  where progress.user_id = current_user_id and progress.status in ('completed', 'mastered');

  select coalesce(jsonb_agg(item order by occurred_at desc), '[]'::jsonb) into timeline_items
  from (
    select user_achievement.unlocked_at as occurred_at, jsonb_build_object(
      'id', user_achievement.id, 'type', 'achievement', 'title', achievement.title,
      'subtitle', achievement.description, 'occurredAt', user_achievement.unlocked_at
    ) as item
    from public.user_achievements user_achievement
    join public.achievements achievement on achievement.id = user_achievement.achievement_id
    where user_achievement.user_id = current_user_id
    union all
    select progress.completed_at, jsonb_build_object(
      'id', module.id, 'type', 'module_seal', 'title', module.title,
      'subtitle', level.cefr || ' Module Seal', 'occurredAt', progress.completed_at
    )
    from public.user_module_progress progress
    join public.modules module on module.id = progress.module_id
    join public.levels level on level.id = module.level_id
    where progress.user_id = current_user_id and progress.status in ('completed', 'mastered') and progress.completed_at is not null
    union all
    select progress.completed_at, jsonb_build_object(
      'id', level.id, 'type', 'level_emblem', 'title', level.cefr || ' ' || level.title,
      'subtitle', 'Level Emblem', 'occurredAt', progress.completed_at
    )
    from public.user_level_progress progress
    join public.levels level on level.id = progress.level_id
    where progress.user_id = current_user_id and progress.status in ('completed', 'mastered') and progress.completed_at is not null
  ) timeline;

  return jsonb_build_object(
    'achievements', achievement_items,
    'moduleSeals', module_seals,
    'levelEmblems', level_emblems,
    'timeline', timeline_items
  );
end;
$$;

revoke all on function public.get_achievements_overview() from public, anon;
grant execute on function public.get_achievements_overview() to authenticated;
