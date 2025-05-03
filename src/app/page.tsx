// src/app/page.tsx
"use client";

import { useState, useRef, useEffect, type MouseEvent, type TouchEvent } from 'react';
import { MessageCircle } from 'lucide-react';
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { AnalysisPanel } from "@/components/analysis/analysis-panel";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';

export default function Home() {
  const [isAssetExpanded, setIsAssetExpanded] = useState(true);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // State for draggable button position
  const [position, setPosition] = useState({ x: 0, y: 0 });
  // Refs for drag handling
  const dragButtonRef = useRef<HTMLButtonElement>(null);
  const isDraggingRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  // Effect to position button initially and handle window resize
  useEffect(() => {
    const button = dragButtonRef.current;
    const parent = button?.offsetParent; // Get the nearest positioned ancestor
    if (button && parent) {
      // Initial position: bottom-right corner relative to the parent container
      const initialX = parent.clientWidth - button.offsetWidth - 24; // 24px = 1.5rem (right-6)
      const initialY = parent.clientHeight - button.offsetHeight - 24; // 24px = 1.5rem (bottom-6)
      setPosition({ x: initialX, y: initialY });
    }

    const handleResize = () => {
       if (button && parent) {
         // Adjust position on resize to stay relative to bottom-right, avoiding going off-screen
         const newX = Math.min(
           position.x,
           parent.clientWidth - button.offsetWidth - 24
         );
         const newY = Math.min(
           position.y,
           parent.clientHeight - button.offsetHeight - 24
         );
         setPosition({ x: Math.max(0, newX), y: Math.max(0, newY) }); // Ensure it doesn't go off-left/top
       }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
     // Re-run if position.x/y changes might be too frequent, rely on parent dimensions change if possible
  }, []); // Run once on mount

  // Mouse down handler
  const handleMouseDown = (e: MouseEvent<HTMLButtonElement> | TouchEvent<HTMLButtonElement>) => {
    // Prevent drag if clicking inside popover content area
    if (isChatOpen && (e.target as HTMLElement).closest('[data-radix-popover-content]')) {
      return;
    }

    isDraggingRef.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };
    initialPosRef.current = { x: position.x, y: position.y };
    dragButtonRef.current?.classList.add('cursor-grabbing');

    // Prevent text selection during drag
    e.preventDefault();
  };

  // Mouse move handler (added in useEffect)
  const handleMouseMove = (e: globalThis.MouseEvent | globalThis.TouchEvent) => {
    if (!isDraggingRef.current || !dragButtonRef.current) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startPosRef.current.x;
    const dy = clientY - startPosRef.current.y;

    const parent = dragButtonRef.current.offsetParent as HTMLElement;
    if (!parent) return;

    // Calculate new position, constraining within parent bounds
    let newX = initialPosRef.current.x + dx;
    let newY = initialPosRef.current.y + dy;

    // Constrain X
    newX = Math.max(0, newX); // Prevent moving past left edge
    newX = Math.min(newX, parent.clientWidth - dragButtonRef.current.offsetWidth); // Prevent moving past right edge

    // Constrain Y
    newY = Math.max(0, newY); // Prevent moving past top edge
    newY = Math.min(newY, parent.clientHeight - dragButtonRef.current.offsetHeight); // Prevent moving past bottom edge


    setPosition({ x: newX, y: newY });
  };

  // Mouse up handler (added in useEffect)
  const handleMouseUp = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      dragButtonRef.current?.classList.remove('cursor-grabbing');
    }
  };

  // Effect to add and remove global mouse move/up listeners
  useEffect(() => {
    if (isDraggingRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    }

    // Cleanup function
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
       window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDraggingRef.current]); // Dependency on dragging state


  // Toggle for asset summary
  const handleAssetToggle = () => {
    setIsAssetExpanded(!isAssetExpanded);
  };

  // Toggle for the analysis panel
  const handleAnalysisToggle = () => {
    setIsAnalysisExpanded(!isAnalysisExpanded);
  };

  return (
    // Main container: flex, full height, padding, gap, relative for button positioning
    <div className="flex h-screen bg-background overflow-hidden p-4 gap-4 relative">
      {/* Left Analysis Panel: Shrinkable width, full height */}
      <aside className={cn(
        "flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out h-full", // Ensure full height
        isAnalysisExpanded ? 'w-72' : 'w-16'
      )}>
        <AnalysisPanel isExpanded={isAnalysisExpanded} onToggle={handleAnalysisToggle} />
      </aside>

      {/* Center content area: Takes remaining space, stacks chart and assets */}
      <main className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Chart Container: Takes available space, flex column */}
        <div className="flex-1 flex flex-col overflow-hidden bg-card rounded-lg shadow-md border border-border">
          <h1 className="text-lg font-semibold p-3 border-b border-border text-foreground flex-shrink-0">BTC/USDT Price Chart</h1>
          {/* Inner div for widget takes remaining space */}
          <div className="flex-1 p-0 overflow-hidden">
            <TradingViewWidget />
          </div>
        </div>

        {/* Asset Summary Container: Below chart, defined height when expanded */}
        <div className={cn(
          "flex flex-col overflow-hidden border border-border rounded-lg shadow-md bg-card",
           // Give it a fixed height when expanded, shrink when collapsed
           // Adjust 'h-96' as needed for desired height relative to analysis panel
           isAssetExpanded ? 'h-96' : 'h-auto flex-shrink-0'
        )}>
          <AssetSummary isExpanded={isAssetExpanded} onToggle={handleAssetToggle} />
        </div>
      </main>

      {/* Chat Popover: Absolute positioning remains the same */}
      <Popover open={isChatOpen} onOpenChange={setIsChatOpen}>
        <PopoverTrigger asChild>
          {/* Draggable Chat Icon Button */}
          <Button
            ref={dragButtonRef}
            variant="default"
            size="icon"
            className="absolute bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50 cursor-grab active:cursor-grabbing" // Use absolute positioning, add grab cursors
            style={{
              transform: `translate(${position.x}px, ${position.y}px)`, // Apply dynamic position
              touchAction: 'none', // Prevent default touch behavior like scrolling
              bottom: 'auto', // Override default fixed positioning
              right: 'auto', // Override default fixed positioning
              left: 0, // Required for transform to work correctly with absolute
              top: 0   // Required for transform to work correctly with absolute
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown} // Handle touch events as well
            aria-label="Toggle Chat"
            onClick={(e) => {
                 // Prevent popover opening if dragging just finished
                if (Math.abs(position.x - initialPosRef.current.x) > 5 || Math.abs(position.y - initialPosRef.current.y) > 5) {
                    e.stopPropagation(); // Stop click event if moved significantly
                }
            }}
          >
            <MessageCircle className="h-7 w-7" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="end"
           // Adjust sideOffset to avoid overlap if button is near edge
          sideOffset={10}
          className="w-[400px] h-[550px] p-0 border-border shadow-xl bg-card flex flex-col overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
          // Optional: Prevent pointer events on content from closing popover during drag attempt
          onPointerDownOutside={(e) => {
             // If the target is the draggable button, prevent closing
             if (dragButtonRef.current?.contains(e.target as Node)) {
               e.preventDefault();
             }
          }}
        >
          <ChatWindow />
        </PopoverContent>
      </Popover>
    </div>
  );
}

