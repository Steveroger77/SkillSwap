import React from 'react';
import { GraduationCap, Lightbulb } from 'lucide-react';

const Swap = () => {
  return (
    <div className="flex flex-col h-full justify-center pt-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Start Swapping Skills</h1>
        <p className="text-gray-400">Choose how you'd like to participate</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Learn Card */}
        <div className="group relative p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-white/30 transition-all duration-500 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-black">
            <GraduationCap size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Learn a Skill</h2>
          <p className="text-gray-400 text-sm mb-8">Find someone to teach you a new skill from our community of experts.</p>
          <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform">
            Start Learning
          </button>
        </div>

        {/* Teach Card */}
        <div className="group relative p-8 rounded-3xl bg-[#0a0a0a] border border-white/10 hover:border-white/30 transition-all duration-500 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 text-black">
            <Lightbulb size={40} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Teach a Skill</h2>
          <p className="text-gray-400 text-sm mb-8">Share your knowledge with others and grow your network.</p>
          <button className="w-full py-3 bg-white text-black font-bold rounded-xl hover:scale-105 transition-transform">
            Start Teaching
          </button>
        </div>
      </div>
    </div>
  );
};

export default Swap;