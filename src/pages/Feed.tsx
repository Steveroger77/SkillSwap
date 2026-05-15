import { useState, useEffect, useRef } from 'react';
import { supabase, uploadPostMedia } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  Heart, MessageCircle, Send, Bookmark, MoreHorizontal,
  MapPin, Image as ImageIcon, Hash, XCircle, Loader2,
  Trash2, Share2, Copy, ChevronLeft, ChevronRight, Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { CommentSection } from '../components/CommentSection';
import { motion, AnimatePresence } from 'motion/react';

// ── Hashtag / mention renderer ──────────────────────────────────────────────
const HashtagText = ({ text }: { text: string }) => {
  if (!text) return null;
  return (
    <>
      {text.split(/(\s+)/).map((part, i) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1).replace(/[.,!?;:]+$/, '');
          return <Link key={i} to={`/hashtag/${tag}`} className="text-white font-bold hover:underline">{part}</Link>;
        }
        if (part.startsWith('@')) {
          return <span key={i} className="text-white font-bold cursor-pointer">{part}</span>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

// ── PostItem ─────────────────────────────────────────────────────────────────
function PostItem({ post, userId, handleLike, handleSave, setPostToDelete, activeComments, setActiveComments, showShareModal, setShowShareModal, showToast }: any) {
  const [mediaIdx, setMediaIdx] = useState(0);
  const [showHeart, setShowHeart] = useState(false);
  const lastTap = useRef<number>(0);

  const doubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!post.is_liked) handleLike(post.id, false);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 900);
    }
    lastTap.current = now;
  };

  const media = post.post_media ?? [];
  const ts = post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'just now';

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-3xl overflow-hidden shadow-2xl"
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15">
            {post.profiles?.avatar_url
              ? <img src={post.profiles.avatar_url} alt={post.profiles?.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 font-bold text-sm">
                  {post.profiles?.name?.[0]?.toUpperCase() || '?'}
                </div>
            }
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-tight">{post.profiles?.name}</p>
            <p className="text-[10px] text-white/38 flex items-center gap-1 uppercase font-bold tracking-[0.1em] mt-0.5">
              <MapPin className="w-2.5 h-2.5" /> {post.location || 'Remote'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {post.user_id === userId && (
            <button onClick={() => setPostToDelete(post)} className="p-2 text-red-500/40 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 text-white/35 hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Media */}
      {media.length > 0 ? (
        <div className="relative aspect-square select-none bg-black/20" onClick={doubleTap}>
          <AnimatePresence mode="wait">
            <motion.div key={mediaIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="absolute inset-0">
              {media[mediaIdx]?.media_type === 'video' ? (
                <video src={media[mediaIdx].media_url} className="w-full h-full object-cover" controls autoPlay muted loop playsInline />
              ) : (
                <img src={media[mediaIdx]?.media_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              )}
            </motion.div>
          </AnimatePresence>

          {media.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setMediaIdx(i => Math.max(0, i - 1)); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white opacity-0 hover:opacity-100 transition-opacity backdrop-blur-md"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setMediaIdx(i => Math.min(media.length - 1, i + 1)); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white opacity-0 hover:opacity-100 transition-opacity backdrop-blur-md"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_: any, i: number) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setMediaIdx(i); }}
                    className={`rounded-full transition-all ${i === mediaIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'}`} />
                ))}
              </div>
            </>
          )}

          <AnimatePresence>
            {showHeart && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.4, opacity: 1 }} exit={{ scale: 2, opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <Heart className="w-28 h-28 text-white fill-current drop-shadow-2xl" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        // Text-only post
        <div className="px-6 py-8 bg-white/[0.02] min-h-[100px] flex items-center">
          <p className="text-white/80 text-base leading-relaxed"><HashtagText text={post.caption} /></p>
        </div>
      )}

      {/* Actions */}
      <div className="px-5 py-4 relative z-10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex gap-5">
            <button
              onClick={() => { handleLike(post.id, post.is_liked); if (!post.is_liked) { setShowHeart(true); setTimeout(() => setShowHeart(false), 900); } }}
              className="transition-transform active:scale-90"
            >
              <Heart className={`w-6 h-6 transition-all duration-200 ${post.is_liked ? 'text-red-500 fill-current scale-110' : 'text-white/80 hover:text-white'}`} />
            </button>
            <button
              onClick={() => setActiveComments(activeComments === post.id ? null : post.id)}
              className="transition-transform active:scale-90"
            >
              <MessageCircle className={`w-6 h-6 transition-colors ${activeComments === post.id ? 'text-white fill-current' : 'text-white/80 hover:text-white'}`} />
            </button>
            <button onClick={() => setShowShareModal(post.id)} className="transition-transform active:scale-90">
              <Send className="w-6 h-6 text-white/80 hover:text-white transition-colors" />
            </button>
          </div>
          <button onClick={() => handleSave(post.id, post.is_saved)} className="transition-transform active:scale-90">
            <Bookmark className={`w-6 h-6 transition-all duration-200 ${post.is_saved ? 'text-white fill-current' : 'text-white/80 hover:text-white'}`} />
          </button>
        </div>

        <div className="space-y-1">
          {post._count?.post_likes > 0 && (
            <p className="text-sm font-bold text-white">
              {post._count.post_likes.toLocaleString()} {post._count.post_likes === 1 ? 'like' : 'likes'}
            </p>
          )}
          {media.length > 0 && post.caption && (
            <p className="text-sm leading-snug text-white/80">
              <span className="font-bold text-white mr-2">{post.profiles?.name}</span>
              <HashtagText text={post.caption} />
            </p>
          )}
          {post._count?.comments > 0 && activeComments !== post.id && (
            <button onClick={() => setActiveComments(post.id)} className="text-sm text-white/38 hover:text-white/65 transition-colors">
              View all {post._count.comments} comments
            </button>
          )}
          <p className="text-[10px] text-white/28 uppercase font-bold tracking-[0.1em] pt-0.5">{ts}</p>
        </div>

        {activeComments === post.id && <CommentSection postId={post.id} />}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal === post.id && (
          <div
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center modal-backdrop"
            onClick={() => setShowShareModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal p-7 rounded-t-3xl sm:rounded-3xl max-w-sm w-full"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-6 sm:hidden" />
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-headline font-black text-white">Share Post</h3>
                <button onClick={() => setShowShareModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <XCircle className="w-5 h-5 text-white/40" />
                </button>
              </div>
              <div className="flex gap-8 justify-center relative z-10">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
                    showToast('Link copied!', 'success');
                    setShowShareModal(null);
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-all">
                    <Copy className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">Copy Link</span>
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: 'SkillSwap Post', url: `${window.location.origin}/post/${post.id}` });
                    }
                    setShowShareModal(null);
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full glass flex items-center justify-center hover:bg-white/15 transition-all">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/45">Share</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

// ── Feed ─────────────────────────────────────────────────────────────────────
export default function Feed() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts]               = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [caption, setCaption]           = useState('');
  const [files, setFiles]               = useState<File[]>([]);
  const [uploading, setUploading]       = useState(false);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<any>(null);
  const [showCompose, setShowCompose]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id ( id, name, username, avatar_url, location ),
        post_media ( id, media_url, media_type ),
        post_likes ( user_id ),
        saved_posts ( user_id ),
        comments ( id )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { console.error(error); setLoading(false); return; }

    const enriched = (data ?? []).map(p => ({
      ...p,
      is_liked: p.post_likes?.some((l: any) => l.user_id === user?.id) ?? false,
      is_saved: p.saved_posts?.some((s: any) => s.user_id === user?.id) ?? false,
      _count: { post_likes: p.post_likes?.length ?? 0, comments: p.comments?.length ?? 0 },
    }));

    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    const sub = supabase
      .channel('feed-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, fetchPosts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'saved_posts' }, fetchPosts)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    // Optimistic update
    setPosts(ps => ps.map(p => p.id === postId ? {
      ...p, is_liked: !isLiked,
      _count: { ...p._count, post_likes: p._count.post_likes + (isLiked ? -1 : 1) },
    } : p));
    if (isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
    }
  };

  const handleSave = async (postId: string, isSaved: boolean) => {
    if (!user) return;
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, is_saved: !isSaved } : p));
    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', user.id);
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: user.id });
    }
  };

  const handleCreatePost = async () => {
    if (!user || (!caption.trim() && files.length === 0)) return;
    setUploading(true);
    try {
      const { data: post, error: postErr } = await supabase
        .from('posts')
        .insert({ user_id: user.id, caption: caption.trim(), location: profile?.location || 'Remote' })
        .select()
        .single();
      if (postErr) throw postErr;

      if (files.length > 0) {
        const mediaRows = await Promise.all(files.map(f => uploadPostMedia(user.id, f)));
        await supabase.from('post_media').insert(mediaRows.map(r => ({ post_id: post.id, ...r })));
      }

      setCaption('');
      setFiles([]);
      setShowCompose(false);
      showToast('Post shared! 🎉', 'success');
      fetchPosts();
    } catch (err: any) {
      showToast(err.message || 'Failed to create post', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) showToast('Failed to delete post', 'error');
    else { setPostToDelete(null); fetchPosts(); showToast('Post deleted', 'success'); }
  };

  return (
    <main className="max-w-xl mx-auto px-4 pt-20 pb-32">
      {/* Compose trigger (desktop inline) */}
      <div className="glass-card rounded-3xl p-5 mb-8 relative overflow-hidden hidden md:block">
        <div className="relative z-10 flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/15 flex-shrink-0">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 font-bold text-sm">
                  {profile?.name?.[0]?.toUpperCase() || '?'}
                </div>
            }
          </div>
          <div className="flex-1 space-y-4">
            <textarea
              className="glass-input w-full rounded-2xl px-5 py-3.5 text-sm resize-none"
              placeholder="Share a skill, tip, or achievement…"
              rows={caption.length > 80 ? 3 : 2}
              value={caption}
              onChange={e => setCaption(e.target.value)}
            />

            {files.length > 0 && (
              <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                {files.map((f, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/12 flex-shrink-0">
                    <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                    <button onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                      <XCircle className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="flex gap-4">
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-white/45 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
                  <ImageIcon className="w-4 h-4" />
                  {files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Media'}
                </button>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" multiple
                  onChange={e => { if (e.target.files) setFiles(p => [...p, ...Array.from(e.target.files!)].slice(0, 10)); }} />
                <button className="flex items-center gap-1.5 text-white/45 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider">
                  <Hash className="w-4 h-4" /> Topics
                </button>
              </div>
              <button
                onClick={handleCreatePost}
                disabled={uploading || (!caption.trim() && files.length === 0)}
                className="btn-primary px-7 py-2.5 rounded-full text-xs font-bold tracking-wider flex items-center gap-2"
              >
                {uploading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {uploading ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile FAB compose */}
      <button
        onClick={() => setShowCompose(true)}
        className="md:hidden fixed bottom-28 right-5 z-40 w-14 h-14 btn-primary rounded-full shadow-2xl flex items-center justify-center glow-white"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Mobile Compose Modal */}
      <AnimatePresence>
        {showCompose && (
          <div className="fixed inset-0 z-[80] flex items-end justify-center modal-backdrop md:hidden" onClick={() => setShowCompose(false)}>
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal rounded-t-3xl p-6 w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5" />
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-headline font-black text-white">New Post</h3>
                  <button onClick={() => setShowCompose(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <XCircle className="w-5 h-5 text-white/40" />
                  </button>
                </div>
                <textarea
                  className="glass-input w-full rounded-2xl px-5 py-4 text-sm resize-none"
                  placeholder="Share a skill, tip, or achievement…"
                  rows={4}
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  autoFocus
                />
                {files.length > 0 && (
                  <div className="flex gap-2.5 overflow-x-auto pb-1 custom-scrollbar">
                    {files.map((f, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-white/12 flex-shrink-0">
                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => setFiles(p => p.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5">
                          <XCircle className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex-1 btn-glass py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Media
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" multiple
                    onChange={e => { if (e.target.files) setFiles(p => [...p, ...Array.from(e.target.files!)].slice(0, 10)); }} />
                  <button
                    onClick={handleCreatePost}
                    disabled={uploading || (!caption.trim() && files.length === 0)}
                    className="flex-1 btn-primary py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Posting…</> : 'Post'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Feed */}
      <div className="space-y-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-3xl overflow-hidden">
              <div className="p-5 flex gap-3 items-center">
                <div className="w-10 h-10 rounded-full shimmer flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="w-28 h-3 rounded shimmer" />
                  <div className="w-18 h-2 rounded shimmer" />
                </div>
              </div>
              <div className="aspect-square w-full shimmer" />
              <div className="p-5 space-y-2">
                <div className="w-full h-3 rounded shimmer" />
                <div className="w-2/3 h-3 rounded shimmer" />
              </div>
            </div>
          ))
        ) : posts.length === 0 ? (
          <div className="text-center py-24 glass-card rounded-3xl">
            <ImageIcon className="w-12 h-12 text-white/15 mx-auto mb-4" />
            <p className="text-white/40 font-medium">No posts yet.</p>
            <p className="text-white/25 text-sm mt-1">Be the first to share a skill!</p>
          </div>
        ) : (
          posts.map(post => (
            <PostItem
              key={post.id}
              post={post}
              userId={user?.id}
              handleLike={handleLike}
              handleSave={handleSave}
              setPostToDelete={setPostToDelete}
              activeComments={activeComments}
              setActiveComments={setActiveComments}
              showShareModal={showShareModal}
              setShowShareModal={setShowShareModal}
              showToast={showToast}
            />
          ))
        )}
      </div>

      {/* Delete Post Modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 modal-backdrop">
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              className="glass-modal p-8 rounded-3xl max-w-sm w-full space-y-6 text-center relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 bg-red-500/12 rounded-full flex items-center justify-center mx-auto">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <div className="space-y-2 mt-4">
                  <h3 className="text-xl font-bold text-white">Delete Post?</h3>
                  <p className="text-white/45 text-sm">This action cannot be undone.</p>
                </div>
                <div className="flex flex-col gap-3 mt-6">
                  <button onClick={() => handleDeletePost(postToDelete.id)}
                    className="w-full bg-red-500 text-white py-3.5 rounded-full font-bold text-sm hover:bg-red-600 transition-colors">
                    Delete Permanently
                  </button>
                  <button onClick={() => setPostToDelete(null)}
                    className="w-full btn-glass py-3.5 rounded-full text-sm font-bold">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
