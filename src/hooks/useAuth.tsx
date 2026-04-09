import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import type { Profile } from '../types';

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        const profileRef = doc(db, 'users', firebaseUser.uid);
        
        // Initial check and creation if needed
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await createInitialProfile(firebaseUser);
        }

        // Real-time listener
        unsubscribeProfile = onSnapshot(profileRef, (doc) => {
          if (doc.exists()) {
            setProfile(doc.data() as Profile);
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to profile:', error);
          setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  async function createInitialProfile(firebaseUser: User) {
    try {
      const profileRef = doc(db, 'users', firebaseUser.uid);
      const name = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Anonymous';
      const username = name.toLowerCase().replace(/\s+/g, '_') + '_' + Math.floor(Math.random() * 1000);
      
      const newProfile: Profile = {
        id: firebaseUser.uid,
        name: name,
        username: username,
        email: firebaseUser.email || '',
        bio: '',
        avatar_url: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/200`,
        location: 'Remote',
        created_at: new Date().toISOString()
      };

      await setDoc(profileRef, {
        ...newProfile,
        created_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creating initial profile:', error);
    }
  }

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
