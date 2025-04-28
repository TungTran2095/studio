// src/components/assets/asset-summary.tsx
"use client";

import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronDown, ChevronUp } from 'lucide-react'; // Import icons
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

// Define props including isExpanded and onToggle
interface AssetSummaryProps {
  isExpanded: boolean;
  onToggle: () => void;
}

export const AssetSummary: FC<AssetSummaryProps> = ({ isExpanded, onToggle }) => {
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
  const handleFetchAssets = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setIsConnected(false);
    setAssets([]);
    console.log("Fetching assets with (DO NOT LOG IN PRODUCTION):", {
      apiKey: values.apiKey.substring(0, 5) + "...",
      isTestnet: values.isTestnet,
    });

    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
        // Simulate API response based on isTestnet
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
            description: "Successfully fetched assets.", // Simplified message
         });
    } catch (error) {
        console.error("Error fetching assets:", error);
        setAssets(initialAssets);
        setIsConnected(false);
        toast({
            title: "Error",
            description: "Failed to fetch assets. Please check your API keys and network connection.",
            variant: "destructive",
        });
    } finally {
        setIsLoading(false);
    }
  };

  // Calculate total portfolio value
  const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);

  return (
    // Ensure the container takes full height of its parent div and uses flex column layout
    // Removed bg-card, text-card-foreground, as these are now on the parent container div in page.tsx
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Header remains, adjust padding and border */}
      <CardHeader className="p-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-foreground">Asset Summary</CardTitle>
         <Button variant="ghost" size="icon" onClick={onToggle} className="h-6 w-6 text-foreground"> {/* Ensure button text color matches theme */}
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            <span className="sr-only">{isExpanded ? 'Collapse' : 'Expand'} Asset Summary</span>
        </Button>
      </CardHeader>

     {/* Conditionally render content based on isExpanded */}
      {isExpanded && (
        // Content container takes remaining space, adjust padding
        <CardContent className="flex-1 p-3 overflow-hidden flex flex-col gap-4">
          {/* API Key Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFetchAssets)} className="space-y-3">
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-xs text-foreground">API Key</FormLabel> {/* Explicitly set text color */}
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
                    <FormLabel className="text-xs text-foreground">API Secret</FormLabel> {/* Explicitly set text color */}
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
                      <FormLabel htmlFor="testnet" className="text-xs font-normal text-foreground"> {/* Explicitly set text color */}
                        Use Testnet
                      </FormLabel>
                    </FormItem>
                  )}
                />
                <Button type="submit" size="sm" disabled={isLoading} className="text-xs h-8"> {/* Default button styling */}
                  {isLoading ? "Loading..." : "Load Assets"}
                </Button>
              </div>
              <FormDescription className="text-xs text-muted-foreground pt-1">
                  Enter your Binance API credentials. Handled client-side. **Not securely stored**.
              </FormDescription>
            </form>
          </Form>

          {/* Asset Table Area */}
          {/* Add top border for separation */}
          <div className="flex-1 overflow-hidden border-t border-border pt-3">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="w-[100px] text-muted-foreground">Asset</TableHead>
                    <TableHead className="text-muted-foreground">Symbol</TableHead>
                    <TableHead className="text-right text-muted-foreground">Quantity</TableHead>
                    <TableHead className="text-right text-muted-foreground">Total Value (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading Skeletons
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={index} className="border-border">
                        <TableCell><Skeleton className="h-4 w-20 bg-muted" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-10 bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto bg-muted" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto bg-muted" /></TableCell>
                      </TableRow>
                    ))
                  ) : isConnected && assets.length > 0 ? (
                    // Display Fetched Assets
                    assets.map((asset) => (
                      <TableRow key={asset.symbol} className="border-border">
                        <TableCell className="font-medium text-foreground">{asset.asset}</TableCell>
                        <TableCell className="text-foreground">{asset.symbol}</TableCell>
                        <TableCell className="text-right text-foreground">{asset.quantity.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-foreground">${asset.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // Initial or No Data Message
                    <TableRow className="border-border">
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          {isConnected ? "No assets found." : "Enter API keys to load assets."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {/* Ensure caption background matches container */}
                {isConnected && assets.length > 0 && !isLoading && (
                  <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border">
                      Total Portfolio Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCaption>
                )}
              </Table>
            </ScrollArea>
          </div>
        </CardContent>
      )}
    </div>
  );
};
