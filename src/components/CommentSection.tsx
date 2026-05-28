import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: { id: string; name: string; username: string; avatar_url: string | null };
}

interface Props {
  postId: string;
  onCountChange?: (n: number) => void;
}

export function CommentSection({ postId, onCountChange }: Props) {
  const { user, profile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [posting, setPosting]   = useState(false);
  const [replyTo, setReplyTo]   = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments();
    const ch = supabase
      .channel(`comments-${postId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `post_id=eq.${postId}` },
        () => fetchComments())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [postId]);

  const fetchComments = async () => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles:user_id(id,name,username,avatar_url)')
      .eq('post_id', postId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });
    if (data) {
      setComments(data as Comment[]);
      onCountChange?.(data.length);
    }
    setLoading(false);
  };

  const submit = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setPosting(true);
    setText('');
    setReplyTo(null);
    const payload: any = { post_id: postId, user_id: user.id, content };
    if (replyTo) payload.parent_id = replyTo.id;
    const { error } = await supabase.from('comments').insert(payload);
    if (error) console.error('comment error:', error.message);
    setPosting(false);
  };

  const deleteComment = async (id: string) => {
    await supabase.from('comments').delete().eq('id', id).eq('user_id', user!.id);
    fetchComments();
  };

  const startReply = (c: Comment) => {
    setReplyTo(c);
    setText(`@${c.profiles?.username} `);
    inputRef.current?.focus();
  };

  if (loading) return (
    <div className="mt-3 pt-3 border-t border-white/[0.05] flex justify-center py-3">
      <Loader2 className="w-4 h-4 animate-spin text-white/25" />
    </div>
  );

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05]">
      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-3 max-h-52 overflow-y-auto custom-scrollbar">
          <AnimatePresence initial={false}>
            {comments.map(c => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="flex gap-2.5 group"
              >
                <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-white/8 bg-white/5">
                  {c.profiles?.avatar_url
                    ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full flex items-center justify-center text-white/40 text-[9px] font-black">{c.profiles?.name?.[0]?.toUpperCase() || '?'}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="bg-white/[0.04] rounded-2xl px-3 py-2">
                    <span className="font-bold text-white text-xs mr-1.5">{c.profiles?.name || 'User'}</span>
                    <span className="text-white/72 text-xs leading-relaxed break-words">{c.content}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-1">
                    <span className="text-[9px] text-white/22">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                    <button onClick={() => startReply(c)}
                      className="text-[9px] font-bold text-white/35 hover:text-white/70 transition-colors">
                      Reply
                    </button>
                    {c.user_id === user?.id && (
                      <button onClick={() => deleteComment(c.id)}
                        className="text-[9px] text-red-400/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {comments.length === 0 && (
        <p className="text-xs text-white/22 text-center py-2 mb-2">No comments yet — be first!</p>
      )}

      {/* Reply banner */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between px-3 py-1.5 bg-white/[0.04] rounded-xl mb-2 overflow-hidden"
          >
            <p className="text-xs text-white/50">Replying to <span className="font-bold text-white">@{replyTo.profiles?.username}</span></p>
            <button onClick={() => { setReplyTo(null); setText(''); }} className="text-white/30 hover:text-white/60 text-sm">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 border border-white/8 bg-white/5">
          {profile?.avatar_url
            ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            : <div className="w-full h-full flex items-center justify-center text-white/40 text-[9px] font-black">{profile?.name?.[0]?.toUpperCase() || '?'}</div>}
        </div>
        <div className="flex-1 flex items-center glass-input rounded-full px-4 py-2.5 gap-2">
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-xs text-white placeholder:text-white/22"
            placeholder="Add a comment…"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          />
          <motion.button
            whileTap={{ scale: 0.82 }}
            onClick={submit}
            disabled={posting || !text.trim()}
            className="text-white/35 hover:text-white disabled:opacity-20 transition-colors flex-shrink-0"
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
