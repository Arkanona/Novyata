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
  parent_resume_id uuid references resumes(id_resume) on delete set null,
  section_order jsonb not null default '["summary","experiences","educations","skills","languages"]'::jsonb,
  font_family varchar(40) not null default 'Inter',
  content_density varchar(20) not null default 'normal',
  section_spacing varchar(20) not null default 'normal',
  heading_style varchar(20) not null default 'line',
  divider_style varchar(20) not null default 'solid',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists resume_custom_sections (
  id_resume_section uuid primary key default gen_random_uuid(),
  id_resume uuid not null references resumes(id_resume) on delete cascade,
  section_type varchar(40) not null check (section_type in ('projects','certifications','volunteering','achievements','publications','portfolio','github','linkedin','interests')),
  title varchar(120) not null,
  content text not null,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists resume_versions (
  id_resume_version uuid primary key default gen_random_uuid(),
  id_resume uuid not null references resumes(id_resume) on delete cascade,
  id_user uuid not null references users(id_user) on delete cascade,
  version_label varchar(160) not null,
  reason varchar(160) not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public_profiles (
  id_public_profile uuid primary key default gen_random_uuid(),
  id_user uuid not null unique references users(id_user) on delete cascade,
  id_resume uuid references resumes(id_resume) on delete set null,
  slug varchar(60) not null unique,
  is_published boolean not null default false,
  visible_sections jsonb not null default '{"name":false,"job_title":false,"summary":false,"experiences":false,"educations":false,"skills":false,"languages":false,"custom_sections":false}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint public_profiles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint public_profiles_sections_object check (jsonb_typeof(visible_sections) = 'object')
);

create table if not exists resume_share_links (
  id_resume_share_link uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  id_resume uuid not null references resumes(id_resume) on delete cascade,
  token_hash varchar(64) not null unique,
  include_contact_details boolean not null default false,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists weekly_goals (
  id_weekly_goal uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  week_start date not null,
  is_enabled boolean not null default false,
  target_applications smallint not null default 5 check (target_applications between 1 and 50),
  target_followups smallint not null default 2 check (target_followups between 1 and 50),
  target_interviews smallint not null default 1 check (target_interviews between 1 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_goals_user_week_unique unique (id_user,week_start)
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

create table if not exists notifications (
  id_notification uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  id_application uuid not null references applications(id_application) on delete cascade,
  type varchar(40) not null,
  title varchar(160) not null,
  body varchar(500) not null,
  dedupe_key varchar(220) not null,
  scheduled_for timestamptz not null,
  is_read boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notifications_type_check check (type in ('interview_soon', 'no_response', 'next_action')),
  constraint notifications_user_dedupe_unique unique (id_user, dedupe_key)
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

create table if not exists resume_import_usage (
  id_resume_import_usage uuid primary key default gen_random_uuid(),
  id_user uuid not null references users(id_user) on delete cascade,
  period varchar(7) not null,
  import_count integer not null default 0 check (import_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resume_import_usage_user_period_unique unique (id_user, period),
  constraint resume_import_usage_period_check check (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
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
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check check (type in ('interview_soon', 'no_response', 'next_action'));

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
  add column if not exists font_size varchar(10) not null default 'normal',
  add column if not exists parent_resume_id uuid references resumes(id_resume) on delete set null,
  add column if not exists section_order jsonb not null default '["summary","experiences","educations","skills","languages"]'::jsonb,
  add column if not exists font_family varchar(40) not null default 'Inter',
  add column if not exists content_density varchar(20) not null default 'normal',
  add column if not exists section_spacing varchar(20) not null default 'normal',
  add column if not exists heading_style varchar(20) not null default 'line',
  add column if not exists divider_style varchar(20) not null default 'solid';

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
create index if not exists resumes_parent_idx on resumes(parent_resume_id) where parent_resume_id is not null;
create index if not exists resume_versions_resume_created_idx on resume_versions(id_resume, created_at desc);
create index if not exists resume_versions_user_idx on resume_versions(id_user, created_at desc);
create index if not exists public_profiles_published_slug_idx on public_profiles(slug) where is_published = true;
create index if not exists resume_share_links_active_idx on resume_share_links(id_user,id_resume,created_at desc) where revoked_at is null;
create index if not exists weekly_goals_user_week_idx on weekly_goals(id_user,week_start desc);
create index if not exists resume_custom_sections_resume_order_idx on resume_custom_sections(id_resume, display_order, created_at);
create index if not exists cover_letters_user_id_idx on cover_letters(id_user);
create index if not exists cover_letters_resume_id_idx on cover_letters(id_resume);
create index if not exists applications_user_id_idx on applications(id_user);
create index if not exists applications_status_idx on applications(status);
create index if not exists application_events_application_date_idx on application_events(id_application, event_date desc);
create index if not exists application_followups_application_idx on application_followups(id_application);
create index if not exists interviews_application_idx on interviews(id_application);
create index if not exists saved_answers_user_idx on saved_answers(id_user);
create index if not exists interview_sessions_application_idx on interview_sessions(id_application, updated_at desc);
create index if not exists notifications_user_active_idx on notifications(id_user, is_read, scheduled_for desc) where archived_at is null;
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

create or replace function build_resume_snapshot(p_resume_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'resume', jsonb_build_object(
      'title_resume', r.title_resume, 'job_title', r.job_title,
      'first_name', r.first_name, 'last_name', r.last_name,
      'email', r.email, 'phone', r.phone, 'city', r.city, 'summary', r.summary,
      'template_key', r.template_key, 'accent_color', r.accent_color, 'font_size', r.font_size,
      'font_family', r.font_family, 'content_density', r.content_density,
      'section_spacing', r.section_spacing, 'heading_style', r.heading_style,
      'divider_style', r.divider_style, 'section_order', r.section_order
    ),
    'experiences', coalesce((select jsonb_agg(jsonb_build_object(
      'job_title', x.job_title, 'company', x.company, 'city', x.city,
      'start_date', x.start_date, 'end_date', x.end_date, 'is_current', x.is_current, 'description', x.description
    ) order by x.start_date desc nulls last, x.created_at desc) from experiences x where x.id_resume = r.id_resume), '[]'::jsonb),
    'educations', coalesce((select jsonb_agg(jsonb_build_object(
      'degree', e.degree, 'school', e.school, 'city', e.city,
      'start_date', e.start_date, 'end_date', e.end_date, 'description', e.description
    ) order by e.start_date desc nulls last, e.created_at desc) from educations e where e.id_resume = r.id_resume), '[]'::jsonb),
    'skills', coalesce((select jsonb_agg(jsonb_build_object('name', s.name, 'level', s.level) order by s.created_at, s.name) from skills s where s.id_resume = r.id_resume), '[]'::jsonb),
    'languages', coalesce((select jsonb_agg(jsonb_build_object('name', l.name, 'level', l.level) order by l.created_at, l.name) from languages l where l.id_resume = r.id_resume), '[]'::jsonb),
    'custom_sections', coalesce((select jsonb_agg(jsonb_build_object(
      'section_type', c.section_type, 'title', c.title, 'content', c.content, 'display_order', c.display_order
    ) order by c.display_order, c.created_at) from resume_custom_sections c where c.id_resume = r.id_resume), '[]'::jsonb)
  ) from resumes r where r.id_resume = p_resume_id;
$$;

create or replace function capture_resume_version(p_resume_id uuid, p_user_id uuid, p_reason varchar default 'Modification du CV')
returns uuid
language plpgsql
as $$
declare
  snapshot_value jsonb;
  previous_snapshot jsonb;
  version_id uuid;
begin
  if not exists (select 1 from resumes r join users u on u.id_user = r.id_user where r.id_resume = p_resume_id and r.id_user = p_user_id and u.plan = 'pro') then
    return null;
  end if;
  snapshot_value := build_resume_snapshot(p_resume_id);
  select v.snapshot into previous_snapshot from resume_versions v where v.id_resume = p_resume_id order by v.created_at desc, v.id_resume_version desc limit 1;
  if previous_snapshot is not null and previous_snapshot = snapshot_value then return null; end if;
  insert into resume_versions (id_resume, id_user, version_label, reason, snapshot)
  values (p_resume_id, p_user_id, 'Version du ' || to_char(clock_timestamp(), 'DD/MM/YYYY HH24:MI'), coalesce(nullif(p_reason, ''), 'Modification du CV'), snapshot_value)
  returning id_resume_version into version_id;
  return version_id;
end;
$$;

create or replace function capture_resume_version_after_change()
returns trigger
language plpgsql
as $$
declare
  resume_id uuid;
  owner_id uuid;
  reason_text varchar(160);
begin
  if current_setting('novyata.skip_resume_version_capture', true) = 'on' then return null; end if;
  if tg_table_name = 'resumes' then
    resume_id := case when tg_op = 'DELETE' then old.id_resume else new.id_resume end;
  else
    resume_id := case when tg_op = 'DELETE' then old.id_resume else new.id_resume end;
  end if;
  select r.id_user into owner_id from resumes r where r.id_resume = resume_id;
  if owner_id is null then return null; end if;
  reason_text := case
    when tg_table_name = 'resumes' and tg_op = 'INSERT' then 'Version initiale'
    when tg_table_name = 'resumes' then 'Mise à jour des informations et de l’apparence'
    when tg_table_name = 'experiences' then case when tg_op = 'INSERT' then 'Expérience ajoutée' when tg_op = 'DELETE' then 'Expérience supprimée' else 'Expérience modifiée' end
    when tg_table_name = 'educations' then case when tg_op = 'INSERT' then 'Formation ajoutée' when tg_op = 'DELETE' then 'Formation supprimée' else 'Formation modifiée' end
    when tg_table_name = 'skills' then case when tg_op = 'INSERT' then 'Compétence ajoutée' when tg_op = 'DELETE' then 'Compétence supprimée' else 'Compétence modifiée' end
    when tg_table_name = 'languages' then case when tg_op = 'INSERT' then 'Langue ajoutée' when tg_op = 'DELETE' then 'Langue supprimée' else 'Langue modifiée' end
    else case when tg_op = 'INSERT' then 'Section ajoutée' when tg_op = 'DELETE' then 'Section supprimée' else 'Section modifiée' end
  end;
  perform capture_resume_version(resume_id, owner_id, reason_text);
  return null;
end;
$$;

drop trigger if exists users_set_updated_at on users;
create trigger users_set_updated_at before update on users for each row execute function set_updated_at();

drop trigger if exists resumes_set_updated_at on resumes;
create trigger resumes_set_updated_at before update on resumes for each row execute function set_updated_at();
drop trigger if exists public_profiles_set_updated_at on public_profiles;
create trigger public_profiles_set_updated_at before update on public_profiles for each row execute function set_updated_at();
drop trigger if exists weekly_goals_set_updated_at on weekly_goals;
create trigger weekly_goals_set_updated_at before update on weekly_goals for each row execute function set_updated_at();
drop trigger if exists resumes_capture_version on resumes;
create trigger resumes_capture_version after insert or update on resumes for each row execute function capture_resume_version_after_change();
drop trigger if exists experiences_capture_version on experiences;
create trigger experiences_capture_version after insert or update or delete on experiences for each row execute function capture_resume_version_after_change();
drop trigger if exists educations_capture_version on educations;
create trigger educations_capture_version after insert or update or delete on educations for each row execute function capture_resume_version_after_change();
drop trigger if exists skills_capture_version on skills;
create trigger skills_capture_version after insert or update or delete on skills for each row execute function capture_resume_version_after_change();
drop trigger if exists languages_capture_version on languages;
create trigger languages_capture_version after insert or update or delete on languages for each row execute function capture_resume_version_after_change();
drop trigger if exists resume_custom_sections_capture_version on resume_custom_sections;
create trigger resume_custom_sections_capture_version after insert or update or delete on resume_custom_sections for each row execute function capture_resume_version_after_change();
drop trigger if exists resume_custom_sections_set_updated_at on resume_custom_sections;
create trigger resume_custom_sections_set_updated_at before update on resume_custom_sections for each row execute function set_updated_at();

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

drop trigger if exists resume_import_usage_set_updated_at on resume_import_usage;
create trigger resume_import_usage_set_updated_at before update on resume_import_usage for each row execute function set_updated_at();

drop trigger if exists application_followups_set_updated_at on application_followups;
create trigger application_followups_set_updated_at before update on application_followups for each row execute function set_updated_at();
drop trigger if exists interviews_set_updated_at on interviews;
create trigger interviews_set_updated_at before update on interviews for each row execute function set_updated_at();
drop trigger if exists saved_answers_set_updated_at on saved_answers;
create trigger saved_answers_set_updated_at before update on saved_answers for each row execute function set_updated_at();
drop trigger if exists interview_sessions_set_updated_at on interview_sessions;
create trigger interview_sessions_set_updated_at before update on interview_sessions for each row execute function set_updated_at();
drop trigger if exists notifications_set_updated_at on notifications;
create trigger notifications_set_updated_at before update on notifications for each row execute function set_updated_at();
