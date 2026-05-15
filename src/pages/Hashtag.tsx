import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Grid, Clock, TrendingUp, Heart, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function Hashtag() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const [posts, setPosts]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'top'>('recent');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    if (!tag) return;
    fetchPosts();
  }, [tag]);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id ( id, name, username, avatar_url ),
        post_media ( id, media_url, media_type ),
        post_likes ( user_id )
      `)
      .ilike('caption', `%#${tag}%`)
      .order('created_at', { ascending: false });

    if (error) console.error(error);
    const enriched = (data ?? []).map(p => ({
      ...p,
      _likes: p.post_likes?.length ?? 0,
    }));
    setPosts(enriched);
    setLoading(false);
  };

  const sorted = [...posts].sort((a, b) =>
    activeTab === 'top' ? b._likes - a._likes : 0
  );

  return (
    <main className="pt-24 pb-32 px-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <button
          onClick={() => navigate(-1)}
          className="p-3 btn-glass rounded-2xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="glass-card rounded-3xl p-5 flex-1 flex items-center gap-5 relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-5 w-full">
            <div className="w-16 h-16 rounded-2xl glass border border-white/10 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-black text-white/60">#</span>
            </div>
            <div>
              <h1 className="text-3xl font-headline font-black text-white tracking-tight">#{tag}</h1>
              <p className="text-white/38 text-sm mt-0.5">{posts.length} {posts.length === 1 ? 'post' : 'posts'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 glass rounded-full mb-8">
        {([
          { key: 'recent', icon: Clock,      label: 'Recent' },
          { key: 'top',    icon: TrendingUp, label: 'Top' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 rounded-full text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === tab.key ? 'bg-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.2)]' : 'text-white/45 hover:text-white/75'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="aspect-square shimmer rounded-lg" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-3xl py-20 text-center"
        >
          <Grid className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No posts with #{tag} yet.</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {sorted.map((post, i) => {
            const thumb = post.post_media?.[0]?.media_url;
            return (
              <motion.button
                key={post.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(post)}
                className="aspect-square overflow-hidden relative group rounded-lg bg-white/[0.03] post-thumb"
              >
                {thumb ? (
                  <img src={thumb} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p className="text-white/35 text-[10px] text-center line-clamp-4 leading-tight">{post.caption}</p>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1.5 text-white font-bold text-sm">
                    <Heart className="w-4 h-4 fill-current" />
                    {post._likes}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selected && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal rounded-3xl max-w-sm w-full overflow-hidden"
            >
              {selected.post_media?.[0]?.media_url && (
                <div className="aspect-square">
                  <img src={selected.post_media[0].media_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full overflow-hidden glass">
                    {selected.profiles?.avatar_url
                      ? <img src={selected.profiles.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-bold">
                          {selected.profiles?.name?.[0]?.toUpperCase() || '?'}
                        </div>
                    }
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{selected.profiles?.name}</p>
                    <p className="text-white/35 text-[11px]">@{selected.profiles?.username}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 text-white/60 text-sm">
                    <Heart className="w-4 h-4" /> {selected._likes}
                  </div>
                </div>
                {selected.caption && (
                  <p className="text-white/75 text-sm leading-relaxed mb-4">{selected.caption}</p>
                )}
                <p className="text-white/25 text-[10px] uppercase font-bold tracking-wider mb-5">
                  {selected.created_at ? formatDistanceToNow(new Date(selected.created_at), { addSuffix: true }) : ''}
                </p>
                <button
                  onClick={() => setSelected(null)}
                  className="w-full btn-glass py-3 rounded-2xl text-sm font-bold"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
