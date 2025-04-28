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

export const AssetSummary: FC<AssetSummaryProps> = ({ isExpanded, onToggle }) => {
  // Use state from Zustand store
  const {
    assets,
    trades,
    isLoadingAssets,
    isLoadingTrades,
    isConnected,
    ownedSymbols, // Keep track of all owned symbols internally for potential full balance checks
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
    clearState, // Function to clear store state
  } = useAssetStore();

  const { toast } = useToast();
  const summaryViewportRef = useRef<HTMLDivElement>(null); // Ref for summary scroll area
  const historyViewportRef = useRef<HTMLDivElement>(null); // Ref for history scroll area

   // Initialize the form with values from the store
   const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: apiKey || "",
      apiSecret: apiSecret || "",
      isTestnet: isTestnet || false,
    },
  });

  // Watch form values to update the store dynamically (optional, but useful for persistence)
   const watchedApiKey = useWatch({ control: form.control, name: 'apiKey' });
   const watchedApiSecret = useWatch({ control: form.control, name: 'apiSecret' });
   const watchedIsTestnet = useWatch({ control: form.control, name: 'isTestnet' });

   // Update store when form values change (debounced or on blur might be better in real app)
   useEffect(() => {
     setCredentials(watchedApiKey, watchedApiSecret, watchedIsTestnet);
   }, [watchedApiKey, watchedApiSecret, watchedIsTestnet, setCredentials]);

   // Reset form if store credentials change externally (e.g., cleared)
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
        // `actuallyOwnedSymbols` is not currently used for pair construction, but kept for logging/potential future use
        actuallyOwnedSymbols: string[] // Symbols user actually owns with balance
    ) => {
        if (!credentials.apiKey || !credentials.apiSecret) {
             console.warn("Cannot fetch trades: Credentials missing.");
             toast({ title: "Credentials Missing", description: "API credentials not provided.", variant: "destructive" });
             return;
        }

        // --- Use ONLY the TARGET_SYMBOLS for pair construction ---
        const symbolsToUseForPairConstruction = TARGET_SYMBOLS;
        console.log("Symbols being used for trade history pair construction:", symbolsToUseForPairConstruction);

        // --- Construct potential trading pairs based ONLY on TARGET_SYMBOLS ---
        // Primarily focus on BTC/USDT pair, but include potential reverse if needed or other pairs involving ONLY BTC/USDT
        const potentialPairs = new Set<string>();

        if (symbolsToUseForPairConstruction.includes('BTC') && symbolsToUseForPairConstruction.includes('USDT')) {
            potentialPairs.add('BTCUSDT');
            // Add other direct pairs involving only these two if they exist, e.g., USDTBTC (less common)
            // potentialPairs.add('USDTBTC'); // Uncomment if needed, Binance API might reject non-existent pairs
        }

        // Add individual pairs against common stablecoins if needed for completeness, though filtering later is primary
        // Example: If only BTC was target, you might add BTCUSDC, BTCTUSD etc.
        // But since we target BTC & USDT, BTCUSDT is the main one.

        const tradingPairsToFetch = Array.from(potentialPairs);

        if (tradingPairsToFetch.length === 0) {
            console.log("Could not construct any relevant trading pairs from target symbols:", symbolsToUseForPairConstruction);
            setTrades([]);
            toast({ title: "No Relevant Pairs", description: "Could not determine relevant trading pairs for target symbols (BTC, USDT)." });
            return;
        }
        // --- End constructing pairs ---


        console.log(`Attempting to fetch trade history for ${tradingPairsToFetch.length} potential pairs (TARGET SYMBOLS ONLY):`, tradingPairsToFetch.join(', ')); // Log pairs
        setIsLoadingTrades(true);
        setTrades([]); // Clear previous trades in store

        try {
             // Call the action with the CONSTRUCTED TRADING PAIRS
             const result = await fetchBinanceTradeHistory({
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                isTestnet: credentials.isTestnet,
                symbols: tradingPairsToFetch, // Pass the generated trading pairs (likely just ['BTCUSDT'])
                limit: 100, // Fetch a reasonable number per pair
            });

            console.log("fetchBinanceTradeHistory result:", result);

            if (result.success) {
                // Filter trades to only include those involving the TARGET_SYMBOLS (BTC or USDT as base or quote)
                // This is an extra layer of safety, main pair should be BTCUSDT
                const targetSymbolsSet = new Set(TARGET_SYMBOLS);
                const filteredTrades = result.data.filter(trade => {
                    // Determine base and quote - use the properties from the trade object if available
                    const base = trade.baseAsset || ""; // Use provided baseAsset
                    const quote = trade.quoteAsset || ""; // Use provided quoteAsset

                    // If base/quote not provided, attempt simple parse (fallback)
                    let baseAsset = base;
                    let quoteAsset = quote;
                    if (!baseAsset || !quoteAsset) {
                        // console.warn(`Trade ${trade.id} for ${trade.symbol} missing base/quote asset. Attempting fallback parse.`);
                        if (trade.symbol === 'BTCUSDT') {
                            baseAsset = 'BTC';
                            quoteAsset = 'USDT';
                        } else {
                             // Add more robust parsing if other pairs were included in fetch
                             const knownQuoteAssets = ['USDT']; // Focus on USDT as quote for simplicity now
                             for (const q of knownQuoteAssets) {
                                if (trade.symbol.endsWith(q) && trade.symbol.length > q.length) {
                                    baseAsset = trade.symbol.substring(0, trade.symbol.length - q.length);
                                    quoteAsset = q;
                                    break;
                                }
                             }
                             if(!baseAsset) baseAsset = trade.symbol; // Fallback if still nothing
                        }
                    }


                    // Include the trade if EITHER the base OR quote asset is in our target list
                    return targetSymbolsSet.has(baseAsset) || targetSymbolsSet.has(quoteAsset);
                });


                 console.log(`Filtered trades from ${result.data.length} to ${filteredTrades.length} based on TARGET SYMBOLS: ${TARGET_SYMBOLS.join(', ')}`);
                 setTrades(filteredTrades); // Update trades in store with filtered list

                if (filteredTrades.length === 0) {
                     toast({ title: "No Relevant Trades Found", description: `No recent trade history found involving ${TARGET_SYMBOLS.join(' or ')}.` });
                } else {
                     toast({ title: "Success", description: `Fetched ${filteredTrades.length} relevant trades for ${TARGET_SYMBOLS.join(' and ')}.` });
                }
            } else {
                 setTrades([]); // Clear trades in store on failure
                console.error("Error fetching trade history from action:", result.error);
                toast({
                title: "Error Fetching Trades",
                description: `Failed to fetch trade history: ${result.error}.`, // Simplified error
                variant: "destructive",
                });
            }
        } catch (error) {
             setTrades([]); // Clear trades in store on unexpected error
             console.error("Error calling fetchBinanceTradeHistory action:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred while fetching trade history.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingTrades(false);
        }
    }, [isConnected, setIsLoadingTrades, setTrades, toast, setCredentials]); // Added setCredentials dependency


  // Function to fetch assets using the Server Action and update store
  const handleFetchAssets = useCallback(async (values: z.infer<typeof formSchema>) => {
    console.log("Attempting to fetch assets with credentials:", { apiKey: '...', apiSecret: '...', isTestnet: values.isTestnet });
    setIsLoadingAssets(true);
    // Clear relevant parts of the store before fetching
    setAssets([]);
    setTrades([]); // Clear trades when fetching new assets
    setOwnedSymbols([]); // Clear all owned symbols first
    setIsConnected(false);
    setCredentials(values.apiKey, values.apiSecret, values.isTestnet); // Ensure store has latest credentials

    try {
      const result = await fetchBinanceAssets({
        apiKey: values.apiKey,
        apiSecret: values.apiSecret,
        isTestnet: values.isTestnet,
      });

      console.log("fetchBinanceAssets result:", result);

      if (result.success) {
        // Filter the fetched assets to only include TARGET_SYMBOLS before setting state
        const targetSymbolsSet = new Set(TARGET_SYMBOLS);
        const filteredAssets = result.data.filter(asset => targetSymbolsSet.has(asset.symbol));

        setAssets(filteredAssets); // Set the filtered assets (BTC, USDT)
        // Store all originally owned symbols if needed elsewhere, or filter this too
        setOwnedSymbols(result.ownedSymbols || []); // Keep the original owned symbols list from the API response for context
        setIsConnected(true);
        toast({
          title: "Success",
          // Updated message
          description: `Fetched assets. Displaying balances for ${TARGET_SYMBOLS.join(' and ')}.`,
        });

        // Automatically fetch trades IF on history tab and connection was successful
        if (activeTab === 'history') {
           console.log("Assets loaded, triggering trade history fetch for TARGET SYMBOLS.");
           // Pass credentials and the *original* owned symbols (or just an empty array if not needed)
           handleFetchTrades(values, result.ownedSymbols || []);
        }
      } else {
        // Clear assets, trades, owned symbols, but keep credentials
        setAssets([]);
        setTrades([]);
        setOwnedSymbols([]);
        setIsConnected(false);
        // clearState(); // Avoid clearing credentials on error
        toast({
          title: "Error Fetching Assets",
          description: `Failed to fetch assets: ${result.error}. Check credentials and permissions.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Clear assets, trades, owned symbols, but keep credentials
      setAssets([]);
      setTrades([]);
      setOwnedSymbols([]);
      setIsConnected(false);
      // clearState(); // Avoid clearing credentials on error
      console.error("Error calling fetchBinanceAssets action:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAssets(false);
    }
    // Add handleFetchTrades to dependency array
  }, [setIsLoadingAssets, setAssets, setTrades, setOwnedSymbols, setIsConnected, setCredentials, toast, activeTab, handleFetchTrades]);

   // Handle tab change - update store
   const onTabChange = (value: string) => {
        console.log("Tab changed to:", value);
        setActiveTab(value);
        // Fetch trades if switching to history tab and trades are not already loaded/loading AND we are connected
        if (value === 'history' && trades.length === 0 && !isLoadingTrades && isConnected) {
             // Use credentials from the store
             if (apiKey && apiSecret) {
                 console.log("Switching to history tab, fetching trades for TARGET SYMBOLS.");
                 // Pass original ownedSymbols list (might not be needed by handleFetchTrades anymore)
                handleFetchTrades({ apiKey, apiSecret, isTestnet }, ownedSymbols);
            } else {
                 console.warn("Switching to history tab, but credentials missing.");
                 setTrades([]); // Clear trades if no credentials
                 toast({ title: "Credentials Missing", description: "API credentials not found. Cannot fetch history.", variant: "destructive" });
            }
        } else if (value === 'history' && !isConnected) {
             toast({ title: "Not Connected", description: "Load assets first to fetch trade history.", variant: "destructive" });
             setTrades([]); // Clear trades if not connected
        }
    };

   // Recalculate total portfolio value based on the FILTERED assets shown (BTC, USDT)
   const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);

   const isLoading = isLoadingAssets || isLoadingTrades; // Combined loading state


    // Helper function to render asset rows (uses the filtered 'assets' state: BTC, USDT)
    const renderAssetRows = () => {
        if (isLoadingAssets) {
            // Show skeletons based on TARGET_SYMBOLS count for consistency
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
        if (isConnected && assets.length > 0) {
            return assets.map((asset) => (
                <TableRow key={asset.symbol} className="border-border">
                    <TableCell className="font-medium text-foreground text-xs">{asset.asset || asset.symbol}</TableCell>
                    <TableCell className="text-foreground text-xs">{asset.symbol}</TableCell>
                    <TableCell className="text-right text-foreground text-xs">{asset.quantity.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell className="text-right text-foreground text-xs">${asset.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                     {isLoadingAssets ? "Loading..." : "Enter API keys to load assets."}
                 </TableCell>
             </TableRow>
         );
    };

    // Helper function to render trade rows (uses the filtered 'trades' state involving BTC/USDT)
    const renderTradeRows = () => {
        if (isLoadingTrades) {
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
        if (trades.length > 0 && !isLoadingTrades) {
            return trades.map((trade) => (
                <TableRow key={trade.id} className="border-border">
                    <TableCell className="text-foreground text-xs whitespace-nowrap">{format(new Date(trade.time), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                    <TableCell className="text-foreground text-xs whitespace-nowrap">{trade.symbol}</TableCell>
                    <TableCell className={cn("text-xs whitespace-nowrap", trade.isBuyer ? "text-green-500" : "text-red-500")}>
                        {trade.isBuyer ? 'BUY' : 'SELL'}
                    </TableCell>
                    <TableCell className="text-right text-foreground text-xs whitespace-nowrap">{parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell className="text-right text-foreground text-xs whitespace-nowrap">{parseFloat(trade.qty).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell className="text-right text-foreground text-xs whitespace-nowrap">{parseFloat(trade.quoteQty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
            ));
        }
         // Explicitly handle the "no relevant trades" case after loading completes
         if (trades.length === 0 && !isLoadingTrades && isConnected) {
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
                     {apiKey && apiSecret ? (isLoadingTrades ? "Loading..." : "Loading trade history or switch to this tab...") : "Enter API Keys and Load Assets first."}
                 </TableCell>
             </TableRow>
        );
    };


  return (
    // Ensure the container takes full height of its parent div and uses flex column layout
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header remains, adjust padding and border */}
      <CardHeader className="p-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-foreground">Binance Account</CardTitle>
         <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-foreground"> {/* Ensure button text color matches theme */}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} Binance Account</span>
        </Button>
      </CardHeader>

     {/* Conditionally render content based on isExpanded */}
      {isExpanded && (
        // Content container takes remaining space, adjust padding
        <CardContent className="flex-1 p-3 overflow-hidden flex flex-col gap-4">
          {/* API Key Form */}
          <Form {...form}>
            {/* Use store credentials for the handler */}
             <form onSubmit={form.handleSubmit(handleFetchAssets)} className="space-y-3">
               {/* Inputs remain the same */}
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
                      type="password" // Hide sensitive input
                      className="h-8 text-xs bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring" // Theme colors
                      disabled={isLoadingAssets} // Only disable during asset load
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
                        type="password" // Hide sensitive input
                        className="h-8 text-xs bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring" // Theme colors
                         disabled={isLoadingAssets} // Only disable during asset load
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
                           disabled={isLoadingAssets} // Only disable during asset load
                          className="border-primary data-[state=checked]:bg-primary-gradient data-[state=checked]:text-primary-foreground" // Theme colors
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

          {/* Tabs for Summary and History */}
           {/* Use store state for active tab and handler */}
          <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col overflow-hidden pt-3 border-t border-border">
            <div className="flex justify-between items-center mb-2">
                <TabsList className="grid w-full grid-cols-2 h-9">
                    {/* Updated Tab Titles */}
                    <TabsTrigger value="summary" className="text-xs h-full">Summary</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs h-full">Trade History</TabsTrigger>
                </TabsList>
                 {/* Refresh button for trades, only shown on history tab */}
                {activeTab === 'history' && ( // Show refresh if on history tab
                    <Button
                        variant="ghost"
                        size="icon"
                         // Use credentials from the store for refresh
                        onClick={() => {
                             // Make sure credentials exist before refreshing
                            if(apiKey && apiSecret && isConnected) { // Only refresh if connected
                                 console.log("Manual refresh clicked for trade history (TARGET SYMBOLS).");
                                 // Pass original ownedSymbols list (might not be needed by handleFetchTrades anymore)
                                handleFetchTrades({ apiKey, apiSecret, isTestnet }, ownedSymbols);
                            }
                             else if (!isConnected) {
                                toast({ title: "Not Connected", description: "Load assets first to refresh trade history.", variant: "destructive" });
                             }
                             else {
                                 console.warn("Cannot refresh trades: Credentials missing.");
                                 toast({ title: "Credentials Missing", description: "Cannot refresh trades without API credentials.", variant: "destructive" });
                            }
                        }}
                         // Disable if loading trades OR if credentials are missing OR not connected
                         disabled={isLoadingTrades || !apiKey || !apiSecret || !isConnected}
                        className="ml-2 h-8 w-8 flex-shrink-0"
                        title="Refresh Trade History"
                    >
                        <RotateCw className={`h-4 w-4 ${isLoadingTrades ? 'animate-spin' : ''}`} />
                        <span className="sr-only">Refresh Trades</span>
                    </Button>
                )}
            </div>


            {/* Asset Summary Tab Content */}
            <TabsContent value="summary" className="flex-1 overflow-hidden mt-0">
              {/* Pass viewportRef to ScrollArea */}
              <ScrollArea className="h-full" viewportRef={summaryViewportRef} orientation="both"> {/* Enable both orientations */}
                {/* Wrap table in a div to allow horizontal scrolling */}
                <div className="min-w-max"> {/* Ensure content doesn't shrink */}
                    {/* Use store state for rendering */}
                    <Table>
                    <TableHeader>
                        <TableRow className="border-border">
                        {/* Update headers slightly if needed */}
                        <TableHead className="w-[100px] text-muted-foreground text-xs">Asset</TableHead>
                        <TableHead className="text-muted-foreground text-xs">Symbol</TableHead>
                        <TableHead className="text-right text-muted-foreground text-xs">Quantity</TableHead>
                        <TableHead className="text-right text-muted-foreground text-xs">Value (USD)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderAssetRows()}
                    </TableBody>
                    {/* Use store state for condition (based on filtered assets: BTC, USDT) */}
                    {isConnected && assets.length > 0 && !isLoadingAssets && (
                        <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                            Total Value ({TARGET_SYMBOLS.join(' & ')}): ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <br />
                            <span className="text-xs opacity-70">Value calculated based on current market prices.</span>
                        </TableCaption>
                    )}
                    {isConnected && assets.length === 0 && !isLoadingAssets && (
                        <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                            No balance found for {TARGET_SYMBOLS.join(' or ')}. Check Binance account or API key permissions.
                        </TableCaption>
                    )}
                        {!isConnected && !isLoadingAssets && (
                            <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                                Enter API keys and click "Load Assets".
                            </TableCaption>
                        )}
                    </Table>
                 </div>
              </ScrollArea>
            </TabsContent>

            {/* Trade History Tab Content */}
            <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
              {/* Pass viewportRef to ScrollArea */}
               <ScrollArea className="h-full" viewportRef={historyViewportRef} orientation="both"> {/* Enable both orientations */}
                 {/* Wrap table in a div to allow horizontal scrolling */}
                 <div className="min-w-max"> {/* Ensure content doesn't shrink */}
                    {/* Use store state for rendering (uses filtered trades) */}
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
                        {/* Use store state for condition */}
                        {isConnected && trades.length > 0 && !isLoadingTrades && (
                            <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                                Showing last {trades.length} relevant trades involving {TARGET_SYMBOLS.join(' or ')}. Refresh for latest.
                            </TableCaption>
                        )}
                        {isConnected && trades.length === 0 && !isLoadingTrades && apiKey && apiSecret && ( // Only show 'No trades found' if tried and finished loading
                            <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                                No recent relevant trades found involving {TARGET_SYMBOLS.join(' or ')}.
                            </TableCaption>
                        )}
                        {!isConnected && !isLoadingTrades && ( // Show prompt if not connected
                            <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                                Load Assets first to view trade history.
                            </TableCaption>
                        )}
                        {!apiKey || !apiSecret && !isLoadingTrades && ( // Show prompt if no credentials
                            <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                                Enter API Keys to view trade history.
                            </TableCaption>
                        )}
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
