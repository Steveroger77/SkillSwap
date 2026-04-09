import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, orderBy, getDoc, doc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Search, Phone, Video, MoreVertical, Send, Smile, PlusCircle, CheckCheck, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Messages() {
  const { profile } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    // Fetch chats where user is a participant
    const q = query(collection(db, 'chats'), where('participants', 'array-contains', profile.id));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = await Promise.all(snapshot.docs.map(async (d) => {
        const data = { id: d.id, ...d.data() } as any;
        
        // Find the other participant
        const otherUserId = data.participants.find((p: string) => p !== profile.id);
        let otherProfile = null;
        if (otherUserId) {
          const otherProfileDoc = await getDoc(doc(db, 'users', otherUserId));
          if (otherProfileDoc.exists()) {
            otherProfile = { id: otherProfileDoc.id, ...otherProfileDoc.data() };
          }
        }
        
        return { ...data, otherProfile };
      }));
      
      setChats(chatList.sort((a, b) => (b.updated_at?.seconds || 0) - (a.updated_at?.seconds || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (activeChat) {
      const q = query(
        collection(db, `chats/${activeChat.id}/messages`),
        orderBy('created_at', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
      });

      return () => unsubscribe();
    }
  }, [activeChat]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat || !profile) return;
    
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, `chats/${activeChat.id}/messages`), {
        sender_id: profile.id,
        content: messageContent,
        created_at: serverTimestamp()
      });

      // Update chat's last message/timestamp
      // Note: This might fail if rules are strict, but it's good for sorting
      // await updateDoc(doc(db, 'chats', activeChat.id), {
      //   last_message: messageContent,
      //   updated_at: serverTimestamp()
      // });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <main className="pt-24 pb-32 min-h-screen px-4 md:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      <section className="lg:col-span-12 flex flex-col gap-6">
        <h2 className="text-4xl font-extrabold font-headline tracking-tighter text-white mb-2">Messages</h2>
        <div className="flex h-[716px] glass-card rounded-3xl overflow-hidden shadow-2xl">
          {/* Chat List */}
          <div className="w-1/3 border-r border-white/5 bg-white/[0.02] flex flex-col backdrop-blur-xl">
            <div className="p-6 border-b border-white/5">
              <div className="relative">
                <input className="w-full bg-white/5 border-white/10 rounded-full py-2.5 px-10 text-xs font-medium focus:ring-1 focus:ring-white/20 focus:bg-white/10 transition-all outline-none" placeholder="Search conversations" />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-white/20" />
                </div>
              ) : chats.length === 0 ? (
                <p className="text-center text-xs text-neutral-500 py-10">No conversations yet</p>
              ) : chats.map(c => (
                <div 
                  key={c.id} 
                  onClick={() => setActiveChat(c)} 
                  className={cn(
                    "p-4 flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors", 
                    activeChat?.id === c.id && "bg-white/10"
                  )}
                >
                  <img 
                    src={c.otherProfile?.avatar_url || `https://picsum.photos/seed/${c.id}/200`} 
                    className="w-11 h-11 rounded-full border border-white/10" 
                    referrerPolicy="no-referrer" 
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider truncate">
                      {c.otherProfile?.name || 'User'}
                    </h4>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {c.last_message || 'Tap to open chat'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Screen */}
          <div className="flex-1 flex flex-col bg-white/[0.01] backdrop-blur-md">
            {activeChat ? (
              <>
                <div className="px-8 py-5 border-b border-white/5 flex justify-between items-center bg-white/[0.03]">
                  <div className="flex items-center gap-4">
                    <img 
                      src={activeChat.otherProfile?.avatar_url || `https://picsum.photos/seed/${activeChat.id}/200`} 
                      className="w-10 h-10 rounded-full border border-white/10" 
                      referrerPolicy="no-referrer" 
                    />
                    <div>
                      <h4 className="text-base font-black font-headline text-white tracking-tight">
                        {activeChat.otherProfile?.name || 'Active Chat'}
                      </h4>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-neutral-400">Online</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <Phone className="w-5 h-5 text-neutral-400 cursor-pointer" />
                    <Video className="w-5 h-5 text-neutral-400 cursor-pointer" />
                    <MoreVertical className="w-5 h-5 text-neutral-400 cursor-pointer" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  {messages.map(m => (
                    <div key={m.id} className={cn("flex items-end gap-3 max-w-[80%]", m.sender_id === profile?.id ? "ml-auto flex-row-reverse" : "")}>
                      <div className={cn("px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-lg", m.sender_id === profile?.id ? "bg-white text-black rounded-br-none" : "glass-card text-white rounded-bl-none")}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="h-full flex items-center justify-center text-neutral-500 text-sm italic">
                      No messages yet. Say hi!
                    </div>
                  )}
                </div>
                <div className="p-8 bg-black/40 border-t border-white/5">
                  <div className="flex items-center gap-4 bg-white/5 p-2 rounded-full border border-white/10">
                    <PlusCircle className="w-6 h-6 text-neutral-400 cursor-pointer" />
                    <input 
                      className="flex-1 bg-transparent border-none text-sm focus:ring-0 text-white py-2" 
                      placeholder="Type a message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button onClick={sendMessage} className="w-10 h-10 bg-white text-black flex items-center justify-center rounded-full hover:scale-105 transition-transform">
                      <Send className="w-5 h-5 fill-current" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-500">Select a chat to start messaging</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
