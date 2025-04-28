import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";

export default function Home() {
  return (
    // Use a relative container for the fixed chat window positioning
    <div className="relative flex h-screen bg-background">
      {/* Main content area for the chart */}
      <main className="flex-1 p-4 overflow-auto">
        <h1 className="text-2xl font-semibold mb-4 text-foreground">BTC/USDT Price Chart</h1>
        <div className="h-[calc(100%-5rem)]"> {/* Adjust height as needed */}
         <TradingViewWidget />
        </div>
      </main>

      {/* Chat Window positioned at the bottom right */}
      <div className="fixed bottom-4 right-4 z-50">
        <ChatWindow />
      </div>
    </div>
  );
}
