import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Zap, Loader2, MapPin, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Swap() {
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const [knowSkills, setKnowSkills]   = useState<any[]>([]);
  const [learnSkills, setLearnSkills] = useState<any[]>([]);
  const [mentors, setMentors]         = useState<any[]>([]);
  const [learners, setLearners]       = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // My skills
      const { data: mySkills } = await supabase
        .from('user_skills')
        .select('*, skills(*)')
        .eq('user_id', user.id);

      const know = (mySkills ?? []).filter(s => s.type === 'know');
      const learn = (mySkills ?? []).filter(s => s.type === 'learn');
      setKnowSkills(know);
      setLearnSkills(learn);

      // Other users with their skills
      const { data: others } = await supabase
        .from('profiles')
        .select(`*, user_skills(*, skills(*))`)
        .neq('id', user.id)
        .limit(20);

      const list = others ?? [];

      const knowIds  = new Set(know.map(s => s.skill_id));
      const learnIds = new Set(learn.map(s => s.skill_id));

      // Mentors: know what I want to learn
      const mentorList = list.filter(u =>
        u.user_skills?.some((s: any) => s.type === 'know' && learnIds.has(s.skill_id))
      );
      // Learners: want what I know
      const learnerList = list.filter(u =>
        u.user_skills?.some((s: any) => s.type === 'learn' && knowIds.has(s.skill_id))
      );

      setMentors(mentorList.length ? mentorList : list.slice(0, 3));
      setLearners(learnerList.length ? learnerList : list.slice(3, 6));
    } finally {
      setLoading(false);
    }
  };

  const sendSwap = async (toUserId: string, skillId?: string) => {
    if (!profile) return;
    setSending(toUserId);
    const { error } = await supabase.from('swap_requests').insert({
      from_user: profile.id,
      to_user: toUserId,
      skill_id: skillId ?? null,
      status: 'pending',
    });
    if (error) showToast('Failed to send request', 'error');
    else { showToast('Swap request sent! 🎉', 'success'); setSelectedUser(null); }
    setSending(null);
  };

  const UserCard = ({ u, variant }: { u: any; variant: 'mentor' | 'learner' }) => {
    const relevantSkills = u.user_skills?.filter((s: any) =>
      variant === 'mentor'
        ? s.type === 'know' && learnSkills.some(ls => ls.skill_id === s.skill_id)
        : s.type === 'learn' && knowSkills.some(ks => ks.skill_id === s.skill_id)
    ) ?? [];
    const bestSkill = relevantSkills[0] ?? u.user_skills?.[0];

    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-2xl group cursor-pointer hover:bg-white/[0.07] transition-all"
        onClick={() => setSelectedUser({ ...u, bestSkill })}
      >
        <div className="flex gap-4 items-center mb-5">
          <img
            src={u.avatar_url || `https://picsum.photos/seed/${u.id}/100`}
            className="w-14 h-14 rounded-full object-cover border border-white/12 transition-all group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white leading-tight">{u.name}</p>
            <p className="text-xs text-white/38 mt-0.5">@{u.username}</p>
            {u.location && (
              <p className="text-[10px] text-white/28 flex items-center gap-1 mt-1">
                <MapPin className="w-2.5 h-2.5" /> {u.location}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 px-2 py-1 glass rounded-full">
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Live</span>
          </div>
        </div>

        {relevantSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {relevantSkills.slice(0, 3).map((s: any) => (
              <span key={s.id} className="text-[10px] px-2.5 py-1 rounded-full bg-white/12 border border-white/18 text-white font-bold uppercase tracking-wide">
                {s.skills?.name}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={e => { e.stopPropagation(); sendSwap(u.id, bestSkill?.skill_id); }}
          disabled={sending === u.id}
          className="btn-primary w-full py-3.5 rounded-full text-xs font-bold tracking-widest flex items-center justify-center gap-2"
        >
          {sending === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {sending === u.id ? 'Sending…' : 'Send Swap Request'}
        </button>
      </motion.div>
    );
  };

  return (
    <main className="pt-24 pb-32 px-4 md:px-8 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tighter text-white mb-4">The Exchange.</h1>
        <p className="text-white/45 max-w-xl text-lg font-light leading-relaxed">
          Match with experts and learners. Grow through direct knowledge sharing.
        </p>
      </div>

      {/* My skills summary */}
      {(knowSkills.length > 0 || learnSkills.length > 0) && (
        <div className="glass-card p-6 rounded-2xl mb-12 flex flex-wrap gap-6">
          {knowSkills.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">I Know</p>
              <div className="flex flex-wrap gap-1.5">
                {knowSkills.map(s => (
                  <span key={s.id} className="text-xs px-3 py-1.5 rounded-full bg-white/12 border border-white/18 text-white font-bold">{s.skills?.name}</span>
                ))}
              </div>
            </div>
          )}
          {learnSkills.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">I Want to Learn</p>
              <div className="flex flex-wrap gap-1.5">
                {learnSkills.map(s => (
                  <span key={s.id} className="text-xs px-3 py-1.5 rounded-full bg-white/[0.045] border border-white/10 text-white/55 font-bold">{s.skills?.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="flex items-end justify-between mb-6 px-1">
            <h2 className="text-3xl font-headline font-bold tracking-tight">Learn a Skill</h2>
            <span className="text-xs font-bold uppercase tracking-widest text-white/30">Mentors</span>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1,2].map(i => <div key={i} className="glass-card rounded-2xl h-40 shimmer" />)}
            </div>
          ) : mentors.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-white/35">
              <p>No mentors found. Add skills you want to learn in your profile.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {mentors.map(u => <UserCard key={u.id} u={u} variant="mentor" />)}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-end justify-between mb-6 px-1">
            <h2 className="text-3xl font-headline font-bold tracking-tight">Teach a Skill</h2>
            <span className="text-xs font-bold uppercase tracking-widest text-white/30">Learners</span>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1,2].map(i => <div key={i} className="glass-card rounded-2xl h-40 shimmer" />)}
            </div>
          ) : learners.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center text-white/35">
              <p>No learners found. Add skills you know in your profile.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {learners.map(u => <UserCard key={u.id} u={u} variant="learner" />)}
            </div>
          )}
        </div>
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 modal-backdrop" onClick={() => setSelectedUser(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal p-8 rounded-3xl max-w-md w-full"
            >
              <div className="flex justify-end mb-4">
                <button onClick={() => setSelectedUser(null)}><XCircle className="w-6 h-6 text-white/40" /></button>
              </div>
              <div className="flex gap-5 items-center mb-6">
                <img src={selectedUser.avatar_url || `https://picsum.photos/seed/${selectedUser.id}/100`}
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/15" />
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                  <p className="text-white/40 text-sm">@{selectedUser.username}</p>
                  {selectedUser.location && <p className="text-white/30 text-sm flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{selectedUser.location}</p>}
                </div>
              </div>
              {selectedUser.bio && <p className="text-white/55 text-sm leading-relaxed mb-6">{selectedUser.bio}</p>}
              <button
                onClick={() => sendSwap(selectedUser.id, selectedUser.bestSkill?.skill_id)}
                disabled={sending === selectedUser.id}
                className="btn-primary w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
              >
                {sending === selectedUser.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Send Swap Request
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
