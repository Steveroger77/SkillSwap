import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, MoreHorizontal, Bookmark, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Post } from '../types';

const Feed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    fetchData();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) setCurrentUser(data.session.user.id);
  };

  const fetchData = async () => {
    try {
      // Fetch posts, join with profiles table, and get likes
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (username, avatar_url),
          likes (user_id)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setPosts(data as unknown as Post[]);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !currentUser) return;
    setIsPosting(true);
    
    try {
      const { error } = await supabase.from('posts').insert({
        user_id: currentUser,
        content: newPostContent
      });

      if (error) throw error;
      setNewPostContent('');
      fetchData(); // Refresh feed
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to post');
    } finally {
      setIsPosting(false);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!currentUser) return;
    
    // Optimistic UI update could go here, but for now we'll just hit the API
    const post = posts.find(p => p.id === postId);
    const isLiked = post?.likes?.some(like => like.user_id === currentUser);

    try {
      if (isLiked) {
        await supabase.from('likes').delete().match({ user_id: currentUser, post_id: postId });
      } else {
        await supabase.from('likes').insert({ user_id: currentUser, post_id: postId });
      }
      fetchData(); // Refresh to show real state
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-white" /></div>;
  }

  return (
    <div className="space-y-8">
      {/* Create Post Input */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-white/5 shadow-2xl">
        <textarea
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="Share your learning milestone..."
          className="w-full bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none mb-4"
          rows={2}
        />
        <div className="flex justify-between items-center">
          <p className="text-gray-500 text-xs">Supports Markdown & Hashtags</p>
          <button 
            onClick={handleCreatePost}
            disabled={isPosting || !newPostContent.trim()}
            className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {isPosting ? 'Posting...' : 'Post'}
          </button>
        </div>
      </div>

      {/* Posts Feed */}
      {posts.length === 0 ? (
        <div className="text-center text-gray-500 py-10">No posts yet. Be the first!</div>
      ) : (
        posts.map(post => {
          const isLiked = post.likes?.some(l => l.user_id === currentUser);
          
          return (
            <article key={post.id} className="bg-[#0a0a0a] rounded-2xl border border-white/5 overflow-hidden">
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={post.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${post.profiles?.username}&background=random`} 
                    alt={post.profiles?.username} 
                    className="w-10 h-10 rounded-full object-cover border border-white/10" 
                  />
                  <div>
                    <p className="font-semibold text-sm">{post.profiles?.username || 'Unknown User'}</p>
                    <p className="text-xs text-gray-500">{new Date(post.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-white"><MoreHorizontal size={20} /></button>
              </div>

              {/* Media (If exists) */}
              {post.image_url && (
                <div className="w-full aspect-square bg-gray-900 overflow-hidden">
                  <img src={post.image_url} alt="Post content" className="w-full h-full object-cover" />
                </div>
              )}

              {/* Actions */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => toggleLike(post.id)}
                      className={`transition-transform active:scale-90 ${isLiked ? 'text-red-500 fill-current' : 'text-white'}`}
                    >
                      <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
                    </button>
                    <button className="text-white hover:text-gray-300"><MessageCircle size={24} /></button>
                    <button className="text-white hover:text-gray-300"><Send size={24} /></button>
                  </div>
                  <button className="text-white hover:text-gray-300"><Bookmark size={24} /></button>
                </div>

                {/* Likes */}
                <p className="font-semibold text-sm mb-2">{post.likes?.length || 0} likes</p>

                {/* Caption */}
                <p className="text-sm text-gray-300 mb-2">
                  <span className="font-semibold text-white mr-2">{post.profiles?.username}</span>
                  {post.content}
                </p>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
};

export default Feed;