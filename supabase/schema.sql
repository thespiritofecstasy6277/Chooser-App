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
