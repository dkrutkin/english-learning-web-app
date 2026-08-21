# Fluent — English Learning Web App

Веб-приложение для последовательного изучения английского языка по маршруту **A2 → B1 → B2 → C1**. Репозиторий подготовлен как старт Phase 1 из технического задания.

## Что уже настроено

- React 19 + TypeScript + Vite;
- React Router со всеми основными URL из ТЗ;
- TanStack Query для server state;
- Supabase client с проверкой environment variables;
- Tailwind CSS 4 и отдельные CSS design tokens;
- светлая, тёмная и системная темы с сохранением выбора;
- responsive AppShell: desktop sidebar и mobile bottom navigation;
- стартовые экраны Landing, Auth, Onboarding, Home, Learn, Progress, Achievements, Profile, Settings и Lesson Runner;
- Level Orbit, Course Journey и базовые progress-компоненты;
- Supabase migration со схемой курса, пользовательским прогрессом, achievements, Storage buckets и RLS;
- Vitest + Testing Library;
- Oxlint + Prettier;
- директории для illustrations, icons и emblems.

Telegram-бот намеренно не входит в этот репозиторий: по ТЗ это отдельный продукт с отдельной базой и hosting.

## Требования

- Node.js 24 (версия зафиксирована в `.nvmrc`);
- npm 11+;
- Docker Desktop — только если нужен локальный Supabase;
- Supabase CLI уже установлен как dev dependency проекта.

## Первый запуск frontend

```bash
cd /Users/dmitrykrutkin/dev/english-learning-web-app
npm install
cp .env.example .env.local
npm run dev
```

После запуска приложение доступно по адресу `http://localhost:5173`.

Без заполненного `.env.local` интерфейс работает в демонстрационном режиме. Для Auth, данных и сохранения прогресса укажите публичные значения Supabase:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
VITE_ENABLE_MOCK_AUTH=false
```

Никогда не добавляйте во frontend `service_role`, secret key или пароль базы данных.

### Локальный demo-аккаунт

Для проверки интерфейса без создания пользователя в Supabase добавьте в локальный `.env`:

```dotenv
VITE_ENABLE_MOCK_AUTH=true
```

После перезапуска dev-сервера на форме входа появится кнопка `Continue with demo account`.
Нажмите её, чтобы открыть защищённые страницы без ввода данных. Мок доступен только в Vite
development mode и не включается в production-сборке. Он предназначен для проверки интерфейса
и маршрутов, но не проверяет Supabase, RLS или сохранение данных.

## Локальный Supabase

После запуска Docker Desktop:

```bash
npm run supabase:start
npm run supabase:reset
```

Миграция создаёт таблицы, индексы, триггеры, базовые CEFR levels, skills, achievements, Storage buckets и RLS policies.

Остановить локальные сервисы:

```bash
npm run supabase:stop
```

## Проверки

```bash
npm run typecheck
npm run lint
npm run test
npm run format:check
npm run build
```

## Основная структура

```text
src/
├── app/                  # providers и router
├── components/
│   ├── layout/           # AppShell, Sidebar, MobileNavigation
│   ├── progress/         # LevelOrbit
│   └── theme/            # ThemeToggle
├── features/
│   └── theme/            # theme state и persistence
├── lib/
│   └── supabase/         # browser-safe Supabase client
├── pages/                # route-level screens
├── styles/               # design tokens и responsive styles
└── test/                 # test setup

supabase/
├── config.toml
└── migrations/

public/
├── illustrations/
├── icons/
└── emblems/
```

## GitHub

Git-репозиторий уже инициализирован локально. После создания пустого репозитория на GitHub:

```bash
git remote add origin https://github.com/YOUR_ACCOUNT/english-learning-web-app.git
git push -u origin main
```

## Vercel

1. Импортируйте GitHub-репозиторий в Vercel.
2. Framework Preset: `Vite`.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.
5. Добавьте `VITE_SUPABASE_URL` и `VITE_SUPABASE_PUBLISHABLE_KEY` в Environment Variables.
6. Добавьте production URL Vercel в Supabase Auth → URL Configuration.

## Ближайший development scope

1. Подключить реальный Supabase project и применить migration.
2. Реализовать Auth и создание/обновление profile.
3. Загрузить `levels → modules → lessons → lesson_blocks` из Supabase.
4. Построить data-driven `ExerciseRenderer`.
5. Добавить autosave progress и агрегирование Module/Level progress.
6. Реализовать автоматическую выдачу achievements.
