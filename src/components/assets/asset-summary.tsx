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
    setIsLoadingAssets(true);
    // Clear relevant parts of the store before fetching
    setAssets([]);
    setTrades([]);
    setOwnedSymbols([]);
    setIsConnected(false);
    setCredentials(values.apiKey, values.apiSecret, values.isTestnet); // Ensure store has latest credentials

    try {
      const result = await fetchBinanceAssets({
        apiKey: values.apiKey,
        apiSecret: values.apiSecret,
        isTestnet: values.isTestnet,
      });

      if (result.success) {
        setAssets(result.data);
        setOwnedSymbols(result.ownedSymbols || []);
        setIsConnected(true);
        toast({
          title: "Success",
          description: "Successfully fetched assets from Binance.",
        });
         // Automatically fetch trades if on history tab and just connected
        if (activeTab === "history") {
           handleFetchTrades(values, result.ownedSymbols || []);
        }
      } else {
        // Clear state on failure
        clearState();
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
  }, [setIsLoadingAssets, setAssets, setTrades, setOwnedSymbols, setIsConnected, setCredentials, clearState, toast, activeTab]); // Added activeTab

   // Function to fetch trade history using the Server Action and update store
   const handleFetchTrades = useCallback(async (
        credentials: z.infer<typeof formSchema>,
        symbolsToFetch: string[]
    ) => {
        if (!isConnected) {
             toast({ title: "Not Connected", description: "Please load assets first.", variant: "destructive" });
             return;
        }
        if (symbolsToFetch.length === 0) {
            console.log("No owned symbols with balance found to fetch trade history for.");
             setTrades([]); // Clear trades in store
            return;
        }

        setIsLoadingTrades(true);
        setTrades([]); // Clear previous trades in store

        try {
             const result = await fetchBinanceTradeHistory({
                apiKey: credentials.apiKey,
                apiSecret: credentials.apiSecret,
                isTestnet: credentials.isTestnet,
                symbols: undefined,
                limit: 50,
            });

            if (result.success) {
                setTrades(result.data); // Update trades in store
                if (result.data.length === 0) {
                     toast({ title: "No Trades", description: "No recent trade history found for your assets." });
                } else {
                     toast({ title: "Success", description: `Fetched ${result.data.length} trades.` });
                }
            } else {
                 setTrades([]); // Clear trades in store on failure
                console.error("Error fetching trade history from action:", result.error);
                toast({
                title: "Error Fetching Trades",
                description: `Failed to fetch trade history: ${result.error}.`,
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
    }, [isConnected, setIsLoadingTrades, setTrades, toast]);

   // Handle tab change - update store
   const onTabChange = (value: string) => {
        setActiveTab(value);
        // Fetch trades if switching to history tab, assets are loaded, and trades are not already loaded/loading
        if (value === 'history' && isConnected && trades.length === 0 && !isLoadingTrades) {
             // Use credentials from the store
             if (apiKey && apiSecret) {
                handleFetchTrades({ apiKey, apiSecret, isTestnet }, ownedSymbols);
            } else {
                 toast({ title: "Credentials Missing", description: "API credentials not found in store.", variant: "destructive" });
            }

        }
    };

   // Recalculate total portfolio value when assets change
   const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);

   const isLoading = isLoadingAssets || isLoadingTrades; // Combined loading state


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
                      disabled={isLoading}
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
                        disabled={isLoading}
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
                          disabled={isLoading}
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
                            if(apiKey && apiSecret) {
                                handleFetchTrades({ apiKey, apiSecret, isTestnet }, ownedSymbols)
                            } else {
                                 toast({ title: "Credentials Missing", description: "Cannot refresh trades without API credentials.", variant: "destructive" });
                            }
                        }}
                        disabled={isLoadingTrades || !isConnected || ownedSymbols.length === 0 || !apiKey || !apiSecret}
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
                    {isLoadingAssets ? (
                      // Loading Skeletons for Assets
                      Array.from({ length: 3 }).map((_, index) => (
                        <TableRow key={index} className="border-border">
                          <TableCell><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-10 bg-muted" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto bg-muted" /></TableCell>
                          <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                        </TableRow>
                      ))
                    ) : isConnected && assets.length > 0 ? (
                      // Display Fetched Assets from store
                      assets.map((asset) => (
                        <TableRow key={asset.symbol} className="border-border">
                          <TableCell className="font-medium text-foreground text-xs">{asset.asset || asset.symbol}</TableCell> {/* Use symbol as fallback */}
                          <TableCell className="text-foreground text-xs">{asset.symbol}</TableCell>
                          <TableCell className="text-right text-foreground text-xs">{asset.quantity.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell> {/* Show more precision for crypto */}
                          <TableCell className="text-right text-foreground text-xs">${asset.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      // Initial or No Data Message for Assets
                      <TableRow className="border-border">
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground text-xs">
                            {isConnected && !isLoadingAssets ? "No assets with a balance found." : "Enter API keys to load assets."}
                        </TableCell>
                      </TableRow>
                    )}
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
                        {isLoadingTrades ? (
                             // Loading Skeletons for Trades
                            Array.from({ length: 5 }).map((_, index) => (
                                <TableRow key={index} className="border-border">
                                <TableCell><Skeleton className="h-4 w-24 bg-muted" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                                <TableCell><Skeleton className="h-4 w-8 bg-muted" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto bg-muted" /></TableCell>
                                <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                                </TableRow>
                            ))
                         ) : isConnected && trades.length > 0 ? (
                             // Display Fetched Trades from store
                            trades.map((trade) => (
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
                            ))
                        ) : (
                             // Initial or No Data Message for Trades
                            <TableRow className="border-border">
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                                     {isConnected && !isLoadingTrades ? "No trade history found or fetch failed." : "Load assets first to enable trade history."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                     {/* Use store state for condition */}
                    {isConnected && trades.length > 0 && !isLoadingTrades && (
                         <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border text-xs">
                             Showing last {trades.length} trades. Refresh for latest.
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
