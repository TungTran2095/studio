// src/components/assets/asset-summary.tsx
"use client";

import type { FC } from "react";
import { useState, useEffect, useCallback, useRef } from "react"; // Added useRef
import { useForm, useWatch } from "react-hook-form"; // Added useWatch
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronDown, ChevronUp, RotateCw } from 'lucide-react'; // Import icons
import { fetchBinanceAssets, fetchBinanceTradeHistory } from "@/actions/binance"; // Import Server Actions
import type { Asset, Trade } from "@/actions/binance"; // Import types
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Keep Card parts for internal structure
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format } from 'date-fns'; // For formatting timestamps
import { useAssetStore } from '@/store/asset-store'; // Import Zustand store

// Schema for form validation - remains the same
const formSchema = z.object({
  apiKey: z.string().min(1, { message: "API Key is required." }),
  apiSecret: z.string().min(1, { message: "API Secret is required." }),
  isTestnet: z.boolean().default(false),
});

// Define props including isExpanded and onToggle
interface AssetSummaryProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Define the list of symbols to ALWAYS check for trade history and display assets for
const TARGET_SYMBOLS = ['BTC', 'USDT']; // UPDATED: Only BTC and USDT
const REFRESH_INTERVAL_MS = 5000; // 5 seconds

export const AssetSummary: FC<AssetSummaryProps> = ({ isExpanded, onToggle }) => {
  // Use state from Zustand store
  const {
    assets,
    trades,
    isLoadingAssets,
    isLoadingTrades,
    isConnected,
    ownedSymbols,
    activeTab,
    apiKey,
    apiSecret,
    isTestnet,
    setAssets,
    setTrades,
    setIsLoadingAssets,
    setIsLoadingTrades,
    setIsConnected,
    setOwnedSymbols,
    setActiveTab,
    setCredentials,
    clearState,
  } = useAssetStore();

  const { toast } = useToast();
  const summaryViewportRef = useRef<HTMLDivElement>(null);
  const historyViewportRef = useRef<HTMLDivElement>(null);
  const [isCredentialsVisible, setIsCredentialsVisible] = useState(true);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null); // Ref for the interval timer
  // State to track if the current fetch is manual (for toast control)
  const isManualFetchRef = useRef(false);

   // Initialize the form with values from the store
   const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: apiKey || "",
      apiSecret: apiSecret || "",
      isTestnet: isTestnet || false,
    },
  });

  // Watch form values to update the store dynamically
   const watchedApiKey = useWatch({ control: form.control, name: 'apiKey' });
   const watchedApiSecret = useWatch({ control: form.control, name: 'apiSecret' });
   const watchedIsTestnet = useWatch({ control: form.control, name: 'isTestnet' });

   // Update store when form values change
   useEffect(() => {
     // Only update credentials if they are valid according to schema (basic check)
     if (watchedApiKey && watchedApiKey.length > 1 && watchedApiSecret && watchedApiSecret.length > 1) {
       setCredentials(watchedApiKey, watchedApiSecret, watchedIsTestnet);
     }
   }, [watchedApiKey, watchedApiSecret, watchedIsTestnet, setCredentials]);

   // Reset form if store credentials change externally
   useEffect(() => {
     form.reset({
       apiKey: apiKey || "",
       apiSecret: apiSecret || "",
       isTestnet: isTestnet || false,
     });
   }, [apiKey, apiSecret, isTestnet, form]);


   // Moved handleFetchTrades definition *before* handleFetchAssets
   // Function to fetch trade history using the Server Action and update store
   const handleFetchTrades = useCallback(async (
        credentials: z.infer<typeof formSchema>,
        actuallyOwnedSymbols: string[],
        isManual: boolean = false // Flag to indicate manual refresh
    ) => {
        if (!isConnected || !credentials.apiKey || !credentials.apiSecret) {
             // Don't toast on automatic refresh if not connected
             if (isManual) {
                 console.warn("Cannot fetch trades: Not connected or credentials missing.");
                 toast({ title: "Cannot Fetch Trades", description: "Connect to Binance and ensure API credentials are provided.", variant: "destructive" });
             }
             setIsLoadingTrades(false); // Ensure loading state is reset
             setTrades([]); // Clear trades if not connected
             return;
        }

        const symbolsToUseForPairConstruction = TARGET_SYMBOLS;
        const potentialPairs = new Set<string>();
        if (symbolsToUseForPairConstruction.includes('BTC') && symbolsToUseForPairConstruction.includes('USDT')) {
            potentialPairs.add('BTCUSDT');
        }
        const tradingPairsToFetch = Array.from(potentialPairs);

        if (tradingPairsToFetch.length === 0) {
            if (isManual) {
                 console.log("Could not construct any relevant trading pairs from target symbols:", symbolsToUseForPairConstruction);
                 toast({ title: "No Relevant Pairs", description: "Could not determine relevant trading pairs for target symbols (BTC, USDT)." });
            }
             setIsLoadingTrades(false);
             setTrades([]);
            return;
        }

        if (!isManual && isLoadingTrades) {
            // console.log("[Auto-Refresh] Skipping trade fetch: Already loading.");
            return; // Avoid overlapping auto-refresh calls
        }

        console.log(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Attempting to fetch trade history for ${tradingPairsToFetch.length} pairs:`, tradingPairsToFetch.join(', '));
        setIsLoadingTrades(true);
        // Don't clear trades immediately on auto-refresh, only on manual or error

        try {
             const result = await fetchBinanceTradeHistory({
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                isTestnet: credentials.isTestnet,
                symbols: tradingPairsToFetch,
                limit: 100,
            });

            // console.log("fetchBinanceTradeHistory result:", result);

            if (result.success) {
                const targetSymbolsSet = new Set(TARGET_SYMBOLS);
                const filteredTrades = result.data.filter(trade => {
                    const baseAsset = trade.baseAsset || (trade.symbol === 'BTCUSDT' ? 'BTC' : '');
                    const quoteAsset = trade.quoteAsset || (trade.symbol === 'BTCUSDT' ? 'USDT' : '');
                    return targetSymbolsSet.has(baseAsset) || targetSymbolsSet.has(quoteAsset);
                });

                 console.log(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Fetched ${filteredTrades.length} relevant trades involving ${TARGET_SYMBOLS.join(' or ')}.`);
                 setTrades(filteredTrades);

                // Only show success toast on manual refresh
                if (isManual) {
                    if (filteredTrades.length === 0) {
                        toast({ title: "No Relevant Trades Found", description: `No recent trade history found involving ${TARGET_SYMBOLS.join(' or ')}.` });
                    } else {
                        toast({ title: "Trades Refreshed", description: `Fetched ${filteredTrades.length} relevant trades.` });
                    }
                 }
            } else {
                 setTrades([]); // Clear trades on failure
                console.error(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Error fetching trade history from action:`, result.error);
                
                // Phân tích lỗi để hiển thị thông báo hữu ích hơn
                let errorDescription = 'Lỗi không xác định.';
                let variant: "default" | "destructive" = "destructive";
                
                if (result.error) {
                  // Kiểm tra các lỗi phổ biến liên quan đến timestamp
                  if (result.error.includes('timestamp')) {
                    errorDescription = 'Lỗi đồng bộ thời gian với máy chủ Binance. Đang tự động khắc phục...';
                    variant = "default"; // Đây là lỗi tạm thời, đã xử lý tự động
                  } 
                  // Lỗi chứng thực
                  else if (result.error.includes('API-key') || result.error.includes('signature')) {
                    errorDescription = 'Lỗi xác thực API key/secret. Vui lòng kiểm tra lại thông tin đăng nhập.';
                  }
                  // Lỗi quyền truy cập
                  else if (result.error.includes('permission') || result.error.includes('authoriz')) {
                    errorDescription = 'Không có quyền truy cập. API key có thể thiếu quyền đọc lịch sử giao dịch.';
                  } 
                  // Lỗi giới hạn rate
                  else if (result.error.includes('rate limit') || result.error.includes('too many requests')) {
                    errorDescription = 'Vượt quá giới hạn yêu cầu. Vui lòng thử lại sau ít phút.';
                  }
                  // Lỗi khác có thể xác định
                  else {
                    errorDescription = `${result.error}. Kiểm tra thông tin đăng nhập và quyền truy cập.`;
                  }
                }
                
                // Hiển thị toast với thông tin lỗi chi tiết hơn
                toast({
                  title: "Lỗi khi tải lịch sử giao dịch",
                  description: errorDescription,
                  variant: variant,
                });
            }
        } catch (error) {
             setTrades([]);
             console.error(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Error calling fetchBinanceTradeHistory action:`, error);
             // Always show error toast
            toast({
                title: "Error",
                description: "An unexpected error occurred while fetching trade history.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingTrades(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isConnected, apiKey, apiSecret, isTestnet, toast, setTrades, setIsLoadingTrades, isLoadingTrades]); // Include state dependencies


  // Function to fetch assets using the Server Action and update store
  const handleFetchAssets = useCallback(async (values: z.infer<typeof formSchema>, isManual: boolean = false) => {
    console.log(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Attempting to fetch assets...`);
    isManualFetchRef.current = isManual; // Track if this fetch was manual

     if (!isManual && isLoadingAssets) {
        // console.log("[Auto-Refresh] Skipping asset fetch: Already loading.");
        return; // Avoid overlapping auto-refresh calls
     }

    setIsLoadingAssets(true);
    if (isManual) { // Only clear state completely on manual load
        setAssets([]);
        setTrades([]);
        setOwnedSymbols([]);
        setIsConnected(false);
    }
    // Always ensure store has latest credentials before fetch
    setCredentials(values.apiKey, values.apiSecret, values.isTestnet);

    try {
      const result = await fetchBinanceAssets({
        apiKey: values.apiKey,
        apiSecret: values.apiSecret,
        isTestnet: values.isTestnet,
      });

      // console.log("fetchBinanceAssets result:", result);

      if (result.success) {
        const targetSymbolsSet = new Set(TARGET_SYMBOLS);
        const filteredAssets = result.data.filter(asset => targetSymbolsSet.has(asset.symbol));

        setAssets(filteredAssets);
        setOwnedSymbols(result.ownedSymbols || []);
        setIsConnected(true); // Set connected state

        // Only show success toast on initial manual load that successfully connects
        if (isManual && !isConnected) { // Only if manual AND was not previously connected
          toast({
            title: "Connected",
            description: `Fetched assets. Displaying balances for ${TARGET_SYMBOLS.join(' and ')}.`,
          });
         } else if (isManual) {
             toast({
                 title: "Assets Refreshed",
                 description: `Updated balances for ${TARGET_SYMBOLS.join(' and ')}.`,
             });
         }


        // Automatically fetch trades IF on history tab and connection was successful
        // Trigger immediately after assets are successfully fetched
        if (activeTab === 'history') {
           console.log(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Assets loaded, triggering trade history fetch.`);
           // Pass isManual flag to trade fetch
           await handleFetchTrades(values, result.ownedSymbols || [], isManual);
        } else {
             // If not on history tab, ensure trade loading state is false
             setIsLoadingTrades(false);
        }

      } else {
        setOwnedSymbols([]);
        setIsConnected(false);
        console.error(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Error fetching assets from action:`, result.error);
        
        // Chỉ hiển thị toast thông báo lỗi khi là thao tác thủ công hoặc lần đầu kết nối thất bại
        if (isManual || !isConnected) {
          // Kiểm tra lỗi liên quan đến IP hoặc API key
          if (result.error?.includes('IP không được phép') || result.error?.includes('API key không đúng') || result.error?.includes('-2015')) {
            toast({
              title: "Lỗi quyền hạn API key hoặc IP",
              description: "API key hoặc IP không được phép. Vui lòng kiểm tra cài đặt IP trong tài khoản Binance của bạn.",
              variant: "destructive",
              action: (
                <a href="/ip-check" target="_blank" className="rounded bg-destructive-foreground px-3 py-2 text-xs font-medium text-destructive">
                  Kiểm tra IP
                </a>
              ),
            });
          } else {
            toast({
              title: "Lỗi kết nối đến Binance",
              description: result.error || "Không thể kết nối tới Binance API.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      // Clear state on error, keep credentials
      setAssets([]);
      setTrades([]);
      setOwnedSymbols([]);
      setIsConnected(false);
      
      // Lấy thông tin lỗi chi tiết
      let errorMessage = "Lỗi không xác định khi tải dữ liệu.";
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Error calling fetchBinanceAssets action:`, error);
      } else {
        console.error(`[${isManual ? 'Manual' : 'Auto'}-Fetch] Unknown error calling fetchBinanceAssets:`, error);
      }
      
      // Hiển thị thông báo lỗi
      toast({
        title: "Lỗi",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoadingAssets(false);
       // If not fetching trades (because not on history tab), ensure trade loading is off
      // The check inside the success block handles the case where activeTab is 'history'
       if (activeTab !== 'history') {
            setIsLoadingTrades(false);
       }
      isManualFetchRef.current = false; // Reset manual fetch flag
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
      setIsLoadingAssets,
      setAssets,
      setTrades,
      setOwnedSymbols,
      setIsConnected,
      setCredentials,
      toast,
      activeTab,
      handleFetchTrades,
      isConnected, // Add isConnected to re-evaluate toast logic
      isLoadingAssets // Add to prevent overlapping calls
      // Removed state values like apiKey, apiSecret, isTestnet - they come from 'values' arg or store
  ]);


   // Handle tab change - update store
   const onTabChange = (value: string) => {
        console.log("Tab changed to:", value);
        setActiveTab(value);
        // Fetch trades if switching to history tab, connected, and trades aren't loaded/loading
        if (value === 'history' && isConnected && trades.length === 0 && !isLoadingTrades) {
             if (apiKey && apiSecret) {
                 console.log("Switching to history tab, fetching initial trades.");
                handleFetchTrades({ apiKey, apiSecret, isTestnet }, ownedSymbols, true); // Treat as manual fetch on tab switch
            } else {
                 console.warn("Switching to history tab, but credentials missing.");
                 setTrades([]);
                 toast({ title: "Credentials Missing", description: "API credentials not found.", variant: "destructive" });
            }
        } else if (value === 'history' && !isConnected) {
             toast({ title: "Not Connected", description: "Load assets first to fetch trade history.", variant: "destructive" });
             setTrades([]);
        }
    };

   // --- Real-time Update Effect ---
   useEffect(() => {
       // Function to perform the refresh
       const refreshData = async () => {
           if (isConnected && apiKey && apiSecret) {
               console.log("[Auto-Refresh] Refreshing data...");
               // Fetch assets first (isManual = false)
               await handleFetchAssets({ apiKey, apiSecret, isTestnet }, false);
               // handleFetchAssets will trigger handleFetchTrades if on the history tab
           } else {
                // console.log("[Auto-Refresh] Skipping refresh: Not connected or credentials missing.");
           }
       };

       // Clear existing interval if credentials change or connection status changes
       if (intervalIdRef.current) {
           clearInterval(intervalIdRef.current);
           intervalIdRef.current = null;
           console.log("[Auto-Refresh] Interval cleared due to connection/credential change.");
       }

       // Set new interval only if connected and credentials exist
       if (isConnected && apiKey && apiSecret) {
           console.log(`[Auto-Refresh] Setting up refresh interval (${REFRESH_INTERVAL_MS}ms)...`);
           intervalIdRef.current = setInterval(refreshData, REFRESH_INTERVAL_MS);
       }

       // Cleanup function to clear interval on component unmount or before re-running effect
       return () => {
           if (intervalIdRef.current) {
               clearInterval(intervalIdRef.current);
               console.log("[Auto-Refresh] Interval cleared on cleanup.");
               intervalIdRef.current = null;
           }
       };
    // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [isConnected, apiKey, apiSecret, isTestnet, handleFetchAssets]); // Dependencies that should trigger interval reset/setup


   // Recalculate total portfolio value based on the FILTERED assets shown (BTC, USDT)
   const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);

   // Combined loading state for manual refresh button
   const isLoadingManual = isLoadingAssets || isLoadingTrades;


    // Helper function to render asset rows (uses the filtered 'assets' state: BTC, USDT)
    const renderAssetRows = () => {
        // Show skeletons only if explicitly loading assets AND there are no assets currently shown
        if (isLoadingAssets && assets.length === 0) {
            return Array.from({ length: TARGET_SYMBOLS.length }).map((_, index) => (
                <TableRow key={`asset-skeleton-${index}`} className="border-border">
                    <TableCell><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10 bg-muted" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto bg-muted" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                </TableRow>
            ));
        }
        // 'assets' state already contains only the filtered assets (BTC, USDT)
        if (assets.length > 0) { // Show assets even if isConnected is briefly false during refresh
            return assets.map((asset) => (
                <TableRow key={asset.symbol} className="border-border hover:bg-accent/50">
                    <TableCell className="font-medium text-foreground text-xs py-1.5">{asset.asset || asset.symbol}</TableCell>
                    <TableCell className="text-foreground text-xs py-1.5">{asset.symbol}</TableCell>
                    <TableCell className="text-right text-foreground text-xs py-1.5">{asset.quantity.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell className="text-right text-foreground text-xs py-1.5">${asset.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
            ));
        }
        if (isConnected && assets.length === 0 && !isLoadingAssets) {
             return (
                <TableRow className="border-border">
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                        No balance found for {TARGET_SYMBOLS.join(' or ')}.
                    </TableCell>
                </TableRow>
            );
        }
         // Default case: Not connected or explicit failure message handled elsewhere
         return (
            <TableRow className="border-border">
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                     {!apiKey || !apiSecret ? "Enter API keys to load assets." : (isLoadingAssets ? "Loading..." : "Click 'Load Assets' or check connection.")}
                 </TableCell>
             </TableRow>
         );
    };

    // Helper function to render trade rows (uses the filtered 'trades' state involving BTC/USDT)
    const renderTradeRows = () => {
        // Show skeletons only if explicitly loading trades AND there are no trades currently shown
        if (isLoadingTrades && trades.length === 0) {
            return Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={`trade-skeleton-${index}`} className="border-border">
                    <TableCell><Skeleton className="h-4 w-24 bg-muted" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8 bg-muted" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto bg-muted" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                </TableRow>
            ));
        }
        // 'trades' state already contains filtered trades
        if (trades.length > 0) { // Show trades even if loading in background
            return trades.map((trade) => (
                <TableRow key={trade.id} className="border-border hover:bg-accent/50">
                    <TableCell className="text-foreground text-xs whitespace-nowrap py-1.5">{format(new Date(trade.time), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                    <TableCell className="text-foreground text-xs whitespace-nowrap py-1.5">{trade.symbol}</TableCell>
                    <TableCell className={cn("text-xs whitespace-nowrap py-1.5", trade.isBuyer ? "text-green-500" : "text-red-500")}>
                        {trade.isBuyer ? 'BUY' : 'SELL'}
                    </TableCell>
                    <TableCell className="text-right text-foreground text-xs whitespace-nowrap py-1.5">{parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell className="text-right text-foreground text-xs whitespace-nowrap py-1.5">{parseFloat(trade.qty).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell className="text-right text-foreground text-xs whitespace-nowrap py-1.5">{parseFloat(trade.quoteQty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
            ));
        }
         // Explicitly handle the "no relevant trades" case after loading completes
         if (isConnected && trades.length === 0 && !isLoadingTrades) {
             return (
                <TableRow className="border-border">
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                        No recent trade history found involving {TARGET_SYMBOLS.join(' or ')}.
                    </TableCell>
                </TableRow>
             );
         }
        // Default case if not connected or loading hasn't started/finished
        return (
             <TableRow className="border-border">
                 <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                     {!isConnected ? "Load Assets first." : (isLoadingTrades ? "Loading..." : "No history or error.")}
                 </TableCell>
             </TableRow>
        );
    };


  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <CardHeader className="p-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-foreground">Binance Account</CardTitle>
        <div className="flex items-center gap-1">
             {/* Manual Refresh Button - Added Here */}
             <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                    if (apiKey && apiSecret) {
                        handleFetchAssets({ apiKey, apiSecret, isTestnet }, true); // Force manual fetch
                    } else {
                        toast({ title: "Credentials Missing", description: "Cannot refresh without API credentials.", variant: "destructive" });
                    }
                }}
                disabled={isLoadingManual || !apiKey || !apiSecret} // Disable if loading or no keys
                className={cn("h-6 w-6 text-foreground flex-shrink-0", !isExpanded && "hidden")} // Hide when collapsed
                title="Refresh Assets & Trades"
             >
                 <RotateCw className={cn("h-4 w-4", isLoadingManual && "animate-spin")} />
                 <span className="sr-only">Refresh Data</span>
             </Button>

            {/* Existing Expand/Collapse Toggle */}
             <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-foreground">
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} Binance Account</span>
            </Button>
         </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="flex-1 p-3 overflow-hidden flex flex-col gap-4">
           <div className="space-y-3 border-b border-border pb-4 mb-4">
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setIsCredentialsVisible(!isCredentialsVisible)}
                >
                    <Label className="text-sm font-medium text-foreground">API Credentials {isConnected ? <span className="text-green-500 text-xs">(Connected)</span> : <span className="text-red-500 text-xs">(Disconnected)</span>}</Label>
                    <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground">
                        {isCredentialsVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="sr-only">{isCredentialsVisible ? 'Hide' : 'Show'} Credentials</span>
                    </Button>
                </div>

                {isCredentialsVisible && (
                    <Form {...form}>
                         {/* Pass true for isManual flag */}
                        <form onSubmit={form.handleSubmit((values) => handleFetchAssets(values, true))} className="space-y-3 pt-2">
                            <FormField
                                control={form.control}
                                name="apiKey"
                                render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-xs text-foreground">API Key</FormLabel>
                                    <FormControl>
                                    <Input
                                    placeholder="Binance API Key"
                                    {...field}
                                    type="password"
                                    className="h-8 text-xs bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                                    disabled={isLoadingAssets}
                                    />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="apiSecret"
                                render={({ field }) => (
                                <FormItem className="space-y-1">
                                    <FormLabel className="text-xs text-foreground">API Secret</FormLabel>
                                    <FormControl>
                                    <Input
                                        placeholder="Binance API Secret"
                                        {...field}
                                        type="password"
                                        className="h-8 text-xs bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                                        disabled={isLoadingAssets}
                                    />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                                )}
                            />
                            <div className="flex items-center justify-between">
                                <FormField
                                control={form.control}
                                name="isTestnet"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                    <FormControl>
                                        <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="testnet"
                                        disabled={isLoadingAssets}
                                        className="border-primary data-[state=checked]:bg-primary-gradient data-[state=checked]:text-primary-foreground"
                                        />
                                    </FormControl>
                                    <FormLabel htmlFor="testnet" className="text-xs font-normal text-foreground">
                                        Use Testnet
                                    </FormLabel>
                                    </FormItem>
                                )}
                                />
                                <Button type="submit" size="sm" disabled={isLoadingAssets} className="text-xs h-8">
                                {isLoadingAssets ? "Loading..." : "Load Assets"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
           </div>


          <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-2">
                <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="summary" className="text-xs h-full">Summary</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs h-full">Trade History</TabsTrigger>
                </TabsList>
                {/* Refresh button is moved to CardHeader */}
            </div>


            {/* Asset Summary Tab Content */}
            <TabsContent value="summary" className="flex-1 overflow-hidden mt-0">
              <ScrollArea className="h-full" viewportRef={summaryViewportRef} orientation="both">
                <div className="min-w-max">
                    <Table>
                    <TableHeader>
                        <TableRow className="border-border">
                        <TableHead className="w-[100px] text-muted-foreground text-xs">Asset</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Symbol</TableHead>
                        <TableHead className="text-right text-muted-foreground text-xs">Quantity</TableHead>
                        <TableHead className="text-right text-muted-foreground text-xs">Value (USD)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderAssetRows()}
                    </TableBody>
                    {/* Total Value Caption */}
                    <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs text-left">
                        {isLoadingAssets && assets.length > 0 && (
                             <span className="flex items-center gap-1 animate-pulse">
                                <RotateCw className="h-3 w-3 animate-spin" /> Updating...
                            </span>
                        )}
                        {!isLoadingAssets && isConnected && assets.length > 0 && (
                            `Total Value (${TARGET_SYMBOLS.join(' & ')}): $${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        )}
                         {!isLoadingAssets && isConnected && assets.length === 0 && (
                            `No balance found for ${TARGET_SYMBOLS.join(' or ')}.`
                         )}
                         {!isConnected && !isLoadingAssets && (
                            "Enter API keys and click 'Load Assets'."
                         )}
                         {/* Add a small note about auto-refresh */}
                         <span className="text-xs opacity-70 float-right">
                             {isConnected ? `(Auto-refreshes every ${REFRESH_INTERVAL_MS / 1000}s)` : ''}
                         </span>
                    </TableCaption>
                    </Table>
                 </div>
              </ScrollArea>
            </TabsContent>

            {/* Trade History Tab Content */}
            <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
               <ScrollArea className="h-full" viewportRef={historyViewportRef} orientation="both">
                 <div className="min-w-max">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-border">
                                <TableHead className="text-muted-foreground text-xs whitespace-nowrap">Time</TableHead>
                                <TableHead className="text-muted-foreground text-xs whitespace-nowrap">Pair</TableHead>
                                <TableHead className="text-muted-foreground text-xs whitespace-nowrap">Side</TableHead>
                                <TableHead className="text-right text-muted-foreground text-xs whitespace-nowrap">Price</TableHead>
                                <TableHead className="text-right text-muted-foreground text-xs whitespace-nowrap">Amount</TableHead>
                                <TableHead className="text-right text-muted-foreground text-xs whitespace-nowrap">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {renderTradeRows()}
                        </TableBody>
                        {/* Trade History Caption */}
                        <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs text-left">
                            {isLoadingTrades && trades.length > 0 && (
                                <span className="flex items-center gap-1 animate-pulse">
                                     <RotateCw className="h-3 w-3 animate-spin" /> Updating...
                                </span>
                            )}
                            {!isLoadingTrades && isConnected && trades.length > 0 && (
                                `Showing last ${trades.length} relevant trades involving ${TARGET_SYMBOLS.join(' or ')}.`
                            )}
                            {!isLoadingTrades && isConnected && trades.length === 0 && (
                                `No recent relevant trades found for ${TARGET_SYMBOLS.join(' or ')}.`
                            )}
                            {!isConnected && !isLoadingTrades && (
                                "Load Assets first to view trade history."
                            )}
                            <span className="text-xs opacity-70 float-right">
                                {isConnected ? `(Auto-refreshes every ${REFRESH_INTERVAL_MS / 1000}s)` : ''}
                             </span>
                        </TableCaption>
                    </Table>
                  </div>
               </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </div>
  );
};

    