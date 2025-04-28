// src/components/assets/asset-summary.tsx
"use client";

import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
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

// Define Asset type
interface Asset {
  asset: string;
  symbol: string;
  quantity: number;
  totalValue: number; // Assuming value is already calculated in USD
}

// Placeholder data for initial state or when not connected
const initialAssets: Asset[] = [
 // Keep empty initially, or show placeholder message
];

// Schema for form validation
const formSchema = z.object({
  apiKey: z.string().min(1, { message: "API Key is required." }),
  apiSecret: z.string().min(1, { message: "API Secret is required." }),
  isTestnet: z.boolean().default(false),
});

export const AssetSummary: FC = () => {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false); // Track if API is connected
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      apiKey: "",
      apiSecret: "",
      isTestnet: false,
    },
  });

  // Placeholder function to simulate fetching assets
  // **SECURITY WARNING:** NEVER handle API secrets directly in the frontend.
  // This function should call a secure backend endpoint.
  const handleFetchAssets = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setIsConnected(false); // Reset connection status on new fetch attempt
    setAssets([]); // Clear previous assets
    console.log("Fetching assets with (DO NOT LOG IN PRODUCTION):", {
      apiKey: values.apiKey.substring(0, 5) + "...", // Avoid logging full key
      isTestnet: values.isTestnet,
    });

    // --- Start Placeholder Logic ---
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        // In a real app, this would be replaced by:
        // const response = await fetch('/api/binance/assets', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(values),
        // });
        // if (!response.ok) throw new Error('Failed to fetch assets');
        // const fetchedAssets = await response.json();

        // Simulate successful fetch based on testnet toggle
        const fetchedAssets: Asset[] = values.isTestnet
          ? [
              { asset: "Test BTC", symbol: "BTC", quantity: 0.2, totalValue: 6000 },
              { asset: "Test ETH", symbol: "ETH", quantity: 5, totalValue: 10000 },
              { asset: "Test USDT", symbol: "USDT", quantity: 2000, totalValue: 2000 },
            ]
          : [
              { asset: "Bitcoin", symbol: "BTC", quantity: 0.5, totalValue: 30000 },
              { asset: "Ethereum", symbol: "ETH", quantity: 10, totalValue: 20000 },
              { asset: "USD Tether", symbol: "USDT", quantity: 5000, totalValue: 5000 },
            ];

        setAssets(fetchedAssets);
        setIsConnected(true);
         toast({
            title: "Success",
            description: "Successfully fetched assets from Binance.",
         });
    } catch (error) {
        console.error("Error fetching assets:", error);
        setAssets(initialAssets); // Reset to initial or empty state on error
        setIsConnected(false);
        toast({
            title: "Error",
            description: "Failed to fetch assets. Please check your API keys and network connection.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
    // --- End Placeholder Logic ---
  };

  // Calculate total portfolio value
  const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);

  return (
    <div className="flex flex-col h-full w-full bg-card text-card-foreground">
      <CardHeader className="p-3 border-b border-border flex-shrink-0">
        <CardTitle className="text-lg font-medium text-center">Asset Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 overflow-hidden flex flex-col gap-4">
        {/* API Key Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFetchAssets)} className="space-y-3">
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs">API Key</FormLabel>
                  <FormControl>
                    <Input
                     placeholder="Binance API Key"
                     {...field}
                     type="password" // Hide sensitive input
                     className="h-8 text-xs"
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
                  <FormLabel className="text-xs">API Secret</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Binance API Secret"
                      {...field}
                      type="password" // Hide sensitive input
                      className="h-8 text-xs"
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
                      />
                    </FormControl>
                    <FormLabel htmlFor="testnet" className="text-xs font-normal">
                      Use Testnet
                    </FormLabel>
                  </FormItem>
                )}
              />
              <Button type="submit" size="sm" disabled={isLoading} className="text-xs h-8">
                {isLoading ? "Loading..." : "Load Assets"}
              </Button>
            </div>
             <FormDescription className="text-xs text-muted-foreground pt-1">
                Enter your Binance API credentials to view your assets. These keys are handled client-side for this demo and are **not securely stored**.
            </FormDescription>
          </form>
        </Form>

        {/* Asset Table Area */}
        <div className="flex-1 overflow-hidden border-t border-border pt-3">
          <ScrollArea className="h-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Asset</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total Value (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  // Loading Skeletons
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : isConnected && assets.length > 0 ? (
                  // Display Fetched Assets
                  assets.map((asset) => (
                    <TableRow key={asset.symbol}>
                      <TableCell className="font-medium">{asset.asset}</TableCell>
                      <TableCell>{asset.symbol}</TableCell>
                      <TableCell className="text-right">{asset.quantity.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${asset.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                    </TableRow>
                  ))
                ) : (
                   // Initial or No Data Message
                   <TableRow>
                     <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        {isConnected ? "No assets found." : "Enter API keys to load assets."}
                     </TableCell>
                   </TableRow>
                )}
              </TableBody>
              {isConnected && assets.length > 0 && !isLoading && (
                 <TableCaption className="sticky bottom-0 bg-card py-2">
                    Total Portfolio Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                 </TableCaption>
              )}
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </div>
  );
};

    