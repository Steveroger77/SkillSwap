# SkillSwap Database Schema (Supabase SQL)

Run this in your Supabase SQL Editor to set up the database.

```sql
-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  username text unique not null,
  email text not null,
  bio text default '',
  avatar_url text,
  location text default 'Remote',
  created_at timestamp with time zone default now()
);

-- 2. Skills Table
create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text
);

-- 3. User Skills (Junction)
create table if not exists public.user_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  type text check (type in ('know', 'learn')),
  unique(user_id, skill_id, type)
);

-- 4. Posts Table
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  caption text,
  location text,
  created_at timestamp with time zone default now()
);

-- 5. Post Media
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  media_url text not null,
  media_type text check (media_type in ('image', 'video'))
);

-- 6. Post Likes
create table if not exists public.post_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- 7. Comments
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  content text not null,
  parent_id uuid references public.comments(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- 8. Comment Likes
create table if not exists public.comment_likes (
  user_id uuid references public.profiles(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  primary key (user_id, comment_id)
);

-- 9. Hashtags
create table if not exists public.hashtags (
  id uuid primary key default gen_random_uuid(),
  tag text unique not null
);

-- 10. Post Hashtags
create table if not exists public.post_hashtags (
  post_id uuid references public.posts(id) on delete cascade,
  hashtag_id uuid references public.hashtags(id) on delete cascade,
  primary key (post_id, hashtag_id)
);

-- 11. Saved Posts
create table if not exists public.saved_posts (
  user_id uuid references public.profiles(id) on delete cascade,
  post_id uuid references public.posts(id) on delete cascade,
  primary key (user_id, post_id)
);

-- 12. Swap Requests
create table if not exists public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  from_user uuid references public.profiles(id) on delete cascade,
  to_user uuid references public.profiles(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamp with time zone default now()
);

-- 13. Chats
create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now()
);

-- 14. Chat Participants
create table if not exists public.chat_participants (
  chat_id uuid references public.chats(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  primary key (chat_id, user_id)
);

-- 15. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid references public.chats(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text,
  attachment_url text,
  created_at timestamp with time zone default now(),
  edited_at timestamp with time zone
);

-- TRIGGER TO CREATE PROFILE ON SIGNUP --
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, username, email, avatar_url, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    'https://picsum.photos/seed/' || new.id || '/200',
    'Remote'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- SEED DATA --
insert into public.skills (name, category) values
  ('React Development', 'Programming'),
  ('UI/UX Design', 'Design'),
  ('Digital Marketing', 'Business'),
  ('Photography', 'Creative'),
  ('Spanish Language', 'Languages'),
  ('Python Programming', 'Programming'),
  ('Graphic Design', 'Design'),
  ('Public Speaking', 'Soft Skills'),
  ('Data Analysis', 'Data Science'),
  ('Video Editing', 'Creative')
on conflict (name) do nothing;

-- RLS POLICIES --

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.user_skills enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.hashtags enable row level security;
alter table public.post_hashtags enable row level security;
alter table public.saved_posts enable row level security;
alter table public.swap_requests enable row level security;
alter table public.chats enable row level security;
alter table public.chat_participants enable row level security;
alter table public.messages enable row level security;

-- Profiles: Anyone can read, only owner can update/insert
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Skills: Anyone can read
drop policy if exists "Skills are viewable by everyone" on public.skills;
create policy "Skills are viewable by everyone" on public.skills for select using (true);

-- User Skills: Anyone can read, only owner can manage
drop policy if exists "User skills are viewable by everyone" on public.user_skills;
create policy "User skills are viewable by everyone" on public.user_skills for select using (true);
drop policy if exists "Users can manage their own skills" on public.user_skills;
create policy "Users can manage their own skills" on public.user_skills for all using (auth.uid() = user_id);

-- Posts: Anyone can read, only owner can insert/update/delete
drop policy if exists "Posts are viewable by everyone" on public.posts;
create policy "Posts are viewable by everyone" on public.posts for select using (true);
drop policy if exists "Users can insert their own posts" on public.posts;
create policy "Users can insert their own posts" on public.posts for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts" on public.posts for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own posts" on public.posts;
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

-- Likes: Users can like/unlike only for themselves
drop policy if exists "Likes viewable by everyone" on public.post_likes;
create policy "Likes viewable by everyone" on public.post_likes for select using (true);
drop policy if exists "Users can manage their own likes" on public.post_likes;
create policy "Users can manage their own likes" on public.post_likes for all using (auth.uid() = user_id);

-- Swap Requests: Only sender/receiver can view
drop policy if exists "Users can view their own swap requests" on public.swap_requests;
create policy "Users can view their own swap requests" on public.swap_requests for select using (auth.uid() = from_user or auth.uid() = to_user);
drop policy if exists "Users can create swap requests" on public.swap_requests;
create policy "Users can create swap requests" on public.swap_requests for insert with check (auth.uid() = from_user);
drop policy if exists "Receivers can update swap request status" on public.swap_requests;
create policy "Receivers can update swap request status" on public.swap_requests for update using (auth.uid() = to_user);

-- Chats & Messages: Only participants can view/send
drop policy if exists "Participants can view their chats" on public.chats;
create policy "Participants can view their chats" on public.chats for select using (
  exists (select 1 from public.chat_participants where chat_id = public.chats.id and user_id = auth.uid())
);
drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages" on public.messages for select using (
  exists (select 1 from public.chat_participants where chat_id = public.messages.chat_id and user_id = auth.uid())
);
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages" on public.messages for insert with check (
  exists (select 1 from public.chat_participants where chat_id = chat_id and user_id = auth.uid())
);

-- STORAGE BUCKETS --
-- This creates the buckets if they don't exist
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('posts', 'posts', true)
on conflict (id) do nothing;

-- Set up storage policies
drop policy if exists "Public Access" on storage.objects;
create policy "Public Access" on storage.objects for select using ( bucket_id in ('avatars', 'posts') );

drop policy if exists "Authenticated users can upload" on storage.objects;
create policy "Authenticated users can upload" on storage.objects for insert with check ( 
  bucket_id in ('avatars', 'posts') AND auth.role() = 'authenticated' 
);
```
