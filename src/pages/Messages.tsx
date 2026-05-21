import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Send, Loader2, Search, MessageSquare, ArrowLeft, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isToday, isYesterday } from 'date-fns';

function msgTime(ts: string) {
  const d = new Date(ts);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

export default function Messages() {
  const { user } = useAuth();
  const [chats, setChats]           = useState<any[]>([]);
  const [active, setActive]         = useState<any>(null);
  const [messages, setMessages]     = useState<any[]>([]);
  const [text, setText]             = useState('');
  const [loading, setLoading]       = useState(true);
  const [sending, setSending]       = useState(false);
  const [searchQ, setSearchQ]       = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const fetchChats = useCallback(async () => {
    if (!user) return;
    const { data: parts } = await supabase.from('chat_participants').select('chat_id').eq('user_id', user.id);
    const ids = (parts ?? []).map(p => p.chat_id);
    if (!ids.length) { setLoading(false); return; }

    const results = await Promise.all(ids.map(async chatId => {
      const [{ data: ps }, { data: msgs }] = await Promise.all([
        supabase.from('chat_participants').select('user_id').eq('chat_id', chatId),
        supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: false }).limit(1),
      ]);
      const otherId = (ps ?? []).find(p => p.user_id !== user.id)?.user_id;
      let other = null;
      if (otherId) { const { data } = await supabase.from('profiles').select('*').eq('id', otherId).single(); other = data; }
      return { id: chatId, other, lastMsg: msgs?.[0] ?? null };
    }));

    setChats(results.sort((a, b) => {
      const at = a.lastMsg?.created_at ? new Date(a.lastMsg.created_at).getTime() : 0;
      const bt = b.lastMsg?.created_at ? new Date(b.lastMsg.created_at).getTime() : 0;
      return bt - at;
    }));
    setLoading(false);
  }, [user]);

  const fetchMessages = useCallback(async (chatId: string) => {
    const { data } = await supabase.from('messages').select('*').eq('chat_id', chatId).order('created_at', { ascending: true });
    setMessages(data ?? []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
  }, []);

  useEffect(() => { fetchChats(); }, [fetchChats]);

  useEffect(() => {
    if (!active) { setMessages([]); return; }
    fetchMessages(active.id);
    const ch = supabase.channel(`chat:${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${active.id}` }, payload => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active?.id, fetchMessages]);

  const send = async () => {
    const content = text.trim();
    if (!content || !active || !user) return;
    setSending(true); setText('');
    await supabase.from('messages').insert({ chat_id: active.id, sender_id: user.id, content });
    setSending(false);
    inputRef.current?.focus();
    fetchChats();
  };

  const filtered = chats.filter(c => !searchQ || c.other?.name?.toLowerCase().includes(searchQ.toLowerCase()));

  return (
    <div className="fixed inset-0 pt-14 pb-20 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`${!active ? 'flex' : 'hidden md:flex'} flex-col w-full md:w-80 lg:w-96 border-r border-white/[0.055] glass-nav`}>
        <div className="p-4 border-b border-white/[0.055]">
          <h2 className="font-headline text-xl font-black text-white mb-3">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/28" />
            <input className="glass-input rounded-2xl pl-10 pr-4 py-2.5 text-sm" placeholder="Search…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="p-4 space-y-3">{[1,2,3].map(i => <div key={i} className="flex gap-3 p-2"><div className="w-11 h-11 rounded-full shimmer" /><div className="flex-1 space-y-2"><div className="w-28 h-3 shimmer rounded-full" /><div className="w-40 h-2.5 shimmer rounded-full" /></div></div>)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquare className="w-10 h-10 text-white/12 mb-3" />
              <p className="text-white/38 text-sm font-medium">No conversations yet</p>
              <p className="text-white/22 text-xs mt-1">Accept a swap request to start chatting</p>
            </div>
          ) : (
            filtered.map(chat => (
              <motion.button key={chat.id} whileTap={{ scale: 0.98 }} onClick={() => setActive(chat)}
                className={`w-full text-left flex items-center gap-3 px-4 py-3.5 transition-colors ${active?.id === chat.id ? 'bg-white/[0.07]' : 'hover:bg-white/[0.035]'}`}>
                <div className="w-11 h-11 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                  {chat.other?.avatar_url ? <img src={chat.other.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 font-black">{chat.other?.name?.[0]?.toUpperCase() || '?'}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-2">
                    <p className="font-semibold text-white text-sm truncate">{chat.other?.name || 'User'}</p>
                    {chat.lastMsg && <span className="text-[10px] text-white/25 flex-shrink-0">{msgTime(chat.lastMsg.created_at)}</span>}
                  </div>
                  {chat.lastMsg && <p className="text-xs text-white/38 truncate mt-0.5">{chat.lastMsg.sender_id === user?.id ? 'You: ' : ''}{chat.lastMsg.content}</p>}
                </div>
              </motion.button>
            ))
          )}
        </div>
      </div>

      {/* Chat pane */}
      <div className={`${active ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {!active ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center"><MessageSquare className="w-10 h-10 text-white/15" /></div>
            <p className="text-white/38 text-lg font-semibold">Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="glass-nav border-b border-white/[0.055] px-4 py-3 flex items-center gap-3">
              <button onClick={() => setActive(null)} className="md:hidden p-2 hover:bg-white/8 rounded-xl transition-colors active:scale-95"><ArrowLeft className="w-5 h-5 text-white/55" /></button>
              <div className="w-9 h-9 rounded-full overflow-hidden border border-white/10 flex-shrink-0">
                {active.other?.avatar_url ? <img src={active.other.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 font-black text-sm">{active.other?.name?.[0]?.toUpperCase() || '?'}</div>}
              </div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">{active.other?.name}</p>
                <p className="text-[10px] text-white/32">@{active.other?.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full"><p className="text-white/28 text-sm">Say hello! 👋</p></div>
              ) : (
                messages.map((msg, i) => {
                  const isMe = msg.sender_id === user?.id;
                  const showTime = i === 0 || new Date(msg.created_at).getTime() - new Date(messages[i-1].created_at).getTime() > 300000;
                  return (
                    <div key={msg.id}>
                      {showTime && <div className="text-center my-3"><span className="text-[10px] text-white/22 uppercase font-bold tracking-widest">{msgTime(msg.created_at)}</span></div>}
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-0.5`}
                      >
                        <div className={`max-w-[72%] px-4 py-2.5 text-sm leading-relaxed ${isMe ? 'bubble-me' : 'bubble-them'}`}>
                          {msg.content}
                          <span className={`block text-[9px] mt-1 ${isMe ? 'text-black/30' : 'text-white/22'}`}>{format(new Date(msg.created_at), 'h:mm a')}</span>
                        </div>
                      </motion.div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="glass-nav border-t border-white/[0.055] p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  className="glass-input flex-1 rounded-2xl px-4 py-3 text-sm"
                  placeholder="Message…"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                />
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="w-11 h-11 btn-primary rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-38"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </motion.button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
