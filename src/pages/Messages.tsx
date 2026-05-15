import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Send, Loader2, Search, MessageSquare, MoreVertical, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

function msgTime(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export default function Messages() {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [activeChat, setActiveChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chats
  useEffect(() => {
    if (!user) return;
    fetchChats();
  }, [user]);

  // Load messages + realtime when activeChat changes
  useEffect(() => {
    if (!activeChat) { setMessages([]); return; }
    fetchMessages(activeChat.id);

    const channel = supabase
      .channel(`chat:${activeChat.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `chat_id=eq.${activeChat.id}`,
      }, payload => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeChat?.id]);

  // Scroll on message load
  useEffect(() => {
    if (messages.length) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages.length]);

  const fetchChats = async () => {
    if (!user) return;
    setLoading(true);

    const { data: participantData } = await supabase
      .from('chat_participants')
      .select('chat_id')
      .eq('user_id', user.id);

    const chatIds = (participantData ?? []).map(p => p.chat_id);
    if (!chatIds.length) { setLoading(false); return; }

    // For each chat, get the other participant's profile and last message
    const results = await Promise.all(chatIds.map(async (chatId) => {
      const [{ data: parts }, { data: lastMsgs }] = await Promise.all([
        supabase.from('chat_participants').select('user_id').eq('chat_id', chatId),
        supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: false }).limit(1),
      ]);

      const otherUserId = (parts ?? []).find(p => p.user_id !== user.id)?.user_id;
      let otherProfile = null;
      if (otherUserId) {
        const { data: p } = await supabase.from('profiles').select('*').eq('id', otherUserId).single();
        otherProfile = p;
      }
      return { id: chatId, otherProfile, lastMessage: lastMsgs?.[0] || null };
    }));

    const sorted = results.sort((a, b) => {
      const aTime = a.lastMessage?.created_at ? new Date(a.lastMessage.created_at).getTime() : 0;
      const bTime = b.lastMessage?.created_at ? new Date(b.lastMessage.created_at).getTime() : 0;
      return bTime - aTime;
    });

    setChats(sorted);
    setLoading(false);
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    setMessages(data ?? []);
  };

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !activeChat || !user) return;
    setSending(true);
    setNewMessage('');
    const { error } = await supabase.from('messages').insert({
      chat_id: activeChat.id,
      sender_id: user.id,
      content,
    });
    if (error) setNewMessage(content);
    setSending(false);
    inputRef.current?.focus();
    fetchChats(); // refresh last message
  };

  const filteredChats = chats.filter(c =>
    !searchQ || c.otherProfile?.name?.toLowerCase().includes(searchQ.toLowerCase())
  );

  // ── Mobile: show chat list or active chat
  const showChatList = !activeChat;

  return (
    <div className="fixed inset-0 pt-16 pb-24 flex overflow-hidden">
      {/* Sidebar / Chat list */}
      <div className={`${showChatList ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-80 lg:w-96 border-r border-white/[0.06] glass-nav`}>
        <div className="p-4 border-b border-white/[0.06]">
          <h2 className="font-headline text-xl font-black text-white mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              className="glass-input w-full rounded-2xl pl-10 pr-4 py-2.5 text-sm"
              placeholder="Search conversations…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="flex gap-3 items-center p-2">
                  <div className="w-12 h-12 rounded-full shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="w-28 h-3 rounded shimmer" />
                    <div className="w-40 h-2.5 rounded shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquare className="w-12 h-12 text-white/15 mb-4" />
              <p className="text-white/40 font-medium text-sm">No conversations yet</p>
              <p className="text-white/25 text-xs mt-1">Accept a swap request to start chatting</p>
            </div>
          ) : (
            filteredChats.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3 transition-all ${
                  activeChat?.id === chat.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.04]'
                }`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden glass border border-white/10 flex-shrink-0">
                  {chat.otherProfile?.avatar_url
                    ? <img src={chat.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full flex items-center justify-center text-white/50 font-bold">
                        {chat.otherProfile?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="font-semibold text-white text-sm truncate">{chat.otherProfile?.name || 'User'}</p>
                    {chat.lastMessage && (
                      <span className="text-[10px] text-white/28 flex-shrink-0 ml-2">{msgTime(chat.lastMessage.created_at)}</span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className="text-xs text-white/40 truncate mt-0.5">
                      {chat.lastMessage.sender_id === user?.id ? 'You: ' : ''}{chat.lastMessage.content}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat view */}
      <div className={`${!showChatList ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {!activeChat ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-24 h-24 rounded-3xl glass flex items-center justify-center mb-6">
              <MessageSquare className="w-12 h-12 text-white/20" />
            </div>
            <p className="text-white/50 text-xl font-semibold mb-1">Select a conversation</p>
            <p className="text-white/28 text-sm">Choose someone to start chatting</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="glass-nav border-b border-white/[0.06] px-4 py-3.5 flex items-center gap-3">
              <button onClick={() => setActiveChat(null)} className="md:hidden p-2 hover:bg-white/10 rounded-xl transition-colors">
                <ArrowLeft className="w-5 h-5 text-white/60" />
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden glass border border-white/10 flex-shrink-0">
                {activeChat.otherProfile?.avatar_url
                  ? <img src={activeChat.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  : <div className="w-full h-full flex items-center justify-center text-white/50 font-bold text-sm">
                      {activeChat.otherProfile?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm">{activeChat.otherProfile?.name}</p>
                <p className="text-[11px] text-white/38">@{activeChat.otherProfile?.username}</p>
              </div>
              <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <MoreVertical className="w-5 h-5 text-white/40" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <p className="text-white/35 text-sm">No messages yet. Say hello! 👋</p>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  const showTime = i === 0 || (new Date(msg.created_at).getTime() - new Date(messages[i-1].created_at).getTime()) > 300000;
                  return (
                    <div key={msg.id}>
                      {showTime && (
                        <div className="text-center my-2">
                          <span className="text-[10px] text-white/25 uppercase font-bold tracking-wider">
                            {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', damping: 24, stiffness: 250 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isMe
                            ? 'bg-white text-black rounded-br-md font-medium'
                            : 'glass text-white rounded-bl-md'
                        }`}>
                          {msg.content}
                          <span className={`block text-[9px] mt-1 ${isMe ? 'text-black/35' : 'text-white/25'}`}>
                            {format(new Date(msg.created_at), 'h:mm a')}
                          </span>
                        </div>
                      </motion.div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="glass-nav border-t border-white/[0.06] p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center glass-input rounded-2xl px-4 py-3 gap-2">
                  <input
                    ref={inputRef}
                    className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/30"
                    placeholder="Message…"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={sending || !newMessage.trim()}
                  className="w-12 h-12 rounded-2xl btn-primary flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
