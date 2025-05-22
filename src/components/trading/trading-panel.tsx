// src/components/trading/trading-panel.tsx
"use client";

import type { FC } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form"; // Correct import for useForm
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAssetStore } from '@/store/asset-store';
import { placeBuyOrder, placeSellOrder } from "@/actions/trade"; // Import new trade actions
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeHistory } from "./trade-history";

// Schema for the trading form
const tradeFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required.").default("BTCUSDT"), // Removed .toUpperCase()
  quantity: z.coerce.number().positive("Quantity must be positive."), // Use coerce for string input
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  price: z.coerce.number().optional(), // Optional price for limit orders
}).refine((data) => {
  // Require price if orderType is LIMIT
  if (data.orderType === 'LIMIT' && (data.price === undefined || data.price <= 0)) {
    return false;
  }
  return true;
}, {
  message: "A valid positive price is required for LIMIT orders.",
  path: ["price"], // Apply error to price field
});

export const TradingPanel: FC = () => {
  const { apiKey, apiSecret, isTestnet, isConnected } = useAssetStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("trade");

  const form = useForm<z.infer<typeof tradeFormSchema>>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      symbol: "BTCUSDT",
      quantity: undefined, // Start with empty quantity
      orderType: "MARKET",
      price: undefined,
    },
  });

  const orderType = form.watch('orderType'); // Watch order type to conditionally show price

  const handleTrade = async (values: z.infer<typeof tradeFormSchema>, side: 'BUY' | 'SELL') => {
    if (!isConnected || !apiKey || !apiSecret) {
      toast({
        title: "Not Connected",
        description: "Please connect your Binance account in the 'Binance Account' panel first.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    console.log(`[TradingPanel] Attempting to place ${side} ${values.orderType} order:`, values);

    try {
      let result;
      // Ensure symbol is uppercase before sending to the action, if necessary
      const symbolUppercase = values.symbol.toUpperCase();
      const tradeInput = {
        apiKey,
        apiSecret,
        isTestnet,
        symbol: symbolUppercase, // Use uppercase symbol
        quantity: values.quantity,
        orderType: values.orderType,
        price: values.price, // Will be undefined for MARKET orders
      };

      if (side === 'BUY') {
        result = await placeBuyOrder(tradeInput);
      } else {
        result = await placeSellOrder(tradeInput);
      }

      if (result.success) {
        toast({
          title: `Order Placed (${side})`,
          description: result.message || `Successfully placed ${side} order.`,
        });
        form.reset(); // Reset form on success
        
        // Chuyển sang tab lịch sử giao dịch sau khi đặt lệnh thành công
        setActiveTab("history");
      } else {
        toast({
          title: `Order Failed (${side})`,
          description: result.message || "Failed to place order.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error(`[TradingPanel] Error placing ${side} order:`, error);
      toast({
        title: "Error",
        description: `An unexpected error occurred: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="flex flex-col h-full w-full overflow-hidden border-none shadow-none bg-transparent">
      <CardHeader className="p-3 border-b border-border flex-shrink-0">
        <CardTitle className="text-lg font-medium text-foreground">Giao dịch</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="trade">Đặt lệnh</TabsTrigger>
            <TabsTrigger value="history">Lịch sử giao dịch</TabsTrigger>
          </TabsList>
          
          <TabsContent value="trade" className="space-y-4">
            <Form {...form}>
              <form className="space-y-4">
                {/* Symbol Input - Readonly for now, can be changed later */}
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Symbol</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly // Keep it simple for now
                          className="h-8 text-xs bg-input border-border"
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Order Type Radio */}
                <FormField
                  control={form.control}
                  name="orderType"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs">Order Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                          disabled={isSubmitting}
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="MARKET" id="market" />
                            </FormControl>
                            <FormLabel htmlFor="market" className="text-xs font-normal">Market</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="LIMIT" id="limit" />
                            </FormControl>
                            <FormLabel htmlFor="limit" className="text-xs font-normal">Limit</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Price Input (Conditional for LIMIT orders) */}
                {orderType === 'LIMIT' && (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Price (USDT)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="0.01" // Adjust step as needed
                            placeholder="Enter limit price"
                            className="h-8 text-xs bg-input border-border"
                            disabled={isSubmitting}
                            value={field.value ?? ''} // Handle undefined for controlled input
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                )}

                {/* Quantity Input */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Quantity (BTC)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="0.00001" // Adjust step as needed
                          placeholder="Enter amount"
                          className="h-8 text-xs bg-input border-border"
                          disabled={isSubmitting}
                          value={field.value ?? ''} // Handle undefined for controlled input
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Buy/Sell Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                        type="button" // Prevent default form submission
                        variant="default" // Consider specific buy/sell variants later
                        className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm" // Buy button style
                        onClick={form.handleSubmit((values) => handleTrade(values, 'BUY'))}
                        disabled={isSubmitting || !isConnected}
                    >
                        {isSubmitting ? "Placing..." : "Buy BTC"}
                    </Button>
                    <Button
                        type="button" // Prevent default form submission
                        variant="destructive" // Use destructive for sell
                        className="h-9 text-sm" // Sell button style
                        onClick={form.handleSubmit((values) => handleTrade(values, 'SELL'))}
                        disabled={isSubmitting || !isConnected}
                    >
                        {isSubmitting ? "Placing..." : "Sell BTC"}
                    </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="history">
            <TradeHistory />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
