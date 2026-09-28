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
  accent_color varchar(7) not null default '#314A67',
  font_size varchar(10) not null default 'normal',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table resumes add column if not exists accent_color varchar(7) not null default '#314A67', add column if not exists font_size varchar(10) not null default 'normal';
create table if not exists experiences (
  id_experience uuid primary key default gen_random_uuid(), id_resume uuid not null references resumes(id_resume) on delete cascade,
  job_title varchar(160) not null, company varchar(160) not null, city varchar(160), start_date date, end_date date,
  is_current boolean not null default false, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists educations (
  id_education uuid primary key default gen_random_uuid(), id_resume uuid not null references resumes(id_resume) on delete cascade,
  degree varchar(180) not null, school varchar(180) not null, city varchar(160), start_date date, end_date date, description text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Compatibility migration for the first MVP schema.
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
end;
$$;

alter table experiences add column if not exists city varchar(160), add column if not exists created_at timestamptz not null default now(), add column if not exists updated_at timestamptz not null default now();
alter table educations add column if not exists city varchar(160), add column if not exists created_at timestamptz not null default now(), add column if not exists updated_at timestamptz not null default now();
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'skills' and column_name = 'id') and not exists (select 1 from information_schema.columns where table_name = 'skills' and column_name = 'id_skill') then alter table skills rename column id to id_skill; end if;
  if exists (select 1 from information_schema.columns where table_name = 'skills' and column_name = 'resume_id') and not exists (select 1 from information_schema.columns where table_name = 'skills' and column_name = 'id_resume') then alter table skills rename column resume_id to id_resume; end if;
  if exists (select 1 from information_schema.columns where table_name = 'languages' and column_name = 'id') and not exists (select 1 from information_schema.columns where table_name = 'languages' and column_name = 'id_language') then alter table languages rename column id to id_language; end if;
  if exists (select 1 from information_schema.columns where table_name = 'languages' and column_name = 'resume_id') and not exists (select 1 from information_schema.columns where table_name = 'languages' and column_name = 'id_resume') then alter table languages rename column resume_id to id_resume; end if;
end;
$$;
alter table skills add column if not exists created_at timestamptz not null default now(), add column if not exists updated_at timestamptz not null default now();
alter table languages add column if not exists created_at timestamptz not null default now(), add column if not exists updated_at timestamptz not null default now();
create table if not exists skills (
  id_skill uuid primary key default gen_random_uuid(), id_resume uuid not null references resumes(id_resume) on delete cascade,
  name varchar(100) not null, level varchar(40), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists languages (
  id_language uuid primary key default gen_random_uuid(), id_resume uuid not null references resumes(id_resume) on delete cascade,
  name varchar(100) not null, level varchar(40), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists resumes_user_id_idx on resumes(id_user);
create index if not exists experiences_resume_id_idx on experiences(id_resume);
create index if not exists educations_resume_id_idx on educations(id_resume);
create index if not exists skills_resume_id_idx on skills(id_resume);
create index if not exists languages_resume_id_idx on languages(id_resume);

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

drop trigger if exists experiences_set_updated_at on experiences;
create trigger experiences_set_updated_at
before update on experiences
for each row execute function set_updated_at();

drop trigger if exists educations_set_updated_at on educations;
create trigger educations_set_updated_at
before update on educations
for each row execute function set_updated_at();

drop trigger if exists skills_set_updated_at on skills;
create trigger skills_set_updated_at before update on skills for each row execute function set_updated_at();
drop trigger if exists languages_set_updated_at on languages;
create trigger languages_set_updated_at before update on languages for each row execute function set_updated_at();
