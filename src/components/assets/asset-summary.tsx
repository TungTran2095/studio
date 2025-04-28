// src/components/assets/asset-summary.tsx
"use client";

import type { FC } from "react";
import { useState, useEffect, useCallback } from "react"; // Added useCallback
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

export const AssetSummary: FC<AssetSummaryProps> = ({ isExpanded, onToggle }) => {
  // Use state from Zustand store
  const {
    assets,
    trades,
    isLoadingAssets,
    isLoadingTrades,
    isConnected,
    ownedSymbols, // Asset symbols (e.g., BTC, ETH)
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


  // Function to fetch assets using the Server Action and update store
  const handleFetchAssets = useCallback(async (values: z.infer<typeof formSchema>) => {
    console.log("Attempting to fetch assets with credentials:", { apiKey: '...', apiSecret: '...', isTestnet: values.isTestnet });
    setIsLoadingAssets(true);
    // Clear relevant parts of the store before fetching
    setAssets([]);
    setTrades([]); // Clear trades when fetching new assets
    setOwnedSymbols([]);
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
        setAssets(result.data);
        setOwnedSymbols(result.ownedSymbols || []);
        setIsConnected(true);
        toast({
          title: "Success",
          description: `Fetched ${result.data.length} assets from Binance.`,
        });
         // Automatically fetch trades IF on history tab and assets were loaded successfully
         // Ensure ownedSymbols from the result are used immediately
        if (activeTab === "history" && result.ownedSymbols && result.ownedSymbols.length > 0) {
           console.log("Assets loaded, triggering trade history fetch for symbols:", result.ownedSymbols);
           handleFetchTrades(values, result.ownedSymbols); // Pass credentials and fetched symbols
        } else if (activeTab === "history") {
            console.log("Assets loaded, but no symbols with balance found for trade history.");
             setTrades([]); // Ensure trades are cleared if no symbols
        }
      } else {
        // Clear state on failure
        clearState(); // Consider if clearing credentials here is desired UX
        toast({
          title: "Error Fetching Assets",
          description: `Failed to fetch assets: ${result.error}. Check credentials and permissions.`,
          variant: "destructive",
        });
      }
    } catch (error) {
       clearState(); // Clear state on unexpected error
      console.error("Error calling fetchBinanceAssets action:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAssets(false);
    }
  }, [setIsLoadingAssets, setAssets, setTrades, setOwnedSymbols, setIsConnected, setCredentials, clearState, toast, activeTab, /* Removed handleFetchTrades from deps */]); // Avoid handleFetchTrades in deps here


   // Function to fetch trade history using the Server Action and update store
   // Takes credentials and the list of ASSET symbols (e.g., ['BTC', 'ETH'])
   const handleFetchTrades = useCallback(async (
        credentials: z.infer<typeof formSchema>,
        ownedAssetSymbols: string[] // Expecting asset symbols like BTC, ETH
    ) => {
        if (!isConnected) {
             console.warn("Cannot fetch trades: Not connected (assets not loaded).");
             toast({ title: "Not Connected", description: "Please load assets first.", variant: "destructive" });
             return;
        }
        if (!ownedAssetSymbols || ownedAssetSymbols.length === 0) {
            console.log("No owned symbols provided to fetch trade history for.");
             setTrades([]); // Clear trades in store
             toast({ title: "No Symbols", description: "No assets with balance found to check trade history." });
            return;
        }

        // --- Construct potential trading pairs ---
        // Common quote assets (adjust as needed)
        const quoteAssets = ['USDT', 'BTC', 'ETH', 'BNB', 'USDC', 'TUSD', 'FDUSD'];
        const potentialPairs = new Set<string>();

        ownedAssetSymbols.forEach(asset => {
            quoteAssets.forEach(quote => {
                if (asset !== quote) {
                    // Add ASSET/QUOTE pair
                    potentialPairs.add(`${asset}${quote}`);
                    // Add QUOTE/ASSET pair (less common for history but possible)
                    // potentialPairs.add(`${quote}${asset}`);
                }
            });
        });

         // If user owns a quote asset, add pairs against other quote assets
        ownedAssetSymbols.forEach(asset => {
            if (quoteAssets.includes(asset)) {
                quoteAssets.forEach(quote => {
                     if (asset !== quote) {
                         potentialPairs.add(`${asset}${quote}`); // e.g., BTCUSDT if owning BTC
                         potentialPairs.add(`${quote}${asset}`); // e.g., USDTBTC if owning USDT
                     }
                });
            }
        });


        // Filter out duplicates (already handled by Set)
        const tradingPairsToFetch = Array.from(potentialPairs);

        if (tradingPairsToFetch.length === 0) {
            console.log("Could not construct any potential trading pairs from owned symbols:", ownedAssetSymbols);
            setTrades([]);
            toast({ title: "No Pairs", description: "Could not determine relevant trading pairs." });
            return;
        }
        // --- End constructing pairs ---


        console.log(`Attempting to fetch trade history for ${tradingPairsToFetch.length} potential pairs:`, tradingPairsToFetch.slice(0, 10).join(', ') + (tradingPairsToFetch.length > 10 ? '...' : '')); // Log first few pairs
        setIsLoadingTrades(true);
        setTrades([]); // Clear previous trades in store

        try {
             // Call the action with the CONSTRUCTED TRADING PAIRS
             const result = await fetchBinanceTradeHistory({
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                isTestnet: credentials.isTestnet,
                symbols: tradingPairsToFetch, // Pass the generated trading pairs
                limit: 50, // Adjust limit as needed
            });

            console.log("fetchBinanceTradeHistory result:", result);

            if (result.success) {
                setTrades(result.data); // Update trades in store
                if (result.data.length === 0) {
                     toast({ title: "No Trades Found", description: "No recent trade history found for the checked pairs." });
                } else {
                     toast({ title: "Success", description: `Fetched ${result.data.length} trades.` });
                }
            } else {
                 setTrades([]); // Clear trades in store on failure
                console.error("Error fetching trade history from action:", result.error);
                toast({
                title: "Error Fetching Trades",
                description: `Failed to fetch trade history: ${result.error}. Some symbols might be invalid.`,
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
    }, [isConnected, setIsLoadingTrades, setTrades, toast /* No other store deps needed here */]);

   // Handle tab change - update store
   const onTabChange = (value: string) => {
        console.log("Tab changed to:", value);
        setActiveTab(value);
        // Fetch trades if switching to history tab, assets are loaded, and trades are not already loaded/loading
        if (value === 'history' && isConnected && trades.length === 0 && !isLoadingTrades) {
             // Use credentials and OWNED SYMBOLS from the store
             if (apiKey && apiSecret && ownedSymbols && ownedSymbols.length > 0) {
                 console.log("Switching to history tab, fetching trades for symbols:", ownedSymbols);
                handleFetchTrades({ apiKey, apiSecret, isTestnet }, ownedSymbols);
            } else if (apiKey && apiSecret) {
                 console.log("Switching to history tab, but no owned symbols available to fetch trades for.");
                 setTrades([]); // Clear trades if no symbols
                 toast({ title: "No Symbols", description: "Load assets first or no assets with balance found.", variant: "destructive" });
            }
            else {
                 console.warn("Switching to history tab, but credentials or symbols missing.");
                 toast({ title: "Credentials Missing", description: "API credentials not found in store.", variant: "destructive" });
            }

        }
    };

   // Recalculate total portfolio value when assets change
   const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);

   const isLoading = isLoadingAssets || isLoadingTrades; // Combined loading state


    // Helper function to render asset rows
    const renderAssetRows = () => {
        if (isLoadingAssets) {
            return Array.from({ length: 3 }).map((_, index) => (
                <TableRow key={`asset-skeleton-${index}`} className="border-border">
                    <TableCell><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10 bg-muted" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto bg-muted" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                </TableRow>
            ));
        }
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
        return (
            <TableRow className="border-border">
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                    {isConnected && !isLoadingAssets ? "No assets with a balance found." : "Enter API keys to load assets."}
                </TableCell>
            </TableRow>
        );
    };

    // Helper function to render trade rows
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
        if (isConnected && trades.length > 0) {
            return trades.map((trade) => (
                <TableRow key={trade.id} className="border-border">
                    <TableCell className="text-foreground text-xs">{format(new Date(trade.time), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                    <TableCell className="text-foreground text-xs">{trade.symbol}</TableCell>
                    <TableCell className={cn("text-xs", trade.isBuyer ? "text-green-500" : "text-red-500")}>
                        {trade.isBuyer ? 'BUY' : 'SELL'}
                    </TableCell>
                    <TableCell className="text-right text-foreground text-xs">{parseFloat(trade.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell className="text-right text-foreground text-xs">{parseFloat(trade.qty).toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell>
                    <TableCell className="text-right text-foreground text-xs">{parseFloat(trade.quoteQty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
            ));
        }
        return (
            <TableRow className="border-border">
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                    {isConnected && !isLoadingTrades && trades.length === 0 ? "No recent trade history found for checked pairs." :
                     isConnected && !isLoadingTrades ? "Failed to fetch trades or invalid pairs." :
                     !isConnected ? "Load assets first to enable trade history." :
                     "Loading trade history..."}
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
              <FormDescription className="text-xs text-muted-foreground pt-1">
                  Enter your Binance API credentials. Ensure keys have read-only access for viewing assets/trades and trading permissions if using the chatbot trade feature. Credentials are used for API calls and **not stored persistently by this demo application** (state is temporary).
              </FormDescription>
            </form>
          </Form>

          {/* Tabs for Summary and History */}
           {/* Use store state for active tab and handler */}
          <Tabs value={activeTab} onValueChange={onTabChange} className="flex-1 flex flex-col overflow-hidden pt-3 border-t border-border">
            <div className="flex justify-between items-center mb-2">
                <TabsList className="grid w-full grid-cols-2 h-9">
                    <TabsTrigger value="summary" className="text-xs h-full">Asset Summary</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs h-full">Trade History</TabsTrigger>
                </TabsList>
                 {/* Refresh button for trades, only shown on history tab */}
                {activeTab === 'history' && isConnected && (
                    <Button
                        variant="ghost"
                        size="icon"
                         // Use credentials from the store for refresh
                        onClick={() => {
                             // Make sure ownedSymbols exist before refreshing
                            if(apiKey && apiSecret && ownedSymbols && ownedSymbols.length > 0) {
                                 console.log("Manual refresh clicked for trade history, symbols:", ownedSymbols);
                                handleFetchTrades({ apiKey, apiSecret, isTestnet }, ownedSymbols);
                            } else if (apiKey && apiSecret) {
                                 console.warn("Cannot refresh trades: No owned symbols available.");
                                 toast({ title: "No Symbols", description: "No assets with balance to refresh trades for.", variant: "destructive" });
                            }
                             else {
                                 console.warn("Cannot refresh trades: Credentials missing.");
                                 toast({ title: "Credentials Missing", description: "Cannot refresh trades without API credentials.", variant: "destructive" });
                            }
                        }}
                         // Disable if loading trades, not connected, no symbols, or no credentials
                         disabled={isLoadingTrades || !isConnected || !ownedSymbols || ownedSymbols.length === 0 || !apiKey || !apiSecret}
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
              <ScrollArea className="h-full">
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
                   {/* Use store state for condition */}
                  {isConnected && assets.length > 0 && !isLoadingAssets && (
                    <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                        Total Portfolio Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <br />
                        <span className="text-xs opacity-70">Value calculated based on current market prices.</span>
                    </TableCaption>
                  )}
                </Table>
              </ScrollArea>
            </TabsContent>

            {/* Trade History Tab Content */}
            <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
               <ScrollArea className="h-full">
                 {/* Use store state for rendering */}
                <Table>
                    <TableHeader>
                        <TableRow className="border-border">
                            <TableHead className="text-muted-foreground text-xs">Time</TableHead>
                            <TableHead className="text-muted-foreground text-xs">Pair</TableHead>
                            <TableHead className="text-muted-foreground text-xs">Side</TableHead>
                            <TableHead className="text-right text-muted-foreground text-xs">Price</TableHead>
                            <TableHead className="text-right text-muted-foreground text-xs">Amount</TableHead>
                            <TableHead className="text-right text-muted-foreground text-xs">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {renderTradeRows()}
                    </TableBody>
                     {/* Use store state for condition */}
                    {isConnected && trades.length > 0 && !isLoadingTrades && (
                         <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                             Showing last {trades.length} trades for relevant pairs. Refresh for latest.
                         </TableCaption>
                    )}
                      {isConnected && trades.length === 0 && !isLoadingTrades && (
                         <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                             No recent trades found for relevant pairs.
                         </TableCaption>
                    )}
                     {!isConnected && (
                         <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                             Load assets to view trade history.
                         </TableCaption>
                     )}
                </Table>
               </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </div>
  );
};