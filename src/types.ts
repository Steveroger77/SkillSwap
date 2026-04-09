export type Profile = {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar_url: string | null;
  location: string;
  created_at: string;
};

export type Skill = {
  id: string;
  name: string;
  category: string;
};

export type UserSkill = {
  id: string;
  user_id: string;
  skill_id: string;
  type: 'know' | 'learn';
  skill?: Skill;
};

export type Post = {
  id: string;
  user_id: string;
  caption: string;
  location: string;
  created_at: string;
  profiles?: Profile;
  post_media?: PostMedia[];
  _count?: {
    post_likes: number;
    comments: number;
  };
  is_liked?: boolean;
  is_saved?: boolean;
};

export type PostMedia = {
  id: string;
  post_id: string;
  media_url: string;
  media_type: 'image' | 'video';
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles?: Profile;
};

export type SwapRequest = {
  id: string;
  from_user: string;
  to_user: string;
  skill_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  from_profile?: Profile;
  to_profile?: Profile;
  skill?: Skill;
};

export type Chat = {
  id: string;
  created_at: string;
  participants?: Profile[];
  last_message?: Message;
};

export type Message = {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  attachment_url: string | null;
  created_at: string;
  edited_at: string | null;
};
