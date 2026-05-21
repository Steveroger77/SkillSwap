import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Zap, ArrowLeftRight, MapPin, Loader2, RefreshCw, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Swap() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [matches, setMatches]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [sending, setSending]   = useState(false);
  const [mySkills, setMySkills] = useState<{ know: any[]; learn: any[] }>({ know: [], learn: [] });

  const fetchMatches = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Get my skills
      const { data: mine } = await supabase.from('user_skills').select('*, skills(*)').eq('user_id', user.id);
      const myKnow  = (mine ?? []).filter(s => s.type === 'know');
      const myLearn = (mine ?? []).filter(s => s.type === 'learn');
      setMySkills({ know: myKnow, learn: myLearn });

      if (!myKnow.length && !myLearn.length) { setLoading(false); return; }

      const myKnowIds  = myKnow.map(s => s.skill_id);
      const myLearnIds = myLearn.map(s => s.skill_id);

      // Find users who know what I want to learn AND want to learn what I know
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('*, user_skills(type, skills(id,name,category))')
        .neq('id', user.id);

      const scored = (allUsers ?? [])
        .map(u => {
          const theirKnow  = (u.user_skills ?? []).filter((s: any) => s.type === 'know').map((s: any) => s.skill_id ?? s.skills?.id);
          const theirLearn = (u.user_skills ?? []).filter((s: any) => s.type === 'learn').map((s: any) => s.skill_id ?? s.skills?.id);
          const teachScore = myLearnIds.filter(id => theirKnow.includes(id)).length;
          const learnScore = myKnowIds.filter(id => theirLearn.includes(id)).length;
          return { ...u, _score: teachScore + learnScore, _teach: teachScore, _learn: learnScore };
        })
        .filter(u => u._score > 0)
        .sort((a, b) => b._score - a._score);

      setMatches(scored);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [user, showToast]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const sendSwap = async (toUser: any) => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from('swap_requests').insert({
      from_user: user.id, to_user: toUser.id, status: 'pending',
    });
    if (error) showToast('Already sent a request to this person', 'info');
    else { showToast(`Swap request sent to ${toUser.name}! 🤝`, 'success'); setSelected(null); }
    setSending(false);
  };

  const matchDot = (score: number) => {
    if (score >= 3) return 'bg-green-400';
    if (score >= 2) return 'bg-yellow-400';
    return 'bg-white/40';
  };

  return (
    <main className="max-w-2xl mx-auto px-4 pt-20 pb-32">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <h1 className="font-headline text-3xl font-black text-white tracking-tight">Swap</h1>
          <motion.button whileTap={{ scale: 0.88 }} onClick={fetchMatches} className="p-2.5 btn-glass rounded-2xl">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
        <p className="text-white/38 text-sm">Matched to your skill profile</p>
      </motion.div>

      {/* My skills summary */}
      {(mySkills.know.length > 0 || mySkills.learn.length > 0) && (
        <div className="glass-card rounded-3xl p-5 mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Your Skill Profile</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-2">You Teach</p>
                <div className="flex flex-wrap gap-1.5">
                  {mySkills.know.map(s => <span key={s.id} className="skill-badge px-2.5 py-1 rounded-full text-[10px] font-bold text-white/70">{s.skills?.name}</span>)}
                  {!mySkills.know.length && <span className="text-white/25 text-xs">None added</span>}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35 mb-2">You Learn</p>
                <div className="flex flex-wrap gap-1.5">
                  {mySkills.learn.map(s => <span key={s.id} className="skill-badge px-2.5 py-1 rounded-full text-[10px] font-bold text-white/45 bg-white/[0.03]">{s.skills?.name}</span>)}
                  {!mySkills.learn.length && <span className="text-white/25 text-xs">None added</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="glass-card rounded-2xl p-5 flex gap-4"><div className="w-14 h-14 rounded-2xl shimmer flex-shrink-0" /><div className="flex-1 space-y-2"><div className="w-36 h-3 shimmer rounded-full" /><div className="w-24 h-2.5 shimmer rounded-full" /></div></div>)}
        </div>
      ) : matches.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card rounded-3xl py-20 text-center">
          <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center mx-auto mb-5"><ArrowLeftRight className="w-10 h-10 text-white/18" /></div>
          <p className="text-white/40 text-lg font-semibold mb-1">No matches yet</p>
          <p className="text-white/24 text-sm max-w-[240px] mx-auto leading-relaxed">Add skills to your profile to start finding swap partners</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {matches.map((u, i) => {
            const teaches = (u.user_skills ?? []).filter((s: any) => s.type === 'know');
            const learns  = (u.user_skills ?? []).filter((s: any) => s.type === 'learn');
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                onClick={() => setSelected(u)}
                className="glass-card rounded-2xl p-4 flex items-start gap-4 cursor-pointer hover:border-white/20 transition-all active:scale-[.99]"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 text-xl font-black">{u.name?.[0]?.toUpperCase()}</div>}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-surface ${matchDot(u._score)}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="font-bold text-white text-sm">{u.name}</p>
                      <p className="text-white/35 text-xs">@{u.username}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2.5 py-1 glass rounded-full flex-shrink-0">
                      <Zap className="w-3 h-3 text-white/50" />
                      <span className="text-[10px] font-black text-white/60">{u._score} match{u._score > 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {teaches.slice(0, 2).map((s: any) => <span key={s.skills?.id} className="skill-badge px-2 py-1 rounded-full text-[10px] font-bold text-white/65">⚡ {s.skills?.name}</span>)}
                    {learns.slice(0, 2).map((s: any) => <span key={s.skills?.id} className="skill-badge px-2 py-1 rounded-full text-[10px] font-bold text-white/40 bg-white/[0.03]">📖 {s.skills?.name}</span>)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Match detail modal */}
      <AnimatePresence>
        {selected && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 modal-backdrop" onClick={() => setSelected(null)}>
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 36 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal rounded-t-3xl sm:rounded-3xl max-w-sm w-full overflow-hidden"
            >
              <div className="relative z-10 p-6">
                <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-5 sm:hidden" />
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/12 flex-shrink-0">
                    {selected.avatar_url ? <img src={selected.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 text-2xl font-black">{selected.name?.[0]?.toUpperCase()}</div>}
                  </div>
                  <div>
                    <p className="font-headline font-black text-white text-xl">{selected.name}</p>
                    <p className="text-white/38 text-sm mb-1">@{selected.username}</p>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 glass rounded-full w-fit">
                      <Zap className="w-3 h-3 text-white/50" /><span className="text-[10px] font-black text-white/60">{selected._score} skill match{selected._score > 1 ? 'es' : ''}</span>
                    </div>
                  </div>
                </div>
                {selected.bio && <p className="text-white/50 text-sm leading-relaxed mb-5">{selected.bio}</p>}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  {[['Teaches', 'know'], ['Learning', 'learn']].map(([label, type]) => (
                    <div key={type}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white/28 mb-2">{label}</p>
                      <div className="flex flex-col gap-1.5">
                        {(selected.user_skills ?? []).filter((s: any) => s.type === type).slice(0, 4).map((s: any) => (
                          <span key={s.skills?.id} className="skill-badge px-3 py-1.5 rounded-full text-xs font-bold text-white/70 block truncate">{s.skills?.name}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3">
                  <button onClick={() => sendSwap(selected)} disabled={sending} className="w-full btn-primary py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {sending ? 'Sending…' : 'Send Swap Request'}
                  </button>
                  <button onClick={() => setSelected(null)} className="w-full btn-glass py-3.5 rounded-2xl text-sm font-bold">Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
