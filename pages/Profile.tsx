import React, { useState, useEffect } from 'react';
import { LogOut, Edit2, Loader2, Save } from 'lucide-react';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';

const Profile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  // Edit states
  const [bio, setBio] = useState('');
  const [skillsOfferedInput, setSkillsOfferedInput] = useState('');
  const [skillsWantedInput, setSkillsWantedInput] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      setBio(data.bio || '');
      setSkillsOfferedInput(data.skills_offered?.join(', ') || '');
      setSkillsWantedInput(data.skills_wanted?.join(', ') || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!profile) return;
    
    try {
      const updates = {
        id: profile.id,
        bio,
        skills_offered: skillsOfferedInput.split(',').map(s => s.trim()).filter(Boolean),
        skills_wanted: skillsWantedInput.split(',').map(s => s.trim()).filter(Boolean),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  if (loading) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-white" /></div>;
  if (!profile) return <div className="pt-20 text-center">Profile not found</div>;

  return (
    <div className="pt-8 pb-20">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="relative group mb-4">
          <img 
            src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.username}&background=random`} 
            alt={profile.username} 
            className="w-24 h-24 rounded-full border-2 border-white/20 object-cover"
          />
        </div>
        
        <h1 className="text-2xl font-bold mb-1">{profile.full_name}</h1>
        <p className="text-gray-400 text-sm mb-4">@{profile.username}</p>
        
        {isEditing ? (
           <textarea 
             value={bio} 
             onChange={(e) => setBio(e.target.value)}
             className="w-full bg-[#111] p-2 rounded mb-4 text-sm text-center border border-white/20"
             placeholder="Short bio..."
           />
        ) : (
           <p className="text-gray-300 text-sm mb-6 max-w-xs">{profile.bio || "No bio yet."}</p>
        )}

        <div className="flex gap-3">
          {isEditing ? (
             <button onClick={handleUpdate} className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2">
               <Save size={16} /> Save
             </button>
          ) : (
             <button onClick={() => setIsEditing(true)} className="px-6 py-2 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors">
               Edit Profile
             </button>
          )}
          
          <button 
            onClick={handleLogout}
            className="px-6 py-2 bg-[#111] text-white border border-white/10 rounded-lg hover:bg-[#222] transition-colors flex items-center gap-2"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Skills Section */}
      <div className="space-y-6 mb-10">
        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-white/5">
          <h3 className="font-bold mb-4 text-lg">Skills You Know</h3>
          {isEditing ? (
             <input 
               type="text" 
               value={skillsOfferedInput} 
               onChange={(e) => setSkillsOfferedInput(e.target.value)}
               className="w-full bg-[#111] p-3 rounded border border-white/20"
               placeholder="Photography, Coding (comma separated)"
             />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skills_offered && profile.skills_offered.length > 0 ? (
                profile.skills_offered.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-white/10 rounded-full text-sm">{skill}</span>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No skills added yet.</p>
              )}
            </div>
          )}
        </div>

        <div className="bg-[#0a0a0a] rounded-xl p-6 border border-white/5">
          <h3 className="font-bold mb-4 text-lg">Skills You Want to Learn</h3>
          {isEditing ? (
             <input 
               type="text" 
               value={skillsWantedInput} 
               onChange={(e) => setSkillsWantedInput(e.target.value)}
               className="w-full bg-[#111] p-3 rounded border border-white/20"
               placeholder="React, Cooking (comma separated)"
             />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.skills_wanted && profile.skills_wanted.length > 0 ? (
                profile.skills_wanted.map(skill => (
                  <span key={skill} className="px-3 py-1 bg-white/10 rounded-full text-sm border border-white/20">{skill}</span>
                ))
              ) : (
                <p className="text-gray-500 text-sm">No skills added yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;