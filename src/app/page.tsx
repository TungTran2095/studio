// src/app/page.tsx
import { AssetSummary } from "@/components/assets/asset-summary";
import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";

export default function Home() {
  return (
    // Use flexbox for the main layout with padding and gap
    // Ensure main background covers the entire page
    <div className="flex h-screen bg-background overflow-hidden p-4 gap-4">
      {/* Main content area for the chart - Use card styling for consistency */}
      <main className="flex-1 flex flex-col overflow-hidden bg-card rounded-lg shadow-md border border-border">
        {/* Header for the chart section */}
        <h1 className="text-lg font-semibold p-3 border-b border-border text-foreground flex-shrink-0">BTC/USDT Price Chart</h1>
        {/* Chart container takes remaining space and has padding */}
        <div className="flex-1 p-0 overflow-hidden"> {/* Reduced padding for chart */}
         <TradingViewWidget />
        </div>
      </main>

      {/* Container for Asset Summary and Chat */}
      <aside className="w-96 border border-border flex flex-col bg-card rounded-lg shadow-md overflow-hidden flex-shrink-0">
         {/* Asset Summary Section - Top Half */}
         {/* Let AssetSummary control its own height within its container */}
         <div className="h-1/2 border-b border-border flex flex-col overflow-hidden">
            <AssetSummary />
         </div>
         {/* Chat Window Section - Bottom Half */}
         <div className="h-1/2 flex flex-col">
            <ChatWindow />
         </div>
      </aside>
    </div>
  );
}

    