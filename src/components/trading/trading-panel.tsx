// src/components/trading/trading-panel.tsx
"use client";

import type { FC } from "react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAssetStore } from '@/store/asset-store';
import { placeBuyOrder, placeSellOrder } from "@/actions/trade";
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
import { TradingDebug } from "./trading-debug";
import { supabase as supabaseClient } from '@/lib/supabase-client';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

// Schema for the trading form - Cải thiện validation
const tradeFormSchema = z.object({
  symbol: z.string().min(1, "Symbol is required.").default("BTCUSDT"),
  quantity: z.coerce.number().positive("Số lượng phải lớn hơn 0.").min(0.000001, "Số lượng tối thiểu là 0.000001"),
  orderType: z.enum(['MARKET', 'LIMIT']).default('MARKET'),
  price: z.coerce.number().optional(),
}).refine((data) => {
  // Chỉ yêu cầu price cho LIMIT orders
  if (data.orderType === 'LIMIT') {
    return data.price !== undefined && data.price > 0;
  }
  return true;
}, {
  message: "Giá phải được nhập cho lệnh LIMIT.",
  path: ["price"],
});

export const TradingPanel: FC = () => {
  const { apiKey, apiSecret, isTestnet, setCredentials } = useAssetStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("trade");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [submitTimeout, setSubmitTimeout] = useState<NodeJS.Timeout | null>(null);

  // Fetch danh sách tài khoản từ supabase khi mount
  useEffect(() => {
    async function fetchAccounts() {
      if (!supabaseClient) return;
      try {
        const { data, error } = await supabaseClient.from('binance_account').select('*');
        if (error) {
          toast({ title: 'Lỗi khi lấy tài khoản', description: error.message, variant: 'destructive' });
          return;
        }
        setAccounts((data || []).map((item: any) => ({
          id: item.id || item.Name || `acc-${Math.random()}`,
          name: item.Name || '',
          apiKey: item.config?.apiKey,
          apiSecret: item.config?.apiSecret,
          isTestnet: item.config?.isTestnet ?? false,
        })));
      } catch (error: any) {
        console.error('[TradingPanel] Error fetching accounts:', error);
        toast({ title: 'Lỗi khi lấy tài khoản', description: error.message, variant: 'destructive' });
      }
    }
    fetchAccounts();
  }, [toast]);

  // Khi chọn tài khoản thì set credentials vào store
  useEffect(() => {
    if (!selectedAccountId) return;
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (acc) {
      setCredentials(acc.apiKey, acc.apiSecret, acc.isTestnet);
    }
  }, [selectedAccountId, accounts, setCredentials]);

  const form = useForm<z.infer<typeof tradeFormSchema>>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      symbol: "BTCUSDT",
      quantity: undefined,
      orderType: "MARKET",
      price: undefined,
    },
  });

  const orderType = form.watch('orderType');

  // Cleanup timeout khi component unmount
  useEffect(() => {
    return () => {
      if (submitTimeout) {
        clearTimeout(submitTimeout);
      }
    };
  }, [submitTimeout]);

  const handleTrade = async (values: z.infer<typeof tradeFormSchema>, side: 'BUY' | 'SELL') => {
    // Kiểm tra credentials
    if (!apiKey || !apiSecret) {
      toast({
        title: "Chưa kết nối",
        description: "Vui lòng chọn tài khoản Binance trong panel 'Tài khoản Binance' trước.",
        variant: "destructive",
      });
      return;
    }

    // Kiểm tra validation
    const validation = tradeFormSchema.safeParse(values);
    if (!validation.success) {
      toast({
        title: "Dữ liệu không hợp lệ",
        description: validation.error.errors.map(e => e.message).join(', '),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    console.log(`[TradingPanel] Attempting to place ${side} ${values.orderType} order:`, values);

    // Tạo timeout để tránh bị đơ vô thời hạn
    const timeout = setTimeout(() => {
      setIsSubmitting(false);
      toast({
        title: "Timeout",
        description: "Lệnh giao dịch bị timeout. Vui lòng thử lại.",
        variant: "destructive",
      });
    }, 30000); // 30 giây timeout

    setSubmitTimeout(timeout);

    try {
      let result;
      const symbolUppercase = values.symbol.toUpperCase();
      const tradeInput = {
        apiKey,
        apiSecret,
        isTestnet,
        symbol: symbolUppercase,
        quantity: Number(values.quantity), // Đảm bảo luôn là number
        orderType: values.orderType,
        price: values.price,
      };

      console.log(`[TradingPanel] Sending trade request:`, {
        ...tradeInput,
        apiKey: '***',
        apiSecret: '***'
      });

      if (side === 'BUY') {
        result = await placeBuyOrder(tradeInput);
      } else {
        result = await placeSellOrder(tradeInput);
      }

      // Clear timeout nếu thành công
      clearTimeout(timeout);
      setSubmitTimeout(null);

      if (result.success) {
        toast({
          title: `Đặt lệnh thành công (${side})`,
          description: result.message || `Đã đặt lệnh ${side} thành công.`,
        });
        form.reset();
        // XÓA dòng này để không chuyển tab
        // setActiveTab("history");
      } else {
        toast({
          title: `Đặt lệnh thất bại (${side})`,
          description: result.message || "Không thể đặt lệnh.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      // Clear timeout nếu có lỗi
      clearTimeout(timeout);
      setSubmitTimeout(null);

      console.error(`[TradingPanel] Error placing ${side} order:`, error);
      
      let errorMessage = 'Lỗi không xác định';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.body) {
        try {
          const parsedError = JSON.parse(error.body);
          errorMessage = parsedError.msg || error.body;
        } catch {
          errorMessage = error.body;
        }
      }

      toast({
        title: "Lỗi",
        description: `Đã xảy ra lỗi: ${errorMessage}`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hàm xử lý submit với validation trước
  const handleSubmit = async (side: 'BUY' | 'SELL') => {
    try {
      const isValid = await form.trigger();
      if (!isValid) {
        toast({
          title: "Dữ liệu không hợp lệ",
          description: "Vui lòng kiểm tra lại thông tin nhập.",
          variant: "destructive",
        });
        return;
      }

      const values = form.getValues();
      await handleTrade(values, side);
    } catch (error: any) {
      console.error('[TradingPanel] Form submission error:', error);
      toast({
        title: "Lỗi",
        description: "Lỗi khi xử lý form: " + (error.message || 'Lỗi không xác định'),
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="flex flex-col h-full w-full overflow-hidden border-none shadow-none bg-transparent">
      <CardHeader className="p-3 border-b border-border flex-shrink-0">
        <CardTitle className="text-lg font-medium text-foreground">Giao dịch</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-1 mb-4">
            {/* TabsList đã bị xóa vì chỉ còn một tab */}
          </TabsList>
          
          <TabsContent value="trade" className="space-y-4">
            {/* Dropdown chọn tài khoản giao dịch */}
            <div>
              <label className="text-xs text-black mb-1 block">Chọn tài khoản giao dịch</label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                                    <SelectTrigger className="w-full h-8 text-xs">
                  <SelectValue placeholder="Chọn tài khoản" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name ? acc.name : acc.apiKey?.slice(0, 6) + '...'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Form {...form}>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                {/* Symbol Input - Readonly for now, can be changed later */}
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-black">Symbol</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          readOnly
                          className="h-8 text-xs"
                          disabled={isSubmitting}
                          value={field.value ?? ''}
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
                      <FormLabel className="text-xs text-black">Loại lệnh</FormLabel>
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
                            <FormLabel htmlFor="market" className="text-xs font-normal text-black">Market</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="LIMIT" id="limit" />
                            </FormControl>
                            <FormLabel htmlFor="limit" className="text-xs font-normal text-black">Limit</FormLabel>
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
                        <FormLabel className="text-xs text-black">Giá (USDT)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            step="any"
                            min={0}
                            className="h-8 text-xs"
                            disabled={isSubmitting}
                            value={field.value ?? ''}
                            placeholder="Nhập giá..."
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
                      <FormLabel className="text-xs text-black">Số lượng (BTC)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          step="any"
                          min={0.000001}
                          className="h-8 text-xs"
                          disabled={isSubmitting}
                          value={field.value ?? ''}
                          placeholder="Nhập số lượng..."
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Buy/Sell Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <Button
                        type="button"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700 text-white h-9 text-sm"
                        onClick={() => handleSubmit('BUY')}
                        disabled={isSubmitting || !apiKey || !apiSecret || !selectedAccountId}
                    >
                        {isSubmitting ? "Đang đặt lệnh..." : "Mua BTC"}
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        className="h-9 text-sm"
                        onClick={() => handleSubmit('SELL')}
                        disabled={isSubmitting || !apiKey || !apiSecret || !selectedAccountId}
                    >
                        {isSubmitting ? "Đang đặt lệnh..." : "Bán BTC"}
                    </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <TradeHistory />
          </TabsContent>
        </Tabs>
      </CardContent>
      
      {/* Debug Component */}
      <TradingDebug />
    </Card>
  );
};
