// src/components/assets/asset-summary.tsx
"use client";

import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronDown, ChevronUp } from 'lucide-react'; // Import icons
import { fetchBinanceAssets } from "@/actions/binance"; // Import the Server Action
import type { Asset } from "@/actions/binance"; // Import the Asset type from the action
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

// Placeholder data for initial state
const initialAssets: Asset[] = [];

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

  // Function to fetch assets using the Server Action
  const handleFetchAssets = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setIsConnected(false);
    setAssets([]); // Clear previous assets

    try {
      // Call the Server Action
      const result = await fetchBinanceAssets({
        apiKey: values.apiKey,
        apiSecret: values.apiSecret,
        isTestnet: values.isTestnet,
      });

      if (result.success) {
        setAssets(result.data);
        setIsConnected(true);
        toast({
          title: "Success",
          description: "Successfully fetched assets from Binance.",
        });
      } else {
        // Handle errors reported by the Server Action
        console.error("Error fetching assets from action:", result.error);
        setAssets(initialAssets);
        setIsConnected(false);
        toast({
          title: "Error",
          description: `Failed to fetch assets: ${result.error}. Check credentials and permissions.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Handle unexpected errors during the action call
      console.error("Error calling fetchBinanceAssets action:", error);
      setAssets(initialAssets);
      setIsConnected(false);
      toast({
        title: "Error",
        description: "An unexpected error occurred while fetching assets. Please try again.",
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
                <Button type="submit" size="sm" disabled={isLoading} className="text-xs h-8">
                  {isLoading ? "Loading..." : "Load Assets"}
                </Button>
              </div>
              <FormDescription className="text-xs text-muted-foreground pt-1">
                  Enter your Binance API credentials. Ensure keys have read-only access. Keys are sent to the server for processing and **not stored**.
              </FormDescription>
            </form>
          </Form>

          {/* Asset Table Area */}
          <div className="flex-1 overflow-hidden border-t border-border pt-3">
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    {/* Update headers slightly if needed */}
                    <TableHead className="w-[100px] text-muted-foreground">Asset</TableHead>
                    <TableHead className="text-muted-foreground">Symbol</TableHead>
                    <TableHead className="text-right text-muted-foreground">Quantity</TableHead>
                    <TableHead className="text-right text-muted-foreground">Value (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Loading Skeletons - remain the same
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
                        <TableCell className="font-medium text-foreground">{asset.asset || asset.symbol}</TableCell> {/* Use symbol as fallback */}
                        <TableCell className="text-foreground">{asset.symbol}</TableCell>
                        <TableCell className="text-right text-foreground">{asset.quantity.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 })}</TableCell> {/* Show more precision for crypto */}
                        <TableCell className="text-right text-foreground">${asset.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    // Initial or No Data Message
                    <TableRow className="border-border">
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          {isConnected && !isLoading ? "No assets with a balance found or API key lacks permissions." : "Enter API keys to load assets."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {isConnected && assets.length > 0 && !isLoading && (
                  <TableCaption className="sticky bottom-0 bg-card py-2 text-muted-foreground border-t border-border">
                      Total Portfolio Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <br />
                      <span className="text-xs">Value calculated based on current market prices.</span>
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
