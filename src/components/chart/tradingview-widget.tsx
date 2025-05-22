// components/TradingViewWidget.tsx
"use client";

import React, { useEffect, useRef, memo } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

export const TradingViewWidget: React.FC = memo(() => {
  const container = useRef<HTMLDivElement>(null);
  const scriptAdded = useRef(false); // Ref to track if script has been added
  const widgetInstance = useRef<any>(null); // Ref to store the widget instance

  // Function to update widget theme - Force dark mode
  const updateTheme = () => {
    const currentTheme = "dark"; // Always set to dark
    if (widgetInstance.current && typeof widgetInstance.current.changeTheme === 'function') {
        // Ensure the changeTheme function exists before calling
        try {
            widgetInstance.current.changeTheme(currentTheme);
        } catch (error) {
            console.error("Error changing TradingView widget theme:", error);
        }
    }
    return currentTheme;
  };

  useEffect(() => {
    // Ensure container exists and script hasn't been added yet
    if (!container.current || scriptAdded.current) return;

    const currentTheme = "dark"; // Set initial theme directly to dark

    // Configuration for the Advanced Real-Time Chart Widget
    const widgetConfig = {
      "autosize": true, // Use autosize instead of fixed width/height
      "symbol": "BINANCE:BTCUSDT", // Primary symbol
      "interval": "D", // Default interval (Daily)
      "timezone": "Etc/UTC",
      "theme": currentTheme, // Set initial theme to dark
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
        if (typeof window.TradingView !== 'undefined' && typeof window.TradingView.widget === 'function') {
           // Store the widget instance
           try {
               widgetInstance.current = new window.TradingView.widget(widgetConfig);
               scriptAdded.current = true; // Mark script as loaded and widget initialized
           } catch (error) {
                console.error("Error initializing TradingView widget:", error);
           }
        } else {
            console.error("TradingView library not loaded correctly.");
        }
    }
    script.onerror = () => {
        console.error("TradingView script failed to load.");
    }

    container.current.appendChild(script);

     // Setup MutationObserver to detect theme changes on HTML element
     // Although we force dark theme, this can help if other styles depend on the class
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                updateTheme(); // Re-apply dark theme if needed
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
      if (widgetInstance.current) {
        try {
            // Kiểm tra xem widget có hợp lệ và có phần tử cha (parentNode) không
            const chartContainer = document.getElementById('tradingview_chart_container');
            if (chartContainer && chartContainer.innerHTML) {
                // Xóa nội dung của container thay vì gọi remove() để tránh lỗi parentNode
                chartContainer.innerHTML = '';
            }
            
            // Nếu widget có hàm remove, thử gọi nó một cách an toàn
            if (typeof widgetInstance.current.remove === 'function') {
                // Kiểm tra thêm điều kiện để đảm bảo an toàn
                const iframe = document.querySelector('iframe._tv-chart');
                if (iframe && iframe.parentNode) {
                    widgetInstance.current.remove();
                }
            }
        } catch (error) {
            console.error("Error removing TradingView widget:", error);
        }
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
    <div className="middle-column h-full w-full">
        <div id="chart-container" className="h-full w-full">
            <div id="tradingview_btcusdt" className="tradingview-widget-container h-full w-full" ref={container}>
                {/* The widget script will target this ID */}
                <div id="tradingview_chart_container" className="h-full w-full"></div>
            </div>
        </div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
