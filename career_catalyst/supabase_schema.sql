-- CareerCatalyst Supabase Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

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
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📘',
  color TEXT DEFAULT 'brand-indigo',
  module_type TEXT DEFAULT 'learn',  -- learn, interview, practice
  roadmap JSONB NOT NULL DEFAULT '[]',  -- array of sections with topics/subtopics
  is_builtin BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

-- Generated content cache (all AI-generated content stored here)
CREATE TABLE IF NOT EXISTS generated_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
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
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, module)
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Streak data
CREATE TABLE IF NOT EXISTS streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT REFERENCES profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_modules_user ON modules(user_id);
CREATE INDEX IF NOT EXISTS idx_content_user_key ON generated_content(user_id, content_key);
CREATE INDEX IF NOT EXISTS idx_progress_user_module ON progress(user_id, module);

-- Row Level Security (RLS) — enable for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;

-- Policies: allow all operations for now (device-id based, no auth)
-- In production, use Supabase Auth and restrict to authenticated users

CREATE POLICY "Allow all for profiles" ON profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for modules" ON modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for generated_content" ON generated_content FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for progress" ON progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for settings" ON settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for streaks" ON streaks FOR ALL USING (true) WITH CHECK (true);
