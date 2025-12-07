import React from 'react';
import { MessageSquare } from 'lucide-react';

const Messages = () => {
  return (
    <div className="pt-4">
      <h1 className="text-2xl font-bold mb-6">Messages</h1>

      <div className="p-12 rounded-2xl bg-[#0a0a0a] border border-white/5 flex flex-col items-center justify-center text-center min-h-[300px]">
        <MessageSquare size={48} className="text-gray-600 mb-4" />
        <h3 className="text-xl font-medium mb-2">No active swaps yet</h3>
        <p className="text-gray-500">Accept a swap request to start chatting</p>
      </div>
    </div>
  );
};

export default Messages;