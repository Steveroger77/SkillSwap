-- ╔══════════════════════════════════════════════════════════════════╗
-- ║  SkillSwap — Supabase Production Schema                         ║
-- ║  Run this in: Supabase Dashboard > SQL Editor                   ║
-- ╚══════════════════════════════════════════════════════════════════╝

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── PROFILES ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  username    text unique not null,
  email       text,
  bio         text default '',
  avatar_url  text,
  location    text default 'Remote',
  created_at  timestamptz default now()
);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, username, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), '[^a-z0-9_.]', '', 'g')) || '_' || substr(new.id::text, 1, 4),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── SKILLS ────────────────────────────────────────────────────────────────
create table if not exists public.skills (
  id       uuid primary key default gen_random_uuid(),
  name     text unique not null,
  category text
);

-- ── USER SKILLS ───────────────────────────────────────────────────────────
create table if not exists public.user_skills (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  type     text check (type in ('know','learn')) not null,
  unique(user_id, skill_id, type)
);

-- ── POSTS ─────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade,
  caption    text default '',
  location   text default 'Remote',
  created_at timestamptz default now()
);

-- ── POST MEDIA ────────────────────────────────────────────────────────────
create table if not exists public.post_media (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  media_url  text not null,
  media_type text check (media_type in ('image','video')) not null default 'image'
);

-- ── POST LIKES ────────────────────────────────────────────────────────────
create table if not exists public.post_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- ── SAVED POSTS ───────────────────────────────────────────────────────────
create table if not exists public.saved_posts (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- ── COMMENTS ─────────────────────────────────────────────────────────────
create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid references public.posts(id) on delete cascade,
  user_id    uuid references public.profiles(id) on delete cascade,
  content    text not null,
  parent_id  uuid references public.comments(id) on delete cascade,
  created_at timestamptz default now()
);

-- ── SWAP REQUESTS ─────────────────────────────────────────────────────────
create table if not exists public.swap_requests (
  id         uuid primary key default gen_random_uuid(),
  from_user  uuid references public.profiles(id) on delete cascade,
  to_user    uuid references public.profiles(id) on delete cascade,
  skill_id   uuid references public.skills(id) on delete set null,
  status     text check (status in ('pending','accepted','rejected')) default 'pending',
  created_at timestamptz default now()
);

-- ── CHATS ─────────────────────────────────────────────────────────────────
create table if not exists public.chats (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz default now()
);

create table if not exists public.chat_participants (
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (chat_id, user_id)
);

-- ── MESSAGES ─────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id             uuid primary key default gen_random_uuid(),
  chat_id        uuid references public.chats(id) on delete cascade,
  sender_id      uuid references public.profiles(id) on delete cascade,
  content        text not null,
  attachment_url text,
  created_at     timestamptz default now(),
  edited_at      timestamptz
);

-- ── INDEXES ───────────────────────────────────────────────────────────────
create index if not exists idx_posts_user_id      on public.posts(user_id);
create index if not exists idx_posts_created_at   on public.posts(created_at desc);
create index if not exists idx_post_likes_post_id on public.post_likes(post_id);
create index if not exists idx_comments_post_id   on public.comments(post_id);
create index if not exists idx_messages_chat_id   on public.messages(chat_id);
create index if not exists idx_swap_from          on public.swap_requests(from_user);
create index if not exists idx_swap_to            on public.swap_requests(to_user);
create index if not exists idx_user_skills_user   on public.user_skills(user_id);
create index if not exists idx_profiles_username  on public.profiles(username);

-- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.skills         enable row level security;
alter table public.user_skills    enable row level security;
alter table public.posts          enable row level security;
alter table public.post_media     enable row level security;
alter table public.post_likes     enable row level security;
alter table public.saved_posts    enable row level security;
alter table public.comments       enable row level security;
alter table public.swap_requests  enable row level security;
alter table public.chats          enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages       enable row level security;

-- Profiles: anyone authenticated can read; only own profile can be updated
create policy "profiles_select" on public.profiles for select to authenticated using (true);
create policy "profiles_insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update to authenticated using (id = auth.uid());

-- Skills: readable by all; insertable by authenticated
create policy "skills_select" on public.skills for select to authenticated using (true);
create policy "skills_insert" on public.skills for insert to authenticated with check (true);

-- User skills
create policy "user_skills_select" on public.user_skills for select to authenticated using (true);
create policy "user_skills_insert" on public.user_skills for insert to authenticated with check (user_id = auth.uid());
create policy "user_skills_delete" on public.user_skills for delete to authenticated using (user_id = auth.uid());

-- Posts
create policy "posts_select" on public.posts for select to authenticated using (true);
create policy "posts_insert" on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy "posts_delete" on public.posts for delete to authenticated using (user_id = auth.uid());

-- Post media
create policy "post_media_select" on public.post_media for select to authenticated using (true);
create policy "post_media_insert" on public.post_media for insert to authenticated with check (true);
create policy "post_media_delete" on public.post_media for delete to authenticated using (
  exists (select 1 from public.posts where id = post_media.post_id and user_id = auth.uid())
);

-- Likes
create policy "post_likes_select" on public.post_likes for select to authenticated using (true);
create policy "post_likes_insert" on public.post_likes for insert to authenticated with check (user_id = auth.uid());
create policy "post_likes_delete" on public.post_likes for delete to authenticated using (user_id = auth.uid());

-- Saved posts
create policy "saved_posts_select" on public.saved_posts for select to authenticated using (user_id = auth.uid());
create policy "saved_posts_insert" on public.saved_posts for insert to authenticated with check (user_id = auth.uid());
create policy "saved_posts_delete" on public.saved_posts for delete to authenticated using (user_id = auth.uid());

-- Comments
create policy "comments_select" on public.comments for select to authenticated using (true);
create policy "comments_insert" on public.comments for insert to authenticated with check (user_id = auth.uid());
create policy "comments_delete" on public.comments for delete to authenticated using (user_id = auth.uid());

-- Swap requests
create policy "swap_select" on public.swap_requests for select to authenticated using (from_user = auth.uid() or to_user = auth.uid());
create policy "swap_insert" on public.swap_requests for insert to authenticated with check (from_user = auth.uid());
create policy "swap_update" on public.swap_requests for update to authenticated using (to_user = auth.uid());

-- Chats
create policy "chats_select" on public.chats for select to authenticated using (
  exists (select 1 from public.chat_participants where chat_id = chats.id and user_id = auth.uid())
);
create policy "chats_insert" on public.chats for insert to authenticated with check (true);

-- Chat participants
create policy "chat_participants_select" on public.chat_participants for select to authenticated using (true);
create policy "chat_participants_insert" on public.chat_participants for insert to authenticated with check (true);

-- Messages
create policy "messages_select" on public.messages for select to authenticated using (
  exists (select 1 from public.chat_participants where chat_id = messages.chat_id and user_id = auth.uid())
);
create policy "messages_insert" on public.messages for insert to authenticated with check (sender_id = auth.uid());

-- ── STORAGE BUCKET ────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('media', 'media', true) on conflict do nothing;

create policy "media_select" on storage.objects for select using (bucket_id = 'media');
create policy "media_insert" on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "media_update" on storage.objects for update to authenticated using (bucket_id = 'media' and owner = auth.uid()::text);
create policy "media_delete" on storage.objects for delete to authenticated using (bucket_id = 'media' and owner = auth.uid()::text);

-- ── REALTIME ──────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.posts;
alter publication supabase_realtime add table public.post_likes;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.swap_requests;
alter publication supabase_realtime add table public.saved_posts;

-- ── SEED SKILLS ───────────────────────────────────────────────────────────
insert into public.skills (name, category) values
  ('React', 'Frontend'), ('TypeScript', 'Programming'), ('Python', 'Programming'),
  ('Figma', 'Design'), ('UI/UX Design', 'Design'), ('Node.js', 'Backend'),
  ('PostgreSQL', 'Database'), ('Machine Learning', 'AI/ML'), ('Photography', 'Creative'),
  ('Video Editing', 'Creative'), ('Copywriting', 'Writing'), ('SEO', 'Marketing'),
  ('Spanish', 'Language'), ('French', 'Language'), ('Guitar', 'Music'),
  ('Piano', 'Music'), ('3D Modeling', 'Design'), ('Flutter', 'Mobile'),
  ('Swift', 'Mobile'), ('Kotlin', 'Mobile'), ('Data Analysis', 'Data'),
  ('Excel', 'Data'), ('Digital Marketing', 'Marketing'), ('Public Speaking', 'Soft Skills'),
  ('Leadership', 'Soft Skills'), ('Graphic Design', 'Design'), ('Illustration', 'Creative'),
  ('Vue.js', 'Frontend'), ('AWS', 'Cloud'), ('Docker', 'DevOps')
on conflict (name) do nothing;
