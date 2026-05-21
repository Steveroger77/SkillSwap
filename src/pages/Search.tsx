import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Search as SearchIcon, Zap, MapPin, Loader2, X, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Search() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [query, setQuery]       = useState('');
  const [filter, setFilter]     = useState<'all'|'know'|'learn'>('all');
  const [results, setResults]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [sending, setSending]   = useState(false);
  const [skills, setSkills]     = useState<any[]>([]);

  useEffect(() => { supabase.from('skills').select('*').order('name').then(({ data }) => setSkills(data ?? [])); }, []);

  const search = useCallback(async (q: string, f: string) => {
    setLoading(true);
    try {
      let qb = supabase
        .from('profiles')
        .select('*, user_skills(type, skills(id,name,category))')
        .neq('id', user?.id ?? '');

      if (q.trim()) {
        qb = qb.or(`name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%`);
      }

      const { data, error } = await qb.limit(30);
      if (error) throw error;

      let filtered = data ?? [];
      if (f !== 'all') {
        filtered = filtered.filter((u: any) => u.user_skills?.some((s: any) => s.type === f));
      }
      setResults(filtered);
    } catch (e: any) { showToast(e.message, 'error'); }
    finally { setLoading(false); }
  }, [user?.id, showToast]);

  useEffect(() => {
    const t = setTimeout(() => search(query, filter), 300);
    return () => clearTimeout(t);
  }, [query, filter, search]);

  const sendSwap = async (toUser: any, skillId?: string) => {
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from('swap_requests').insert({
      from_user: user.id, to_user: toUser.id,
      skill_id: skillId ?? null, status: 'pending',
    });
    if (error) showToast(error.message === 'duplicate key' ? 'Already sent a request!' : error.message, 'error');
    else { showToast(`Swap request sent to ${toUser.name}! 🤝`, 'success'); setSelected(null); }
    setSending(false);
  };

  const pills = [
    { key: 'all',   label: 'Everyone' },
    { key: 'know',  label: 'Teaching' },
    { key: 'learn', label: 'Learning' },
  ] as const;

  return (
    <main className="max-w-2xl mx-auto px-4 pt-20 pb-32">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}>
        <h1 className="font-headline text-3xl font-black text-white tracking-tight mb-1">Explore</h1>
        <p className="text-white/38 text-sm mb-6">Find your next skill partner</p>

        {/* Search bar */}
        <div className="relative mb-4">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            className="glass-input rounded-2xl pl-11 pr-10 py-3.5 text-sm"
            placeholder="Search by name, username, or skill…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && <button onClick={() => setQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"><X className="w-4 h-4" /></button>}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 custom-scrollbar">
          {pills.map(p => (
            <button key={p.key} onClick={() => setFilter(p.key)} className={`tag-pill flex-shrink-0 ${filter === p.key ? 'active' : ''}`}>{p.label}</button>
          ))}
        </div>
      </motion.div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="glass-card rounded-2xl p-4 flex gap-3">
              <div className="w-12 h-12 rounded-full shimmer flex-shrink-0" />
              <div className="flex-1 space-y-2"><div className="w-32 h-3 shimmer rounded-full" /><div className="w-48 h-2.5 shimmer rounded-full" /></div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="glass-card rounded-3xl py-16 text-center">
          <SearchIcon className="w-10 h-10 text-white/15 mx-auto mb-3" />
          <p className="text-white/40 font-medium">No users found</p>
          <p className="text-white/22 text-sm mt-1">Try a different search or filter</p>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((u, i) => {
            const knows  = (u.user_skills ?? []).filter((s: any) => s.type === 'know');
            const learns = (u.user_skills ?? []).filter((s: any) => s.type === 'learn');
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
                onClick={() => setSelected(u)}
                className="glass-card rounded-2xl p-4 flex items-start gap-3 cursor-pointer hover:border-white/20 transition-all active:scale-[.99]"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                  {u.avatar_url ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 font-black">{u.name?.[0]?.toUpperCase() || '?'}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white text-sm">{u.name}</p>
                      <p className="text-white/38 text-xs">@{u.username}</p>
                    </div>
                    {u.location && <p className="text-white/28 text-[10px] flex items-center gap-1 flex-shrink-0"><MapPin className="w-2.5 h-2.5" />{u.location}</p>}
                  </div>
                  {u.bio && <p className="text-white/50 text-xs mt-1.5 leading-snug line-clamp-2">{u.bio}</p>}
                  {(knows.length > 0 || learns.length > 0) && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {knows.slice(0, 3).map((s: any) => (
                        <span key={s.skills?.id} className="skill-badge px-2.5 py-1 rounded-full text-[10px] font-bold text-white/75">⚡ {s.skills?.name}</span>
                      ))}
                      {learns.slice(0, 2).map((s: any) => (
                        <span key={s.skills?.id} className="skill-badge px-2.5 py-1 rounded-full text-[10px] font-bold text-white/45 bg-white/[0.03]">📖 {s.skills?.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Profile + Swap modal */}
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
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/12 flex-shrink-0">
                    {selected.avatar_url ? <img src={selected.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 text-2xl font-black">{selected.name?.[0]?.toUpperCase()}</div>}
                  </div>
                  <div>
                    <p className="font-headline font-black text-white text-xl">{selected.name}</p>
                    <p className="text-white/38 text-sm">@{selected.username}</p>
                    {selected.location && <p className="text-white/28 text-xs flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{selected.location}</p>}
                  </div>
                </div>
                {selected.bio && <p className="text-white/55 text-sm leading-relaxed mb-5">{selected.bio}</p>}

                {/* Skills */}
                {(selected.user_skills ?? []).length > 0 && (
                  <div className="space-y-3 mb-6">
                    {['know', 'learn'].map(type => {
                      const list = (selected.user_skills ?? []).filter((s: any) => s.type === type);
                      if (!list.length) return null;
                      return (
                        <div key={type}>
                          <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">{type === 'know' ? 'Teaches' : 'Learning'}</p>
                          <div className="flex flex-wrap gap-2">
                            {list.map((s: any) => (
                              <span key={s.skills?.id} className="skill-badge px-3 py-1.5 rounded-full text-xs font-bold text-white/75">{s.skills?.name}</span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => sendSwap(selected)}
                    disabled={sending}
                    className="w-full btn-primary py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {sending ? 'Sending…' : 'Send Swap Request'}
                  </button>
                  <button onClick={() => setSelected(null)} className="w-full btn-glass py-3.5 rounded-2xl text-sm font-bold">Close</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
