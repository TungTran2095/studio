// src/app/page.tsx
"use client";

import { useState, type FC } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { AnalysisPanel } from "@/components/analysis/analysis-panel";
import { TradingPanel } from "@/components/trading/trading-panel";
import { cn } from '@/lib/utils';

export default function Home() {
  // Keep existing state for toggling expanded/collapsed view,
  // resizing will be handled by react-resizable-panels when expanded.
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(true);
  const [isChatExpanded, setIsChatExpanded] = useState(false); // Default chat to collapsed

  const handleAnalysisToggle = () => {
    setIsAnalysisExpanded(!isAnalysisExpanded);
    // Ideally, you might also trigger panel collapse/expand here if using panel API
  };

  const handleChatToggle = () => {
    setIsChatExpanded(!isChatExpanded);
    // Ideally, trigger panel collapse/expand here
  };

  return (
    // Main container: Use PanelGroup for horizontal resizing
    <div className="h-screen bg-background overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full w-full">
            {/* Left Analysis Panel */}
            <Panel
                defaultSize={isAnalysisExpanded ? 20 : 5} // Default size based on state
                minSize={5} // Minimum collapsed size (adjust as needed)
                maxSize={30}
                collapsible={true} // Allow collapsing
                collapsedSize={5} // Size when collapsed
                onCollapse={() => setIsAnalysisExpanded(false)}
                onExpand={() => setIsAnalysisExpanded(true)}
                className={cn(
                    "flex flex-col transition-all duration-300 ease-in-out h-full", // Ensure full height
                     // Hide content visually when collapsed by panel, not just width
                    !isAnalysisExpanded && "min-w-[4rem]" // Ensure collapsed width is applied
                )}
                id="analysis-panel"
            >
                {/* Render AnalysisPanel always, let Panel handle collapsing */}
                 <AnalysisPanel isExpanded={isAnalysisExpanded} onToggle={handleAnalysisToggle} />
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="w-1.5 bg-transparent hover:bg-border/50 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 transition-colors data-[resize-handle-active]:bg-border" />

            {/* Center Content Panel */}
            <Panel defaultSize={60} minSize={30} id="center-panel">
                 <PanelGroup direction="vertical" className="h-full w-full gap-1 p-1">
                    {/* Top Chart Panel */}
                    <Panel defaultSize={60} minSize={25} id="chart-panel">
                        <div className="flex-[3] flex flex-col overflow-hidden bg-card rounded-lg shadow-md border border-border h-full">
                          <h1 className="text-lg font-semibold p-3 border-b border-border text-foreground flex-shrink-0">BTC/USDT Price Chart</h1>
                          <div className="flex-1 p-0 overflow-hidden">
                            <TradingViewWidget />
                          </div>
                        </div>
                    </Panel>

                     {/* Resize Handle */}
                    <PanelResizeHandle className="h-1.5 bg-transparent hover:bg-border/50 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 transition-colors data-[resize-handle-active]:bg-border" />

                     {/* Bottom Panels (Assets + Trading) */}
                    <Panel defaultSize={40} minSize={25} id="bottom-panels">
                         <PanelGroup direction="horizontal" className="h-full w-full gap-1">
                             {/* Asset Summary Panel */}
                            <Panel defaultSize={50} minSize={25} id="asset-panel">
                                <div className="flex-1 flex flex-col overflow-hidden border border-border rounded-lg shadow-md bg-card h-full">
                                    {/* Keep toggle, but it only affects internal content now */}
                                    <AssetSummary isExpanded={true} onToggle={() => {}} />
                                </div>
                            </Panel>

                             {/* Resize Handle */}
                            <PanelResizeHandle className="w-1.5 bg-transparent hover:bg-border/50 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 transition-colors data-[resize-handle-active]:bg-border" />

                             {/* Trading Panel */}
                            <Panel defaultSize={50} minSize={25} id="trading-panel">
                                <div className="flex-1 flex flex-col overflow-hidden border border-border rounded-lg shadow-md bg-card h-full">
                                    <TradingPanel />
                                </div>
                            </Panel>
                         </PanelGroup>
                    </Panel>
                 </PanelGroup>
            </Panel>

            {/* Resize Handle */}
            <PanelResizeHandle className="w-1.5 bg-transparent hover:bg-border/50 focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 transition-colors data-[resize-handle-active]:bg-border" />

            {/* Right Chat Panel */}
            <Panel
                defaultSize={isChatExpanded ? 25 : 5} // Default size based on state
                minSize={5} // Minimum collapsed size
                maxSize={40}
                collapsible={true}
                collapsedSize={5} // Size when collapsed (approx 4rem)
                onCollapse={() => setIsChatExpanded(false)}
                onExpand={() => setIsChatExpanded(true)}
                className={cn(
                    "flex flex-col transition-all duration-300 ease-in-out h-full", // Full height
                     // Ensure collapsed width is applied
                    !isChatExpanded && "min-w-[4rem]"
                )}
                 id="chat-panel"
            >
                {/* Render ChatWindow always, let Panel handle collapsing */}
                <ChatWindow isExpanded={isChatExpanded} onToggle={handleChatToggle} />
            </Panel>
        </PanelGroup>
    </div>
  );
}
