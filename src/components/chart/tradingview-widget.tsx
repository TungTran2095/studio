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
    // Check if document is available (client-side)
    const currentTheme = typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? "dark" : "light";

    const widgetConfig = {
      "symbols": [
        [
          "BINANCE:BTCUSDT|1D"
        ]
      ],
      "chartOnly": true,
      "width": "100%",
      "height": "100%",
      "locale": "en",
      "colorTheme": currentTheme, // Use variable directly
      "autosize": true,
      "showVolume": false,
      "showMA": false,
      "hideDateRanges": false,
      "hideMarketStatus": true,
      "hideSymbolLogo": true,
      "scalePosition": "right",
      "scaleMode": "Normal",
      "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      "fontSize": "10",
      "noTimeScale": false,
      "valuesTracking": "1",
      "changeMode": "price-and-percent",
      "chartType": "candlesticks", // Corrected typo: candlestick -> candlesticks
      "maLineColor": "#2962FF",
      "maLineWidth": 1,
      "maLength": 9,
      "lineWidth": 2,
      "lineType": 0,
      "dateFormat": "dd MMM yy", // Removed single quotes, ensure keys are quoted
      "studies": [
        "IchimokuCloud@tv-basicstudies" // Add Ichimoku Cloud indicator
      ]
    };


    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;
    // Use JSON.stringify to ensure valid JSON format
    script.innerHTML = JSON.stringify(widgetConfig);


    container.current.appendChild(script);
    scriptAdded.current = true; // Mark script as added

    // Optional: Cleanup script on component unmount
    return () => {
      if (container.current && container.current.contains(script)) {
         container.current.removeChild(script);
         scriptAdded.current = false; // Reset script added status on unmount
      }
    };
    // Add currentTheme to dependency array if it might change dynamically
    // For now, assuming theme is set on initial load based on class
  }, []); // Empty dependency array ensures this runs only once on mount

   // Use Tailwind classes for styling the container
   return (
    <div className="tradingview-widget-container h-full w-full" ref={container}>
      <div className="tradingview-widget-container__widget h-full w-full"></div>
      <div className="tradingview-widget-copyright">
        {/* Optional: Link to TradingView */}
        {/* <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span className="blue-text">Track all markets on TradingView</span></a> */}
      </div>
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';

