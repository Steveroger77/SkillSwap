import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, limit, doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import type { Skill, Profile } from '../types';
import { PlusCircle, Zap, Loader2 } from 'lucide-react';

export default function Swap() {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const [learnSkills, setLearnSkills] = useState<any[]>([]);
  const [knowSkills, setKnowSkills] = useState<any[]>([]);
  const [mentors, setMentors] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      fetchMySkills();
      fetchRecommendations();
    }
  }, [profile]);

  async function fetchMySkills() {
    if (!profile) return;
    try {
      const skillsSnapshot = await getDocs(collection(db, `users/${profile.id}/skills`));
      const skills = await Promise.all(skillsSnapshot.docs.map(async (sDoc) => {
        const sData = sDoc.data();
        const skillSnap = await getDoc(doc(db, 'skills', sData.skill_id));
        return {
          id: sDoc.id,
          ...sData,
          skills: skillSnap.exists() ? skillSnap.data() : { name: 'Unknown Skill' }
        };
      }));
      setKnowSkills(skills.filter((s: any) => s.type === 'know').map((s: any) => ({ id: s.skill_id, ...s.skills })));
      setLearnSkills(skills.filter((s: any) => s.type === 'learn').map((s: any) => ({ id: s.skill_id, ...s.skills })));
    } catch (error) {
      console.error('Error fetching my skills:', error);
    }
  }

  async function fetchRecommendations() {
    if (!profile) return;
    setLoading(true);
    try {
      // Simplified recommendation logic: fetch some users and their skills
      const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(10)));
      const allUsers = await Promise.all(usersSnapshot.docs.map(async (uDoc) => {
        const userData = { id: uDoc.id, ...uDoc.data() } as any;
        const skillsSnapshot = await getDocs(collection(db, `users/${uDoc.id}/skills`));
        const userSkills = await Promise.all(skillsSnapshot.docs.map(async (sDoc) => {
          const sData = sDoc.data();
          const skillSnap = await getDoc(doc(db, 'skills', sData.skill_id));
          return { 
            id: sDoc.id, 
            ...sData, 
            skills: skillSnap.exists() ? skillSnap.data() : { name: 'Unknown Skill' } 
          };
        }));
        return { ...userData, user_skills: userSkills };
      }));

      const others = allUsers.filter(u => u.id !== profile.id);
      
      // Mentors: users who know what I want to learn
      const mentorList = others.filter(u => 
        u.user_skills?.some((s: any) => s.type === 'know' && learnSkills.some(ls => ls.id === s.skill_id))
      );
      
      // Learners: users who want to learn what I know
      const learnerList = others.filter(u => 
        u.user_skills?.some((s: any) => s.type === 'learn' && knowSkills.some(ks => ks.id === s.skill_id))
      );

      setMentors(mentorList.length > 0 ? mentorList : others.slice(0, 2));
      setLearners(learnerList.length > 0 ? learnerList : others.slice(2, 4));
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleRequestSwap = async (toUserId: string, skillId?: string, skillName?: string) => {
    if (!profile) return;
    try {
      await addDoc(collection(db, 'swap_requests'), {
        from_user: profile.id,
        to_user: toUserId,
        skill_id: skillId || null,
        skill_name: skillName || 'General Swap',
        status: 'pending',
        created_at: serverTimestamp()
      });
      showToast('Swap request sent!', 'success');
    } catch (error) {
      console.error('Error sending swap request:', error);
      showToast('Error sending swap request. Please try again.', 'error');
    }
  };

  return (
    <main className="pt-24 pb-32 px-6 md:px-12 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-5xl md:text-7xl font-headline font-extrabold tracking-tighter text-white mb-4">The Exchange.</h1>
        <p className="text-on-surface-variant max-w-xl text-lg font-light leading-relaxed">Match with experts and learners in your network. Grow your capabilities through direct knowledge sharing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <section className="flex flex-col gap-8">
          <div className="flex items-end justify-between px-2">
            <h2 className="text-3xl font-headline font-bold tracking-tight">LEARN A SKILL</h2>
            <span className="text-xs font-sans uppercase tracking-widest opacity-50">Demand</span>
          </div>
          <div className="glass-card p-8 rounded-xl">
            <div className="flex flex-wrap gap-3 mb-8">
              {learnSkills.map(s => (
                <span key={s.id} className="px-4 py-2 rounded-full bg-white text-black font-sans text-sm font-bold uppercase tracking-tight">{s.name}</span>
              ))}
              {learnSkills.length === 0 && <p className="text-xs text-neutral-500 italic">Add skills you want to learn in your profile.</p>}
            </div>
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Recommended Mentors</h3>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
              ) : mentors.map(m => (
                <div key={m.id} className="glass-card p-6 rounded-lg group cursor-pointer hover:bg-white/5 transition-all">
                  <div className="flex gap-4 items-center mb-4">
                    <img src={m.avatar_url || `https://picsum.photos/seed/${m.id}/200`} className="w-14 h-14 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-headline font-bold text-lg leading-none text-white">{m.name}</p>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-1">Expert</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full">
                      <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-bold text-white">LIVE</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRequestSwap(m.id, m.user_skills?.[0]?.skill_id, m.user_skills?.[0]?.skills?.name)}
                    className="w-full py-4 rounded-full bg-white text-black font-bold uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    Send Swap Request
                  </button>
                </div>
              ))}
              {!loading && mentors.length === 0 && <p className="text-sm text-neutral-500 text-center">No mentors found yet.</p>}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-8">
          <div className="flex items-end justify-between px-2">
            <h2 className="text-3xl font-headline font-bold tracking-tight">TEACH A SKILL</h2>
            <span className="text-xs font-sans uppercase tracking-widest opacity-50">Supply</span>
          </div>
          <div className="glass-card p-8 rounded-xl">
            <div className="flex flex-wrap gap-3 mb-8">
              {knowSkills.map(s => (
                <span key={s.id} className="px-4 py-2 rounded-full bg-white text-black font-sans text-sm font-bold uppercase tracking-tight">{s.name}</span>
              ))}
              {knowSkills.length === 0 && <p className="text-xs text-neutral-500 italic">Add skills you know in your profile.</p>}
            </div>
            <div className="space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-4">Recommended Learners</h3>
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-white/20" /></div>
              ) : learners.map(l => (
                <div key={l.id} className="glass-card p-6 rounded-lg group cursor-pointer hover:bg-white/5 transition-all">
                  <div className="flex gap-4 items-center mb-4">
                    <img src={l.avatar_url || `https://picsum.photos/seed/${l.id}/200`} className="w-14 h-14 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-headline font-bold text-lg leading-none text-white">{l.name}</p>
                      <p className="text-xs text-on-surface-variant uppercase tracking-widest mt-1">Learner</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRequestSwap(l.id, l.user_skills?.[0]?.skill_id, l.user_skills?.[0]?.skills?.name)}
                    className="w-full py-4 rounded-full bg-white text-black font-bold uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    Send Swap Request
                  </button>
                </div>
              ))}
              {!loading && learners.length === 0 && <p className="text-sm text-neutral-500 text-center">No learners found yet.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
