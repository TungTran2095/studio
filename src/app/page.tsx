// src/app/page.tsx
"use client"; // Add 'use client' because we are using useState hook

import { useState } from 'react';
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { AnalysisPanel } from "@/components/analysis/analysis-panel"; // Import the new panel
import { cn } from '@/lib/utils';

export default function Home() {
  const [isAssetExpanded, setIsAssetExpanded] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true); // State for the new panel

  // Ensure at least one right-hand panel is expanded if the user tries to collapse the last one
  const handleAssetToggle = () => {
      if (isAssetExpanded && !isChatExpanded) {
        // Prevent collapsing the last expanded panel
        setIsChatExpanded(true); // Force chat open if asset is collapsing and chat is already closed
      }
      setIsAssetExpanded(!isAssetExpanded);
  };

  const handleChatToggle = () => {
       if (isChatExpanded && !isAssetExpanded) {
         // Prevent collapsing the last expanded panel
         setIsAssetExpanded(true); // Force asset open if chat is collapsing and asset is already closed
       }
       setIsChatExpanded(!isChatExpanded);
  };

   // Toggle for the new analysis panel
   const handleAnalysisToggle = () => {
      setIsAnalysisExpanded(!isAnalysisExpanded);
   };


  return (
    <div className="flex h-screen bg-background overflow-hidden p-4 gap-4">
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

      {/* Right Container for Asset Summary and Chat */}
      <aside className="w-96 flex flex-col gap-4 flex-shrink-0">
         {/* Asset Summary Container */}
         <div className={cn(
             "flex flex-col overflow-hidden transition-all duration-300 ease-in-out border border-border rounded-lg shadow-md bg-card",
             isAssetExpanded && isChatExpanded ? 'h-1/2' : '',
             isAssetExpanded && !isChatExpanded ? 'flex-1' : '', // Takes full height if chat is collapsed
             !isAssetExpanded ? 'h-auto flex-shrink-0' : '' // Height determined by content (header) when collapsed
           )}>
            <AssetSummary isExpanded={isAssetExpanded} onToggle={handleAssetToggle} />
         </div>

         {/* Chat Window Container */}
         <div className={cn(
            "flex flex-col overflow-hidden transition-all duration-300 ease-in-out border border-border rounded-lg shadow-md bg-card",
             isChatExpanded && isAssetExpanded ? 'h-1/2' : '',
             isChatExpanded && !isAssetExpanded ? 'flex-1' : '', // Takes full height if asset is collapsed
             !isChatExpanded ? 'h-auto flex-shrink-0' : '' // Height determined by content (header) when collapsed
         )}>
            <ChatWindow isExpanded={isChatExpanded} onToggle={handleChatToggle}/>
         </div>
      </aside>
    </div>
  );
}
