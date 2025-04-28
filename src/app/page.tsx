// src/app/page.tsx
"use client"; // Add 'use client' because we are using useState hook

import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { AnalysisPanel } from "@/components/analysis/analysis-panel"; // Import the new panel
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from '@/lib/utils';

export default function Home() {
  const [isAssetExpanded, setIsAssetExpanded] = useState(true);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true); // State for the analysis panel
  const [isChatOpen, setIsChatOpen] = useState(false); // State for chat popover

  // Toggle for asset summary
  const handleAssetToggle = () => {
      setIsAssetExpanded(!isAssetExpanded);
  };

   // Toggle for the analysis panel
   const handleAnalysisToggle = () => {
      setIsAnalysisExpanded(!isAnalysisExpanded);
   };


  return (
    <div className="flex h-screen bg-background overflow-hidden p-4 gap-4 relative"> {/* Added relative positioning */}
      {/* Left Analysis Panel */}
       <aside className={cn(
            "flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out",
            isAnalysisExpanded ? 'w-72' : 'w-16' // Adjust width based on expansion
        )}>
             <AnalysisPanel isExpanded={isAnalysisExpanded} onToggle={handleAnalysisToggle} />
        </aside>


      {/* Main content area for the chart - Takes remaining space */}
      <main className="flex-1 flex flex-col overflow-hidden bg-card rounded-lg shadow-md border border-border">
        <h1 className="text-lg font-semibold p-3 border-b border-border text-foreground flex-shrink-0">BTC/USDT Price Chart</h1>
        <div className="flex-1 p-0 overflow-hidden">
         <TradingViewWidget />
        </div>
      </main>

      {/* Right Container for Asset Summary */}
      <aside className="w-96 flex flex-col gap-4 flex-shrink-0">
         {/* Asset Summary Container */}
         <div className={cn(
             "flex flex-col overflow-hidden transition-all duration-300 ease-in-out border border-border rounded-lg shadow-md bg-card",
             // Use flex-1 to take full height when chat is a popover
             isAssetExpanded ? 'flex-1' : 'flex-shrink-0 h-auto'
           )}>
            <AssetSummary isExpanded={isAssetExpanded} onToggle={handleAssetToggle} />
         </div>
      </aside>

       {/* Chat Popover */}
      <Popover open={isChatOpen} onOpenChange={setIsChatOpen}>
        <PopoverTrigger asChild>
           {/* Fixed Chat Icon Button */}
          <Button
            variant="default" // Use primary gradient
            size="icon"
            className="fixed bottom-6 right-6 rounded-full h-14 w-14 shadow-lg z-50" // Positioned bottom-right, rounded, larger size
            aria-label="Toggle Chat"
          >
            <MessageCircle className="h-7 w-7" /> {/* Larger icon */}
          </Button>
        </PopoverTrigger>
         {/* Define width and height for the popover content */}
        <PopoverContent
            side="top" // Open popover above the button
            align="end" // Align to the right edge of the trigger
            className="w-[400px] h-[550px] p-0 border-border shadow-xl bg-card flex flex-col overflow-hidden" // Set dimensions, remove padding, add styles
            onOpenAutoFocus={(e) => e.preventDefault()} // Prevent autofocus stealing focus
        >
           {/* ChatWindow now rendered inside PopoverContent */}
           {/* Pass dummy handlers as ChatWindow expects them, though they won't be used for expand/collapse */}
           <ChatWindow isExpanded={true} onToggle={() => {}} />
        </PopoverContent>
      </Popover>

    </div>
  );
}
