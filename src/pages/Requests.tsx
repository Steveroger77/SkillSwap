import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { CheckCircle, XCircle, Clock, Loader2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-500/12 text-yellow-400 border-yellow-500/22',
  accepted: 'bg-green-500/12  text-green-400  border-green-500/22',
  rejected: 'bg-red-500/12   text-red-400   border-red-500/22',
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:  <Clock className="w-3 h-3" />,
  accepted: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

export default function Requests() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [tab, setTab]         = useState<'incoming'|'outgoing'>('incoming');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string|null>(null);

  const fetch = async () => {
    if (!user) return;
    setLoading(true);
    const col = tab === 'incoming' ? 'to_user' : 'from_user';
    const { data, error } = await supabase
      .from('swap_requests')
      .select('*, from_profile:from_user(id,name,username,avatar_url,location), to_profile:to_user(id,name,username,avatar_url,location), skills(id,name)')
      .eq(col, user.id)
      .order('created_at', { ascending: false });
    if (error) showToast('Failed to load requests', 'error');
    else setRequests(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, [user, tab]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('swap-req')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests' }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const updateStatus = async (id: string, status: 'accepted'|'rejected') => {
    setUpdating(id);
    const { error } = await supabase.from('swap_requests').update({ status }).eq('id', id);
    if (error) showToast('Failed to update', 'error');
    else {
      showToast(status === 'accepted' ? '🤝 Swap accepted!' : 'Request declined', status === 'accepted' ? 'success' : 'info');
      // If accepted, create a chat between the two users
      if (status === 'accepted') {
        const req = requests.find(r => r.id === id);
        if (req) {
          const { data: chat } = await supabase.from('chats').insert({}).select().single();
          if (chat) {
            await supabase.from('chat_participants').insert([
              { chat_id: chat.id, user_id: req.from_user },
              { chat_id: chat.id, user_id: req.to_user },
            ]);
          }
        }
      }
      fetch();
    }
    setUpdating(null);
  };

  const other = (req: any) => tab === 'incoming' ? req.from_profile : req.to_profile;

  return (
    <main className="max-w-2xl mx-auto px-4 pt-20 pb-32">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="mb-8">
        <h1 className="font-headline text-3xl font-black text-white tracking-tight mb-1">Requests</h1>
        <p className="text-white/38 text-sm">Manage your skill swap proposals</p>
      </motion.div>

      {/* Tabs */}
      <div className="relative flex p-1 glass rounded-full mb-8">
        <motion.div layoutId="req-tab" className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full shadow-[0_4px_16px_rgba(255,255,255,.2)]"
          animate={{ left: tab === 'incoming' ? '4px' : 'calc(50%)' }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
        {(['incoming','outgoing'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative z-10 flex-1 py-2.5 text-sm font-bold capitalize transition-colors duration-200 rounded-full ${tab === t ? 'text-black' : 'text-white/42 hover:text-white/70'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="glass-card rounded-2xl p-5 flex gap-4"><div className="w-14 h-14 rounded-2xl shimmer flex-shrink-0" /><div className="flex-1 space-y-2"><div className="w-36 h-3 shimmer rounded-full" /><div className="w-24 h-2.5 shimmer rounded-full" /></div></div>)}</div>
      ) : requests.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-3xl py-20 text-center">
          <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center mx-auto mb-5"><Zap className="w-10 h-10 text-white/15" /></div>
          <p className="text-white/40 text-lg font-semibold">No {tab} requests</p>
          <p className="text-white/24 text-sm mt-1">{tab === 'incoming' ? 'When someone sends you a swap, it appears here.' : 'Send swap requests from Swap or Explore.'}</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {requests.map((req, i) => {
              const u = other(req);
              return (
                <motion.div key={req.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                  className="glass-card rounded-2xl p-5 relative overflow-hidden">
                  <div className="relative z-10 flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 flex-shrink-0">
                      {u?.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 text-xl font-black">{u?.name?.[0]?.toUpperCase() || '?'}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-bold text-white text-base">{u?.name || 'User'}</p>
                          <p className="text-white/35 text-xs">@{u?.username}</p>
                        </div>
                        <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex-shrink-0 ${STATUS_STYLE[req.status]}`}>
                          {STATUS_ICON[req.status]}{req.status}
                        </span>
                      </div>
                      {req.skills && (
                        <div className="flex items-center gap-1.5 mb-3">
                          <Zap className="w-3.5 h-3.5 text-white/35" />
                          <span className="text-sm text-white/55">Skill: <span className="text-white font-semibold">{req.skills.name}</span></span>
                        </div>
                      )}
                      <p className="text-[10px] text-white/22 uppercase font-bold tracking-widest">
                        {req.created_at ? formatDistanceToNow(new Date(req.created_at), { addSuffix: true }) : 'just now'}
                      </p>
                      {tab === 'incoming' && req.status === 'pending' && (
                        <div className="flex gap-2.5 mt-4">
                          <motion.button whileTap={{ scale: 0.96 }} onClick={() => updateStatus(req.id, 'accepted')} disabled={updating === req.id}
                            className="flex-1 btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2">
                            {updating === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept
                          </motion.button>
                          <motion.button whileTap={{ scale: 0.96 }} onClick={() => updateStatus(req.id, 'rejected')} disabled={updating === req.id}
                            className="flex-1 btn-glass py-3 rounded-2xl text-sm flex items-center justify-center gap-2 !text-red-400 !border-red-500/18">
                            <XCircle className="w-4 h-4" /> Decline
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </main>
  );
}
