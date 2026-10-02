-- Novyata MVP — PostgreSQL / Supabase
-- This script is safe to run on a new database and retains compatibility
-- migrations for the earliest MVP schema.

create extension if not exists pgcrypto;

-- 1. Tables and their current relationships.
create table if not exists users (
  id_user uuid primary key default gen_random_uuid(),
  first_name varchar(100) not null,
  last_name varchar(100) not null,
  email varchar(255) not null unique,
  password varchar(255) not null,
  plan varchar(20) not null default 'free',
  subscription_status varchar(40) not null default 'free',
  stripe_customer_id varchar(255),
  stripe_subscription_id varchar(255),
  current_period_end timestamptz,
  email_verified boolean not null default false,
  email_verification_token_hash varchar(255),
  email_verification_expires_at timestamptz,
  password_reset_token_hash varchar(255),
  password_reset_expires_at timestamptz,
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
  accent_color varchar(7) not null default '#314A67',
  font_size varchar(10) not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists cover_letters (
  id_cover_letter uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  id_resume uuid references resumes(id_resume) on delete set null,
  title varchar(160) not null,
  company_name varchar(160),
  job_title varchar(160),
  recipient_name varchar(160),
  recipient_position varchar(160),
  company_address varchar(500),
  subject varchar(255),
  content text not null,
  template varchar(50) not null default 'classic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists applications (
  id_application uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  id_resume uuid references resumes(id_resume) on delete set null,
  id_cover_letter uuid references cover_letters(id_cover_letter) on delete set null,
  id_job_analysis uuid,
  company_name varchar(160) not null,
  job_title varchar(160) not null,
  location varchar(160),
  job_url varchar(2048),
  salary varchar(100),
  status varchar(40) not null default 'À postuler',
  application_date date,
  contact_name varchar(160),
  contact_email varchar(255),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_status_check check (status in ('À postuler', 'Candidature envoyée', 'En cours d’étude', 'Entretien', 'Proposition', 'Refusée', 'Archivée'))
);

create table if not exists application_events (
  id_application_event uuid primary key default gen_random_uuid(),
  id_application uuid not null references applications(id_application) on delete cascade,
  type varchar(60) not null,
  title varchar(160) not null,
  description text,
  event_date timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists application_followups (
  id_followup uuid primary key default gen_random_uuid(),
  id_application uuid not null references applications(id_application) on delete cascade,
  type varchar(40) not null default 'Première relance',
  content text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interviews (
  id_interview uuid primary key default gen_random_uuid(),
  id_application uuid not null references applications(id_application) on delete cascade,
  interview_date timestamptz,
  interview_type varchar(100),
  people_met text,
  feeling varchar(100),
  questions_asked text,
  key_points text,
  next_steps text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists saved_answers (
  id_saved_answer uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  category varchar(100) not null,
  title varchar(160) not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists interview_sessions (
  id_interview_session uuid primary key default gen_random_uuid(),
  id_application uuid not null references applications(id_application) on delete cascade,
  id_user uuid not null references users(id_user) on delete cascade,
  status varchar(20) not null default 'in_progress' check (status in ('in_progress', 'completed')),
  exchanges jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists job_analyses (
  id_job_analysis uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  id_resume uuid not null references resumes(id_resume) on delete cascade,
  company_name varchar(160),
  job_title varchar(160),
  job_description text not null,
  match_score integer not null check (match_score between 0 and 100),
  analysis_result jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ai_usage (
  id_ai_usage uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  feature varchar(60) not null,
  period varchar(7) not null,
  count integer not null default 0 check (count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_usage_user_feature_period_unique unique (id_user, feature, period)
);

create table if not exists stripe_webhook_events (
  stripe_event_id varchar(255) primary key,
  event_type varchar(120) not null,
  processed_at timestamptz not null default now()
);

create table if not exists experiences (
  id_experience uuid primary key default gen_random_uuid(),
  id_resume uuid not null references resumes(id_resume) on delete cascade,
  job_title varchar(160) not null,
  company varchar(160) not null,
  city varchar(160),
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists educations (
  id_education uuid primary key default gen_random_uuid(),
  id_resume uuid not null references resumes(id_resume) on delete cascade,
  degree varchar(180) not null,
  school varchar(180) not null,
  city varchar(160),
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists skills (
  id_skill uuid primary key default gen_random_uuid(),
  id_resume uuid not null references resumes(id_resume) on delete cascade,
  name varchar(100) not null,
  level varchar(40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists languages (
  id_language uuid primary key default gen_random_uuid(),
  id_resume uuid not null references resumes(id_resume) on delete cascade,
  name varchar(100) not null,
  level varchar(40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Compatibility migrations for databases created with an earlier MVP schema.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'experiences' and column_name = 'id')
    and not exists (select 1 from information_schema.columns where table_name = 'experiences' and column_name = 'id_experience') then
    alter table experiences rename column id to id_experience;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'experiences' and column_name = 'resume_id')
    and not exists (select 1 from information_schema.columns where table_name = 'experiences' and column_name = 'id_resume') then
    alter table experiences rename column resume_id to id_resume;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'experiences' and column_name = 'position')
    and not exists (select 1 from information_schema.columns where table_name = 'experiences' and column_name = 'job_title') then
    alter table experiences rename column position to job_title;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'experiences' and column_name = 'location')
    and not exists (select 1 from information_schema.columns where table_name = 'experiences' and column_name = 'city') then
    alter table experiences rename column location to city;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'educations' and column_name = 'id')
    and not exists (select 1 from information_schema.columns where table_name = 'educations' and column_name = 'id_education') then
    alter table educations rename column id to id_education;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'educations' and column_name = 'resume_id')
    and not exists (select 1 from information_schema.columns where table_name = 'educations' and column_name = 'id_resume') then
    alter table educations rename column resume_id to id_resume;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'skills' and column_name = 'id')
    and not exists (select 1 from information_schema.columns where table_name = 'skills' and column_name = 'id_skill') then
    alter table skills rename column id to id_skill;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'skills' and column_name = 'resume_id')
    and not exists (select 1 from information_schema.columns where table_name = 'skills' and column_name = 'id_resume') then
    alter table skills rename column resume_id to id_resume;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'languages' and column_name = 'id')
    and not exists (select 1 from information_schema.columns where table_name = 'languages' and column_name = 'id_language') then
    alter table languages rename column id to id_language;
  end if;
  if exists (select 1 from information_schema.columns where table_name = 'languages' and column_name = 'resume_id')
    and not exists (select 1 from information_schema.columns where table_name = 'languages' and column_name = 'id_resume') then
    alter table languages rename column resume_id to id_resume;
  end if;
end;
$$;

alter table resumes
  add column if not exists template_key varchar(50) not null default 'classic',
  add column if not exists accent_color varchar(7) not null default '#314A67',
  add column if not exists font_size varchar(10) not null default 'normal';

alter table users
  add column if not exists plan varchar(20) not null default 'free',
  add column if not exists subscription_status varchar(40) not null default 'free',
  add column if not exists stripe_customer_id varchar(255),
  add column if not exists stripe_subscription_id varchar(255),
  add column if not exists current_period_end timestamptz,
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verification_token_hash varchar(255),
  add column if not exists email_verification_expires_at timestamptz,
  add column if not exists password_reset_token_hash varchar(255),
  add column if not exists password_reset_expires_at timestamptz;

alter table users add column if not exists job_search_preferences jsonb not null default '{}'::jsonb;
alter table interview_sessions add column if not exists status varchar(20) not null default 'in_progress';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'interview_sessions_status_check') then
    alter table interview_sessions add constraint interview_sessions_status_check check (status in ('in_progress', 'completed'));
  end if;
end $$;
alter table applications add column if not exists id_job_analysis uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'applications_job_analysis_fk') then
    alter table applications add constraint applications_job_analysis_fk foreign key (id_job_analysis) references job_analyses(id_job_analysis) on delete set null;
  end if;
end $$;

alter table experiences
  add column if not exists city varchar(160),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table educations
  add column if not exists city varchar(160),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table skills
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

alter table languages
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

-- 3. Indexes.
create index if not exists resumes_user_id_idx on resumes(id_user);
create index if not exists cover_letters_user_id_idx on cover_letters(id_user);
create index if not exists cover_letters_resume_id_idx on cover_letters(id_resume);
create index if not exists applications_user_id_idx on applications(id_user);
create index if not exists applications_status_idx on applications(status);
create index if not exists application_events_application_date_idx on application_events(id_application, event_date desc);
create index if not exists application_followups_application_idx on application_followups(id_application);
create index if not exists interviews_application_idx on interviews(id_application);
create index if not exists saved_answers_user_idx on saved_answers(id_user);
create index if not exists interview_sessions_application_idx on interview_sessions(id_application, updated_at desc);
create index if not exists job_analyses_user_id_idx on job_analyses(id_user);
create index if not exists job_analyses_resume_id_idx on job_analyses(id_resume);
create index if not exists experiences_resume_id_idx on experiences(id_resume);
create index if not exists educations_resume_id_idx on educations(id_resume);
create index if not exists skills_resume_id_idx on skills(id_resume);
create index if not exists languages_resume_id_idx on languages(id_resume);
create index if not exists ai_usage_user_period_idx on ai_usage(id_user, period);
create unique index if not exists users_stripe_customer_unique_idx on users(stripe_customer_id) where stripe_customer_id is not null;
create unique index if not exists users_stripe_subscription_unique_idx on users(stripe_subscription_id) where stripe_subscription_id is not null;

-- 4. Automatic update timestamps.
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
create trigger users_set_updated_at before update on users for each row execute function set_updated_at();

drop trigger if exists resumes_set_updated_at on resumes;
create trigger resumes_set_updated_at before update on resumes for each row execute function set_updated_at();

drop trigger if exists cover_letters_set_updated_at on cover_letters;
create trigger cover_letters_set_updated_at before update on cover_letters for each row execute function set_updated_at();

drop trigger if exists applications_set_updated_at on applications;
create trigger applications_set_updated_at before update on applications for each row execute function set_updated_at();

drop trigger if exists job_analyses_set_updated_at on job_analyses;
create trigger job_analyses_set_updated_at before update on job_analyses for each row execute function set_updated_at();

drop trigger if exists experiences_set_updated_at on experiences;
create trigger experiences_set_updated_at before update on experiences for each row execute function set_updated_at();

drop trigger if exists educations_set_updated_at on educations;
create trigger educations_set_updated_at before update on educations for each row execute function set_updated_at();

drop trigger if exists skills_set_updated_at on skills;
create trigger skills_set_updated_at before update on skills for each row execute function set_updated_at();

drop trigger if exists languages_set_updated_at on languages;
create trigger languages_set_updated_at before update on languages for each row execute function set_updated_at();

drop trigger if exists ai_usage_set_updated_at on ai_usage;
create trigger ai_usage_set_updated_at before update on ai_usage for each row execute function set_updated_at();

drop trigger if exists application_followups_set_updated_at on application_followups;
create trigger application_followups_set_updated_at before update on application_followups for each row execute function set_updated_at();
drop trigger if exists interviews_set_updated_at on interviews;
create trigger interviews_set_updated_at before update on interviews for each row execute function set_updated_at();
drop trigger if exists saved_answers_set_updated_at on saved_answers;
create trigger saved_answers_set_updated_at before update on saved_answers for each row execute function set_updated_at();
drop trigger if exists interview_sessions_set_updated_at on interview_sessions;
create trigger interview_sessions_set_updated_at before update on interview_sessions for each row execute function set_updated_at();
