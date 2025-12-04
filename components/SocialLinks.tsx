import React from 'react';
import { Mail, Linkedin, Dice6 } from 'lucide-react';
import { SocialLink } from '../types';

const links: SocialLink[] = [
  { 
    label: 'email', 
    url: 'mailto:marcel@example.com', // Placeholder
    icon: <Mail className="w-5 h-5" /> 
  },
  { 
    label: 'boardgamegeek', 
    url: 'https://boardgamegeek.com/user/dbrykr', // Placeholder
    icon: <Dice6 className="w-5 h-5" /> 
  },
  { 
    label: 'linkedin', 
    url: 'https://linkedin.com/in/dbrykr', // Placeholder
    icon: <Linkedin className="w-5 h-5" /> 
  },
];

const SocialLinks: React.FC = () => {
  return (
    <div className="flex flex-col md:flex-row gap-4 mt-8 items-center justify-center">
      {links.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="
            group relative flex items-center gap-4 px-6 py-4 
            rounded-2xl border border-zinc-800 bg-zinc-900/30 backdrop-blur-sm
            hover:border-zinc-600 hover:bg-zinc-800/50 
            transition-all duration-300 ease-out
            w-full md:w-auto min-w-[200px] justify-start md:justify-center
          "
        >
          {/* Icon with glow effect on hover */}
          <span className="
            text-zinc-500 group-hover:text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]
            transition-all duration-300
          ">
            {link.icon}
          </span>
          
          {/* Text */}
          <span className="text-zinc-400 font-medium uppercase tracking-widest text-xs md:text-sm group-hover:text-white transition-colors duration-300">
            {link.label}
          </span>
        </a>
      ))}
    </div>
  );
};

export default SocialLinks;