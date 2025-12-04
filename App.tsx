import React, { useState, useEffect } from 'react';
import DynamicTitle from './components/DynamicTitle';
import SocialLinks from './components/SocialLinks';

const App: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Simple spotlight effect tracking mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#050505] text-white selection:bg-purple-500/30">
      
      {/* Background Noise Texture */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] z-0 pointer-events-none" />

      {/* Dynamic Ambient Glow Spotlight */}
      <div 
        className="fixed pointer-events-none w-[800px] h-[800px] rounded-full mix-blend-screen filter blur-[100px] opacity-10 z-0 transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle, rgba(76, 29, 149, 0.4) 0%, rgba(0,0,0,0) 70%)',
          left: mousePosition.x - 400,
          top: mousePosition.y - 400,
        }}
      />
      
      {/* Static Top-Right Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[128px] pointer-events-none" />
      
      {/* Static Bottom-Left Glow */}
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-7xl mx-auto px-6 text-center">
        
        {/* Main Title */}
        <DynamicTitle />

        {/* Intro Sentence */}
        <div className="mt-8 md:mt-12 opacity-0 animate-[fadeIn_1s_ease-out_0.5s_forwards]">
          <p className="text-xl md:text-3xl font-light text-zinc-300 tracking-wide leading-relaxed">
            hey, i am <span className="font-semibold text-white">marcel</span> & i research the board game market
          </p>
        </div>

        {/* Contact Section */}
        <div className="mt-24 md:mt-32 flex flex-col items-center opacity-0 animate-[fadeIn_1s_ease-out_0.8s_forwards] w-full">
          
          {/* Fine Separator Line */}
          <div className="w-16 md:w-24 h-[1px] bg-zinc-800 mb-8" />
          
          <p className="text-sm md:text-base text-zinc-500 font-medium uppercase tracking-widest mb-4">
            below are my contacts
          </p>
          <div className="w-full flex justify-center">
            <SocialLinks />
          </div>
        </div>

      </div>

      {/* Footer / Copyright (Optional minimalist touch) */}
      <div className="absolute bottom-8 text-zinc-800 text-xs tracking-widest uppercase">
        © {new Date().getFullYear()}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
};

export default App;