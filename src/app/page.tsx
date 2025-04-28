// src/app/page.tsx
"use client"; // Add 'use client' because we are using useState hook

import { useState } from 'react';
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { cn } from '@/lib/utils';

export default function Home() {
  const [isAssetExpanded, setIsAssetExpanded] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(true);

  // Ensure at least one panel is expanded if the user tries to collapse the last one
  const handleAssetToggle = () => {
      if (isAssetExpanded && !isChatExpanded) {
        // Prevent collapsing the last expanded panel
        setIsChatExpanded(true);
      }
      setIsAssetExpanded(!isAssetExpanded);
  };

  const handleChatToggle = () => {
       if (isChatExpanded && !isAssetExpanded) {
         // Prevent collapsing the last expanded panel
         setIsAssetExpanded(true);
       }
       setIsChatExpanded(!isChatExpanded);
  };


  return (
    <div className="flex h-screen bg-background overflow-hidden p-4 gap-4">
      {/* Main content area for the chart */}
      <main className="flex-1 flex flex-col overflow-hidden bg-card rounded-lg shadow-md border border-border">
        <h1 className="text-lg font-semibold p-3 border-b border-border text-foreground flex-shrink-0">BTC/USDT Price Chart</h1>
        <div className="flex-1 p-0 overflow-hidden">
         <TradingViewWidget />
        </div>
      </main>

      {/* Container for Asset Summary and Chat - Manages vertical flex layout */}
      <aside className="w-96 border border-border flex flex-col bg-card rounded-lg shadow-md overflow-hidden flex-shrink-0">
         {/* Asset Summary Container */}
         {/* Apply transition for smooth height change */}
         <div className={cn(
             "flex flex-col overflow-hidden transition-all duration-300 ease-in-out border-b border-border",
             isAssetExpanded && isChatExpanded ? 'h-1/2' : '',
             isAssetExpanded && !isChatExpanded ? 'flex-1' : '',
             !isAssetExpanded ? 'h-auto flex-shrink-0' : '' // Height determined by content (header) when collapsed
           )}>
            <AssetSummary isExpanded={isAssetExpanded} onToggle={handleAssetToggle} />
         </div>

         {/* Chat Window Container */}
         {/* Apply transition for smooth height change */}
         <div className={cn(
            "flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
             isChatExpanded && isAssetExpanded ? 'h-1/2' : '',
             isChatExpanded && !isAssetExpanded ? 'flex-1' : '',
             !isChatExpanded ? 'h-auto flex-shrink-0' : '' // Height determined by content (header) when collapsed
         )}>
            <ChatWindow isExpanded={isChatExpanded} onToggle={handleChatToggle}/>
         </div>
      </aside>
    </div>
  );
}
