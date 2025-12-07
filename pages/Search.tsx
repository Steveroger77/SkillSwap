import React, { useState } from 'react';
import { Search as SearchIcon, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    
    try {
      // Basic text search on username or skills
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${searchTerm}%,skills_offered.cs.{${searchTerm}}`);

      if (error) throw error;
      setResults(data as UserProfile[]);
    } catch (err) {
      console.error(err);
      // Fallback simple search if array syntax fails (simple postgres config)
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${searchTerm}%`);
      
      if (data) setResults(data as UserProfile[]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-4">
      <h1 className="text-2xl font-bold mb-6">Search Users</h1>
      
      <div className="relative mb-8">
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by username..."
          className="w-full bg-[#111] border border-white/10 rounded-xl py-4 pl-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-white/30 transition-colors"
        />
        <button 
          onClick={handleSearch}
          className="absolute right-2 top-2 bottom-2 px-4 bg-white text-black rounded-lg font-medium flex items-center gap-2 hover:bg-gray-200"
        >
          {loading ? <Loader2 size={16} className="animate-spin"/> : <SearchIcon size={16} />}
          Search
        </button>
      </div>

      <div className="space-y-4">
        {results.length > 0 ? (
          results.map(user => (
            <div key={user.id} className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/5 rounded-xl">
              <img 
                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}`} 
                className="w-12 h-12 rounded-full object-cover" 
                alt={user.username} 
              />
              <div>
                 <p className="font-bold">{user.username}</p>
                 <p className="text-sm text-gray-400">{user.full_name}</p>
              </div>
            </div>
          ))
        ) : (
          !loading && <div className="text-center text-gray-500 mt-20">Try searching for a username</div>
        )}
      </div>
    </div>
  );
};

export default Search;