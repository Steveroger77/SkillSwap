import { useState, useEffect } from 'react';
import { db, storage, auth } from '../lib/firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  setDoc, 
  deleteDoc,
  addDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { useAuth } from '../hooks/useAuth';
import { format } from 'date-fns';
import { 
  User, 
  LogOut, 
  Edit2, 
  PlusCircle, 
  Eye, 
  XCircle, 
  MapPin, 
  Calendar, 
  Camera, 
  Loader2, 
  Grid, 
  Bookmark, 
  Settings as SettingsIcon,
  Trash2,
  Moon,
  Sun,
  Heart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { seedMockData } from '../lib/mockData';

export default function Profile() {
  const { profile, signOut, loading, user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [knowSkills, setKnowSkills] = useState<any[]>([]);
  const [learnSkills, setLearnSkills] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', username: '', bio: '', location: '' });
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const [showSkillModal, setShowSkillModal] = useState<'know' | 'learn' | null>(null);
  const [availableSkills, setAvailableSkills] = useState<any[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [postToDelete, setPostToDelete] = useState<any | null>(null);

  useEffect(() => {
    if (profile) {
      fetchUserContent();
      fetchSavedPosts();
      setEditForm({ 
        name: profile.name, 
        username: profile.username, 
        bio: profile.bio || '',
        location: profile.location || 'Remote'
      });
    }
    fetchAvailableSkills();
  }, [profile]);

  const fetchAvailableSkills = async () => {
    try {
      const skillsSnap = await getDocs(collection(db, 'skills'));
      const skillsData = skillsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableSkills(skillsData);
    } catch (error) {
      console.error('Error fetching available skills:', error);
    }
  };

  const [newSkillName, setNewSkillName] = useState('');
  const [isCreatingSkill, setIsCreatingSkill] = useState(false);

  const handleCreateAndAddSkill = async () => {
    if (!newSkillName.trim() || !showSkillModal || !user) return;
    setIsCreatingSkill(true);
    try {
      // 1. Create the skill in the global 'skills' collection
      const skillRef = await addDoc(collection(db, 'skills'), {
        name: newSkillName.trim(),
        created_at: serverTimestamp()
      });

      // 2. Add it to the user's skills
      await handleAddSkill(skillRef.id);
      setNewSkillName('');
      fetchAvailableSkills();
    } catch (error) {
      console.error('Error creating skill:', error);
    } finally {
      setIsCreatingSkill(false);
    }
  };

  const handleDeletePost = async (postId: string, mediaItems?: { url: string, type: string }[]) => {
    if (!user) return;
    console.log('Attempting to delete post:', postId);
    try {
      // 1. Delete media from storage if it exists
      if (mediaItems && mediaItems.length > 0) {
        console.log('Deleting media items:', mediaItems.length);
        for (const item of mediaItems) {
          if (item.url.includes('firebasestorage')) {
            try {
              const fileRef = ref(storage, item.url);
              await deleteObject(fileRef);
              console.log('Deleted media from storage:', item.url);
            } catch (e) {
              console.warn('Could not delete post media:', e);
            }
          }
        }
      }

      // 2. Delete post document
      console.log('Deleting document from Firestore...');
      await deleteDoc(doc(db, 'posts', postId));
      console.log('Document deleted successfully');
      
      // 3. Refresh posts
      fetchUserContent();
      setSelectedPost(null);
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert(`Error deleting post: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddSkill = async (skillId: string) => {
    if (!profile || !showSkillModal || !user) return;
    try {
      const skillRef = doc(db, 'users', user.uid, 'skills', skillId);
      await setDoc(skillRef, {
        skill_id: skillId,
        type: showSkillModal,
        created_at: serverTimestamp()
      });
      
      setShowSkillModal(null);
      fetchUserContent();
    } catch (error) {
      console.error('Error adding skill:', error);
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'skills', skillId));
      fetchUserContent();
    } catch (error) {
      console.error('Error removing skill:', error);
    }
  };

  const fetchSavedPosts = async () => {
    if (!user) return;
    try {
      const savedSnap = await getDocs(collection(db, 'users', user.uid, 'saved_posts'));
      const savedPostsData = await Promise.all(savedSnap.docs.map(async (savedDoc) => {
        const postSnap = await getDoc(doc(db, 'posts', savedDoc.id));
        return postSnap.exists() ? { id: postSnap.id, ...postSnap.data() } : null;
      }));
      setSavedPosts(savedPostsData.filter(p => p !== null));
    } catch (error) {
      console.error('Error fetching saved posts:', error);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile || !user) return;
    setIsUpdating(true);
    try {
      // If it's a storage URL, try to delete the file
      if (profile.avatar_url?.includes('firebasestorage')) {
        try {
          const fileRef = ref(storage, profile.avatar_url);
          await deleteObject(fileRef);
        } catch (e) {
          console.warn('Could not delete avatar file from storage:', e);
        }
      }

      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, {
        avatar_url: `https://picsum.photos/seed/${user.uid}/200`
      });
    } catch (error) {
      console.error('Error deleting avatar:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!profile || !user) return;
    setIsUpdating(true);
    setError(null);
    try {
      let avatarUrl = profile.avatar_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.uid}-${Date.now()}.${fileExt}`;
        const storageRef = ref(storage, `avatars/${fileName}`);

        await uploadBytes(storageRef, avatarFile);
        avatarUrl = await getDownloadURL(storageRef);
      }

      const profileRef = doc(db, 'users', user.uid);
      await updateDoc(profileRef, {
        name: editForm.name,
        username: editForm.username,
        bio: editForm.bio,
        location: editForm.location,
        avatar_url: avatarUrl
      });

      setIsEditing(false);
      setAvatarFile(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSeedData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      await seedMockData(user.uid);
      alert('Mock data seeded successfully! Refreshing content...');
      fetchUserContent();
      fetchSavedPosts();
    } catch (error) {
      alert('Failed to seed mock data. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  async function fetchUserContent() {
    if (!profile || !user) return;
    try {
      // Fetch user's posts
      const postsQuery = query(collection(db, 'posts'), where('user_id', '==', user.uid));
      const postsSnap = await getDocs(postsQuery);
      setPosts(postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch user's skills
      const skillsSnap = await getDocs(collection(db, 'users', user.uid, 'skills'));
      const userSkills = await Promise.all(skillsSnap.docs.map(async (sDoc) => {
        const sData = sDoc.data();
        const skillSnap = await getDoc(doc(db, 'skills', sData.skill_id));
        return {
          id: sDoc.id,
          ...sData,
          skills: skillSnap.exists() ? skillSnap.data() : { name: 'Unknown Skill' }
        };
      }));

      setKnowSkills(userSkills.filter((s: any) => s.type === 'know'));
      setLearnSkills(userSkills.filter((s: any) => s.type === 'learn'));
    } catch (error) {
      console.error('Error fetching user content:', error);
    }
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-on-surface-variant font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-6">
        <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <User className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-headline text-xl font-bold text-white">Profile Missing</h2>
          <p className="text-on-surface-variant leading-relaxed">
            We couldn't find your profile. This usually happens if the database hasn't been set up correctly.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-white text-black py-3 rounded-full font-bold text-sm tracking-tight hover:opacity-90 active:scale-95 transition-all"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="pt-24 pb-32 px-6 max-w-4xl mx-auto">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 mb-16">
        <div className="relative group">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl relative">
            <img 
              src={avatarFile ? URL.createObjectURL(avatarFile) : (profile.avatar_url || `https://picsum.photos/seed/${profile.id}/200`)} 
              alt="Profile" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
            />
            <label className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-8 h-8 text-white" />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && setAvatarFile(e.target.files[0])}
              />
            </label>
          </div>
          {profile.avatar_url && !avatarFile && (
            <button 
              onClick={handleDeleteAvatar}
              className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete Profile Picture"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
            <h1 className="text-2xl font-light text-white">@{profile.username}</h1>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsEditing(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-6 py-1.5 rounded-lg text-sm font-bold transition-all"
              >
                Edit Profile
              </button>
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-8 mb-6">
            <div className="flex gap-1">
              <span className="font-bold text-white">{posts.length}</span>
              <span className="text-on-surface-variant">posts</span>
            </div>
            <div className="flex gap-1">
              <span className="font-bold text-white">{knowSkills.length + learnSkills.length}</span>
              <span className="text-on-surface-variant">skills</span>
            </div>
            <div className="flex gap-1">
              <span className="font-bold text-white">0</span>
              <span className="text-on-surface-variant">swaps</span>
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="font-bold text-white">{profile.name}</h2>
            <p className="text-on-surface/80 whitespace-pre-wrap">{profile.bio || 'No bio yet.'}</p>
            <div className="flex items-center justify-center md:justify-start gap-1 text-sm text-on-surface-variant">
              <MapPin className="w-3 h-3" /> {profile.location || 'Remote'}
            </div>
          </div>
        </div>
      </section>

      {/* Settings Dropdown */}
      {showSettings && (
        <div className="mb-12 glass-card p-6 rounded-2xl animate-in fade-in slide-in-from-top-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-3">
                {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                <span className="text-sm font-medium">Dark Mode</span>
              </div>
              <div className={cn("w-10 h-5 rounded-full relative transition-colors", darkMode ? "bg-white" : "bg-white/20")}>
                <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-black transition-all", darkMode ? "right-1" : "left-1")} />
              </div>
            </button>
            <button 
              onClick={handleSeedData}
              disabled={isSeeding}
              className="flex items-center gap-3 p-4 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all disabled:opacity-50"
            >
              {isSeeding ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
              <span className="text-sm font-medium">{isSeeding ? 'Seeding...' : 'Seed Mock Data'}</span>
            </button>
            <button 
              onClick={signOut}
              className="flex items-center gap-3 p-4 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
          <div className="glass-card p-8 rounded-2xl max-w-md w-full space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)}><XCircle className="w-6 h-6 text-on-surface-variant" /></button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Name</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-3 text-white focus:bg-white/10 transition-all outline-none"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Username</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-3 text-white focus:bg-white/10 transition-all outline-none"
                  value={editForm.username}
                  onChange={(e) => setEditForm({...editForm, username: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Location</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-full px-6 py-3 text-white focus:bg-white/10 transition-all outline-none"
                  value={editForm.location}
                  onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-widest text-on-surface-variant ml-4">Bio</label>
                <textarea 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-white h-24 resize-none focus:bg-white/10 transition-all outline-none"
                  value={editForm.bio}
                  onChange={(e) => setEditForm({...editForm, bio: e.target.value})}
                />
              </div>
            </div>

            <button 
              onClick={handleUpdateProfile}
              disabled={isUpdating}
              className="w-full bg-white text-black py-4 rounded-full font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2"
            >
              {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Skills Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div className="glass-card p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline text-xl font-bold tracking-tight text-white">Skills You Know</h2>
            <button onClick={() => setShowSkillModal('know')}>
              <PlusCircle className="w-5 h-5 text-white cursor-pointer hover:scale-110 transition-transform" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {knowSkills.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic">No skills added yet.</p>
            ) : knowSkills.map(s => (
              <span 
                key={s.id} 
                className="group/skill bg-white/10 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10 flex items-center gap-2"
              >
                {s.skills.name}
                <button onClick={() => handleRemoveSkill(s.id)} className="opacity-0 group-hover/skill:opacity-100 hover:text-red-400 transition-all">
                  <XCircle className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="glass-card p-8 rounded-2xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="font-headline text-xl font-bold tracking-tight text-white">Skills To Learn</h2>
            <button onClick={() => setShowSkillModal('learn')}>
              <PlusCircle className="w-5 h-5 text-white cursor-pointer hover:scale-110 transition-transform" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {learnSkills.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic">No skills added yet.</p>
            ) : learnSkills.map(s => (
              <span 
                key={s.id} 
                className="group/skill bg-white/5 border border-white/10 text-on-surface px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md flex items-center gap-2"
              >
                {s.skills.name}
                <button onClick={() => handleRemoveSkill(s.id)} className="opacity-0 group-hover/skill:opacity-100 hover:text-red-400 transition-all">
                  <XCircle className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Skill Selection Modal */}
      {showSkillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="glass-card p-8 rounded-2xl max-w-md w-full space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="font-headline text-xl font-bold text-white">
                Select a Skill to {showSkillModal === 'know' ? 'Share' : 'Learn'}
              </h3>
              <button onClick={() => setShowSkillModal(null)}>
                <XCircle className="w-6 h-6 text-on-surface-variant hover:text-white" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input 
                  className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-white focus:bg-white/10 transition-all outline-none text-sm"
                  placeholder="Can't find it? Create it..."
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                />
                <button 
                  onClick={handleCreateAndAddSkill}
                  disabled={isCreatingSkill || !newSkillName.trim()}
                  className="bg-white text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest disabled:opacity-50"
                >
                  {isCreatingSkill ? '...' : 'Create'}
                </button>
              </div>
              <div className="h-[1px] bg-white/10 w-full" />
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {availableSkills.map(skill => (
                  <button
                    key={skill.id}
                    onClick={() => handleAddSkill(skill.id)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-medium transition-all"
                  >
                    {skill.name}
                  </button>
                ))}
                {availableSkills.length === 0 && (
                  <p className="text-center text-on-surface-variant py-4">No skills available yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Section */}
      <section>
        <div className="flex justify-center gap-12 mb-8 border-t border-white/10">
          <button 
            onClick={() => setActiveTab('posts')}
            className={cn(
              "flex items-center gap-2 pt-4 font-bold text-xs uppercase tracking-widest transition-all", 
              activeTab === 'posts' ? "text-white border-t border-white -mt-[1px]" : "text-neutral-500 hover:text-white"
            )}
          >
            <Grid className="w-4 h-4" /> Posts
          </button>
          <button 
            onClick={() => setActiveTab('saved')}
            className={cn(
              "flex items-center gap-2 pt-4 font-bold text-xs uppercase tracking-widest transition-all", 
              activeTab === 'saved' ? "text-white border-t border-white -mt-[1px]" : "text-neutral-500 hover:text-white"
            )}
          >
            <Bookmark className="w-4 h-4" /> Saved
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1 md:gap-6">
          {(activeTab === 'posts' ? posts : savedPosts).length === 0 ? (
            <div className="col-span-full text-center py-20 glass-card rounded-2xl">
              <Eye className="w-12 h-12 text-on-surface-variant mx-auto mb-4 opacity-20" />
              <p className="text-on-surface-variant font-medium">
                {activeTab === 'posts' ? "You haven't posted anything yet." : "You haven't saved any posts yet."}
              </p>
            </div>
          ) : (activeTab === 'posts' ? posts : savedPosts).map(post => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className="group relative aspect-square rounded-lg overflow-hidden glass-card cursor-pointer"
            >
              {post.media?.[0] && (
                post.media[0].type === 'video' ? (
                  <video src={post.media[0].url} className="w-full h-full object-cover" />
                ) : (
                  <img src={post.media[0].url} alt="Post" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                )
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <div className="flex items-center gap-6 text-white font-bold">
                  <div className="flex items-center gap-1"><Heart className="w-5 h-5 fill-current" /> {post.likes_count || 0}</div>
                  <div className="flex items-center gap-1"><Grid className="w-5 h-5" /> {post.media?.length || 1}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Post Detail Modal */}
      <AnimatePresence>
        {selectedPost && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
            >
              {/* Media Section */}
              <div className="w-full md:w-3/5 bg-black flex items-center justify-center relative">
                {selectedPost.media?.[0]?.type === 'video' ? (
                  <video src={selectedPost.media[0].url} controls className="max-h-full max-w-full" />
                ) : (
                  <img src={selectedPost.media?.[0]?.url} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" />
                )}
                <button 
                  onClick={() => setSelectedPost(null)}
                  className="absolute top-4 left-4 p-2 bg-black/50 rounded-full text-white md:hidden"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Info Section */}
              <div className="w-full md:w-2/5 flex flex-col bg-surface border-l border-white/10">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                    <span className="font-bold text-white">@{profile.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedPost.user_id === user?.uid && (
                      <button 
                        onClick={() => setPostToDelete(selectedPost)}
                        className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                    <button onClick={() => setSelectedPost(null)} className="hidden md:block p-2 text-on-surface-variant hover:text-white">
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                  <div className="flex gap-3">
                    <img src={profile.avatar_url} className="w-8 h-8 rounded-full object-cover" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-bold mr-2">@{profile.username}</span>
                        {selectedPost.caption}
                      </p>
                      <p className="text-[10px] text-on-surface-variant mt-2 uppercase font-bold tracking-widest">
                        {selectedPost.created_at?.toDate ? format(selectedPost.created_at.toDate(), 'MMM d, yyyy') : 'Recently'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Comments could go here */}
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-xs text-on-surface-variant italic">Comments are visible on the main feed.</p>
                  </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-white/5">
                  <div className="flex items-center gap-4 mb-2">
                    <Heart className="w-6 h-6 text-white" />
                    <Bookmark className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-sm font-bold text-white">{selectedPost.likes_count || 0} likes</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {postToDelete && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card p-8 rounded-3xl max-w-sm w-full space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Delete Post?</h3>
                <p className="text-on-surface-variant text-sm">This action cannot be undone. All media and data will be permanently removed.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDeletePost(postToDelete.id, postToDelete.media)}
                  className="w-full bg-red-500 text-white py-3 rounded-full font-bold text-sm tracking-tight hover:bg-red-600 transition-colors"
                >
                  Delete Permanently
                </button>
                <button 
                  onClick={() => setPostToDelete(null)}
                  className="w-full bg-white/10 text-white py-3 rounded-full font-bold text-sm tracking-tight hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}
