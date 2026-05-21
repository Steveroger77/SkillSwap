import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, uploadPostMedia } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin,
  Image as ImageIcon, Hash, XCircle, Loader2, Trash2, Share2,
  Copy, ChevronLeft, ChevronRight, Plus, X,
} from 'lucide-react';
import { CommentSection } from '../components/CommentSection';

/* ── Hashtag renderer ─────────────────────────────────────────── */
function RichText({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('#')) {
          const tag = p.slice(1).replace(/[.,!?;:]+$/, '');
          return <Link key={i} to={`/hashtag/${tag}`} className="text-white font-semibold hover:underline">{p}</Link>;
        }
        if (p.startsWith('@')) return <span key={i} className="text-white font-semibold">{p}</span>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────── */
function PostSkeleton() {
  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      <div className="p-4 flex gap-3 items-center">
        <div className="w-10 h-10 rounded-full shimmer flex-shrink-0" />
        <div className="space-y-2 flex-1"><div className="w-32 h-3 shimmer rounded-full" /><div className="w-20 h-2 shimmer rounded-full" /></div>
      </div>
      <div className="aspect-square w-full shimmer" />
      <div className="p-4 space-y-2"><div className="w-full h-3 shimmer rounded-full" /><div className="w-2/3 h-3 shimmer rounded-full" /></div>
    </div>
  );
}

/* ── Post Card ────────────────────────────────────────────────── */
function PostCard({ post, userId, onLike, onSave, onDelete, showToast }: {
  post: any; userId?: string;
  onLike: (id: string, liked: boolean) => void;
  onSave: (id: string, saved: boolean) => void;
  onDelete: (post: any) => void;
  showToast: (m: string, t?: any) => void;
}) {
  const [mediaIdx, setMediaIdx]         = useState(0);
  const [showHeart, setShowHeart]       = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare]       = useState(false);
  const lastTap = useRef(0);
  const media = post.post_media ?? [];

  const doubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300 && !post.is_liked) {
      onLike(post.id, false);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTap.current = now;
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className="glass-card rounded-3xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/12 flex-shrink-0">
            {post.profiles?.avatar_url
              ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 text-xs font-black">{post.profiles?.name?.[0]?.toUpperCase() || '?'}</div>}
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{post.profiles?.name || 'User'}</p>
            <p className="text-[10px] text-white/35 flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5" />{post.location || 'Remote'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {post.user_id === userId && (
            <button onClick={() => onDelete(post)} className="p-2 text-white/25 hover:text-red-400 transition-colors rounded-xl">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 text-white/25 hover:text-white/60 transition-colors rounded-xl">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media */}
      {media.length > 0 ? (
        <div className="relative aspect-square bg-black/20 select-none" onClick={doubleTap}>
          <AnimatePresence mode="wait">
            <motion.div key={mediaIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="absolute inset-0">
              {media[mediaIdx]?.media_type === 'video'
                ? <video src={media[mediaIdx].media_url} className="w-full h-full object-cover" autoPlay muted loop playsInline controls />
                : <img src={media[mediaIdx]?.media_url} alt="" className="w-full h-full object-cover" />}
            </motion.div>
          </AnimatePresence>
          {/* Nav arrows */}
          {media.length > 1 && (
            <>
              {mediaIdx > 0 && <button onClick={e => { e.stopPropagation(); setMediaIdx(i => i - 1); }} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 glass rounded-full"><ChevronLeft className="w-4 h-4 text-white" /></button>}
              {mediaIdx < media.length - 1 && <button onClick={e => { e.stopPropagation(); setMediaIdx(i => i + 1); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 glass rounded-full"><ChevronRight className="w-4 h-4 text-white" /></button>}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_: any, i: number) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setMediaIdx(i); }} className={`rounded-full transition-all duration-300 ${i === mediaIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
          {/* Double-tap heart */}
          <AnimatePresence>
            {showHeart && (
              <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.4, opacity: 1 }} exit={{ scale: 2, opacity: 0 }} transition={{ duration: 0.4 }} className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="w-24 h-24 text-white fill-current drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="px-5 py-6 min-h-[80px] flex items-center bg-white/[0.015]">
          <p className="text-white/72 text-base leading-relaxed"><RichText text={post.caption} /></p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-5">
            <motion.button whileTap={{ scale: 0.82 }} onClick={() => onLike(post.id, post.is_liked)}>
              <Heart className={`w-6 h-6 transition-all duration-200 ${post.is_liked ? 'text-red-500 fill-red-500' : 'text-white/65 hover:text-white'}`} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.82 }} onClick={() => setShowComments(s => !s)}>
              <MessageCircle className={`w-6 h-6 transition-colors duration-200 ${showComments ? 'text-white fill-white/20' : 'text-white/65 hover:text-white'}`} />
            </motion.button>
            <motion.button whileTap={{ scale: 0.82 }} onClick={() => setShowShare(true)}>
              <Send className="w-6 h-6 text-white/65 hover:text-white transition-colors" />
            </motion.button>
          </div>
          <motion.button whileTap={{ scale: 0.82 }} onClick={() => onSave(post.id, post.is_saved)}>
            <Bookmark className={`w-6 h-6 transition-all duration-200 ${post.is_saved ? 'text-white fill-white' : 'text-white/65 hover:text-white'}`} />
          </motion.button>
        </div>

        {post._likes > 0 && <p className="text-sm font-bold text-white mb-1">{post._likes.toLocaleString()} {post._likes === 1 ? 'like' : 'likes'}</p>}
        {media.length > 0 && post.caption && (
          <p className="text-sm leading-snug text-white/75 mb-1">
            <span className="font-bold text-white mr-1.5">{post.profiles?.name}</span>
            <RichText text={post.caption} />
          </p>
        )}
        {post._comments > 0 && !showComments && (
          <button onClick={() => setShowComments(true)} className="text-xs text-white/35 hover:text-white/60 transition-colors mb-1">
            View all {post._comments} comments
          </button>
        )}
        <p className="text-[10px] text-white/22 uppercase font-bold tracking-widest">
          {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'just now'}
        </p>
        {showComments && <CommentSection postId={post.id} />}
      </div>

      {/* Share sheet */}
      <AnimatePresence>
        {showShare && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center modal-backdrop" onClick={() => setShowShare(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} onClick={e => e.stopPropagation()} className="glass-modal rounded-t-3xl sm:rounded-3xl p-7 max-w-sm w-full">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-headline font-black text-white">Share</h3>
                  <button onClick={() => setShowShare(false)}><X className="w-5 h-5 text-white/35" /></button>
                </div>
                <div className="flex gap-8 justify-center">
                  {[
                    { icon: Copy, label: 'Copy Link', action: () => { navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`); showToast('Link copied!', 'success'); setShowShare(false); } },
                    { icon: Share2, label: 'Share', action: () => { if (navigator.share) navigator.share({ title: 'SkillSwap', url: `${window.location.origin}/post/${post.id}` }); setShowShare(false); } },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} onClick={action} className="flex flex-col items-center gap-2">
                      <div className="w-14 h-14 rounded-full glass flex items-center justify-center hover:bg-white/12 transition-all active:scale-95"><Icon className="w-6 h-6 text-white" /></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white/38">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

/* ── Compose ─────────────────────────────────────────────────── */
function Compose({ profile, onPost }: { profile: any; onPost: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen]         = useState(false);
  const [caption, setCaption]   = useState('');
  const [files, setFiles]       = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!user || (!caption.trim() && !files.length)) return;
    setUploading(true);
    try {
      const { data: post, error } = await supabase.from('posts')
        .insert({ user_id: user.id, caption: caption.trim(), location: profile?.location || 'Remote' })
        .select().single();
      if (error) throw error;
      if (files.length) {
        const rows = await Promise.all(files.map(f => uploadPostMedia(user.id, f)));
        await supabase.from('post_media').insert(rows.map(r => ({ post_id: post.id, ...r })));
      }
      setCaption(''); setFiles([]); setOpen(false);
      showToast('Posted! 🎉', 'success');
      onPost();
    } catch (e: any) { showToast(e.message || 'Failed to post', 'error'); }
    finally { setUploading(false); }
  };

  return (
    <>
      {/* Desktop inline */}
      <div className="hidden md:block glass-card rounded-3xl p-5 mb-6 relative overflow-hidden">
        <div className="relative z-10 flex gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/12 flex-shrink-0">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 text-xs font-black">{profile?.name?.[0]?.toUpperCase() || '?'}</div>}
          </div>
          <div className="flex-1 space-y-3">
            <textarea className="glass-input w-full rounded-2xl px-4 py-3 text-sm resize-none" placeholder="Share a skill, tip, or win…" rows={caption.length > 80 ? 3 : 2} value={caption} onChange={e => setCaption(e.target.value)} />
            {files.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {files.map((f, i) => (
                  <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-white/35 hover:text-white/65 transition-colors text-xs font-bold uppercase tracking-wider"><ImageIcon className="w-4 h-4" />{files.length ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Media'}</button>
                <button className="flex items-center gap-1.5 text-white/35 hover:text-white/65 transition-colors text-xs font-bold uppercase tracking-wider"><Hash className="w-4 h-4" /> Topics</button>
              </div>
              <motion.button whileTap={{ scale: 0.96 }} onClick={submit} disabled={uploading || (!caption.trim() && !files.length)} className="btn-primary px-6 py-2 rounded-full text-xs font-bold flex items-center gap-1.5">
                {uploading && <Loader2 className="w-3 h-3 animate-spin" />}{uploading ? 'Posting…' : 'Post'}
              </motion.button>
            </div>
          </div>
        </div>
        <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*" multiple onChange={e => { if (e.target.files) setFiles(p => [...p, ...Array.from(e.target.files!)].slice(0, 10)); }} />
      </div>

      {/* Mobile FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 btn-primary rounded-full shadow-2xl flex items-center justify-center"
        style={{ boxShadow: '0 8px 32px rgba(255,255,255,0.22)' }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Mobile compose sheet */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] flex items-end modal-backdrop md:hidden" onClick={() => setOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} onClick={e => e.stopPropagation()} className="glass-modal rounded-t-3xl p-6 w-full">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-headline font-black text-white">New Post</h3>
                  <button onClick={() => setOpen(false)}><XCircle className="w-5 h-5 text-white/35" /></button>
                </div>
                <textarea className="glass-input w-full rounded-2xl px-4 py-4 text-sm resize-none" placeholder="Share a skill, tip, or win…" rows={4} value={caption} onChange={e => setCaption(e.target.value)} autoFocus />
                {files.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {files.map((f, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10">
                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => setFiles(p => p.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"><X className="w-3 h-3 text-white" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => fileRef.current?.click()} className="flex-1 btn-glass py-3 rounded-2xl text-sm flex items-center justify-center gap-2"><ImageIcon className="w-4 h-4" /> Media</button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={submit} disabled={uploading || (!caption.trim() && !files.length)} className="flex-1 btn-primary py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Posting…</> : 'Post'}
                  </motion.button>
                </div>
              </div>
              <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*" multiple onChange={e => { if (e.target.files) setFiles(p => [...p, ...Array.from(e.target.files!)].slice(0, 10)); }} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Feed ─────────────────────────────────────────────────────── */
export default function Feed() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [postToDelete, setPostToDelete] = useState<any>(null);

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:user_id(id,name,username,avatar_url,location), post_media(id,media_url,media_type), post_likes(user_id), saved_posts(user_id), comments(id)')
      .order('created_at', { ascending: false })
      .limit(60);
    if (error) { console.error('Feed error:', error); setLoading(false); return; }
    const enriched = (data ?? []).map(p => ({
      ...p,
      is_liked: (p.post_likes ?? []).some((l: any) => l.user_id === user?.id),
      is_saved: (p.saved_posts ?? []).some((s: any) => s.user_id === user?.id),
      _likes: p.post_likes?.length ?? 0,
      _comments: p.comments?.length ?? 0,
    }));
    setPosts(enriched);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchPosts();
    const ch = supabase.channel('feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, fetchPosts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchPosts]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, is_liked: !isLiked, _likes: p._likes + (isLiked ? -1 : 1) } : p));
    if (isLiked) await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    else await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
  };

  const handleSave = async (postId: string, isSaved: boolean) => {
    if (!user) return;
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, is_saved: !isSaved } : p));
    if (isSaved) await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id);
    else await supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id });
  };

  const handleDelete = async (postId: string) => {
    await supabase.from('posts').delete().eq('id', postId);
    setPostToDelete(null); fetchPosts(); showToast('Post deleted', 'success');
  };

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-20 pb-32">
      <Compose profile={profile} onPost={fetchPosts} />
      <div className="space-y-6">
        {loading
          ? [1,2,3].map(i => <PostSkeleton key={i} />)
          : posts.length === 0
            ? (
              <div className="py-24 text-center glass-card rounded-3xl">
                <ImageIcon className="w-12 h-12 text-white/12 mx-auto mb-4" />
                <p className="text-white/38 font-medium">No posts yet</p>
                <p className="text-white/22 text-sm mt-1">Be the first to share a skill!</p>
              </div>
            )
            : posts.map(post => (
              <PostCard key={post.id} post={post} userId={user?.id}
                onLike={handleLike} onSave={handleSave}
                onDelete={setPostToDelete} showToast={showToast} />
            ))
        }
      </div>

      {/* Delete confirm */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 modal-backdrop">
            <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="glass-modal p-8 rounded-3xl max-w-sm w-full text-center">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-400" /></div>
                <h3 className="text-xl font-black text-white mb-1">Delete Post?</h3>
                <p className="text-white/40 text-sm mb-6">This cannot be undone.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => handleDelete(postToDelete.id)} className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-full font-bold text-sm transition-colors">Delete Permanently</button>
                  <button onClick={() => setPostToDelete(null)} className="w-full btn-glass py-3.5 rounded-full text-sm font-bold">Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
