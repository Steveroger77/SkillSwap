import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import type { Profile } from '../types';
import { Search as SearchIcon, MapPin, Loader2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Search() {
  const { profile: currentUserProfile } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchProfiles();
  }, [searchQuery, filter]);

  async function fetchProfiles() {
    setLoading(true);
    try {
      // In Firestore, we fetch all and filter client-side for complex searches
      const profilesSnapshot = await getDocs(collection(db, 'users'));
      const allProfiles = await Promise.all(profilesSnapshot.docs.map(async (doc) => {
        const profileData = { id: doc.id, ...doc.data() } as any;
        
        // Fetch skills for this profile
        const skillsSnapshot = await getDocs(collection(db, `users/${doc.id}/skills`));
        const userSkills = skillsSnapshot.docs.map(sDoc => ({ id: sDoc.id, ...sDoc.data() }));
        
        return { ...profileData, user_skills: userSkills };
      }));

      let filtered = allProfiles.filter(p => p.id !== currentUserProfile?.id);

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(p => {
          if (filter === 'location') return p.location?.toLowerCase().includes(q);
          if (filter === 'username') return p.username?.toLowerCase().includes(q);
          if (filter === 'skills') return p.user_skills?.some((s: any) => s.type === 'know' && s.skills?.name?.toLowerCase().includes(q));
          if (filter === 'learning') return p.user_skills?.some((s: any) => s.type === 'learn' && s.skills?.name?.toLowerCase().includes(q));
          
          return (
            p.name?.toLowerCase().includes(q) ||
            p.username?.toLowerCase().includes(q) ||
            p.location?.toLowerCase().includes(q) ||
            p.user_skills?.some((s: any) => s.skills?.name?.toLowerCase().includes(q))
          );
        });
      }

      setProfiles(filtered);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRequestSwap = async (toUserId: string, skillId?: string, skillName?: string) => {
    if (!currentUserProfile) return;
    try {
      await addDoc(collection(db, 'swap_requests'), {
        from_user: currentUserProfile.id,
        to_user: toUserId,
        skill_id: skillId || null,
        skill_name: skillName || 'General Swap',
        status: 'pending',
        created_at: serverTimestamp()
      });
      alert('Swap request sent!');
    } catch (error) {
      console.error('Error sending swap request:', error);
    }
  };

  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  return (
    <main className="pt-24 pb-48 px-6 max-w-7xl mx-auto">
      {/* User Profile Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="glass-card p-10 rounded-3xl max-w-2xl w-full relative overflow-hidden animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setSelectedProfile(null)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-white transition-colors"
            >
              <XCircle className="w-8 h-8" />
            </button>
            
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl">
                <img src={selectedProfile.avatar_url || `https://picsum.photos/seed/${selectedProfile.id}/200`} alt={selectedProfile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-4">
                <div>
                  <h2 className="text-3xl font-headline font-black text-white">{selectedProfile.name}</h2>
                  <p className="text-on-surface-variant font-medium">@{selectedProfile.username}</p>
                </div>
                
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs text-on-surface-variant uppercase font-bold tracking-widest">
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedProfile.location || 'Remote'}</div>
                </div>
                
                <p className="text-on-surface/80 leading-relaxed whitespace-pre-wrap">{selectedProfile.bio || 'No bio yet.'}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-3">Expert In</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.user_skills?.filter((s: any) => s.type === 'know').map((s: any) => (
                        <span key={s.id} className="bg-white/10 text-white border border-white/5 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{s.skills?.name}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-3">Wants to Learn</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProfile.user_skills?.filter((s: any) => s.type === 'learn').map((s: any) => (
                        <span key={s.id} className="bg-white/5 border border-white/5 text-neutral-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{s.skills?.name}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-8">
                  <button 
                    onClick={() => {
                      handleRequestSwap(selectedProfile.id, selectedProfile.user_skills?.[0]?.skill_id, selectedProfile.user_skills?.[0]?.skills?.name);
                      setSelectedProfile(null);
                    }}
                    className="w-full bg-white text-black py-4 rounded-full font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
                  >
                    Send Swap Request
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <header className="flex flex-col items-center mb-16 space-y-8">
        <div className="w-full max-w-2xl relative">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <SearchIcon className="w-5 h-5 text-neutral-400" />
          </div>
          <input 
            className="w-full bg-white/5 backdrop-blur-xl border border-white/10 focus:ring-1 focus:ring-white/30 rounded-full py-5 pl-14 pr-6 text-white text-lg font-sans placeholder:text-neutral-500 shadow-2xl transition-all outline-none" 
            placeholder="Find skills, users, or locations..." 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
          {['all', 'username', 'location', 'skills', 'learning'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider scale-95 active:scale-90 transition-all",
                filter === f ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.15)]" : "bg-white/5 hover:bg-white/10 border border-white/5 text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="glass-card rounded-xl p-8 h-80 animate-pulse flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/20" /></div>)
        ) : profiles.length === 0 ? (
          <div className="col-span-full text-center py-20 glass-card rounded-xl">
            <SearchIcon className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
            <p className="text-on-surface-variant font-medium">No users found matching your search.</p>
          </div>
        ) : (
          profiles.map((profile) => (
            <div key={profile.id} className="glass-card rounded-xl p-8 flex flex-col space-y-6 group hover:border-white/20 transition-all duration-500">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-white/30 transition-colors">
                    <img src={profile.avatar_url || `https://picsum.photos/seed/${profile.id}/200`} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="font-headline font-bold text-xl text-white tracking-tight">{profile.name}</h3>
                    <div className="flex items-center gap-2">
                      <p className="font-sans text-neutral-500 text-sm">@{profile.username}</p>
                      <span className="text-neutral-700">•</span>
                      <p className="font-sans text-neutral-500 text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {profile.location || 'Remote'}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] bg-white/10 text-white px-2 py-1 rounded-full uppercase font-black tracking-tighter">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span> Online
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-2">Expert In</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.user_skills?.filter((s: any) => s.type === 'know').map((s: any) => (
                      <span key={s.id} className="bg-white/10 text-white border border-white/5 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{s.skills?.name}</span>
                    ))}
                    {profile.user_skills?.filter((s: any) => s.type === 'know').length === 0 && <p className="text-[10px] text-neutral-600 italic">No skills listed</p>}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold mb-2">Wants to Learn</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.user_skills?.filter((s: any) => s.type === 'learn').map((s: any) => (
                      <span key={s.id} className="bg-white/5 border border-white/5 text-neutral-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase">{s.skills?.name}</span>
                    ))}
                    {profile.user_skills?.filter((s: any) => s.type === 'learn').length === 0 && <p className="text-[10px] text-neutral-600 italic">No skills listed</p>}
                  </div>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setSelectedProfile(profile)}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
                >
                  View Profile
                </button>
                <button 
                  onClick={() => handleRequestSwap(profile.id, profile.user_skills?.[0]?.skill_id, profile.user_skills?.[0]?.skills?.name)}
                  className="flex-1 bg-white text-black py-3 rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-white/5"
                >
                  Request Swap
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
