import React from 'react';

const DynamicTitle: React.FC = () => {
  return (
    <div className="relative z-10 select-none flex flex-col items-center">
      {/* Glow effect behind the text for depth */}
      <div className="absolute inset-0 blur-3xl opacity-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-full scale-110 pointer-events-none" />
      
      <h1 
        className="
          text-[25vw] md:text-[18vw] leading-none font-black tracking-tighter 
          bg-clip-text text-transparent 
          bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600
          gradient-text-anim
          drop-shadow-2xl
          transform transition-transform duration-700 hover:scale-[1.02]
          pb-4
        "
      >
        dbrykr
      </h1>
    </div>
  );
};

export default DynamicTitle;