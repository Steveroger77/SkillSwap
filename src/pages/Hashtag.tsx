import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';
import { Grid, Clock, TrendingUp, Eye, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Hashtag() {
  const { tag } = useParams<{ tag: string }>();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recent' | 'top'>('recent');

  useEffect(() => {
    if (!tag) return;

    const postsRef = collection(db, 'posts');
    // Firestore doesn't support array-contains for multiple tags easily if we store them as an array,
    // but we can use a 'hashtags' array field.
    const q = query(
      postsRef, 
      where('hashtags', 'array-contains', tag.toLowerCase()),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = await Promise.all(snapshot.docs.map(async (postDoc) => {
        const data = postDoc.data();
        const authorSnap = await getDoc(doc(db, 'users', data.user_id));
        
        // Get like count for "top" sorting
        const likesSnap = await getDocs(collection(db, 'posts', postDoc.id, 'likes'));
        
        return {
          id: postDoc.id,
          ...data,
          author: authorSnap.exists() ? authorSnap.data() : null,
          likes_count: likesSnap.size
        };
      }));

      setPosts(postsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [tag]);

  const sortedPosts = [...posts].sort((a, b) => {
    if (activeTab === 'top') return b.likes_count - a.likes_count;
    return 0; // Already sorted by desc date in query
  });

  return (
    <main className="pt-24 pb-32 px-6 max-w-4xl mx-auto">
      <header className="flex flex-col items-center mb-12">
        <div className="w-full flex items-center mb-8">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
        </div>
        
        <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
          <span className="text-4xl font-black text-white">#</span>
        </div>
        
        <h1 className="text-4xl font-headline font-black text-white mb-2">#{tag}</h1>
        <p className="text-on-surface-variant font-medium uppercase tracking-widest text-xs">
          {posts.length} {posts.length === 1 ? 'Post' : 'Posts'}
        </p>
      </header>

      <div className="flex justify-center gap-12 mb-8 border-b border-white/5">
        <button 
          onClick={() => setActiveTab('recent')}
          className={cn(
            "flex items-center gap-2 pb-4 font-bold text-xs uppercase tracking-widest transition-all", 
            activeTab === 'recent' ? "text-white border-b-2 border-white" : "text-neutral-500 hover:text-white"
          )}
        >
          <Clock className="w-4 h-4" /> Recent
        </button>
        <button 
          onClick={() => setActiveTab('top')}
          className={cn(
            "flex items-center gap-2 pb-4 font-bold text-xs uppercase tracking-widest transition-all", 
            activeTab === 'top' ? "text-white border-b-2 border-white" : "text-neutral-500 hover:text-white"
          )}
        >
          <TrendingUp className="w-4 h-4" /> Top
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-2xl">
          <Grid className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
          <p className="text-on-surface-variant font-medium">No posts found for this hashtag.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {sortedPosts.map(post => (
            <div key={post.id} className="group relative aspect-square rounded-lg overflow-hidden glass-card cursor-pointer">
              {post.media?.[0] && (
                <img 
                  src={post.media[0].url} 
                  alt="Post" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  referrerPolicy="no-referrer" 
                />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <div className="flex gap-6 text-white font-bold">
                  <div className="flex items-center gap-1"><Eye className="w-5 h-5" /> {post.likes_count}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
