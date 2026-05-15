import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { CheckCircle, XCircle, Clock, Loader2, Zap, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

export default function Requests() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [type, setType] = useState<'incoming' | 'outgoing'>('incoming');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchRequests();

    const channel = supabase
      .channel('swap-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests' }, fetchRequests)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, type]);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    const col = type === 'incoming' ? 'to_user' : 'from_user';
    const { data, error } = await supabase
      .from('swap_requests')
      .select(`
        *,
        from_profile:from_user ( id, name, username, avatar_url, location ),
        to_profile:to_user   ( id, name, username, avatar_url, location ),
        skills ( id, name, category )
      `)
      .eq(col, user.id)
      .order('created_at', { ascending: false });

    if (error) { console.error(error); showToast('Failed to load requests', 'error'); }
    else setRequests(data ?? []);
    setLoading(false);
  };

  const updateRequest = async (id: string, status: 'accepted' | 'rejected') => {
    setUpdating(id);
    const { error } = await supabase
      .from('swap_requests')
      .update({ status })
      .eq('id', id);
    if (error) showToast('Failed to update request', 'error');
    else showToast(status === 'accepted' ? '🤝 Swap accepted!' : 'Request declined', status === 'accepted' ? 'success' : 'info');
    setUpdating(null);
  };

  const statusColors: Record<string, string> = {
    pending:  'bg-yellow-500/15 text-yellow-400 border-yellow-500/25',
    accepted: 'bg-green-500/15 text-green-400 border-green-500/25',
    rejected: 'bg-red-500/15  text-red-400  border-red-500/25',
  };
  const statusIcons: Record<string, React.ReactNode> = {
    pending:  <Clock className="w-3.5 h-3.5" />,
    accepted: <CheckCircle className="w-3.5 h-3.5" />,
    rejected: <XCircle className="w-3.5 h-3.5" />,
  };

  const otherProfile = (req: any) =>
    type === 'incoming' ? req.from_profile : req.to_profile;

  return (
    <main className="max-w-2xl mx-auto px-4 pt-24 pb-32">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-headline text-3xl font-black text-white tracking-tight mb-1">Swap Requests</h1>
        <p className="text-on-surface-variant text-sm">Manage your skill exchange proposals</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex p-1 glass rounded-full mb-8">
        {(['incoming', 'outgoing'] as const).map(t => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`flex-1 py-3 rounded-full text-sm font-bold capitalize transition-all duration-300 ${
              type === t ? 'bg-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.2)]' : 'text-white/45 hover:text-white/75'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card rounded-3xl p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="w-36 h-4 rounded shimmer" />
                <div className="w-24 h-3 rounded shimmer" />
              </div>
            </div>
          ))}
        </div>
      ) : requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-3xl p-16 text-center"
        >
          <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center mx-auto mb-6">
            <Zap className="w-10 h-10 text-white/20" />
          </div>
          <p className="text-white/50 text-lg font-medium mb-1">No {type} requests</p>
          <p className="text-white/28 text-sm">
            {type === 'incoming' ? 'When someone sends you a swap, it\'ll appear here.' : 'Send swap requests from the Swap or Search tab.'}
          </p>
        </motion.div>
      ) : (
        <AnimatePresence>
          <div className="space-y-4">
            {requests.map((req, i) => {
              const other = otherProfile(req);
              return (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="glass-card rounded-3xl p-5 relative overflow-hidden"
                >
                  <div className="relative z-10 flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-2xl overflow-hidden glass border border-white/10 flex-shrink-0">
                      {other?.avatar_url
                        ? <img src={other.avatar_url} alt={other.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        : <div className="w-full h-full flex items-center justify-center text-white/50 text-xl font-bold">
                            {other?.name?.[0]?.toUpperCase() || <User className="w-6 h-6 text-white/30" />}
                          </div>
                      }
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-bold text-white text-base leading-tight">{other?.name || 'Unknown User'}</p>
                          <p className="text-white/38 text-xs">@{other?.username || '—'}</p>
                        </div>
                        <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border flex-shrink-0 ${statusColors[req.status]}`}>
                          {statusIcons[req.status]}
                          {req.status}
                        </span>
                      </div>

                      {req.skills && (
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                          <span className="text-sm text-white/60">
                            Skill: <span className="text-white font-semibold">{req.skills.name}</span>
                          </span>
                        </div>
                      )}

                      <p className="text-[11px] text-white/28 uppercase font-bold tracking-wider">
                        {req.created_at ? formatDistanceToNow(new Date(req.created_at), { addSuffix: true }) : 'Just now'}
                      </p>

                      {type === 'incoming' && req.status === 'pending' && (
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => updateRequest(req.id, 'accepted')}
                            disabled={updating === req.id}
                            className="flex-1 btn-primary py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
                          >
                            {updating === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                            Accept
                          </button>
                          <button
                            onClick={() => updateRequest(req.id, 'rejected')}
                            disabled={updating === req.id}
                            className="flex-1 btn-glass py-3 rounded-2xl text-sm flex items-center justify-center gap-2 text-red-400 border-red-500/20"
                          >
                            <XCircle className="w-4 h-4" />
                            Decline
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}
    </main>
  );
}
