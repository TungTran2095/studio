// src/app/page.tsx
"use client";

import { useState, type FC } from 'react';
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { AnalysisPanel } from "@/components/analysis/analysis-panel";
import { TradingPanel } from "@/components/trading/trading-panel";
import { cn } from '@/lib/utils';

export default function Home() {
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(false); // Default chat to collapsed

  const handleAnalysisToggle = () => {
    setIsAnalysisExpanded(!isAnalysisExpanded);
  };

  const handleChatToggle = () => {
    setIsChatExpanded(!isChatExpanded);
  };

  return (
    // Main container: Use flex row
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Left Analysis Panel */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-in-out h-full border-r border-border",
          isAnalysisExpanded ? "w-1/5 min-w-[250px]" : "w-16" // Adjust width based on state
        )}
      >
        {/* AnalysisPanel controls its internal visibility */}
        <AnalysisPanel isExpanded={isAnalysisExpanded} onToggle={handleAnalysisToggle} />
      </div>

      {/* Center Content Area (Flex column) */}
      <div className="flex-1 flex flex-col gap-2 p-2 overflow-hidden">
        {/* Top Chart Panel */}
        <div className="flex-[3] flex flex-col overflow-hidden bg-card rounded-lg shadow-md border border-border">
            <h1 className="text-lg font-semibold p-3 border-b border-border text-foreground flex-shrink-0">BTC/USDT Price Chart</h1>
            <div className="flex-1 p-0 overflow-hidden">
                <TradingViewWidget />
            </div>
        </div>

        {/* Bottom Panels Area (Flex row) */}
        <div className="flex-1 flex gap-2 overflow-hidden">
            {/* Asset Summary Panel */}
            <div className="flex-1 flex flex-col overflow-hidden border border-border rounded-lg shadow-md bg-card">
                {/* AssetSummary internally handles its content visibility based on its own toggle */}
                <AssetSummary isExpanded={true} onToggle={() => {}} />
            </div>

             {/* Trading Panel */}
            <div className="flex-1 flex flex-col overflow-hidden border border-border rounded-lg shadow-md bg-card">
                <TradingPanel />
            </div>
        </div>
      </div>

      {/* Right Chat Panel */}
      <div
        className={cn(
          "flex flex-col transition-all duration-300 ease-in-out h-full border-l border-border",
          isChatExpanded ? "w-1/4 min-w-[300px]" : "w-16" // Adjust width based on state
        )}
      >
        {/* ChatWindow controls its internal visibility */}
        <ChatWindow isExpanded={isChatExpanded} onToggle={handleChatToggle} />
      </div>
    </div>
  );
}
