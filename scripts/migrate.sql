-- repo-summary-ja: 初期スキーマ
-- 適用方法: psql "$POSTGRES_URL" -f scripts/migrate.sql

create extension if not exists pgcrypto;

create table if not exists repos (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  name text not null,
  full_name text generated always as (owner || '/' || name) stored,
  description text,
  stars int,
  forks int,
  license text,
  primary_language text,
  last_commit_at timestamptz,
  topics text[],
  is_archived boolean default false,       -- 404/削除/rename検知用
  -- Claude要約結果
  summary_ja text,          -- 3行要約
  use_case_ja text,         -- 何に使うか
  target_user_ja text,      -- 想定ユーザー
  alternative_to text,      -- 何のOSSの代替か（該当なければnull）
  category text,            -- 固定リストから選択
  raw_readme_excerpt text,  -- デバッグ・再要約用
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  stars_updated_at timestamptz
);
create unique index if not exists repos_owner_name_idx on repos (owner, name);
create index if not exists repos_stars_idx on repos (stars desc);
create index if not exists repos_category_idx on repos (category);
create index if not exists repos_stars_updated_at_idx on repos (stars_updated_at asc nulls first);

create table if not exists search_logs (
  id uuid primary key default gen_random_uuid(),
  ip_hash text,
  full_name text,
  created_at timestamptz default now()
);
create index if not exists search_logs_ip_hash_created_at_idx on search_logs (ip_hash, created_at desc);
