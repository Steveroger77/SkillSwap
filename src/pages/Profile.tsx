import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { format } from 'date-fns';
import { LogOut, Edit2, MapPin, Camera, Loader2, Grid, Bookmark, Trash2, Check, Plus, X, Search, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts]           = useState<any[]>([]);
  const [saved, setSaved]           = useState<any[]>([]);
  const [knowSkills, setKnowSkills] = useState<any[]>([]);
  const [learnSkills, setLearnSkills] = useState<any[]>([]);
  const [allSkills, setAllSkills]   = useState<any[]>([]);
  const [tab, setTab]               = useState<'posts'|'saved'>('posts');
  const [editing, setEditing]       = useState(false);
  const [skillModal, setSkillModal] = useState<'know'|'learn'|null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [deletingPost, setDeletingPost] = useState<any>(null);
  const [skillSearch, setSkillSearch]   = useState('');
  const [newSkillName, setNewSkillName] = useState('');
  const [avatarFile, setAvatarFile] = useState<File|null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string|null>(null);
  const [saving, setSaving]         = useState(false);
  const [swapCount, setSwapCount]   = useState(0);
  const [form, setForm]             = useState({ name:'', username:'', bio:'', location:'' });
  const avatarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({ name: profile.name, username: profile.username, bio: profile.bio || '', location: profile.location || '' });
    loadAll();
    supabase.from('skills').select('*').order('name').then(({ data }) => setAllSkills(data ?? []));
  }, [profile?.id]);

  const loadAll = async () => {
    if (!user) return;
    const [{ data: postsData }, { data: skillsData }, { data: savedData }, { count }] = await Promise.all([
      supabase.from('posts').select('*, post_media(*), post_likes(user_id)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_skills').select('*, skills(*)').eq('user_id', user.id),
      supabase.from('saved_posts').select('posts(*, post_media(*), profiles(name,username,avatar_url))').eq('user_id', user.id),
      supabase.from('swap_requests').select('*', { count: 'exact', head: true }).or(`from_user.eq.${user.id},to_user.eq.${user.id}`).eq('status', 'accepted'),
    ]);
    setPosts(postsData ?? []);
    setKnowSkills((skillsData ?? []).filter(s => s.type === 'know'));
    setLearnSkills((skillsData ?? []).filter(s => s.type === 'learn'));
    setSaved((savedData ?? []).map((s: any) => s.posts).filter(Boolean));
    setSwapCount(count ?? 0);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f));
  };

  const saveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop() ?? 'jpg';
        const path = `avatars/${user.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage.from('media').upload(path, avatarFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: ud } = supabase.storage.from('media').getPublicUrl(path);
        avatarUrl = ud.publicUrl + `?t=${Date.now()}`;
      }
      if (form.username !== profile.username) {
        const { data: ex } = await supabase.from('profiles').select('id').eq('username', form.username.toLowerCase()).maybeSingle();
        if (ex) throw new Error('Username already taken');
      }
      const { error } = await supabase.from('profiles').update({
        name: form.name.trim(), username: form.username.toLowerCase().trim(),
        bio: form.bio.trim(), location: form.location.trim(), avatar_url: avatarUrl,
      }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      setEditing(false); setAvatarFile(null); setAvatarPreview(null);
      showToast('Profile updated! ✨', 'success');
    } catch (e: any) { showToast(e.message || 'Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const addSkill = async (skillId: string, type: 'know'|'learn') => {
    if (!user) return;
    if ([...knowSkills, ...learnSkills].some(s => s.skill_id === skillId)) { showToast('Already added', 'info'); return; }
    const { error } = await supabase.from('user_skills').insert({ user_id: user.id, skill_id: skillId, type });
    if (error) showToast('Failed to add skill', 'error');
    else { loadAll(); showToast('Skill added!', 'success'); }
  };

  const createSkill = async (type: 'know'|'learn') => {
    if (!newSkillName.trim() || !user) return;
    const { data: ex } = await supabase.from('skills').select('id').ilike('name', newSkillName.trim()).maybeSingle();
    let id = ex?.id;
    if (!id) { const { data } = await supabase.from('skills').insert({ name: newSkillName.trim() }).select().single(); id = data?.id; }
    if (id) { await addSkill(id, type); setNewSkillName(''); setAllSkills([]); supabase.from('skills').select('*').order('name').then(({ data }) => setAllSkills(data ?? [])); }
  };

  const removeSkill = async (id: string) => {
    await supabase.from('user_skills').delete().eq('id', id);
    loadAll(); showToast('Skill removed', 'info');
  };

  const deletePost = async (id: string) => {
    await supabase.from('posts').delete().eq('id', id);
    setDeletingPost(null); setSelectedPost(null); loadAll(); showToast('Post deleted', 'success');
  };

  if (authLoading) return <div className="min-h-svh flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white/30" /></div>;
  if (!profile) return <div className="min-h-svh flex items-center justify-center p-6"><div className="glass-card p-10 rounded-3xl text-center max-w-sm w-full"><p className="text-white/50 mb-6">Profile not found</p><button onClick={signOut} className="btn-primary w-full py-4 rounded-2xl text-sm">Sign Out</button></div></div>;

  const displayPosts = tab === 'posts' ? posts : saved;
  const filteredSkills = allSkills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase()) && ![...knowSkills,...learnSkills].some(us => us.skill_id === s.id));

  return (
    <main className="max-w-[480px] mx-auto px-4 pt-20 pb-32">
      {/* Header card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }} className="glass-card rounded-3xl p-5 mb-4 relative overflow-hidden">
        <div className="relative z-10">
          {/* Avatar + actions */}
          <div className="flex items-start justify-between mb-4">
            <div className="relative group cursor-pointer" onClick={() => editing && avatarRef.current?.click()}>
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-white/12">
                {avatarPreview || profile.avatar_url
                  ? <img src={avatarPreview || profile.avatar_url!} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-full h-full bg-white/10 flex items-center justify-center text-3xl font-black text-white/30">{profile.name[0]?.toUpperCase()}</div>}
              </div>
              {editing && <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-6 h-6 text-white" /></div>}
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="flex gap-2">
              {editing ? (
                <>
                  <button onClick={() => { setEditing(false); setAvatarPreview(null); setAvatarFile(null); }} className="btn-glass p-2.5 rounded-xl"><X className="w-4 h-4" /></button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={saveProfile} disabled={saving} className="btn-primary px-4 py-2.5 rounded-xl text-sm flex items-center gap-1.5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}Save
                  </motion.button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditing(true)} className="btn-glass p-2.5 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={signOut} className="btn-glass p-2.5 rounded-xl !text-red-400/70 hover:!text-red-400"><LogOut className="w-4 h-4" /></button>
                </>
              )}
            </div>
          </div>

          {editing ? (
            <div className="flex flex-col gap-3">
              <input className="glass-input rounded-2xl px-4 py-3 text-sm" placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/28 text-sm">@</span><input className="glass-input rounded-2xl pl-8 pr-4 py-3 text-sm" placeholder="username" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g,'')}))}/></div>
              <textarea className="glass-input rounded-2xl px-4 py-3 text-sm resize-none" rows={3} placeholder="Bio…" value={form.bio} onChange={e => setForm(f => ({...f, bio: e.target.value}))} />
              <input className="glass-input rounded-2xl px-4 py-3 text-sm" placeholder="Location" value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))} />
            </div>
          ) : (
            <div>
              <h2 className="font-headline text-2xl font-black text-white tracking-tight">{profile.name}</h2>
              <p className="text-white/38 text-sm mb-1">@{profile.username}</p>
              {profile.bio && <p className="text-white/62 text-sm leading-relaxed mt-1.5 mb-1">{profile.bio}</p>}
              {profile.location && <p className="text-white/30 text-xs flex items-center gap-1 mt-1.5"><MapPin className="w-3 h-3" />{profile.location}</p>}
            </div>
          )}

          {!editing && (
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/[0.055]">
              {[{ label: 'Posts', val: posts.length }, { label: 'Knows', val: knowSkills.length }, { label: 'Learning', val: learnSkills.length }, { label: 'Swaps', val: swapCount }].map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-xl font-headline font-black text-white">{s.val}</p>
                  <p className="text-white/30 text-[9px] font-black uppercase tracking-widest">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Skills */}
      {!editing && (
        <div className="space-y-3 mb-4">
          {[{ label: 'Teaches', type: 'know' as const, list: knowSkills }, { label: 'Learning', type: 'learn' as const, list: learnSkills }].map(({ label, type, list }) => (
            <div key={type} className="glass-card rounded-2xl p-4 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/32">{label}</p>
                  <button onClick={() => setSkillModal(type)} className="btn-glass p-1.5 rounded-lg"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                {list.length === 0
                  ? <p className="text-white/22 text-xs">No skills yet — tap + to add</p>
                  : <div className="flex flex-wrap gap-2">{list.map(s => (
                      <span key={s.id} className="skill-badge px-3 py-1.5 rounded-full text-xs font-bold text-white/72 flex items-center gap-1.5">
                        {s.skills?.name}
                        <button onClick={() => removeSkill(s.id)} className="text-white/25 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}</div>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {!editing && (
        <div className="glass-card rounded-3xl overflow-hidden relative">
          {/* Tabs */}
          <div className="relative flex p-1 m-3 glass rounded-full">
            <motion.div layoutId="profile-tab" className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white rounded-full"
              animate={{ left: tab === 'posts' ? '4px' : 'calc(50%)' }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }} />
            {(['posts','saved'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`relative z-10 flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors duration-200 rounded-full ${tab === t ? 'text-black' : 'text-white/40 hover:text-white/70'}`}>
                {t === 'posts' ? <Grid className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}{t}
              </button>
            ))}
          </div>

          {displayPosts.length === 0
            ? <div className="py-16 text-center relative z-10"><p className="text-white/28 text-sm">{tab === 'posts' ? 'No posts yet' : 'No saved posts'}</p></div>
            : <div className="grid grid-cols-3 gap-px relative z-10">
                {displayPosts.map((post: any, i: number) => {
                  const thumb = post.post_media?.[0]?.media_url;
                  return (
                    <motion.button key={post.id} whileTap={{ scale: 0.97 }} onClick={() => setSelectedPost(post)}
                      className="aspect-square overflow-hidden relative group bg-white/[0.03] post-thumb">
                      {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center p-2"><p className="text-white/35 text-[9px] leading-tight text-center line-clamp-4">{post.caption}</p></div>}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.button>
                  );
                })}
              </div>
          }
        </div>
      )}

      {/* Post detail modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop" onClick={() => setSelectedPost(null)}>
            <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} onClick={e => e.stopPropagation()} className="glass-modal rounded-3xl max-w-sm w-full overflow-hidden">
              {selectedPost.post_media?.[0]?.media_url && <div className="aspect-square"><img src={selectedPost.post_media[0].media_url} alt="" className="w-full h-full object-cover" /></div>}
              <div className="p-5 relative z-10">
                {selectedPost.caption && <p className="text-white/72 text-sm leading-relaxed mb-3">{selectedPost.caption}</p>}
                <p className="text-white/22 text-[10px] uppercase font-bold tracking-widest mb-4">{selectedPost.created_at ? format(new Date(selectedPost.created_at), 'MMM d, yyyy') : ''}</p>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedPost(null)} className="flex-1 btn-glass py-3 rounded-2xl text-sm font-bold">Close</button>
                  {selectedPost.user_id === user?.id && <button onClick={() => { setDeletingPost(selectedPost); setSelectedPost(null); }} className="btn-glass py-3 px-4 rounded-2xl !text-red-400 !border-red-500/18"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {deletingPost && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 modal-backdrop">
            <motion.div initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }} className="glass-modal p-8 rounded-3xl max-w-sm w-full text-center">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-7 h-7 text-red-400" /></div>
                <h3 className="text-xl font-black text-white mb-1">Delete Post?</h3>
                <p className="text-white/40 text-sm mb-6">Cannot be undone.</p>
                <div className="flex flex-col gap-3">
                  <button onClick={() => deletePost(deletingPost.id)} className="w-full bg-red-500 hover:bg-red-600 text-white py-3.5 rounded-full font-bold text-sm transition-colors">Delete Permanently</button>
                  <button onClick={() => setDeletingPost(null)} className="w-full btn-glass py-3.5 rounded-full text-sm font-bold">Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add skill modal */}
      <AnimatePresence>
        {skillModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 modal-backdrop" onClick={() => { setSkillModal(null); setSkillSearch(''); setNewSkillName(''); }}>
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 36 }} onClick={e => e.stopPropagation()}
              className="glass-modal rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full max-h-[80svh] flex flex-col">
              <div className="w-10 h-1 bg-white/12 rounded-full mx-auto mb-5 sm:hidden" />
              <div className="relative z-10 flex flex-col min-h-0 flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-headline font-black text-white">Add {skillModal === 'know' ? 'Skill I Know' : 'Skill to Learn'}</h3>
                  <button onClick={() => { setSkillModal(null); setSkillSearch(''); setNewSkillName(''); }}><XCircle className="w-5 h-5 text-white/35" /></button>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/28" />
                  <input className="glass-input rounded-2xl pl-10 pr-4 py-3 text-sm" placeholder="Search skills…" value={skillSearch} onChange={e => setSkillSearch(e.target.value)} autoFocus />
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mb-4 min-h-0">
                  {filteredSkills.slice(0, 25).map(s => (
                    <button key={s.id} onClick={() => addSkill(s.id, skillModal!)} className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/8 text-white text-sm transition-colors flex items-center justify-between group">
                      <span>{s.name}</span><Plus className="w-4 h-4 text-white/22 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                  {filteredSkills.length === 0 && skillSearch && <p className="text-white/28 text-sm text-center py-4">No match — create it below</p>}
                </div>
                <div className="border-t border-white/[0.07] pt-4">
                  <p className="text-white/28 text-[10px] font-black uppercase tracking-widest mb-3">Create New Skill</p>
                  <div className="flex gap-2">
                    <input className="glass-input flex-1 rounded-2xl px-4 py-3 text-sm" placeholder="Skill name…" value={newSkillName} onChange={e => setNewSkillName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createSkill(skillModal!)} />
                    <motion.button whileTap={{ scale: 0.92 }} onClick={() => createSkill(skillModal!)} disabled={!newSkillName.trim()} className="btn-primary px-4 py-3 rounded-2xl text-sm font-bold disabled:opacity-40"><Plus className="w-4 h-4" /></motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
