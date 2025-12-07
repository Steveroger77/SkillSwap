export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  skills_offered: string[];
  skills_wanted: string[];
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  profiles?: UserProfile; // Joined data
  likes?: { user_id: string }[]; // Joined data
}

export interface NavItem {
  label: string;
  href: string;
  ariaLabel?: string;
}
