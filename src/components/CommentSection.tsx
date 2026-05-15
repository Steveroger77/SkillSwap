import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { name: string; username: string; avatar_url: string | null };
}

export function CommentSection({ postId }: { postId: string }) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchComments();
    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` }, () => {
        fetchComments();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(name, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (data) setComments(data as Comment[]);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    const content = newComment.trim();
    setNewComment('');
    await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content });
    setSubmitting(false);
  };

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-4">
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-white/30" /></div>
      ) : comments.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic text-center py-2">No comments yet. Be first!</p>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 glass">
                {c.profiles?.avatar_url
                  ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-full h-full flex items-center justify-center text-white/50 text-[10px] font-bold">{c.profiles?.name?.[0]?.toUpperCase() || '?'}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug">
                  <span className="font-bold mr-1.5">{c.profiles?.name || 'User'}</span>
                  <span className="text-on-surface/80">{c.content}</span>
                </p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2.5 items-center">
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 glass">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : <div className="w-full h-full flex items-center justify-center text-white/50 text-[10px] font-bold">{profile?.name?.[0]?.toUpperCase() || '?'}</div>
          }
        </div>
        <div className="flex-1 flex items-center glass-input rounded-full px-4 py-2 gap-2">
          <input
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
            placeholder="Add a comment…"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || !newComment.trim()}
            className="text-white/60 hover:text-white transition-colors disabled:opacity-30"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
