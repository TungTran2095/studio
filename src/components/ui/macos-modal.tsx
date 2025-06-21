import React from 'react';
import { cn } from '@/lib/utils';
import { MacOSCloseButton } from './macos-close-button';

interface MacOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeButtonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function MacOSModal({
  isOpen,
  onClose,
  children,
  className,
  title,
  description,
  showCloseButton = true,
  closeButtonPosition = 'top-right'
}: MacOSModalProps) {
  if (!isOpen) return null;

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={cn(
        "relative bg-background border rounded-lg shadow-xl max-w-4xl w-[90vw] max-h-[90vh] overflow-hidden",
        "transform transition-all duration-200 ease-out",
        "animate-in zoom-in-95 fade-in-0",
        className
      )}>
        {/* Close Button */}
        {showCloseButton && (
          <div className={cn(
            "absolute z-10",
            positionClasses[closeButtonPosition]
          )}>
            <MacOSCloseButton 
              onClick={onClose}
              size="md"
              className="shadow-lg"
            />
          </div>
        )}
        
        {/* Header */}
        {(title || description) && (
          <div className="p-6 border-b bg-muted/30">
            {title && (
              <h2 className="text-lg font-semibold mb-2">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Variant for full-screen modal
export function MacOSFullScreenModal({
  isOpen,
  onClose,
  children,
  className,
  title,
  description,
  showCloseButton = true
}: MacOSModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className={cn(
        "relative bg-background border shadow-xl w-full h-full overflow-hidden",
        "transform transition-all duration-200 ease-out",
        "animate-in slide-in-from-bottom-4 fade-in-0",
        className
      )}>
        {/* Close Button */}
        {showCloseButton && (
          <div className="absolute top-4 right-4 z-10">
            <MacOSCloseButton 
              onClick={onClose}
              size="lg"
              className="shadow-lg"
            />
          </div>
        )}
        
        {/* Header */}
        {(title || description) && (
          <div className="p-6 border-b bg-muted/30">
            {title && (
              <h2 className="text-xl font-semibold mb-2">{title}</h2>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}
        
        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
} 