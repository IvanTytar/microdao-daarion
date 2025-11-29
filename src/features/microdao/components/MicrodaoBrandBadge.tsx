import React from 'react';
import { Building2 } from 'lucide-react';

interface MicrodaoBrandBadgeProps {
  logoUrl?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const MicrodaoBrandBadge: React.FC<MicrodaoBrandBadgeProps> = ({ 
  logoUrl, 
  name, 
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48
  };

  if (logoUrl) {
    return (
      <img 
        src={logoUrl} 
        alt={`${name} logo`} 
        className={`rounded-full object-cover bg-gray-100 shadow-sm border border-gray-200/50 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div className={`rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center border border-gray-200 shadow-sm ${sizeClasses[size]} ${className}`}>
      <Building2 size={iconSizes[size]} className="text-gray-400" />
    </div>
  );
};

