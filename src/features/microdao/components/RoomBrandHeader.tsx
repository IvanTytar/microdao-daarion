import React from 'react';
import { MicrodaoBrandBadge } from './MicrodaoBrandBadge';
import { Hash, Users, Info } from 'lucide-react';

interface RoomBrandHeaderProps {
  bannerUrl?: string | null;
  logoUrl?: string | null; // Room logo
  microdaoLogoUrl?: string | null; // Fallback to MicroDAO logo
  name: string;
  description?: string | null;
  microdaoName?: string;
  membersCount?: number;
  children?: React.ReactNode;
}

export const RoomBrandHeader: React.FC<RoomBrandHeaderProps> = ({
  bannerUrl,
  logoUrl,
  microdaoLogoUrl,
  name,
  description,
  microdaoName,
  membersCount,
  children
}) => {
  // Use room logo if available, else MicroDAO logo
  const displayLogo = logoUrl || microdaoLogoUrl;

  return (
    <div className="relative w-full h-32 md:h-40 bg-gray-800 overflow-hidden rounded-t-xl shrink-0">
      {/* Background / Banner */}
      {bannerUrl ? (
        <div 
          className="absolute inset-0 w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerUrl})` }}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800" />
      )}
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

      {/* Top Actions (Children) */}
      {children && (
        <div className="absolute top-0 left-0 w-full p-4 z-10">
          {children}
        </div>
      )}

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-4 md:p-6 flex items-end gap-4">
        <div className="shrink-0">
          <MicrodaoBrandBadge 
            logoUrl={displayLogo} 
            name={name} 
            size="lg"
            className="ring-2 ring-black/10 shadow-lg bg-white"
          />
        </div>
        
        <div className="flex-1 min-w-0 mb-0.5">
          <div className="flex items-center gap-2 text-gray-300 text-xs uppercase tracking-wider font-medium mb-0.5">
            {microdaoName && <span>{microdaoName}</span>}
            {membersCount !== undefined && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users size={10} />
                  {membersCount} online
                </span>
              </>
            )}
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 truncate">
            <Hash className="text-gray-400 w-5 h-5 md:w-6 md:h-6 shrink-0" />
            {name}
          </h2>
          {description && (
            <p className="text-gray-300 text-sm truncate max-w-xl opacity-90">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

