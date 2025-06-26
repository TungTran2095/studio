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

  useEffect(() => {
    // Ensure container exists and script hasn't been added yet
    if (!container.current || scriptAdded.current) return;

    // Lấy theme từ hệ thống (classList)
    const initialTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

    // Configuration for the Advanced Real-Time Chart Widget
    const widgetConfig = {
      "autosize": true,
      "symbol": "BINANCE:BTCUSDT",
      "interval": "D",
      "timezone": "Etc/UTC",
      "theme": initialTheme, // Luôn đồng bộ theme với hệ thống
      "style": "1",
      "locale": "en",
      "enable_publishing": false,
      "allow_symbol_change": true,
      "withdateranges": true,
      "hide_side_toolbar": false,
      "hide_top_toolbar": false,
      "studies": [
        "IchimokuCloud@tv-basicstudies"
      ],
      "container_id": "tradingview_chart_container",
    };

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.type = "text/javascript";
    script.async = true;
    script.onload = () => {
        if (typeof window.TradingView !== 'undefined' && typeof window.TradingView.widget === 'function') {
           try {
               const targetContainer = document.getElementById('tradingview_chart_container');
               if (targetContainer && container.current) {
                   widgetInstance.current = new window.TradingView.widget(widgetConfig);
                   scriptAdded.current = true;
               } else {
                   console.warn("TradingView container not found, retrying...");
                   setTimeout(() => {
                       const retryContainer = document.getElementById('tradingview_chart_container');
                       if (retryContainer && container.current) {
                           widgetInstance.current = new window.TradingView.widget(widgetConfig);
                           scriptAdded.current = true;
                       }
                   }, 100);
               }
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
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                // Determine the new theme based on the presence of the 'dark' class
                const newTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';

                // Check if the widget is initialized and the theme needs to be changed
                // Also check if the changeTheme function exists before calling
                if (widgetInstance.current && widgetInstance.current.options.theme !== newTheme && typeof widgetInstance.current.changeTheme === 'function') {
                     widgetInstance.current.changeTheme(newTheme);
                     // Optionally update widgetConfig.theme if you were using it elsewhere, but changeTheme is usually enough
                     // widgetConfig.theme = newTheme;
                }
            }
        }
    });

    // Start observing the document element for attribute changes (specifically class)
    // Use { attributes: true } to observe attribute changes.
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
            if (typeof widgetInstance.current.remove === 'function') {
                widgetInstance.current.remove();
            }
            const chartContainer = document.getElementById('tradingview_chart_container');
            if (chartContainer) {
                chartContainer.innerHTML = '';
            }
        } catch (error) {
            console.warn("TradingView widget cleanup warning:", error);
            try {
                const chartContainer = document.getElementById('tradingview_chart_container');
                if (chartContainer) {
                    chartContainer.innerHTML = '';
                }
            } catch (fallbackError) {
                console.error("TradingView fallback cleanup failed:", fallbackError);
            }
        }
        widgetInstance.current = null;
      }

      // Clean up the container div safely
      if (container.current) {
        try {
          const containerElement = container.current;
          while (containerElement.firstChild) {
            try {
              containerElement.removeChild(containerElement.firstChild);
            } catch (childError) {
              containerElement.innerHTML = '';
              break;
            }
          }
        } catch (error) {
          console.warn("Container cleanup warning:", error);
        }
      }

      // Reset script added status
      scriptAdded.current = false;
    };
  }, []); // Empty dependency array ensures this runs only once on mount

   return (
    <div className="middle-column h-full w-full">
        <div id="chart-container" className="h-full w-full">
            <div id="tradingview_btcusdt" className="tradingview-widget-container h-full w-full" ref={container}>
                <div id="tradingview_chart_container" className="h-full w-full"></div>
            </div>
        </div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
