import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function Hashtag() {
  const { tag } = useParams<{ tag: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts]     = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (!tag) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('posts')
        .select('*, profiles:user_id(id,name,username,avatar_url), post_media(id,media_url,media_type), post_likes(user_id)')
        .ilike('caption', `%#${tag}%`)
        .order('created_at', { ascending: false });
      setPosts((data ?? []).map(p => ({
        ...p,
        _likes: p.post_likes?.length ?? 0,
        is_liked: p.post_likes?.some((l: any) => l.user_id === user?.id) ?? false,
      })));
      setLoading(false);
    })();
  }, [tag, user?.id]);

  return (
    <main className="pt-20 pb-32 px-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate(-1)} className="btn-glass p-2.5 rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </motion.button>
        <div className="glass-card rounded-2xl px-5 py-3.5 flex-1 flex items-center gap-4 relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-4 w-full">
            <div className="w-12 h-12 rounded-xl glass flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-black text-white/50">#</span>
            </div>
            <div>
              <h1 className="font-headline text-2xl font-black text-white tracking-tight">#{tag}</h1>
              <p className="text-white/30 text-xs">{loading ? '…' : `${posts.length} post${posts.length !== 1 ? 's' : ''}`}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-square shimmer rounded-lg" style={{ animationDelay: `${i * 0.08}s` }} />)}
        </div>
      ) : posts.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-3xl py-20 text-center">
          <p className="text-5xl mb-4">#</p>
          <p className="text-white/38 font-medium">No posts with #{tag}</p>
          <p className="text-white/22 text-sm mt-1">Be the first to use this hashtag!</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {posts.map((post, i) => {
            const thumb = post.post_media?.[0]?.media_url;
            return (
              <motion.button
                key={post.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 28 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelected(post)}
                className="aspect-square overflow-hidden relative group rounded-lg bg-white/[0.03] post-thumb"
              >
                {thumb
                  ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center p-2"><p className="text-white/28 text-[9px] text-center line-clamp-4 leading-tight">{post.caption}</p></div>}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Heart className="w-4 h-4 text-white fill-current" />
                  <span className="text-white font-bold text-sm">{post._likes}</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Post modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop" onClick={() => setSelected(null)}>
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal rounded-3xl max-w-sm w-full overflow-hidden"
            >
              {selected.post_media?.[0]?.media_url && (
                <div className="aspect-square"><img src={selected.post_media[0].media_url} alt="" className="w-full h-full object-cover" /></div>
              )}
              <div className="p-5 relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full overflow-hidden glass">
                    {selected.profiles?.avatar_url
                      ? <img src={selected.profiles.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-black">{selected.profiles?.name?.[0]?.toUpperCase()}</div>}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{selected.profiles?.name}</p>
                    <p className="text-white/32 text-[10px]">@{selected.profiles?.username}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-white/45 text-sm">
                    <Heart className="w-3.5 h-3.5" />{selected._likes}
                  </div>
                </div>
                {selected.caption && <p className="text-white/65 text-sm leading-relaxed mb-3">{selected.caption}</p>}
                <p className="text-white/22 text-[10px] uppercase font-bold tracking-widest mb-4">
                  {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true })}
                </p>
                <button onClick={() => setSelected(null)} className="w-full btn-glass py-3 rounded-2xl text-sm font-bold">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
