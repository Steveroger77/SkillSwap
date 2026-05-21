-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  SkillSwap — Complete Production Schema                         ║
-- ║  Run in: Supabase Dashboard → SQL Editor                        ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Enable extensions
create extension if not exists "pgcrypto";

-- ── TABLES ───────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null default '',
  username    text unique not null,
  email       text default '',
  bio         text default '',
  avatar_url  text,
  location    text default 'Remote',
  created_at  timestamptz default now()
);

create table if not exists public.skills (
  id       uuid primary key default gen_random_uuid(),
  name     text unique not null,
  category text default 'General'
);

create table if not exists public.user_skills (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references public.profiles(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  type     text not null check (type in ('know','learn')),
  unique(user_id, skill_id, type)
);

create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  caption    text default '',
  location   text default 'Remote',
  created_at timestamptz default now()
);

create table if not exists public.post_media (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  media_url  text not null,
  media_type text not null default 'image' check (media_type in ('image','video'))
);

create table if not exists public.post_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  parent_id  uuid references public.comments(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.swap_requests (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid not null references public.profiles(id) on delete cascade,
  to_user    uuid not null references public.profiles(id) on delete cascade,
  skill_id   uuid references public.skills(id) on delete set null,
  status     text not null default 'pending' check (status in ('pending','accepted','rejected')),
  created_at timestamptz default now()
);

create table if not exists public.chats (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists public.chat_participants (
  chat_id uuid not null references public.chats(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (chat_id, user_id)
);

create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  chat_id        uuid not null references public.chats(id) on delete cascade,
  sender_id      uuid not null references public.profiles(id) on delete cascade,
  content        text not null,
  attachment_url text,
  created_at     timestamptz default now(),
  edited_at      timestamptz
);

-- ── INDEXES ─────────────────────────────────────────────────────────────────
create index if not exists idx_posts_created  on public.posts(created_at desc);
create index if not exists idx_posts_user     on public.posts(user_id);
create index if not exists idx_likes_post     on public.post_likes(post_id);
create index if not exists idx_likes_user     on public.post_likes(user_id);
create index if not exists idx_saved_user     on public.saved_posts(user_id);
create index if not exists idx_comments_post  on public.comments(post_id);
create index if not exists idx_messages_chat  on public.messages(chat_id);
create index if not exists idx_messages_time  on public.messages(created_at asc);
create index if not exists idx_swap_from      on public.swap_requests(from_user);
create index if not exists idx_swap_to        on public.swap_requests(to_user);
create index if not exists idx_skills_user    on public.user_skills(user_id);
create index if not exists idx_profiles_user  on public.profiles(username);

-- ── AUTO-CREATE PROFILE ON SIGNUP ────────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _name     text;
  _username text;
  _base     text;
  _counter  int := 0;
  _try      text;
begin
  _name := coalesce(
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1),
    'User'
  );
  _base := lower(regexp_replace(
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'user'),
    '[^a-z0-9_.]', '', 'g'
  ));
  if length(_base) < 2 then _base := 'user'; end if;
  _try := _base;
  -- ensure unique username
  loop
    exit when not exists (select 1 from public.profiles where username = _try);
    _counter := _counter + 1;
    _try := _base || _counter::text;
  end loop;

  insert into public.profiles (id, name, username, email, avatar_url)
  values (
    new.id, _name, _try, coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.profiles          enable row level security;
alter table public.skills            enable row level security;
alter table public.user_skills       enable row level security;
alter table public.posts             enable row level security;
alter table public.post_media        enable row level security;
alter table public.post_likes        enable row level security;
alter table public.saved_posts       enable row level security;
alter table public.comments          enable row level security;
alter table public.swap_requests     enable row level security;
alter table public.chats             enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages          enable row level security;

-- Drop all existing policies cleanly
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles — readable by all authenticated, writable by owner
create policy "profiles_select" on public.profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- skills — anyone authenticated can read or insert
create policy "skills_select" on public.skills for select using (auth.role() = 'authenticated');
create policy "skills_insert" on public.skills for insert with check (auth.role() = 'authenticated');

-- user_skills
create policy "user_skills_select" on public.user_skills for select using (auth.role() = 'authenticated');
create policy "user_skills_insert" on public.user_skills for insert with check (user_id = auth.uid());
create policy "user_skills_delete" on public.user_skills for delete using (user_id = auth.uid());

-- posts
create policy "posts_select" on public.posts for select using (auth.role() = 'authenticated');
create policy "posts_insert" on public.posts for insert with check (user_id = auth.uid());
create policy "posts_update" on public.posts for update using (user_id = auth.uid());
create policy "posts_delete" on public.posts for delete using (user_id = auth.uid());

-- post_media
create policy "post_media_select" on public.post_media for select using (auth.role() = 'authenticated');
create policy "post_media_insert" on public.post_media for insert with check (auth.role() = 'authenticated');
create policy "post_media_delete" on public.post_media for delete using (
  exists (select 1 from public.posts where id = post_media.post_id and user_id = auth.uid())
);

-- post_likes
create policy "post_likes_select" on public.post_likes for select using (auth.role() = 'authenticated');
create policy "post_likes_insert" on public.post_likes for insert with check (user_id = auth.uid());
create policy "post_likes_delete" on public.post_likes for delete using (user_id = auth.uid());

-- saved_posts
create policy "saved_posts_select" on public.saved_posts for select using (user_id = auth.uid());
create policy "saved_posts_insert" on public.saved_posts for insert with check (user_id = auth.uid());
create policy "saved_posts_delete" on public.saved_posts for delete using (user_id = auth.uid());

-- comments
create policy "comments_select" on public.comments for select using (auth.role() = 'authenticated');
create policy "comments_insert" on public.comments for insert with check (user_id = auth.uid());
create policy "comments_delete" on public.comments for delete using (user_id = auth.uid());

-- swap_requests
create policy "swap_select" on public.swap_requests for select using (from_user = auth.uid() or to_user = auth.uid());
create policy "swap_insert" on public.swap_requests for insert with check (from_user = auth.uid());
create policy "swap_update" on public.swap_requests for update using (from_user = auth.uid() or to_user = auth.uid());

-- chats
create policy "chats_select" on public.chats for select using (
  exists (select 1 from public.chat_participants where chat_id = chats.id and user_id = auth.uid())
);
create policy "chats_insert" on public.chats for insert with check (auth.role() = 'authenticated');

-- chat_participants
create policy "chat_participants_select" on public.chat_participants for select using (auth.role() = 'authenticated');
create policy "chat_participants_insert" on public.chat_participants for insert with check (auth.role() = 'authenticated');

-- messages
create policy "messages_select" on public.messages for select using (
  exists (select 1 from public.chat_participants where chat_id = messages.chat_id and user_id = auth.uid())
);
create policy "messages_insert" on public.messages for insert with check (sender_id = auth.uid());

-- ── STORAGE ─────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm'])
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists "media_select" on storage.objects;
drop policy if exists "media_insert" on storage.objects;
drop policy if exists "media_update" on storage.objects;
drop policy if exists "media_delete" on storage.objects;

create policy "media_select" on storage.objects for select using (bucket_id = 'media');
create policy "media_insert" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media_update" on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "media_delete" on storage.objects for delete to authenticated using (bucket_id = 'media');

-- ── REALTIME ────────────────────────────────────────────────────────────────
do $$ begin
  begin alter publication supabase_realtime add table public.messages; exception when others then null; end;
  begin alter publication supabase_realtime add table public.posts; exception when others then null; end;
  begin alter publication supabase_realtime add table public.post_likes; exception when others then null; end;
  begin alter publication supabase_realtime add table public.comments; exception when others then null; end;
  begin alter publication supabase_realtime add table public.swap_requests; exception when others then null; end;
  begin alter publication supabase_realtime add table public.saved_posts; exception when others then null; end;
end $$;

-- ── SEED SKILLS ─────────────────────────────────────────────────────────────
insert into public.skills (name, category) values
  ('React','Frontend'),('TypeScript','Programming'),('Python','Programming'),
  ('JavaScript','Frontend'),('Node.js','Backend'),('PostgreSQL','Database'),
  ('Figma','Design'),('UI/UX Design','Design'),('Graphic Design','Design'),
  ('Machine Learning','AI/ML'),('Data Analysis','Data'),('Excel','Data'),
  ('Photography','Creative'),('Video Editing','Creative'),('Illustration','Creative'),
  ('Copywriting','Writing'),('Content Writing','Writing'),('SEO','Marketing'),
  ('Digital Marketing','Marketing'),('Social Media','Marketing'),
  ('Spanish','Language'),('French','Language'),('German','Language'),('Japanese','Language'),
  ('Guitar','Music'),('Piano','Music'),('Singing','Music'),
  ('3D Modeling','Design'),('Flutter','Mobile'),('Swift','Mobile'),('Kotlin','Mobile'),
  ('Vue.js','Frontend'),('AWS','Cloud'),('Docker','DevOps'),('Git','DevOps'),
  ('Public Speaking','Soft Skills'),('Leadership','Soft Skills'),('Project Management','Soft Skills')
on conflict (name) do nothing;
