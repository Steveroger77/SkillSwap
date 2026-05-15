import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { format } from 'date-fns';
import {
  LogOut, Edit2, PlusCircle, XCircle, MapPin,
  Camera, Loader2, Grid, Bookmark, Trash2, Check,
  Plus, X, Search,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Profile() {
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts]                     = useState<any[]>([]);
  const [savedPosts, setSavedPosts]           = useState<any[]>([]);
  const [knowSkills, setKnowSkills]           = useState<any[]>([]);
  const [learnSkills, setLearnSkills]         = useState<any[]>([]);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [activeTab, setActiveTab]             = useState<'posts' | 'saved'>('posts');
  const [isEditing, setIsEditing]             = useState(false);
  const [showSkillModal, setShowSkillModal]   = useState<'know' | 'learn' | null>(null);
  const [selectedPost, setSelectedPost]       = useState<any>(null);
  const [postToDelete, setPostToDelete]       = useState<any>(null);
  const [newSkillName, setNewSkillName]       = useState('');
  const [skillSearch, setSkillSearch]         = useState('');
  const [avatarFile, setAvatarFile]           = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview]     = useState<string | null>(null);
  const [saving, setSaving]                   = useState(false);
  const [swapCount, setSwapCount]             = useState(0);
  const [editForm, setEditForm]               = useState({ name: '', username: '', bio: '', location: '' });
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      setEditForm({ name: profile.name, username: profile.username, bio: profile.bio || '', location: profile.location || 'Remote' });
      fetchContent();
      fetchSaved();
      fetchSwapCount();
    }
    fetchAvailableSkills();
  }, [profile?.id]);

  const fetchContent = async () => {
    if (!user) return;
    const [{ data: postsData }, { data: skillsData }] = await Promise.all([
      supabase.from('posts').select('*, post_media(*), post_likes(user_id)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_skills').select('*, skills(*)').eq('user_id', user.id),
    ]);
    setPosts(postsData ?? []);
    setKnowSkills((skillsData ?? []).filter(s => s.type === 'know'));
    setLearnSkills((skillsData ?? []).filter(s => s.type === 'learn'));
  };

  const fetchSaved = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('saved_posts')
      .select('posts(*, post_media(*), profiles(name, username, avatar_url))')
      .eq('user_id', user.id);
    setSavedPosts((data ?? []).map((s: any) => s.posts).filter(Boolean));
  };

  const fetchSwapCount = async () => {
    if (!user) return;
    const { count } = await supabase
      .from('swap_requests')
      .select('*', { count: 'exact', head: true })
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
      .eq('status', 'accepted');
    setSwapCount(count ?? 0);
  };

  const fetchAvailableSkills = async () => {
    const { data } = await supabase.from('skills').select('*').order('name');
    setAvailableSkills(data ?? []);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;
    setSaving(true);
    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop();
        const path = `avatars/${user.id}/avatar.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('media')
          .upload(path, avatarFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      // Check username uniqueness if changed
      if (editForm.username !== profile.username) {
        const { data: existing } = await supabase
          .from('profiles').select('id').eq('username', editForm.username.toLowerCase()).maybeSingle();
        if (existing) { showToast('Username already taken', 'error'); setSaving(false); return; }
      }

      const { error } = await supabase.from('profiles').update({
        name: editForm.name.trim(),
        username: editForm.username.toLowerCase().trim(),
        bio: editForm.bio.trim(),
        location: editForm.location.trim(),
        avatar_url: avatarUrl,
      }).eq('id', user.id);

      if (error) throw error;
      await refreshProfile();
      setIsEditing(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      showToast('Profile updated!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const addSkill = async (skillId: string, type: 'know' | 'learn') => {
    if (!user) return;
    const existing = [...knowSkills, ...learnSkills].find(s => s.skill_id === skillId);
    if (existing) { showToast('Skill already added', 'info'); return; }
    const { error } = await supabase.from('user_skills').insert({ user_id: user.id, skill_id: skillId, type });
    if (error) showToast('Failed to add skill', 'error');
    else { fetchContent(); showToast('Skill added!', 'success'); }
  };

  const createAndAddSkill = async (type: 'know' | 'learn') => {
    if (!newSkillName.trim() || !user) return;
    // Create or find skill
    const { data: existingSkill } = await supabase
      .from('skills').select('id').ilike('name', newSkillName.trim()).maybeSingle();
    let skillId = existingSkill?.id;
    if (!skillId) {
      const { data: created } = await supabase.from('skills').insert({ name: newSkillName.trim() }).select().single();
      skillId = created?.id;
    }
    if (skillId) { await addSkill(skillId, type); setNewSkillName(''); fetchAvailableSkills(); }
  };

  const removeSkill = async (userSkillId: string) => {
    const { error } = await supabase.from('user_skills').delete().eq('id', userSkillId);
    if (error) showToast('Failed to remove skill', 'error');
    else { fetchContent(); showToast('Skill removed', 'info'); }
  };

  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) showToast('Failed to delete post', 'error');
    else { setPostToDelete(null); setSelectedPost(null); fetchContent(); showToast('Post deleted', 'success'); }
  };

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-white/40" />
    </div>
  );

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="glass-card rounded-3xl p-10 text-center max-w-sm w-full">
        <p className="text-white/60 mb-4">Profile not found. Please sign in again.</p>
        <button onClick={signOut} className="btn-primary w-full py-4 rounded-2xl text-sm">Sign Out</button>
      </div>
    </div>
  );

  const displayPosts = activeTab === 'posts' ? posts : savedPosts;
  const filteredSkills = availableSkills.filter(s =>
    s.name.toLowerCase().includes(skillSearch.toLowerCase()) &&
    ![...knowSkills, ...learnSkills].some(us => us.skill_id === s.id)
  );

  return (
    <main className="max-w-2xl mx-auto px-4 pt-20 pb-32">
      {/* Profile Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-6 mb-6 relative overflow-hidden">
        <div className="relative z-10">
          {/* Avatar + Edit */}
          <div className="flex items-start justify-between mb-5">
            <div className="relative group">
              <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-white/15 shadow-2xl">
                {avatarPreview || profile.avatar_url ? (
                  <img src={avatarPreview || profile.avatar_url!} alt={profile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-4xl font-black text-white/30">
                    {profile.name[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              {isEditing && (
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="w-8 h-8 text-white" />
                </button>
              )}
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => { setIsEditing(false); setAvatarPreview(null); setAvatarFile(null); }}
                    className="btn-glass p-3 rounded-2xl"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="btn-primary px-5 py-3 rounded-2xl text-sm flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Save
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsEditing(true)} className="btn-glass p-3 rounded-2xl">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={signOut} className="btn-glass p-3 rounded-2xl text-red-400/70 hover:text-red-400">
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <input
                className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                placeholder="Full Name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
                <input
                  className="glass-input w-full rounded-2xl pl-8 pr-4 py-3 text-sm"
                  placeholder="username"
                  value={editForm.username}
                  onChange={e => setEditForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') }))}
                />
              </div>
              <textarea
                className="glass-input w-full rounded-2xl px-4 py-3 text-sm resize-none"
                placeholder="Bio…"
                rows={3}
                value={editForm.bio}
                onChange={e => setEditForm(f => ({ ...f, bio: e.target.value }))}
              />
              <input
                className="glass-input w-full rounded-2xl px-4 py-3 text-sm"
                placeholder="Location"
                value={editForm.location}
                onChange={e => setEditForm(f => ({ ...f, location: e.target.value }))}
              />
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-headline font-black text-white tracking-tight">{profile.name}</h2>
              <p className="text-white/45 text-sm mb-1">@{profile.username}</p>
              {profile.bio && <p className="text-white/70 text-sm leading-relaxed mt-2 mb-2">{profile.bio}</p>}
              {profile.location && (
                <p className="text-white/35 text-xs flex items-center gap-1.5 mt-2">
                  <MapPin className="w-3 h-3" /> {profile.location}
                </p>
              )}
            </div>
          )}

          {/* Stats */}
          {!isEditing && (
            <div className="flex gap-6 mt-5 pt-5 border-t border-white/[0.06]">
              {[
                { label: 'Posts', val: posts.length },
                { label: 'Knows', val: knowSkills.length },
                { label: 'Learning', val: learnSkills.length },
                { label: 'Swaps', val: swapCount },
              ].map(stat => (
                <div key={stat.label} className="text-center">
                  <p className="text-xl font-headline font-black text-white">{stat.val}</p>
                  <p className="text-white/35 text-[10px] font-bold uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Skills */}
      {!isEditing && (
        <div className="space-y-4 mb-6">
          {/* Knows */}
          <div className="glass-card rounded-3xl p-5 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Knows</h3>
                <button onClick={() => setShowSkillModal('know')} className="p-2 btn-glass rounded-xl">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {knowSkills.length === 0 ? (
                <p className="text-white/30 text-sm">No skills added yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {knowSkills.map(s => (
                    <span key={s.id} className="skill-badge px-4 py-2 rounded-full text-sm font-semibold text-white flex items-center gap-2">
                      {s.skills?.name}
                      <button onClick={() => removeSkill(s.id)} className="text-white/30 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Learning */}
          <div className="glass-card rounded-3xl p-5 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Learning</h3>
                <button onClick={() => setShowSkillModal('learn')} className="p-2 btn-glass rounded-xl">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {learnSkills.length === 0 ? (
                <p className="text-white/30 text-sm">No skills added yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {learnSkills.map(s => (
                    <span key={s.id} className="skill-badge px-4 py-2 rounded-full text-sm font-semibold text-white flex items-center gap-2 border-white/5 bg-white/[0.04]">
                      {s.skills?.name}
                      <button onClick={() => removeSkill(s.id)} className="text-white/30 hover:text-red-400 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      {!isEditing && (
        <div className="glass-card rounded-3xl overflow-hidden relative">
          {/* Tabs */}
          <div className="relative z-10 flex p-1 m-3 glass rounded-full">
            {(['posts', 'saved'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-full text-xs font-bold capitalize flex items-center justify-center gap-1.5 transition-all duration-300 ${
                  activeTab === tab ? 'bg-white text-black shadow-[0_2px_12px_rgba(255,255,255,0.2)]' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab === 'posts' ? <Grid className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                {tab}
              </button>
            ))}
          </div>

          {displayPosts.length === 0 ? (
            <div className="py-16 text-center relative z-10">
              <p className="text-white/30 text-sm">{activeTab === 'posts' ? 'No posts yet' : 'No saved posts'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-0.5 relative z-10">
              {displayPosts.map((post: any, i: number) => {
                const thumb = post.post_media?.[0]?.media_url;
                return (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="aspect-square overflow-hidden relative group post-thumb bg-white/5"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-3">
                        <p className="text-white/40 text-[10px] leading-tight text-center line-clamp-4">{post.caption}</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop" onClick={() => setSelectedPost(null)}>
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal rounded-3xl max-w-sm w-full overflow-hidden"
            >
              {selectedPost.post_media?.[0]?.media_url && (
                <div className="aspect-square w-full">
                  <img src={selectedPost.post_media[0].media_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-5 relative z-10">
                <p className="text-white/80 text-sm leading-relaxed mb-4">{selectedPost.caption}</p>
                <p className="text-white/28 text-[10px] uppercase font-bold tracking-wider mb-4">
                  {selectedPost.created_at ? format(new Date(selectedPost.created_at), 'MMM d, yyyy') : ''}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setSelectedPost(null)} className="flex-1 btn-glass py-3 rounded-2xl text-sm">Close</button>
                  {selectedPost.user_id === user?.id && (
                    <button
                      onClick={() => { setPostToDelete(selectedPost); setSelectedPost(null); }}
                      className="btn-glass py-3 px-4 rounded-2xl text-red-400 border-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Post Modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 modal-backdrop">
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.88, opacity: 0 }}
              className="glass-modal p-8 rounded-3xl max-w-sm w-full space-y-6 text-center relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="w-16 h-16 bg-red-500/12 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Delete Post?</h3>
                <p className="text-white/45 text-sm">This action cannot be undone.</p>
                <div className="flex flex-col gap-3 mt-6">
                  <button onClick={() => handleDeletePost(postToDelete.id)} className="w-full bg-red-500 text-white py-3.5 rounded-full font-bold text-sm hover:bg-red-600 transition-colors">
                    Delete Permanently
                  </button>
                  <button onClick={() => setPostToDelete(null)} className="w-full btn-glass py-3.5 rounded-full text-sm font-bold">Cancel</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Skill Modal */}
      <AnimatePresence>
        {showSkillModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 modal-backdrop" onClick={() => { setShowSkillModal(null); setSkillSearch(''); setNewSkillName(''); }}>
            <motion.div
              initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              onClick={e => e.stopPropagation()}
              className="glass-modal rounded-t-3xl sm:rounded-3xl p-6 max-w-sm w-full max-h-[80vh] flex flex-col relative overflow-hidden"
            >
              <div className="relative z-10 flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="text-xl font-headline font-black text-white">
                    Add {showSkillModal === 'know' ? 'Knowledge' : 'Learning'} Skill
                  </h3>
                  <button onClick={() => { setShowSkillModal(null); setSkillSearch(''); setNewSkillName(''); }} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                    <XCircle className="w-5 h-5 text-white/40" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    className="glass-input w-full rounded-2xl pl-10 pr-4 py-3 text-sm"
                    placeholder="Search skills…"
                    value={skillSearch}
                    onChange={e => setSkillSearch(e.target.value)}
                    autoFocus
                  />
                </div>

                {/* Existing skills list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 mb-4 min-h-0">
                  {filteredSkills.slice(0, 20).map(skill => (
                    <button
                      key={skill.id}
                      onClick={() => addSkill(skill.id, showSkillModal!)}
                      className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/10 text-white text-sm transition-colors flex items-center justify-between group"
                    >
                      <span>{skill.name}</span>
                      <PlusCircle className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                  {filteredSkills.length === 0 && skillSearch && (
                    <p className="text-white/30 text-sm text-center py-4">No match — create it below</p>
                  )}
                </div>

                {/* Create new skill */}
                <div className="border-t border-white/[0.07] pt-4">
                  <p className="text-white/35 text-xs font-bold uppercase tracking-wider mb-3">Or create new skill</p>
                  <div className="flex gap-2">
                    <input
                      className="glass-input flex-1 rounded-2xl px-4 py-3 text-sm"
                      placeholder="Skill name…"
                      value={newSkillName}
                      onChange={e => setNewSkillName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && createAndAddSkill(showSkillModal!)}
                    />
                    <button
                      onClick={() => createAndAddSkill(showSkillModal!)}
                      disabled={!newSkillName.trim()}
                      className="btn-primary px-4 py-3 rounded-2xl text-sm font-bold disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
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
