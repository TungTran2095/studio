import React from 'react';
import { cn } from '@/lib/utils';

interface MacOSCloseButtonProps {
  onClick: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function MacOSCloseButton({ 
  onClick, 
  className,
  size = 'md' 
}: MacOSCloseButtonProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group rounded-full transition-all duration-200 ease-out",
        "bg-red-500 hover:bg-red-600 active:bg-red-700",
        "focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2",
        "transform hover:scale-105 active:scale-95",
        sizeClasses[size],
        className
      )}
      aria-label="Đóng"
    >
      {/* Inner circle for depth effect */}
      <div className="absolute inset-0.5 rounded-full bg-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
      
      {/* Close icon */}
      <div className="relative flex items-center justify-center w-full h-full">
        <svg 
          viewBox="0 0 12 12" 
          className="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          fill="currentColor"
        >
          <path d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5l-.705.705L5.295 6 2.5 8.795l.705.705L6 6.705 8.795 9.5l.705-.705L6.705 6z"/>
        </svg>
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-full bg-red-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm" />
    </button>
  );
}

// Variant for window title bar style
export function MacOSWindowCloseButton({ 
  onClick, 
  className,
  size = 'md' 
}: MacOSCloseButtonProps) {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4', 
    lg: 'w-5 h-5'
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative group rounded-full transition-all duration-200 ease-out",
        "bg-red-500 hover:bg-red-600 active:bg-red-700",
        "focus:outline-none focus:ring-1 focus:ring-red-500/30",
        "transform hover:scale-110 active:scale-95",
        "shadow-sm hover:shadow-md",
        sizeClasses[size],
        className
      )}
      aria-label="Đóng"
    >
      {/* Close icon - always visible for window style */}
      <div className="flex items-center justify-center w-full h-full">
        <svg 
          viewBox="0 0 12 12" 
          className="w-2.5 h-2.5 text-white transition-transform duration-200 group-hover:scale-110"
          fill="currentColor"
        >
          <path d="M9.5 3.205L8.795 2.5 6 5.295 3.205 2.5l-.705.705L5.295 6 2.5 8.795l.705.705L6 6.705 8.795 9.5l.705-.705L6.705 6z"/>
        </svg>
      </div>
      
      {/* Subtle glow on hover */}
      <div className="absolute inset-0 rounded-full bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </button>
  );
} 