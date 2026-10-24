create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 60),
  truth_target integer not null default 500 check (truth_target >= 0),
  dare_target integer not null default 500 check (dare_target >= 0),
  created_at timestamptz not null default now()
);

create unique index if not exists topics_name_case_insensitive_uidx
  on public.topics (lower(name));

insert into public.topics (name)
select topic.name
from (values
  ('Dating and Relationships'),
  ('Funny and Silly'),
  ('Sports and Fitness'),
  ('Education'),
  ('Friends'),
  ('Movies & Entertainment'),
  ('Couples'),
  ('Party Night'),
  ('Night Out'),
  ('Risky Texts'),
  ('Football'),
  ('All')
) as topic(name)
where not exists (
  select 1 from public.topics existing where lower(existing.name) = lower(topic.name)
);

create table if not exists public.prompts (
  id uuid primary key default gen_random_uuid(),
  topic text not null check (
    topic in (
      'Dating and Relationships',
      'Funny and Silly',
      'Sports and Fitness',
      'Education',
      'Friends',
      'Movies & Entertainment',
      'Couples',
      'Party Night',
      'Night Out',
      'Risky Texts',
      'Football',
      'All'
    )
  ),
  kind text not null check (kind in ('truth', 'dare')),
  adult boolean not null default false,
  prompt text not null check (char_length(prompt) between 5 and 500),
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompts_feed_idx
  on public.prompts (enabled, adult, kind, topic);

create unique index if not exists prompts_unique_content_idx
  on public.prompts (topic, kind, adult, prompt);

create or replace function public.set_prompt_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prompts_updated_at on public.prompts;
create trigger prompts_updated_at
before update on public.prompts
for each row
execute function public.set_prompt_updated_at();

alter table public.prompts enable row level security;

revoke all on table public.prompts from anon, authenticated;
grant all on table public.prompts to service_role;

alter table public.prompts drop constraint if exists prompts_topic_check;
alter table public.prompts drop constraint if exists prompts_topic_fkey;
alter table public.prompts
  add constraint prompts_topic_fkey
  foreign key (topic) references public.topics(name) on delete cascade;

alter table public.topics enable row level security;
revoke all on table public.topics from anon, authenticated;
grant all on table public.topics to service_role;

create or replace function public.delete_topic_and_prompts(topic_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  topic_name text;
  deleted_prompts integer;
begin
  select name into topic_name
  from public.topics
  where id = topic_id and name <> 'All'
  for update;

  if topic_name is null then
    return null;
  end if;

  select count(*) into deleted_prompts
  from public.prompts
  where topic = topic_name;

  delete from public.topics where id = topic_id;

  return jsonb_build_object(
    'deleted_topic', topic_name,
    'deleted_prompts', deleted_prompts
  );
end;
$$;

revoke all on function public.delete_topic_and_prompts(uuid) from public, anon, authenticated;
grant execute on function public.delete_topic_and_prompts(uuid) to service_role;
