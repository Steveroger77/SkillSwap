import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { Search as SearchIcon, MapPin, Loader2, XCircle, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { debounce } from '../lib/utils';

export default function Search() {
  const { user, profile: me } = useAuth();
  const { showToast } = useToast();
  const [profiles, setProfiles]         = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [filter, setFilter]             = useState('all');
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [sendingSwap, setSendingSwap]   = useState<string | null>(null);

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'skills', label: 'Knows' },
    { key: 'learning', label: 'Learning' },
    { key: 'location', label: 'Location' },
  ];

  // ── fetch ─────────────────────────────────────────────────────────────────
  const fetchProfiles = useCallback(async (query: string, filterKey: string) => {
    setLoading(true);
    try {
      let q = supabase
        .from('profiles')
        .select(`
          *,
          user_skills (
            id, type, skill_id,
            skills ( id, name, category )
          )
        `)
        .neq('id', user?.id ?? '');

      if (query) {
        if (filterKey === 'location') {
          q = q.ilike('location', `%${query}%`);
        } else if (filterKey === 'username') {
          q = q.ilike('username', `%${query}%`);
        } else {
          q = q.or(`name.ilike.%${query}%,username.ilike.%${query}%,location.ilike.%${query}%`);
        }
      }

      const { data, error } = await q.limit(40);
      if (error) throw error;

      let results = data ?? [];

      // Client-side filter for skill searches
      if (query && (filterKey === 'skills' || filterKey === 'learning')) {
        const type = filterKey === 'skills' ? 'know' : 'learn';
        results = results.filter(p =>
          p.user_skills?.some((s: any) =>
            s.type === type && s.skills?.name?.toLowerCase().includes(query.toLowerCase())
          )
        );
      }

      setProfiles(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(debounce((q: string, f: string) => fetchProfiles(q, f), 350), [fetchProfiles]);

  useEffect(() => {
    debouncedFetch(searchQuery, filter);
  }, [searchQuery, filter, debouncedFetch]);

  const sendSwap = async (toUserId: string, skillId?: string, skillName?: string) => {
    if (!me) return;
    setSendingSwap(toUserId);
    const { error } = await supabase.from('swap_requests').insert({
      from_user: me.id,
      to_user: toUserId,
      skill_id: skillId ?? null,
      status: 'pending',
    });
    if (error) showToast('Failed to send request', 'error');
    else showToast('Swap request sent! 🎉', 'success');
    setSendingSwap(null);
    setSelectedProfile(null);
  };

  return (
    <main className="pt-24 pb-32 px-4 max-w-6xl mx-auto">
      {/* Search bar */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <SearchIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/35" />
          <input
            className="glass-input w-full rounded-2xl pl-14 pr-5 py-4 text-sm"
            placeholder="Search people, skills, locations…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/35 hover:text-white transition-colors">
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`tag-pill cursor-pointer transition-all ${filter === f.key ? 'active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-6 space-y-4">
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-full shimmer" />
                <div className="flex-1 space-y-2"><div className="w-3/4 h-4 rounded shimmer" /><div className="w-1/2 h-3 rounded shimmer" /></div>
              </div>
              <div className="w-full h-10 rounded-xl shimmer" />
            </div>
          ))}
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-20 glass-card rounded-3xl">
          <SearchIcon className="w-12 h-12 text-white/15 mx-auto mb-4" />
          <p className="text-white/40 font-medium">{searchQuery ? 'No results found.' : 'Search to find skill partners.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {profiles.map(p => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedProfile(p)}
              className="glass-card p-6 rounded-2xl cursor-pointer hover:bg-white/[0.07] transition-all group"
            >
              <div className="flex gap-4 items-center mb-4">
                <img
                  src={p.avatar_url || `https://picsum.photos/seed/${p.id}/100`}
                  className="w-14 h-14 rounded-full object-cover border border-white/12 transition-all group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{p.name}</p>
                  <p className="text-xs text-white/40 truncate">@{p.username}</p>
                  {p.location && (
                    <p className="text-[10px] text-white/30 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />{p.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {p.user_skills?.filter((s: any) => s.type === 'know').slice(0, 3).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.user_skills.filter((s: any) => s.type === 'know').slice(0, 3).map((s: any) => (
                      <span key={s.id} className="text-[10px] px-2.5 py-1 rounded-full bg-white/12 border border-white/15 font-bold text-white uppercase tracking-wide">
                        {s.skills?.name}
                      </span>
                    ))}
                  </div>
                )}
                {p.user_skills?.filter((s: any) => s.type === 'learn').slice(0, 2).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.user_skills.filter((s: any) => s.type === 'learn').slice(0, 2).map((s: any) => (
                      <span key={s.id} className="text-[10px] px-2.5 py-1 rounded-full bg-white/[0.045] border border-white/10 font-bold text-white/55 uppercase tracking-wide">
                        wants: {s.skills?.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Profile Modal */}
      <AnimatePresence>
        {selectedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 modal-backdrop" onClick={() => setSelectedProfile(null)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal p-8 rounded-3xl max-w-lg w-full"
            >
              <div className="flex justify-end mb-4">
                <button onClick={() => setSelectedProfile(null)} className="text-white/40 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start mb-6">
                <img
                  src={selectedProfile.avatar_url || `https://picsum.photos/seed/${selectedProfile.id}/200`}
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/15 shadow-2xl"
                  referrerPolicy="no-referrer"
                />
                <div className="text-center sm:text-left flex-1">
                  <h2 className="text-2xl font-bold text-white">{selectedProfile.name}</h2>
                  <p className="text-white/40 text-sm">@{selectedProfile.username}</p>
                  {selectedProfile.location && (
                    <p className="text-white/35 text-sm flex items-center gap-1 justify-center sm:justify-start mt-1">
                      <MapPin className="w-3.5 h-3.5" />{selectedProfile.location}
                    </p>
                  )}
                  {selectedProfile.bio && <p className="text-white/55 text-sm mt-2 leading-relaxed">{selectedProfile.bio}</p>}
                </div>
              </div>

              {selectedProfile.user_skills?.length > 0 && (
                <div className="mb-6 space-y-3">
                  {['know', 'learn'].map(type => {
                    const typeSkills = selectedProfile.user_skills.filter((s: any) => s.type === type);
                    if (!typeSkills.length) return null;
                    return (
                      <div key={type}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2">
                          {type === 'know' ? 'Knows' : 'Wants to Learn'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {typeSkills.map((s: any) => (
                            <span key={s.id} className={`text-xs px-3 py-1.5 rounded-full font-bold uppercase tracking-wide ${
                              type === 'know' ? 'bg-white/12 border border-white/18 text-white' : 'bg-white/[0.045] border border-white/10 text-white/55'
                            }`}>
                              {s.skills?.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => sendSwap(
                  selectedProfile.id,
                  selectedProfile.user_skills?.find((s: any) => s.type === 'know')?.skill_id,
                  selectedProfile.user_skills?.find((s: any) => s.type === 'know')?.skills?.name,
                )}
                disabled={sendingSwap === selectedProfile.id}
                className="btn-primary w-full py-4 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
              >
                {sendingSwap === selectedProfile.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {sendingSwap === selectedProfile.id ? 'Sending…' : 'Send Swap Request'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
