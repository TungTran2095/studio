// src/app/page.tsx
"use client";

import { useState, type FC } from 'react';
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { AnalysisPanel } from "@/components/analysis/analysis-panel";
import { cn } from '@/lib/utils';

export default function Home() {
  const [isAssetExpanded, setIsAssetExpanded] = useState(true);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
  // New state for chat sidebar
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
           // Dynamic height based on expansion
           isAssetExpanded ? 'flex-1' : 'h-auto flex-shrink-0', // Adjusted to flex-1 when expanded
           // Add min-height if needed when collapsed, e.g., 'min-h-16'
        )}>
          <AssetSummary isExpanded={isAssetExpanded} onToggle={handleAssetToggle} />
        </div>
      </main>

      {/* Right Chat Panel: Shrinkable width, full height */}
      <aside className={cn(
        "flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out h-full", // Ensure full height
        // Make collapsed width smaller (w-16 is 64px, adjust if needed)
        // Keep w-96 for expanded state
        isChatExpanded ? 'w-96' : 'w-16' // Using w-16, which should be narrow enough for just an icon
      )}>
         {/* Pass props to ChatWindow to handle its own toggle/state */}
        <ChatWindow isExpanded={isChatExpanded} onToggle={handleChatToggle} />
      </aside>
    </div>
  );
}
