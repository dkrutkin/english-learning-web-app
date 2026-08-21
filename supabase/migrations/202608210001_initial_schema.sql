create extension if not exists pgcrypto;

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.learning_progress_status as enum ('not_started', 'in_progress', 'completed');
create type public.course_progress_status as enum ('locked', 'available', 'in_progress', 'completed', 'mastered');

create table public.levels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  cefr text not null unique check (cefr in ('A2', 'B1', 'B2', 'C1')),
  title text not null,
  description text not null default '',
  order_index integer not null unique check (order_index > 0),
  illustration_url text,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  current_level_id uuid references public.levels(id) on delete set null,
  learning_goal text check (learning_goal in ('everyday', 'career', 'travel', 'study', 'general')),
  weekly_goal smallint not null default 5 check (weekly_goal in (3, 4, 5, 7)),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  show_translations boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  learning_outcome text not null default '',
  illustration_url text,
  icon text,
  order_index integer not null check (order_index > 0),
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  is_required boolean not null default true,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level_id, slug),
  unique (level_id, order_index)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  order_index integer not null check (order_index > 0),
  estimated_minutes integer not null default 0 check (estimated_minutes >= 0),
  is_required boolean not null default true,
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug),
  unique (module_id, order_index)
);

create table public.lesson_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  type text not null check (type in ('intro', 'text', 'grammar', 'vocabulary', 'example', 'single_choice', 'multiple_choice', 'fill_gap', 'matching', 'sentence_builder', 'reading', 'reading_question', 'listening', 'listening_question', 'writing_prompt', 'speaking_prompt', 'info', 'summary', 'quiz')),
  title text,
  content jsonb not null default '{}'::jsonb,
  order_index integer not null check (order_index > 0),
  is_required boolean not null default true,
  is_graded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lesson_id, order_index)
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null
);

create table public.lesson_skills (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  weight numeric(5, 2) not null default 1 check (weight > 0),
  primary key (lesson_id, skill_id)
);

create table public.user_lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  status public.learning_progress_status not null default 'not_started',
  current_block_id uuid references public.lesson_blocks(id) on delete set null,
  completion_percent numeric(5, 2) not null default 0 check (completion_percent between 0 and 100),
  accuracy_percent numeric(5, 2) check (accuracy_percent between 0 and 100),
  started_at timestamptz,
  last_activity_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create table public.exercise_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  block_id uuid not null references public.lesson_blocks(id) on delete cascade,
  answer jsonb not null default '{}'::jsonb,
  score numeric(8, 2) not null default 0,
  max_score numeric(8, 2) not null default 0 check (max_score >= 0),
  is_correct boolean,
  used_hint boolean not null default false,
  attempt_number integer not null default 1 check (attempt_number > 0),
  created_at timestamptz not null default now(),
  unique (user_id, block_id, attempt_number)
);

create table public.user_module_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  completion_percent numeric(5, 2) not null default 0 check (completion_percent between 0 and 100),
  average_accuracy numeric(5, 2) check (average_accuracy between 0 and 100),
  assessment_score numeric(5, 2) check (assessment_score between 0 and 100),
  status public.course_progress_status not null default 'locked',
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

create table public.user_level_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  level_id uuid not null references public.levels(id) on delete cascade,
  completion_percent numeric(5, 2) not null default 0 check (completion_percent between 0 and 100),
  average_accuracy numeric(5, 2) check (average_accuracy between 0 and 100),
  assessment_score numeric(5, 2) check (assessment_score between 0 and 100),
  status public.course_progress_status not null default 'locked',
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, level_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null,
  category text not null check (category in ('progress', 'consistency', 'accuracy', 'exploration', 'mastery')),
  icon text not null,
  condition_type text not null,
  condition_value jsonb not null default '{}'::jsonb,
  order_index integer not null unique,
  is_active boolean not null default true
);

create table public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_id)
);

create table public.user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_date date not null default current_date,
  lesson_blocks_completed integer not null default 0 check (lesson_blocks_completed >= 0),
  lessons_completed integer not null default 0 check (lessons_completed >= 0),
  minutes_active integer not null default 0 check (minutes_active >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

create table public.user_skill_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  attempts integer not null default 0 check (attempts >= 0),
  earned_points numeric(10, 2) not null default 0,
  possible_points numeric(10, 2) not null default 0 check (possible_points >= 0),
  performance_percent numeric(5, 2) check (performance_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create index modules_level_order_idx on public.modules(level_id, order_index);
create index lessons_module_order_idx on public.lessons(module_id, order_index);
create index lesson_blocks_lesson_order_idx on public.lesson_blocks(lesson_id, order_index);
create index user_lesson_progress_user_idx on public.user_lesson_progress(user_id, last_activity_at desc);
create index exercise_attempts_user_lesson_idx on public.exercise_attempts(user_id, lesson_id, created_at desc);
create index user_activity_user_date_idx on public.user_activity(user_id, activity_date desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger levels_set_updated_at before update on public.levels for each row execute function public.set_updated_at();
create trigger modules_set_updated_at before update on public.modules for each row execute function public.set_updated_at();
create trigger lessons_set_updated_at before update on public.lessons for each row execute function public.set_updated_at();
create trigger lesson_blocks_set_updated_at before update on public.lesson_blocks for each row execute function public.set_updated_at();
create trigger user_lesson_progress_set_updated_at before update on public.user_lesson_progress for each row execute function public.set_updated_at();
create trigger user_module_progress_set_updated_at before update on public.user_module_progress for each row execute function public.set_updated_at();
create trigger user_level_progress_set_updated_at before update on public.user_level_progress for each row execute function public.set_updated_at();
create trigger user_activity_set_updated_at before update on public.user_activity for each row execute function public.set_updated_at();
create trigger user_skill_stats_set_updated_at before update on public.user_skill_stats for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.levels enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_blocks enable row level security;
alter table public.skills enable row level security;
alter table public.lesson_skills enable row level security;
alter table public.user_lesson_progress enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.user_module_progress enable row level security;
alter table public.user_level_progress enable row level security;
alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_activity enable row level security;
alter table public.user_skill_stats enable row level security;

create policy "Users read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Authenticated users read published levels" on public.levels for select to authenticated using (status = 'published');
create policy "Authenticated users read published modules" on public.modules for select to authenticated using (status = 'published');
create policy "Authenticated users read published lessons" on public.lessons for select to authenticated using (status = 'published');
create policy "Authenticated users read blocks from published lessons" on public.lesson_blocks for select to authenticated using (exists (select 1 from public.lessons where lessons.id = lesson_blocks.lesson_id and lessons.status = 'published'));
create policy "Authenticated users read skills" on public.skills for select to authenticated using (true);
create policy "Authenticated users read lesson skills" on public.lesson_skills for select to authenticated using (true);
create policy "Authenticated users read active achievements" on public.achievements for select to authenticated using (is_active);

create policy "Users manage own lesson progress" on public.user_lesson_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own attempts" on public.exercise_attempts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own module progress" on public.user_module_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own level progress" on public.user_level_progress for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users read own achievements" on public.user_achievements for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users manage own activity" on public.user_activity for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Users manage own skill stats" on public.user_skill_stats for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

insert into public.skills (slug, name) values
  ('vocabulary', 'Vocabulary'), ('grammar', 'Grammar'), ('reading', 'Reading'),
  ('listening', 'Listening'), ('writing', 'Writing'), ('speaking', 'Speaking');

insert into public.levels (slug, cefr, title, description, order_index, status) values
  ('a2', 'A2', 'Foundations', 'Build essential grammar, vocabulary and everyday communication skills.', 1, 'published'),
  ('b1', 'B1', 'Independent English', 'Communicate confidently about work, travel, experiences and everyday life.', 2, 'published'),
  ('b2', 'B2', 'Confident English', 'Handle complex conversations, professional situations and detailed ideas.', 3, 'draft'),
  ('c1', 'C1', 'Advanced English', 'Understand nuance and express complex ideas naturally and precisely.', 4, 'draft');

insert into public.achievements (slug, title, description, category, icon, condition_type, condition_value, order_index) values
  ('first-step', 'First Step', 'Complete your first lesson.', 'progress', 'sparkles', 'lessons_completed', '{"minimum": 1}', 1),
  ('getting-started', 'Getting Started', 'Complete five lessons.', 'progress', 'book-open', 'lessons_completed', '{"minimum": 5}', 2),
  ('first-module', 'First Module', 'Complete your first module.', 'progress', 'check-circle', 'modules_completed', '{"minimum": 1}', 3),
  ('consistent-week', 'Consistent Week', 'Study on seven consecutive days.', 'consistency', 'flame', 'streak_days', '{"minimum": 7}', 4),
  ('perfect-lesson', 'Perfect Lesson', 'Score 100% on a lesson quiz.', 'accuracy', 'target', 'lesson_accuracy', '{"minimum": 100}', 5),
  ('level-complete', 'Level Complete', 'Complete all required modules of one CEFR level.', 'mastery', 'award', 'levels_completed', '{"minimum": 1}', 6);

insert into storage.buckets (id, name, public) values
  ('lesson-audio', 'lesson-audio', false),
  ('lesson-images', 'lesson-images', false),
  ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy "Authenticated users read lesson audio" on storage.objects for select to authenticated using (bucket_id = 'lesson-audio');
create policy "Authenticated users read lesson images" on storage.objects for select to authenticated using (bucket_id = 'lesson-images');
create policy "Users read own avatar" on storage.objects for select to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users upload own avatar" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update own avatar" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text) with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own avatar" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
