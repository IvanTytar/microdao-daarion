import React from 'react';
import { MicrodaoBrandBadge } from './MicrodaoBrandBadge';

interface MicrodaoHeroProps {
  bannerUrl?: string | null;
  logoUrl?: string | null;
  name: string;
  tagline?: string | null;
  children?: React.ReactNode; // For action buttons etc.
}

export const MicrodaoHero: React.FC<MicrodaoHeroProps> = ({
  bannerUrl,
  logoUrl,
  name,
  tagline,
  children
}) => {
  return (
    <div className="relative w-full h-48 md:h-64 lg:h-80 bg-gray-900 overflow-hidden group">
      {/* Background / Banner */}
      {bannerUrl ? (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-slate-900 via-purple-900 to-slate-900" />
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-8">
        <div className="container mx-auto flex flex-col md:flex-row items-end md:items-end gap-6">
          {/* Logo */}
          <div className="relative -mb-2 md:mb-0 shrink-0">
            <MicrodaoBrandBadge 
              logoUrl={logoUrl} 
              name={name} 
              size="xl" 
              className="ring-4 ring-black/20 shadow-2xl"
            />
          </div>

          {/* Text */}
          <div className="flex-1 mb-1">
            <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg tracking-tight">
              {name}
            </h1>
            {tagline && (
              <p className="text-gray-200 text-lg mt-1 max-w-2xl drop-shadow-md font-light">
                {tagline}
              </p>
            )}
          </div>

          {/* Actions */}
          {children && (
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

