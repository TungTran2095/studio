// components/TradingViewWidget.tsx
"use client";

import React, { useEffect, useRef, memo } from 'react';

export const TradingViewWidget: React.FC = memo(() => {
  const container = useRef<HTMLDivElement>(null);
  const scriptAdded = useRef(false); // Ref to track if script has been added
  const widgetInstance = useRef<any>(null); // Ref to store the widget instance

  // Function to update widget theme
  const updateTheme = () => {
    const currentTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? "dark" : "light";
    if (widgetInstance.current) {
        widgetInstance.current.changeTheme(currentTheme);
    }
    return currentTheme;
  };

  useEffect(() => {
    // Ensure container exists and script hasn't been added yet
    if (!container.current || scriptAdded.current) return;

    const currentTheme = updateTheme(); // Get initial theme

    // Configuration for the Advanced Real-Time Chart Widget
    const widgetConfig = {
      "autosize": true, // Use autosize instead of fixed width/height
      "symbol": "BINANCE:BTCUSDT", // Primary symbol
      "interval": "D", // Default interval (Daily)
      "timezone": "Etc/UTC",
      "theme": currentTheme, // Set initial theme
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
    };

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
        if (typeof window.TradingView !== 'undefined') {
           // Store the widget instance
           widgetInstance.current = new (window as any).TradingView.widget(widgetConfig);
           scriptAdded.current = true; // Mark script as loaded and widget initialized
        }
    }
    script.onerror = () => {
        console.error("TradingView script failed to load.");
    }

    container.current.appendChild(script);

    // Setup MutationObserver to detect theme changes
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                updateTheme(); // Update widget theme when document class changes
            }
        }
    });

    // Start observing the document element for attribute changes
    if (typeof document !== 'undefined') {
        observer.observe(document.documentElement, { attributes: true });
    }

    // Cleanup function
    return () => {
      // Stop observing
      observer.disconnect();

      // Remove widget instance if it exists
      if (widgetInstance.current && typeof widgetInstance.current.remove === 'function') {
        widgetInstance.current.remove();
        widgetInstance.current = null;
      }
      // Clean up the container div
      if (container.current) {
        while (container.current.firstChild) {
          container.current.removeChild(container.current.firstChild);
        }
      }
      // Reset script added status
      scriptAdded.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once on mount

   // Container div for the advanced widget
   return (
    <div className="tradingview-widget-container h-full w-full" ref={container}>
      {/* The widget script will target this ID */}
      <div id="tradingview_chart_container" className="h-full w-full"></div>
      {/* Optional: Link to TradingView can be removed or styled */}
      {/* <div className="tradingview-widget-copyright"></div> */}
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
