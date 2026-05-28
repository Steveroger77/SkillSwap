import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, uploadPostMedia } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal, MapPin,
  Image as ImageIcon, XCircle, Loader2, Trash2, Share2, Copy,
  ChevronLeft, ChevronRight, Plus, X, Hash, Flag, Link2,
} from 'lucide-react';
import { CommentSection } from '../components/CommentSection';

// ── Rich text renderer ────────────────────────────────────────────
function RichText({ text }: { text: string }) {
  if (!text) return null;
  return (
    <>
      {text.split(/(\s+)/).map((part, i) => {
        if (/^#\w+/.test(part)) {
          const tag = part.replace(/^#/, '').replace(/[^a-zA-Z0-9_]/g, '');
          return <Link key={i} to={`/hashtag/${tag}`} className="text-blue-400 hover:text-blue-300 font-medium transition-colors">{part}</Link>;
        }
        if (/^@\w+/.test(part)) return <span key={i} className="text-white font-semibold">{part}</span>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────
function PostSkeleton() {
  return (
    <div className="glass-card rounded-3xl overflow-hidden">
      <div className="px-4 py-3.5 flex gap-3 items-center">
        <div className="w-9 h-9 rounded-full shimmer flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="w-28 h-3 shimmer rounded-full" />
          <div className="w-16 h-2 shimmer rounded-full" />
        </div>
      </div>
      <div className="aspect-square w-full shimmer" />
      <div className="px-4 py-3 space-y-2">
        <div className="w-20 h-3 shimmer rounded-full" />
        <div className="w-full h-3 shimmer rounded-full" />
        <div className="w-2/3 h-3 shimmer rounded-full" />
      </div>
    </div>
  );
}

// ── Post Card ─────────────────────────────────────────────────────
function PostCard({ post, userId, onLike, onSave, onDelete, onCommentCountChange, showToast }: {
  post: any; userId?: string;
  onLike: (id: string, liked: boolean) => void;
  onSave: (id: string, saved: boolean) => void;
  onDelete: (post: any) => void;
  onCommentCountChange: (id: string, n: number) => void;
  showToast: (m: string, t?: any) => void;
}) {
  const [mediaIdx, setMediaIdx]           = useState(0);
  const [heartAnim, setHeartAnim]         = useState(false);
  const [showComments, setShowComments]   = useState(false);
  const [showShare, setShowShare]         = useState(false);
  const [showMenu, setShowMenu]           = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const lastTap = useRef(0);
  const touchStartX = useRef(0);
  const media = post.post_media ?? [];
  const isLong = (post.caption?.length ?? 0) > 100;

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300 && !post.is_liked) {
      onLike(post.id, false);
      setHeartAnim(true);
      setTimeout(() => setHeartAnim(false), 1000);
    }
    lastTap.current = now;
  };

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0 && mediaIdx < media.length - 1) setMediaIdx(i => i + 1);
      if (diff < 0 && mediaIdx > 0) setMediaIdx(i => i - 1);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    showToast('Link copied!', 'success');
    setShowShare(false); setShowMenu(false);
  };
  const nativeShare = () => {
    if (navigator.share) navigator.share({ title: 'SkillSwap', url: `${window.location.origin}/post/${post.id}` });
    else copyLink();
    setShowShare(false); setShowMenu(false);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="glass-card rounded-3xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/12 flex-shrink-0 bg-white/5">
            {post.profiles?.avatar_url
              ? <img src={post.profiles.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-full h-full flex items-center justify-center text-white/50 text-xs font-black">{post.profiles?.name?.[0]?.toUpperCase() || '?'}</div>}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-white text-sm leading-tight truncate">{post.profiles?.name || 'User'}</p>
            <p className="text-[10px] text-white/35 flex items-center gap-1 mt-0.5">
              <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
              <span className="truncate">{post.location || 'Remote'}</span>
            </p>
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="relative flex-shrink-0">
          <button onClick={() => setShowMenu(s => !s)} className="p-2 text-white/30 hover:text-white/70 transition-colors rounded-xl">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                  className="absolute right-0 top-10 z-50 glass-modal rounded-2xl overflow-hidden min-w-[180px] py-1"
                >
                  {[
                    { icon: Link2, label: 'Copy Link', action: copyLink },
                    { icon: Share2, label: 'Share Post', action: nativeShare },
                    ...(post.user_id === userId
                      ? [{ icon: Trash2, label: 'Delete Post', action: () => { onDelete(post); setShowMenu(false); }, danger: true }]
                      : [{ icon: Flag, label: 'Report', action: () => { showToast('Reported', 'info'); setShowMenu(false); } }]
                    ),
                  ].map(({ icon: Icon, label, action, danger }: any) => (
                    <button key={label} onClick={action}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-white/8 transition-colors relative z-10 ${danger ? 'text-red-400' : 'text-white/80'}`}>
                      <Icon className="w-4 h-4" />{label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Media */}
      {media.length > 0 ? (
        <div className="relative bg-black select-none" style={{ aspectRatio: '1/1' }}
          onClick={handleTap} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <AnimatePresence mode="wait">
            <motion.div key={mediaIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }} className="absolute inset-0">
              {media[mediaIdx]?.media_type === 'video'
                ? <video src={media[mediaIdx].media_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
                : <img src={media[mediaIdx]?.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
            </motion.div>
          </AnimatePresence>

          {/* Carousel arrows + dots */}
          {media.length > 1 && (
            <>
              {mediaIdx > 0 && (
                <button onClick={e => { e.stopPropagation(); setMediaIdx(i => i - 1); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 glass rounded-full items-center justify-center hidden md:flex">
                  <ChevronLeft className="w-4 h-4 text-white" />
                </button>
              )}
              {mediaIdx < media.length - 1 && (
                <button onClick={e => { e.stopPropagation(); setMediaIdx(i => i + 1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 glass rounded-full items-center justify-center hidden md:flex">
                  <ChevronRight className="w-4 h-4 text-white" />
                </button>
              )}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_: any, i: number) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setMediaIdx(i); }}
                    className={`rounded-full transition-all duration-300 ${i === mediaIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
                ))}
              </div>
              <div className="absolute top-3 right-3 px-2 py-0.5 glass rounded-full text-[10px] font-bold text-white/70">
                {mediaIdx + 1}/{media.length}
              </div>
            </>
          )}

          {/* Double-tap heart */}
          <AnimatePresence>
            {heartAnim && (
              <motion.div initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.2, opacity: 1 }}
                exit={{ scale: 1.8, opacity: 0 }} transition={{ duration: 0.45 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Heart className="w-28 h-28 fill-white text-white drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <div className="px-5 py-5 bg-white/[0.02]">
          <p className="text-white/80 text-[15px] leading-relaxed"><RichText text={post.caption} /></p>
        </div>
      )}

      {/* Actions */}
      <div className="px-4 pt-3 pb-2 relative z-10">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-4">
            {/* Like button */}
            <motion.button whileTap={{ scale: 0.72 }} onClick={() => onLike(post.id, post.is_liked)}>
              <AnimatePresence mode="wait">
                <motion.div key={post.is_liked ? 'on' : 'off'} initial={{ scale: 0.6 }} animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                  <Heart className={`w-[26px] h-[26px] transition-colors duration-150 ${post.is_liked ? 'fill-red-500 text-red-500' : 'text-white/70 hover:text-white'}`} />
                </motion.div>
              </AnimatePresence>
            </motion.button>

            {/* Comment button */}
            <motion.button whileTap={{ scale: 0.82 }} onClick={() => setShowComments(s => !s)}>
              <MessageCircle className={`w-[26px] h-[26px] transition-colors ${showComments ? 'fill-white/20 text-white' : 'text-white/70 hover:text-white'}`} />
            </motion.button>

            {/* Share button */}
            <motion.button whileTap={{ scale: 0.82 }} onClick={() => setShowShare(true)}>
              <Send className="w-[26px] h-[26px] text-white/70 hover:text-white transition-colors" />
            </motion.button>
          </div>

          {/* Save button */}
          <motion.button whileTap={{ scale: 0.82 }} onClick={() => onSave(post.id, post.is_saved)}>
            <Bookmark className={`w-[26px] h-[26px] transition-all duration-150 ${post.is_saved ? 'fill-white text-white' : 'text-white/70 hover:text-white'}`} />
          </motion.button>
        </div>

        {/* Likes count */}
        {post._likes > 0 && (
          <p className="text-sm font-bold text-white mb-1.5">
            {post._likes.toLocaleString()} {post._likes === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Caption */}
        {media.length > 0 && post.caption && (
          <p className="text-sm leading-snug text-white/78 mb-1.5">
            <span className="font-bold text-white mr-1.5">{post.profiles?.name}</span>
            <RichText text={captionExpanded || !isLong ? post.caption : post.caption.slice(0, 100) + '…'} />
            {isLong && (
              <button onClick={() => setCaptionExpanded(e => !e)} className="text-white/38 ml-1 text-xs font-medium hover:text-white/65">
                {captionExpanded ? 'less' : 'more'}
              </button>
            )}
          </p>
        )}

        {/* View comments */}
        {post._comments > 0 && !showComments && (
          <button onClick={() => setShowComments(true)}
            className="text-sm text-white/35 hover:text-white/60 transition-colors mb-1 block">
            View all {post._comments} comment{post._comments > 1 ? 's' : ''}
          </button>
        )}

        {/* Timestamp */}
        <p className="text-[10px] text-white/22 uppercase tracking-widest font-bold mb-1">
          {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'just now'}
        </p>

        {/* Comments section */}
        {showComments && (
          <CommentSection postId={post.id} onCountChange={n => onCommentCountChange(post.id, n)} />
        )}
      </div>

      {/* Share sheet */}
      <AnimatePresence>
        {showShare && (
          <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center modal-backdrop"
            onClick={() => setShowShare(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-headline font-black text-white">Share Post</h3>
                  <button onClick={() => setShowShare(false)}><X className="w-5 h-5 text-white/35" /></button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { icon: Copy,   label: 'Copy Link', action: copyLink },
                    { icon: Share2, label: 'Share',     action: nativeShare },
                    { icon: Link2,  label: 'Post Link', action: copyLink },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label} onClick={action} className="flex flex-col items-center gap-2.5">
                      <div className="w-14 h-14 rounded-2xl glass flex items-center justify-center hover:bg-white/12 active:scale-95 transition-all">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</span>
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

// ── Compose ───────────────────────────────────────────────────────
function Compose({ profile, onPost }: { profile: any; onPost: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen]           = useState(false);
  const [caption, setCaption]     = useState('');
  const [files, setFiles]         = useState<File[]>([]);
  const [previews, setPreviews]   = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = (fl: FileList | null) => {
    if (!fl) return;
    const arr = Array.from(fl).slice(0, 10 - files.length);
    setFiles(p => [...p, ...arr]);
    setPreviews(p => [...p, ...arr.map(f => URL.createObjectURL(f))]);
  };

  const removeFile = (i: number) => {
    URL.revokeObjectURL(previews[i]);
    setFiles(p => p.filter((_, j) => j !== i));
    setPreviews(p => p.filter((_, j) => j !== i));
  };

  const submit = async () => {
    if (!user || (!caption.trim() && !files.length)) return;
    setUploading(true);
    try {
      const { data: post, error } = await supabase
        .from('posts')
        .insert({ user_id: user.id, caption: caption.trim(), location: profile?.location || 'Remote' })
        .select().single();
      if (error) throw error;
      if (files.length) {
        const rows = await Promise.all(files.map(f => uploadPostMedia(user.id, f)));
        const { error: me } = await supabase.from('post_media').insert(rows.map(r => ({ post_id: post.id, ...r })));
        if (me) throw me;
      }
      setCaption(''); setFiles([]); setPreviews([]); setOpen(false);
      showToast('Posted! 🎉', 'success');
      onPost();
    } catch (e: any) {
      showToast(e.message || 'Failed to post', 'error');
    } finally { setUploading(false); }
  };

  const Previews = () => previews.length > 0 ? (
    <div className="flex gap-2 flex-wrap">
      {previews.map((src, i) => (
        <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
          {files[i]?.type.startsWith('video')
            ? <video src={src} className="w-full h-full object-cover" />
            : <img src={src} className="w-full h-full object-cover" alt="" />}
          <button onClick={() => removeFile(i)}
            className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/70 rounded-full flex items-center justify-center">
            <X className="w-2.5 h-2.5 text-white" />
          </button>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block glass-card rounded-3xl p-5 mb-6 relative overflow-hidden">
        <div className="relative z-10 flex gap-3">
          <div className="w-9 h-9 rounded-full overflow-hidden border border-white/12 flex-shrink-0 bg-white/5">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-full h-full flex items-center justify-center text-white/40 text-xs font-black">{profile?.name?.[0]?.toUpperCase() || '?'}</div>}
          </div>
          <div className="flex-1 space-y-3">
            <textarea className="glass-input w-full rounded-2xl px-4 py-3 text-sm resize-none leading-relaxed"
              placeholder="Share a skill, tip, or achievement…"
              rows={caption.length > 80 ? 3 : 2} value={caption}
              onChange={e => setCaption(e.target.value)} />
            <Previews />
            <div className="flex items-center justify-between">
              <div className="flex gap-4">
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 text-white/35 hover:text-white/65 transition-colors text-xs font-bold uppercase tracking-wider">
                  <ImageIcon className="w-4 h-4" />
                  {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Media'}
                </button>
                <button className="flex items-center gap-1.5 text-white/35 hover:text-white/65 transition-colors text-xs font-bold uppercase tracking-wider">
                  <Hash className="w-4 h-4" /> Hashtag
                </button>
              </div>
              <motion.button whileTap={{ scale: 0.95 }} onClick={submit}
                disabled={uploading || (!caption.trim() && !files.length)}
                className="btn-primary px-6 py-2.5 rounded-full text-xs font-bold flex items-center gap-1.5 disabled:opacity-40">
                {uploading && <Loader2 className="w-3 h-3 animate-spin" />}
                {uploading ? 'Posting…' : 'Post'}
              </motion.button>
            </div>
          </div>
        </div>
        <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*" multiple onChange={e => addFiles(e.target.files)} />
      </div>

      {/* Mobile FAB */}
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-24 right-4 z-40 w-14 h-14 btn-primary rounded-full flex items-center justify-center"
        style={{ boxShadow: '0 8px 32px rgba(255,255,255,0.22)' }}>
        <Plus className="w-6 h-6" />
      </motion.button>

      {/* Mobile sheet */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[80] flex items-end modal-backdrop md:hidden" onClick={() => setOpen(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal rounded-t-3xl p-6 w-full max-h-[90svh] overflow-y-auto">
              <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-5" />
              <div className="relative z-10 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-headline font-black text-white">New Post</h3>
                  <button onClick={() => setOpen(false)}><XCircle className="w-5 h-5 text-white/35" /></button>
                </div>
                <textarea className="glass-input w-full rounded-2xl px-4 py-4 text-sm resize-none leading-relaxed"
                  placeholder="Share a skill, tip, or achievement…" rows={4}
                  value={caption} onChange={e => setCaption(e.target.value)} autoFocus />
                <Previews />
                <div className="flex gap-3">
                  <button onClick={() => fileRef.current?.click()}
                    className="flex-1 btn-glass py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Media
                  </button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={submit}
                    disabled={uploading || (!caption.trim() && !files.length)}
                    className="flex-1 btn-primary py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40">
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" />Posting…</> : 'Post'}
                  </motion.button>
                </div>
              </div>
              <input ref={fileRef} type="file" className="hidden" accept="image/*,video/*" multiple onChange={e => addFiles(e.target.files)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Feed ──────────────────────────────────────────────────────────
export default function Feed() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [postToDelete, setPostToDelete] = useState<any>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchPosts = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, name, username, avatar_url, location),
        post_media (id, media_url, media_type),
        post_likes (user_id),
        saved_posts (user_id),
        comments (id)
      `)
      .order('created_at', { ascending: false })
      .limit(60);

    if (error) {
      console.error('Feed error:', error.message);
      showToast('Failed to load feed', 'error');
    } else {
      setPosts((data ?? []).map(p => ({
        ...p,
        is_liked:  (p.post_likes  ?? []).some((l: any) => l.user_id === user?.id),
        is_saved:  (p.saved_posts ?? []).some((s: any) => s.user_id === user?.id),
        _likes:    p.post_likes?.length  ?? 0,
        _comments: p.comments?.length   ?? 0,
      })));
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => {
    fetchPosts();
    const ch = supabase.channel('feed-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' },     () => fetchPosts(true))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'posts' },     () => fetchPosts(true))
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'post_likes' },() => fetchPosts(true))
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'saved_posts'},() => fetchPosts(true))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchPosts]);

  // Optimistic like
  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    setPosts(ps => ps.map(p => p.id === postId
      ? { ...p, is_liked: !isLiked, _likes: p._likes + (isLiked ? -1 : 1) } : p));
    if (isLiked) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) setPosts(ps => ps.map(p => p.id === postId ? { ...p, is_liked: true, _likes: p._likes + 1 } : p));
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      if (error && !error.message?.includes('duplicate'))
        setPosts(ps => ps.map(p => p.id === postId ? { ...p, is_liked: false, _likes: p._likes - 1 } : p));
    }
  };

  // Optimistic save
  const handleSave = async (postId: string, isSaved: boolean) => {
    if (!user) return;
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, is_saved: !isSaved } : p));
    if (isSaved) {
      const { error } = await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id);
      if (error) {
        setPosts(ps => ps.map(p => p.id === postId ? { ...p, is_saved: true } : p));
        showToast('Failed to unsave', 'error');
      } else showToast('Removed from saved', 'info');
    } else {
      const { error } = await supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id });
      if (error && !error.message?.includes('duplicate')) {
        setPosts(ps => ps.map(p => p.id === postId ? { ...p, is_saved: false } : p));
        showToast('Failed to save', 'error');
      } else if (!error) showToast('Saved! 🔖', 'success');
    }
  };

  const handleDelete = async () => {
    if (!postToDelete || !user) return;
    setDeleting(true);
    const { error } = await supabase.from('posts').delete().eq('id', postToDelete.id).eq('user_id', user.id);
    if (error) showToast('Failed to delete', 'error');
    else { setPosts(ps => ps.filter(p => p.id !== postToDelete.id)); showToast('Post deleted', 'success'); }
    setPostToDelete(null);
    setDeleting(false);
  };

  const handleCommentCountChange = (postId: string, n: number) => {
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, _comments: n } : p));
  };

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-16 pb-32">
      <AnimatePresence>
        {refreshing && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-white/30" />
          </motion.div>
        )}
      </AnimatePresence>

      <Compose profile={profile} onPost={() => fetchPosts(true)} />

      <div className="space-y-5">
        {loading ? (
          [1, 2, 3].map(i => <PostSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-3xl py-24 text-center">
            <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center mx-auto mb-5">
              <ImageIcon className="w-10 h-10 text-white/15" />
            </div>
            <p className="text-white/40 font-semibold text-lg">No posts yet</p>
            <p className="text-white/22 text-sm mt-1">Be the first to share a skill!</p>
          </motion.div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} userId={user?.id}
              onLike={handleLike} onSave={handleSave} onDelete={setPostToDelete}
              onCommentCountChange={handleCommentCountChange} showToast={showToast} />
          ))
        )}
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 modal-backdrop">
            <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.88, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}
              className="glass-modal p-8 rounded-3xl max-w-sm w-full text-center">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-7 h-7 text-red-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-1">Delete Post?</h3>
                <p className="text-white/40 text-sm mb-6">This cannot be undone.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={handleDelete} disabled={deleting}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white py-3.5 rounded-full font-bold text-sm transition-colors flex items-center justify-center gap-2">
                    {deleting && <Loader2 className="w-4 h-4 animate-spin" />}Delete Permanently
                  </button>
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
