import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    fetchComments();
    const ch = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id(name,username,avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    if (data) setComments(data as Comment[]);
    setLoading(false);
  };

  const submit = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setPosting(true);
    setText('');
    await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content });
    setPosting(false);
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.055] space-y-3">
      {loading ? (
        <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-white/25" /></div>
      ) : (
        <AnimatePresence initial={false}>
          {comments.length === 0 ? (
            <p className="text-xs text-white/28 italic text-center py-1">No comments yet</p>
          ) : (
            <div className="space-y-2.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
              {comments.map(c => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                  className="flex gap-2"
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 glass border border-white/8">
                    {c.profiles?.avatar_url
                      ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full flex items-center justify-center text-white/40 text-[9px] font-black">{c.profiles?.name?.[0]?.toUpperCase() || '?'}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-snug">
                      <span className="font-bold text-white mr-1.5">{c.profiles?.name || 'User'}</span>
                      <span className="text-white/68">{c.content}</span>
                    </p>
                    <p className="text-[9px] text-white/22 mt-0.5">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Input */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 glass border border-white/8">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : <div className="w-full h-full flex items-center justify-center text-white/40 text-[9px] font-black">{profile?.name?.[0]?.toUpperCase() || '?'}</div>}
        </div>
        <div className="flex-1 flex items-center glass-input rounded-full px-3.5 py-2 gap-2">
          <input
            className="flex-1 bg-transparent outline-none text-xs text-white placeholder:text-white/25"
            placeholder="Add a comment…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submit()}
          />
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={submit}
            disabled={posting || !text.trim()}
            className="text-white/40 hover:text-white transition-colors disabled:opacity-25"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
