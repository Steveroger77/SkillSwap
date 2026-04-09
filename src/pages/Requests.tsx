import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Requests() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    const column = type === 'incoming' ? 'to_user' : 'from_user';
    const q = query(collection(db, 'swap_requests'), where(column, '==', profile.id));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const reqs = await Promise.all(snapshot.docs.map(async (d) => {
        const data = { id: d.id, ...d.data() } as any;
        
        // Fetch profiles
        const fromProfileDoc = await getDoc(doc(db, 'users', data.from_user));
        const toProfileDoc = await getDoc(doc(db, 'users', data.to_user));
        
        return {
          ...data,
          from_profile: fromProfileDoc.exists() ? { id: fromProfileDoc.id, ...fromProfileDoc.data() } : null,
          to_profile: toProfileDoc.exists() ? { id: toProfileDoc.id, ...toProfileDoc.data() } : null
        };
      }));
      
      setRequests(reqs.sort((a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile, type]);

  const handleStatus = async (id: string, status: 'accepted' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'swap_requests', id), { status });
    } catch (error) {
      console.error('Error updating request status:', error);
    }
  };

  return (
    <main className="pt-24 pb-32 min-h-screen px-4 md:px-8 max-w-7xl mx-auto">
      <div className="flex items-baseline justify-between mb-8">
        <h1 className="text-4xl font-extrabold font-headline tracking-tighter text-white">Requests</h1>
        <div className="flex p-1 bg-white/5 rounded-full backdrop-blur-md">
          <button 
            onClick={() => setType('incoming')}
            className={cn("px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all", type === 'incoming' ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white")}
          >
            Incoming
          </button>
          <button 
            onClick={() => setType('outgoing')}
            className={cn("px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all", type === 'outgoing' ? "bg-white text-black shadow-lg" : "text-neutral-500 hover:text-white")}
          >
            Outgoing
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-white/20" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requests.length === 0 ? (
            <div className="col-span-full text-center py-20 glass-card rounded-2xl">
              <Clock className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
              <p className="text-on-surface-variant font-medium">No {type} requests found.</p>
            </div>
          ) : requests.map(req => (
            <div key={req.id} className="glass-card p-6 rounded-2xl shadow-2xl transition-all hover:bg-white/[0.06]">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <img 
                    src={(type === 'incoming' ? req.from_profile : req.to_profile)?.avatar_url || `https://picsum.photos/seed/${req.id}/200`} 
                    className="w-12 h-12 rounded-full ring-2 ring-white/10" 
                    referrerPolicy="no-referrer" 
                  />
                  <div>
                    <h3 className="text-lg font-bold font-headline text-white leading-tight">
                      {type === 'incoming' ? req.from_profile?.name : req.to_profile?.name}
                    </h3>
                    <p className="text-sm text-neutral-400">
                      {type === 'incoming' ? 'wants to learn' : 'you want to learn'} <span className="text-white font-semibold">{req.skill_name || 'a skill'}</span>
                    </p>
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] uppercase font-bold tracking-widest flex items-center gap-1 px-2 py-1 rounded-full",
                  req.status === 'pending' ? "text-yellow-500 bg-yellow-500/10" : 
                  req.status === 'accepted' ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"
                )}>
                  {req.status === 'pending' && <Clock className="w-3 h-3" />}
                  {req.status}
                </span>
              </div>
              {type === 'incoming' && req.status === 'pending' && (
                <div className="flex gap-3 mt-6">
                  <button onClick={() => handleStatus(req.id, 'accepted')} className="flex-1 py-3 bg-white text-black font-bold text-xs uppercase tracking-widest rounded-full hover:opacity-90 active:scale-95 transition-all">Accept Request</button>
                  <button onClick={() => handleStatus(req.id, 'rejected')} className="px-6 py-3 bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-full hover:bg-white/20 transition-all">Decline</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
