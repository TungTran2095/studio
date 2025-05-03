// src/app/page.tsx
"use client";

import { useState, type FC } from 'react';
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { AnalysisPanel } from "@/components/analysis/analysis-panel";
import { TradingPanel } from "@/components/trading/trading-panel"; // Import the new TradingPanel
import { cn } from '@/lib/utils';

export default function Home() {
  const [isAssetExpanded, setIsAssetExpanded] = useState(true);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
  // State for chat sidebar expansion
  const [isChatExpanded, setIsChatExpanded] = useState(false); // Default to collapsed

  // Toggle for asset summary
  const handleAssetToggle = () => {
    setIsAssetExpanded(!isAssetExpanded);
  };

  // Toggle for the analysis panel
  const handleAnalysisToggle = () => {
    setIsAnalysisExpanded(!isAnalysisExpanded);
  };

  // Toggle for the chat panel
  const handleChatToggle = () => {
    setIsChatExpanded(!isChatExpanded);
  };

  return (
    // Main container: flex, full height, padding, gap
    <div className="flex h-screen bg-background overflow-hidden p-4 gap-4">
      {/* Left Analysis Panel: Shrinkable width, full height */}
      <aside className={cn(
        "flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out h-full", // Ensure full height
        isAnalysisExpanded ? 'w-72' : 'w-16'
      )}>
        <AnalysisPanel isExpanded={isAnalysisExpanded} onToggle={handleAnalysisToggle} />
      </aside>

      {/* Center content area: Takes remaining space, stacks chart and lower panels */}
      <main className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Top Chart Container: Takes most space initially */}
        <div className="flex-[3] flex flex-col overflow-hidden bg-card rounded-lg shadow-md border border-border"> {/* Increased flex-grow */}
          <h1 className="text-lg font-semibold p-3 border-b border-border text-foreground flex-shrink-0">BTC/USDT Price Chart</h1>
          <div className="flex-1 p-0 overflow-hidden">
            <TradingViewWidget />
          </div>
        </div>

        {/* Bottom Container: Holds Assets and Trading side-by-side */}
        <div className="flex-[2] flex gap-4 overflow-hidden"> {/* Reduced flex-grow, horizontal layout */}
            {/* Asset Summary Container: Takes half the space */}
            <div className={cn(
                "flex-1 flex flex-col overflow-hidden border border-border rounded-lg shadow-md bg-card", // Takes half width
            )}>
              {/* AssetSummary might not need expansion toggle anymore if height is fixed */}
              <AssetSummary isExpanded={true} onToggle={() => {}} />
              {/* Or keep toggle if desired */}
              {/* <AssetSummary isExpanded={isAssetExpanded} onToggle={handleAssetToggle} /> */}
            </div>

            {/* New Trading Panel Container: Takes the other half */}
            <div className="flex-1 flex flex-col overflow-hidden border border-border rounded-lg shadow-md bg-card">
              <TradingPanel />
            </div>
        </div>
      </main>

      {/* Right Chat Panel: Shrinkable width, full height */}
      <aside className={cn(
        "flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out h-full", // Ensure full height
        isChatExpanded ? 'w-96' : 'w-16'
      )}>
         {/* Pass props to ChatWindow to handle its own toggle/state */}
        <ChatWindow isExpanded={isChatExpanded} onToggle={handleChatToggle} />
      </aside>
    </div>
  );
}
