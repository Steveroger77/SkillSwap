import { useState, useEffect, useRef } from 'react';
import { db, storage } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  increment
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  MapPin, 
  Image as ImageIcon, 
  Hash, 
  XCircle, 
  Loader2, 
  Trash2, 
  Share2, 
  Copy, 
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';
import { CommentSection } from '../components/CommentSection';
import { motion, AnimatePresence } from 'motion/react';

const HashtagText = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('#')) {
          const tag = part.slice(1).replace(/[.,!?;:]+$/, '');
          return (
            <Link key={i} to={`/hashtag/${tag}`} className="text-white font-bold hover:underline">
              {part}
            </Link>
          );
        }
        if (part.startsWith('@')) {
          return (
            <span key={i} className="text-white font-bold hover:underline cursor-pointer">
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
};

export default function Feed() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeComments, setActiveComments] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('created_at', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = await Promise.all(snapshot.docs.map(async (postDoc) => {
        const data = postDoc.data();
        
        // Fetch author profile
        const authorSnap = await getDoc(doc(db, 'users', data.user_id));
        const authorData = authorSnap.exists() ? authorSnap.data() : null;

        // Check if liked by current user
        let isLiked = false;
        if (user) {
          const likeSnap = await getDoc(doc(db, 'posts', postDoc.id, 'likes', user.uid));
          isLiked = likeSnap.exists();
        }

        // Check if saved by current user
        let isSaved = false;
        if (user) {
          const saveSnap = await getDoc(doc(db, 'users', user.uid, 'saved_posts', postDoc.id));
          isSaved = saveSnap.exists();
        }

        // Get like count
        const likeCount = data.likes_count || 0;

        // Get comment count
        const commentCount = data.comments_count || 0;

        return {
          id: postDoc.id,
          ...data,
          profiles: authorData,
          is_liked: isLiked,
          is_saved: isSaved,
          _count: {
            post_likes: likeCount,
            comments: commentCount
          }
        };
      }));

      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching posts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      const likeRef = doc(db, 'posts', postId, 'likes', user.uid);
      const postRef = doc(db, 'posts', postId);
      
      if (isLiked) {
        await deleteDoc(likeRef);
        await updateDoc(postRef, {
          likes_count: increment(-1),
          updated_at: serverTimestamp()
        });
      } else {
        await setDoc(likeRef, { created_at: serverTimestamp() });
        await updateDoc(postRef, {
          likes_count: increment(1),
          updated_at: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async (postId: string, isSaved: boolean) => {
    if (!user) return;
    try {
      const saveRef = doc(db, 'users', user.uid, 'saved_posts', postId);
      if (isSaved) {
        await deleteDoc(saveRef);
      } else {
        await setDoc(saveRef, { created_at: serverTimestamp() });
      }
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...files].slice(0, 10)); // Max 10 files
    }
  };

  const handleCreatePost = async () => {
    if (!user || (!newPostContent.trim() && selectedFiles.length === 0)) return;
    console.log('Starting post creation...');
    setUploading(true);
    try {
      const media = [];
      
      if (selectedFiles.length > 0) {
        console.log(`Uploading ${selectedFiles.length} files...`);
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.uid}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
          const storageRef = ref(storage, `posts/${user.uid}/${fileName}`);
          
          console.log(`Uploading file: ${fileName}`);
          await uploadBytes(storageRef, file);
          const url = await getDownloadURL(storageRef);
          
          media.push({
            url,
            type: file.type.startsWith('video') ? 'video' : 'image'
          });
        }
      }

      // Extract hashtags and mentions
      const hashtags = newPostContent.match(/#\w+/g)?.map(tag => tag.slice(1).toLowerCase()) || [];
      const mentions = newPostContent.match(/@\w+/g)?.map(mention => mention.slice(1)) || [];

      console.log('Saving post to Firestore...', {
        user_id: user.uid,
        media_count: media.length,
        hashtags_count: hashtags.length
      });

      const postData = {
        user_id: user.uid,
        caption: newPostContent,
        location: profile?.location || 'Remote',
        created_at: serverTimestamp(),
        media,
        hashtags,
        mentions
      };

      try {
        await addDoc(collection(db, 'posts'), postData);
        console.log('Post created successfully!');
        setNewPostContent('');
        setSelectedFiles([]);
      } catch (error) {
        // Use the required error handling pattern
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          operationType: 'create',
          path: 'posts',
          authInfo: {
            userId: user.uid,
            email: user.email,
            emailVerified: user.emailVerified
          }
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        showToast(`Error creating post: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('General Error in handleCreatePost:', error);
      showToast(`Error: ${error instanceof Error ? error.message : 'An unexpected error occurred'}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (postId: string, mediaUrls?: string[]) => {
    if (!user) return;
    console.log('Attempting to delete post:', postId);
    try {
      if (mediaUrls) {
        console.log('Deleting media items:', mediaUrls.length);
        for (const url of mediaUrls) {
          if (url.includes('firebasestorage')) {
            try {
              const fileRef = ref(storage, url);
              await deleteObject(fileRef);
              console.log('Deleted media from storage:', url);
            } catch (e) {
              console.warn('Could not delete post media:', e);
            }
          }
        }
      }
      console.log('Deleting document from Firestore...');
      await deleteDoc(doc(db, 'posts', postId));
      console.log('Document deleted successfully');
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast(`Error deleting post: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('Link copied to clipboard!', 'success');
    setShowShareModal(null);
  };

  return (
    <main className="max-w-2xl mx-auto pt-24 pb-32 px-4 space-y-12">
      {/* Post Creation Card */}
      <section className="glass-card rounded-xl p-6 transition-all hover:bg-white/10 group shadow-2xl">
        <div className="flex gap-4 items-start mb-6 relative z-10">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-surface-container-highest border border-white/10">
            <img 
              src={profile?.avatar_url || `https://picsum.photos/seed/${user?.uid}/200`} 
              alt="Profile" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <textarea 
            className="flex-1 text-left px-6 py-3 rounded-2xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors border border-white/5 outline-none focus:ring-1 focus:ring-white/20 resize-none h-24"
            placeholder="What skill are you sharing today? Use #hashtags or @mentions"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
          />
        </div>
        
        <div className="flex justify-between items-center px-2 relative z-10">
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors group/item cursor-pointer">
              <ImageIcon className="w-5 h-5 group-hover/item:scale-110 transition-transform" />
              <span className="text-sm font-semibold uppercase tracking-tighter">
                {selectedFiles.length > 0 ? `${selectedFiles.length} Selected` : 'Media'}
              </span>
              <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleFileChange} />
            </label>
            <button className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors group/item">
              <Hash className="w-5 h-5 group-hover/item:scale-110 transition-transform" />
              <span className="text-sm font-semibold uppercase tracking-tighter">Topics</span>
            </button>
          </div>
          <button 
            onClick={() => {
              console.log('Post button clicked');
              handleCreatePost();
            }}
            disabled={uploading || (!newPostContent.trim() && selectedFiles.length === 0)}
            className={`px-8 py-2.5 rounded-full font-bold text-sm tracking-tight transition-all shadow-lg flex items-center gap-2 ${
              uploading || (!newPostContent.trim() && selectedFiles.length === 0)
                ? 'bg-white/10 text-white/20 cursor-not-allowed'
                : 'bg-white text-black hover:scale-105 active:scale-95'
            }`}
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading ? 'POSTING...' : 'POST'}
          </button>
        </div>

        {selectedFiles.length > 0 && (
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
            {selectedFiles.map((file, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Preview" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedFiles(prev => prev.filter((_, index) => index !== i))}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Feed List */}
      <div className="space-y-12">
        {loading ? (
          <div className="space-y-12">
            {[1, 2].map(i => (
              <div key={i} className="glass-card rounded-xl overflow-hidden opacity-50 shadow-2xl animate-pulse">
                <div className="p-6 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10"></div>
                  <div className="space-y-2">
                    <div className="w-24 h-3 rounded bg-white/10"></div>
                    <div className="w-16 h-2 rounded bg-white/10"></div>
                  </div>
                </div>
                <div className="aspect-square w-full bg-white/5"></div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 glass-card rounded-xl">
            <ImageIcon className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
            <p className="text-on-surface-variant font-medium">No posts yet. Be the first to share a skill!</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostItem 
              key={post.id} 
              post={post} 
              user={user} 
              handleLike={handleLike} 
              handleSave={handleSave} 
              handleDeletePost={handleDeletePost}
              setPostToDelete={setPostToDelete}
              activeComments={activeComments}
              setActiveComments={setActiveComments}
              showShareModal={showShareModal}
              setShowShareModal={setShowShareModal}
              copyToClipboard={copyToClipboard}
            />
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 rounded-3xl max-w-sm w-full space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Delete Post?</h3>
                <p className="text-on-surface-variant text-sm">This action cannot be undone. All media and data will be permanently removed.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDeletePost(postToDelete.id, postToDelete.media?.map((m: any) => m.url))}
                  className="w-full bg-red-500 text-white py-3 rounded-full font-bold text-sm tracking-tight hover:bg-red-600 transition-colors"
                >
                  Delete Permanently
                </button>
                <button 
                  onClick={() => setPostToDelete(null)}
                  className="w-full bg-white/10 text-white py-3 rounded-full font-bold text-sm tracking-tight hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function PostItem({ 
  post, 
  user, 
  handleLike, 
  handleSave, 
  handleDeletePost, 
  activeComments, 
  setActiveComments,
  showShareModal,
  setShowShareModal,
  setPostToDelete,
  copyToClipboard
}: any) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showHeartPop, setShowHeartPop] = useState(false);
  const lastTap = useRef<number>(0);

  const handleDoubleTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      if (!post.is_liked) {
        handleLike(post.id, false);
      }
      setShowHeartPop(true);
      setTimeout(() => setShowHeartPop(false), 1000);
    }
    lastTap.current = now;
  };

  return (
    <article className="glass-card rounded-xl overflow-hidden shadow-2xl">
      <div className="p-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20">
            <img 
              src={post.profiles?.avatar_url || `https://picsum.photos/seed/${post.user_id}/200`} 
              alt={post.profiles?.name} 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <p className="font-bold font-headline tracking-tight text-white">{post.profiles?.name}</p>
            <p className="text-xs text-on-surface-variant flex items-center gap-1 uppercase font-bold tracking-widest">
              <MapPin className="w-3 h-3" /> {post.location || 'Remote'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.user_id === user?.uid && (
            <button 
              onClick={() => setPostToDelete(post)}
              className="text-red-500/50 hover:text-red-500 transition-colors p-2"
              title="Delete Post"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <button className="text-on-surface-variant hover:text-white transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="aspect-square w-full relative group select-none" onClick={handleDoubleTap}>
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentMediaIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full"
          >
            {post.media?.[currentMediaIndex]?.type === 'video' ? (
              <video 
                src={post.media[currentMediaIndex].url} 
                className="w-full h-full object-cover"
                controls
                autoPlay
                muted
                loop
              />
            ) : (
              <img 
                src={post.media?.[currentMediaIndex]?.url || `https://picsum.photos/seed/${post.id}/800`} 
                alt="Content" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Media Navigation */}
        {post.media?.length > 1 && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(prev => Math.max(0, prev - 1)); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentMediaIndex(prev => Math.min(post.media.length - 1, prev + 1)); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
              {post.media.map((_: any, i: number) => (
                <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentMediaIndex ? 'bg-white' : 'bg-white/30'}`} />
              ))}
            </div>
          </>
        )}

        {/* Heart Pop Animation */}
        <AnimatePresence>
          {showHeartPop && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <Heart className="w-32 h-32 text-white fill-current drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 relative z-10">
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-4">
            <button 
              onClick={() => {
                handleLike(post.id, !!post.is_liked);
                if (!post.is_liked) {
                  setShowHeartPop(true);
                  setTimeout(() => setShowHeartPop(false), 1000);
                }
              }}
              className="group/btn"
            >
              <Heart className={`w-7 h-7 group-hover/btn:scale-125 transition-transform ${post.is_liked ? 'text-red-500 fill-current' : 'text-white'}`} />
            </button>
            <button 
              onClick={() => setActiveComments(activeComments === post.id ? null : post.id)}
              className="group/btn"
            >
              <MessageCircle className={`w-7 h-7 group-hover/btn:scale-125 transition-transform ${activeComments === post.id ? 'text-white fill-current' : 'text-white'}`} />
            </button>
            <button 
              onClick={() => setShowShareModal(post.id)}
              className="group/btn"
            >
              <Share2 className="w-7 h-7 group-hover/btn:scale-125 transition-transform text-white" />
            </button>
          </div>
          <button 
            onClick={() => handleSave(post.id, !!post.is_saved)}
            className={post.is_saved ? 'text-white' : 'text-on-surface-variant hover:text-white'}
          >
            <Bookmark className={`w-7 h-7 ${post.is_saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        <div className="space-y-1.5">
          {post._count?.post_likes > 0 && (
            <p className="text-sm font-bold text-white">
              {post._count.post_likes.toLocaleString()} {post._count.post_likes === 1 ? 'like' : 'likes'}
            </p>
          )}
          
          <p className="text-sm leading-snug">
            <span className="font-bold mr-2">{post.profiles?.name}</span>
            <HashtagText text={post.caption} />
          </p>

          {post._count?.comments > 0 && activeComments !== post.id && (
            <button 
              onClick={() => setActiveComments(post.id)}
              className="text-sm text-on-surface-variant hover:text-white transition-colors"
            >
              View all {post._count.comments} comments
            </button>
          )}

          <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest pt-1">
            {post.created_at?.toDate ? formatDistanceToNow(post.created_at.toDate()) : 'just now'} ago
          </p>
        </div>

        {activeComments === post.id && (
          <CommentSection postId={post.id} />
        )}
      </div>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal === post.id && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass-card p-8 rounded-t-3xl sm:rounded-3xl max-w-sm w-full space-y-8 border-t border-white/20 sm:border"
            >
              <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto sm:hidden" />
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-headline font-black text-white tracking-tight">Share</h3>
                <button onClick={() => setShowShareModal(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-on-surface-variant" />
                </button>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="flex flex-col items-center gap-2">
                  <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                    <Send className="w-6 h-6" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Send</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button 
                    onClick={() => copyToClipboard(`${window.location.origin}/post/${post.id}`)}
                    className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                  >
                    <Copy className="w-6 h-6" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Link</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                    <ExternalLink className="w-6 h-6" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">External</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <button className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                    <MoreHorizontal className="w-6 h-6" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">More</span>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant px-2">Suggested</p>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-xl transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white/10" />
                        <span className="text-sm font-bold">User {i}</span>
                      </div>
                      <button className="px-4 py-1.5 rounded-full bg-white text-black text-[10px] font-black uppercase tracking-widest">Send</button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </article>
  );
}
