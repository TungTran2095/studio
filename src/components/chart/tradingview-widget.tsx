// components/TradingViewWidget.tsx
"use client";

import React, { useEffect, useRef, memo } from 'react';

export const TradingViewWidget: React.FC = memo(() => {
  const container = useRef<HTMLDivElement>(null);
  const scriptAdded = useRef(false); // Ref to track if script has been added

  useEffect(() => {
    // Prevent adding the script multiple times if component re-renders
    if (!container.current || scriptAdded.current) return;

    // Determine the theme *before* creating the JSON string
    const currentTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? "dark" : "light";

    // Configuration for the Advanced Real-Time Chart Widget
    const widgetConfig = {
      "width": "100%",
      "height": "100%",
      "symbol": "BINANCE:BTCUSDT", // Primary symbol
      "interval": "D", // Default interval (Daily)
      "timezone": "Etc/UTC",
      "theme": currentTheme,
      "style": "1", // 1 = Candlesticks
      "locale": "en",
      "enable_publishing": false, // Disable publishing button
      "allow_symbol_change": true, // Allow user to change symbol
      "withdateranges": true, // Show date ranges
      "hide_side_toolbar": false, // Show drawing toolbar
      "hide_top_toolbar": false, // Show top toolbar (interval, chart type etc.)
      "studies": [
        "IchimokuCloud@tv-basicstudies" // Keep Ichimoku Cloud
      ],
      "container_id": "tradingview_chart_container", // Important for advanced widget
      "autosize": true,
    };

    const script = document.createElement("script");
    // Use the Advanced Chart Widget script
    script.src = "https://s3.tradingview.com/tv.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
        if (typeof TradingView !== 'undefined') {
           // Ensure the container ID matches the one in widgetConfig
           new (window as any).TradingView.widget(widgetConfig);
           scriptAdded.current = true; // Mark script as loaded and widget initialized
        }
    }
    script.onerror = () => {
        console.error("TradingView script failed to load.");
        // Handle error appropriately, maybe show a message to the user
    }


    // The advanced widget script doesn't use innerHTML for config.
    // It needs a container div with a specific ID.
    // The script's onload handler initializes the widget.
    container.current.appendChild(script);


    // Cleanup function: Remove the widget and script if the component unmounts
    return () => {
      // The advanced widget might add its own elements. Simple script removal might not be enough.
      // Ideally, TradingView provides a cleanup method, but a simple removal might suffice for basic cases.
      if (container.current) {
        // Clear the container's content
        while (container.current.firstChild) {
          container.current.removeChild(container.current.firstChild);
        }
      }
      // Reset script added status
      scriptAdded.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once on mount


   // Container div for the advanced widget, ID must match config
   return (
    <div className="tradingview-widget-container h-full w-full" ref={container}>
      {/* The widget script will target this ID */}
      <div id="tradingview_chart_container" className="h-full w-full"></div>
      <div className="tradingview-widget-copyright">
        {/* Optional: Link to TradingView */}
        {/* <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span className="blue-text">Track all markets on TradingView</span></a> */}
      </div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';

