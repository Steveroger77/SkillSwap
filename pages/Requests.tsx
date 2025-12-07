import React, { useState } from 'react';

const Requests = () => {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');

  return (
    <div className="pt-4">
      <h1 className="text-2xl font-bold mb-6">Swap Requests</h1>

      {/* Tabs */}
      <div className="flex bg-[#111] rounded-lg p-1 mb-8">
        <button 
          onClick={() => setActiveTab('incoming')}
          className={`flex-1 py-3 rounded-md text-sm font-medium transition-all ${activeTab === 'incoming' ? 'bg-[#222] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Incoming (0)
        </button>
        <button 
          onClick={() => setActiveTab('outgoing')}
          className={`flex-1 py-3 rounded-md text-sm font-medium transition-all ${activeTab === 'outgoing' ? 'bg-[#222] text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
        >
          Outgoing (0)
        </button>
      </div>

      {/* Content */}
      <div className="p-10 rounded-2xl bg-[#0a0a0a] border border-white/5 text-center">
        <p className="text-gray-400">No {activeTab} requests</p>
      </div>
    </div>
  );
};

export default Requests;