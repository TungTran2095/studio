import { ChatWindow } from "@/components/chat/chat-window";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";

export default function Home() {
  return (
    // Use flexbox for the main layout
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Main content area for the chart (takes up remaining space) */}
      <main className="flex-1 p-4 overflow-y-auto"> {/* Allow vertical scroll if needed */}
        <h1 className="text-2xl font-semibold mb-4 text-foreground">BTC/USDT Price Chart</h1>
        {/* Ensure chart container takes available height */}
        <div className="h-[calc(100vh-8rem)]"> {/* Adjust height considering padding and title */}
         <TradingViewWidget />
        </div>
      </main>

      {/* Chat Window container */}
      <aside className="w-96 border-l border-border p-4 flex flex-col">
        <div className="flex-shrink-0"> {/* Prevent chat window from shrinking */}
            <ChatWindow />
        </div>
      </aside>
    </div>
  );
}
