-- Novyata MVP — PostgreSQL / Supabase
create extension if not exists pgcrypto;

create table if not exists users (
  id_user uuid primary key default gen_random_uuid(),
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  email varchar(255) not null unique,
  password varchar(255) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists resumes (
  id_resume uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  title_resume varchar(160) not null default 'Mon CV',
  job_title varchar(160),
  first_name varchar(100),
  last_name varchar(100),
  email varchar(255),
  phone varchar(32),
  city varchar(160),
  summary text,
  template_key varchar(50) not null default 'classic',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists experiences (
  id uuid primary key default gen_random_uuid(), resume_id uuid not null references resumes(id_resume) on delete cascade,
  position varchar(160) not null, company varchar(160) not null, location varchar(160), start_date date, end_date date,
  is_current boolean not null default false, description text, sort_order integer not null default 0
);
create table if not exists educations (
  id uuid primary key default gen_random_uuid(), resume_id uuid not null references resumes(id_resume) on delete cascade,
  school varchar(180) not null, degree varchar(180), field_of_study varchar(180), start_date date, end_date date, description text, sort_order integer not null default 0
);
create table if not exists skills (
  id uuid primary key default gen_random_uuid(), resume_id uuid not null references resumes(id_resume) on delete cascade,
  name varchar(100) not null, level varchar(40), sort_order integer not null default 0
);
create table if not exists languages (
  id uuid primary key default gen_random_uuid(), resume_id uuid not null references resumes(id_resume) on delete cascade,
  name varchar(100) not null, level varchar(40), sort_order integer not null default 0
);
create index if not exists resumes_user_id_idx on resumes(id_user);
create index if not exists experiences_resume_id_idx on experiences(resume_id);
create index if not exists educations_resume_id_idx on educations(resume_id);
create index if not exists skills_resume_id_idx on skills(resume_id);
create index if not exists languages_resume_id_idx on languages(resume_id);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at
before update on users
for each row execute function set_updated_at();

drop trigger if exists resumes_set_updated_at on resumes;
create trigger resumes_set_updated_at
before update on resumes
for each row execute function set_updated_at();
