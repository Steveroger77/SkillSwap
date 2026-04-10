import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc, 
  deleteDoc, 
  setDoc,
  getDocs
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Send, Trash2, Heart, Reply, Loader2, ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

interface CommentSectionProps {
  postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string, name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string, type: 'comment' | 'reply', commentId?: string } | null>(null);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'comment') {
        await deleteDoc(doc(db, 'posts', postId, 'comments', itemToDelete.id));
        showToast('Comment deleted', 'success');
      } else if (itemToDelete.commentId) {
        await deleteDoc(doc(db, 'posts', postId, 'comments', itemToDelete.commentId, 'replies', itemToDelete.id));
        showToast('Reply deleted', 'success');
      }
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting:', error);
      showToast('Error deleting item', 'error');
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'posts', postId, 'comments'), 
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const commentsData = await Promise.all(snapshot.docs.map(async (cDoc) => {
        const data = cDoc.data();
        const authorSnap = await getDoc(doc(db, 'users', data.user_id));
        
        // Check if liked by current user
        let isLiked = false;
        if (user) {
          const likeSnap = await getDoc(doc(db, 'posts', postId, 'comments', cDoc.id, 'likes', user.uid));
          isLiked = likeSnap.exists();
        }

        // Get like count
        const likesSnap = await getDocs(collection(db, 'posts', postId, 'comments', cDoc.id, 'likes'));
        
        return {
          id: cDoc.id,
          ...data,
          author: authorSnap.exists() ? authorSnap.data() : null,
          is_liked: isLiked,
          likes_count: likesSnap.size
        };
      }));
      setComments(commentsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId, user]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    try {
      if (replyTo) {
        await addDoc(collection(db, 'posts', postId, 'comments', replyTo.id, 'replies'), {
          user_id: user.uid,
          content: newComment.trim(),
          created_at: serverTimestamp(),
          likes_count: 0
        });
        setReplyTo(null);
      } else {
        await addDoc(collection(db, 'posts', postId, 'comments'), {
          user_id: user.uid,
          content: newComment.trim(),
          created_at: serverTimestamp(),
          likes_count: 0
        });
      }
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLikeComment = async (commentId: string, isLiked: boolean) => {
    if (!user) return;
    try {
      const likeRef = doc(db, 'posts', postId, 'comments', commentId, 'likes', user.uid);
      if (isLiked) {
        await deleteDoc(likeRef);
      } else {
        await setDoc(likeRef, { created_at: serverTimestamp() });
      }
    } catch (error) {
      console.error('Error liking comment:', error);
    }
  };

  return (
    <div className="mt-6 space-y-6 border-t border-white/5 pt-6">
      <div className="max-h-80 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-white/20" /></div>
        ) : comments.length === 0 ? (
          <p className="text-center text-xs text-on-surface-variant py-4">No comments yet. Start the conversation!</p>
        ) : (
          comments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              postId={postId} 
              user={user} 
              onReply={(id, name) => {
                setReplyTo({ id, name });
                setNewComment(`@${name} `);
              }}
              onLike={handleLikeComment}
              onDelete={(id) => setItemToDelete({ id, type: 'comment' })}
              onDeleteReply={(replyId, commentId) => setItemToDelete({ id: replyId, type: 'reply', commentId })}
            />
          ))
        )}
      </div>

      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
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
                <h3 className="text-xl font-bold text-white">Delete {itemToDelete.type === 'comment' ? 'Comment' : 'Reply'}?</h3>
                <p className="text-on-surface-variant text-sm">This action cannot be undone.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleDelete}
                  className="w-full bg-red-500 text-white py-3 rounded-full font-bold text-sm tracking-tight hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
                <button 
                  onClick={() => setItemToDelete(null)}
                  className="w-full bg-white/10 text-white py-3 rounded-full font-bold text-sm tracking-tight hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <AnimatePresence>
          {replyTo && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-between items-center px-4 py-2 bg-white/5 rounded-t-xl border-x border-t border-white/10"
            >
              <span className="text-xs text-on-surface-variant">Replying to <span className="text-white font-bold">@{replyTo.name}</span></span>
              <button onClick={() => { setReplyTo(null); setNewComment(''); }} className="text-[10px] uppercase font-bold text-white/40 hover:text-white">Cancel</button>
            </motion.div>
          )}
        </AnimatePresence>
        <form onSubmit={handleAddComment} className="flex gap-2">
          <input 
            className={`flex-1 bg-white/5 border border-white/10 ${replyTo ? 'rounded-b-xl' : 'rounded-full'} px-4 py-2 text-sm text-white focus:bg-white/10 transition-all outline-none`}
            placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button 
            type="submit"
            disabled={submitting || !newComment.trim()}
            className="bg-white text-black p-2 rounded-full disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

function CommentItem({ comment, postId, user, onReply, onLike, onDelete, onDeleteReply }: any) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState<any[]>([]);
  const [repliesCount, setRepliesCount] = useState(0);

  useEffect(() => {
    const repliesRef = collection(db, 'posts', postId, 'comments', comment.id, 'replies');
    const q = query(repliesRef, orderBy('created_at', 'asc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      setRepliesCount(snapshot.size);
      if (showReplies) {
        const repliesData = await Promise.all(snapshot.docs.map(async (rDoc) => {
          const data = rDoc.data();
          const authorSnap = await getDoc(doc(db, 'users', data.user_id));
          return {
            id: rDoc.id,
            ...data,
            author: authorSnap.exists() ? authorSnap.data() : null
          };
        }));
        setReplies(repliesData);
      }
    });

    return () => unsubscribe();
  }, [postId, comment.id, showReplies]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3 group">
        <img 
          src={comment.author?.avatar_url || `https://picsum.photos/seed/${comment.user_id}/200`} 
          className="w-8 h-8 rounded-full object-cover flex-shrink-0" 
          referrerPolicy="no-referrer"
        />
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white">{comment.author?.name}</span>
            <span className="text-[10px] text-on-surface-variant">
              {comment.created_at?.toDate ? formatDistanceToNow(comment.created_at.toDate()) : 'just now'}
            </span>
          </div>
          <p className="text-sm text-on-surface/90">{comment.content}</p>
          <div className="flex gap-4 pt-1">
            <button 
              onClick={() => onLike(comment.id, comment.is_liked)}
              className={`text-[10px] font-bold transition-colors flex items-center gap-1 ${comment.is_liked ? 'text-red-500' : 'text-on-surface-variant hover:text-white'}`}
            >
              <Heart className={`w-3 h-3 ${comment.is_liked ? 'fill-current' : ''}`} /> 
              {comment.likes_count > 0 && comment.likes_count}
            </button>
            <button 
              onClick={() => onReply(comment.id, comment.author?.name || 'user')}
              className="text-[10px] font-bold text-on-surface-variant hover:text-white transition-colors flex items-center gap-1"
            >
              <Reply className="w-3 h-3" /> Reply
            </button>
            {comment.user_id === user?.uid && (
              <button 
                onClick={() => onDelete(comment.id)}
                className="text-[10px] font-bold text-red-500/50 hover:text-red-500 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {repliesCount > 0 && (
        <div className="ml-11 space-y-4">
          <button 
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant hover:text-white transition-colors"
          >
            <div className="w-6 h-[1px] bg-white/10"></div>
            {showReplies ? (
              <span className="flex items-center gap-1">Hide replies <ChevronUp className="w-3 h-3" /></span>
            ) : (
              <span className="flex items-center gap-1">View {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'} <ChevronDown className="w-3 h-3" /></span>
            )}
          </button>

          <AnimatePresence>
            {showReplies && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {replies.map(reply => (
                  <div key={reply.id} className="flex gap-3 group">
                    <img 
                      src={reply.author?.avatar_url || `https://picsum.photos/seed/${reply.user_id}/200`} 
                      className="w-6 h-6 rounded-full object-cover flex-shrink-0" 
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{reply.author?.name}</span>
                        <span className="text-[10px] text-on-surface-variant">
                          {reply.created_at?.toDate ? formatDistanceToNow(reply.created_at.toDate()) : 'just now'}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface/90">{reply.content}</p>
                      <div className="flex gap-4 pt-1">
                        <button className="text-[10px] font-bold text-on-surface-variant hover:text-white transition-colors flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                        </button>
                        {reply.user_id === user?.uid && (
                          <button 
                            onClick={() => onDeleteReply(reply.id, comment.id)}
                            className="text-[10px] font-bold text-red-500/50 hover:text-red-500 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
