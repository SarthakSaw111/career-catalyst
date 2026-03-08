-- CareerCatalyst Supabase Schema v2 (with Supabase Auth)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- 
-- IMPORTANT: This schema uses Supabase Auth. Users sign up with email/password.
-- The user_id references auth.users.id (UUID).

-- -- Drop old permissive policies if upgrading from v1
-- DO $$ BEGIN
--   DROP POLICY IF EXISTS "Allow all for profiles" ON profiles;
--   DROP POLICY IF EXISTS "Allow all for modules" ON modules;
--   DROP POLICY IF EXISTS "Allow all for generated_content" ON generated_content;
--   DROP POLICY IF EXISTS "Allow all for progress" ON progress;
--   DROP POLICY IF EXISTS "Allow all for settings" ON settings;
--   DROP POLICY IF EXISTS "Allow all for streaks" ON streaks;
-- EXCEPTION WHEN undefined_table THEN NULL;
-- END $$;

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT DEFAULT 'User',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modules (both built-in and user-created learning modules)
CREATE TABLE IF NOT EXISTS modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📘',
  color TEXT DEFAULT 'brand-indigo',
  module_type TEXT DEFAULT 'learn',
  roadmap JSONB NOT NULL DEFAULT '[]',
  is_builtin BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Generated content cache
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_key TEXT NOT NULL,
  content TEXT NOT NULL,
  module TEXT,
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, content_key)
);

-- Progress tracking per module
CREATE TABLE IF NOT EXISTS progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  module TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module)
);

-- Settings (includes API keys, preferences — persists across cache clears)
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Streak data
CREATE TABLE IF NOT EXISTS streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Token usage tracking (per-call log + daily aggregates)
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  model TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  thinking_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  call_count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, model)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_modules_user ON modules(user_id);
CREATE INDEX IF NOT EXISTS idx_content_user_key ON generated_content(user_id, content_key);
CREATE INDEX IF NOT EXISTS idx_progress_user_module ON progress(user_id, module);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_date ON token_usage(user_id, date);

-- Row Level Security (RLS) — enable for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;

-- Auth-based RLS: users can only access their own data
-- auth.uid()::text matches user_id stored as TEXT

CREATE POLICY "Users manage own profile"
  ON profiles FOR ALL
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

CREATE POLICY "Users manage own modules"
  ON modules FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users manage own content"
  ON generated_content FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users manage own progress"
  ON progress FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users manage own settings"
  ON settings FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users manage own streaks"
  ON streaks FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users manage own token_usage"
  ON token_usage FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
