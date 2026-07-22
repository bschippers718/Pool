-- Pool closed-alpha schema. Run in the Supabase SQL editor.
-- Auth users are Clerk-managed; profiles.id stores the Clerk user id (text).

create table if not exists profiles (
  id text primary key,                 -- clerk user id
  handle text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists pools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null default '🌊',
  owner_id text not null references profiles(id),
  monthly_budget_cents int not null default 3000,
  status text not null default 'active' check (status in ('active', 'exhausted', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists pool_members (
  pool_id uuid not null references pools(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (pool_id, user_id)
);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  code text not null unique,
  created_by text not null references profiles(id),
  expires_at timestamptz,
  max_uses int not null default 20,
  uses int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  unique (pool_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  tier text check (tier in ('cheap', 'smart', 'image')),
  provider text,
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  estimated_cost_cents numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists usage_events (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  message_id uuid references messages(id) on delete set null,
  tier text not null check (tier in ('cheap', 'smart', 'image')),
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  actual_cost_cents numeric(10,4) not null default 0,
  estimated_retail_cents numeric(10,4) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists shared_moments (
  id uuid primary key default gen_random_uuid(),
  pool_id uuid not null references pools(id) on delete cascade,
  user_id text not null references profiles(id) on delete cascade,
  title text not null,
  response text not null,
  tier text not null check (tier in ('cheap', 'smart', 'image')),
  created_at timestamptz not null default now()
);

create index if not exists usage_events_pool_month on usage_events (pool_id, created_at);
create index if not exists usage_events_user_month on usage_events (pool_id, user_id, created_at);
create index if not exists messages_thread on messages (thread_id, created_at);
create index if not exists shared_moments_pool on shared_moments (pool_id, created_at desc);

-- Row level security ----------------------------------------------------------

alter table profiles enable row level security;
alter table pools enable row level security;
alter table pool_members enable row level security;
alter table invites enable row level security;
alter table chat_threads enable row level security;
alter table messages enable row level security;
alter table usage_events enable row level security;
alter table shared_moments enable row level security;

-- The client Supabase user id comes from the Clerk JWT template ("supabase").
-- request.jwt.claims -> 'sub' carries the Clerk user id.
create or replace function public.requesting_user_id() returns text
language sql stable as $$
  select coalesce(
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
    ''
  );
$$;

create policy "profiles self read" on profiles
  for select using (true); -- handles/avatars are pool-visible anyway
create policy "profiles self write" on profiles
  for all using (id = public.requesting_user_id())
  with check (id = public.requesting_user_id());

create policy "members read pool" on pools
  for select using (
    exists (
      select 1 from pool_members pm
      where pm.pool_id = id and pm.user_id = public.requesting_user_id()
    )
  );
create policy "owners update pool" on pools
  for update using (owner_id = public.requesting_user_id());
-- pool insert goes through the service role (owner must also insert membership atomically)

create policy "members read memberships" on pool_members
  for select using (
    user_id = public.requesting_user_id()
    or exists (
      select 1 from pool_members pm
      where pm.pool_id = pool_members.pool_id and pm.user_id = public.requesting_user_id()
    )
  );
-- membership writes go through the service role after invite validation

create policy "members read invites" on invites
  for select using (
    exists (
      select 1 from pool_members pm
      where pm.pool_id = invites.pool_id and pm.user_id = public.requesting_user_id()
    )
  );

create policy "own threads" on chat_threads
  for all using (user_id = public.requesting_user_id())
  with check (user_id = public.requesting_user_id());

create policy "own messages" on messages
  for all using (
    exists (
      select 1 from chat_threads ct
      where ct.id = thread_id and ct.user_id = public.requesting_user_id()
    )
  ) with check (
    exists (
      select 1 from chat_threads ct
      where ct.id = thread_id and ct.user_id = public.requesting_user_id()
    )
  );

create policy "members read pool usage" on usage_events
  for select using (
    exists (
      select 1 from pool_members pm
      where pm.pool_id = usage_events.pool_id and pm.user_id = public.requesting_user_id()
    )
  );
-- usage_events inserts go through the service role (gateway metering)

create policy "members read shared moments" on shared_moments
  for select using (
    exists (
      select 1 from pool_members pm
      where pm.pool_id = shared_moments.pool_id and pm.user_id = public.requesting_user_id()
    )
  );
create policy "own shares insert" on shared_moments
  for insert with check (user_id = public.requesting_user_id());
create policy "own shares delete" on shared_moments
  for delete using (user_id = public.requesting_user_id());
