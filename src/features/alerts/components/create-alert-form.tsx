"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { usePriceAlerts } from "../hooks/use-price-alerts";
import { NotificationChannel, AlertType } from "../services/price-monitor";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Percent, BarChart4, Bell } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const priceThresholdSchema = z.object({
  alertType: z.literal(AlertType.PRICE_THRESHOLD),
  price: z.coerce.number().positive("Giá phải là số dương"),
  direction: z.enum(["above", "below"], {
    required_error: "Vui lòng chọn điều kiện cảnh báo",
  }),
  notifyVia: z.array(z.string()).min(1, "Chọn ít nhất một kênh thông báo"),
});

const priceChangeSchema = z.object({
  alertType: z.literal(AlertType.PRICE_CHANGE),
  percentage: z.coerce.number().positive("Phần trăm phải là số dương"),
  direction: z.enum(["increase", "decrease"], {
    required_error: "Vui lòng chọn chiều biến động",
  }),
  timeframe: z.enum(["1h", "24h"], {
    required_error: "Vui lòng chọn khung thời gian",
  }),
  notifyVia: z.array(z.string()).min(1, "Chọn ít nhất một kênh thông báo"),
});

const candlestickPatternSchema = z.object({
  alertType: z.literal(AlertType.CANDLESTICK_PATTERN),
  patterns: z.array(z.string()).min(1, "Chọn ít nhất một mẫu hình"),
  timeframe: z.enum(["1h", "4h", "1d"], {
    required_error: "Vui lòng chọn khung thời gian",
  }),
  notifyVia: z.array(z.string()).min(1, "Chọn ít nhất một kênh thông báo"),
});

type PriceThresholdFormValues = z.infer<typeof priceThresholdSchema>;
type PriceChangeFormValues = z.infer<typeof priceChangeSchema>;
type CandlestickPatternFormValues = z.infer<typeof candlestickPatternSchema>;

interface CreateAlertFormProps {
  onSuccess?: () => void;
}

export function CreateAlertForm({ onSuccess }: CreateAlertFormProps) {
  const { addPriceThresholdAlert, addPriceChangeAlert, addCandlestickPatternAlert, isLoading } = usePriceAlerts();
  const [activeTab, setActiveTab] = useState<string>("price-threshold");

  // Form cho cảnh báo ngưỡng giá
  const priceThresholdForm = useForm<PriceThresholdFormValues>({
    resolver: zodResolver(priceThresholdSchema),
    defaultValues: {
      alertType: AlertType.PRICE_THRESHOLD,
      price: undefined,
      direction: "above",
      notifyVia: [NotificationChannel.IN_APP],
    },
  });

  // Form cho cảnh báo biến động giá
  const priceChangeForm = useForm<PriceChangeFormValues>({
    resolver: zodResolver(priceChangeSchema),
    defaultValues: {
      alertType: AlertType.PRICE_CHANGE,
      percentage: undefined,
      direction: "increase",
      timeframe: "1h",
      notifyVia: [NotificationChannel.IN_APP],
    },
  });

  // Form cho cảnh báo mẫu hình nến
  const candlestickPatternForm = useForm<CandlestickPatternFormValues>({
    resolver: zodResolver(candlestickPatternSchema),
    defaultValues: {
      alertType: AlertType.CANDLESTICK_PATTERN,
      patterns: [],
      timeframe: "1h",
      notifyVia: [NotificationChannel.IN_APP],
    },
  });

  const onSubmitPriceThreshold = async (values: PriceThresholdFormValues) => {
    try {
      await addPriceThresholdAlert(
        values.price,
        values.direction as "above" | "below",
        values.notifyVia as NotificationChannel[]
      );
      priceThresholdForm.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Lỗi khi tạo cảnh báo ngưỡng giá:", error);
    }
  };

  const onSubmitPriceChange = async (values: PriceChangeFormValues) => {
    try {
      await addPriceChangeAlert(
        values.percentage,
        values.direction as "increase" | "decrease",
        values.timeframe as "1h" | "24h",
        values.notifyVia as NotificationChannel[]
      );
      priceChangeForm.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Lỗi khi tạo cảnh báo biến động giá:", error);
    }
  };

  const onSubmitCandlestickPattern = async (values: CandlestickPatternFormValues) => {
    try {
      await addCandlestickPatternAlert(
        values.patterns,
        values.timeframe as "1h" | "4h" | "1d",
        values.notifyVia as NotificationChannel[]
      );
      candlestickPatternForm.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Lỗi khi tạo cảnh báo mẫu hình nến:", error);
    }
  };

  const notificationOptions = [
    {
      id: NotificationChannel.IN_APP,
      label: "Trong ứng dụng",
    },
    {
      id: NotificationChannel.EMAIL,
      label: "Email",
    },
    {
      id: NotificationChannel.TELEGRAM,
      label: "Telegram",
    },
  ];

  const candlestickPatterns = [
    { id: "doji", label: "Doji" },
    { id: "hammer", label: "Hammer" },
    { id: "shooting_star", label: "Shooting Star" },
    { id: "bullish_engulfing", label: "Bullish Engulfing" },
    { id: "bearish_engulfing", label: "Bearish Engulfing" },
    { id: "morning_star", label: "Morning Star" },
    { id: "evening_star", label: "Evening Star" },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-3 mb-4">
        <TabsTrigger value="price-threshold" className="flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4" /> Ngưỡng giá
        </TabsTrigger>
        <TabsTrigger value="price-change" className="flex items-center gap-1.5">
          <Percent className="h-4 w-4" /> Biến động giá
        </TabsTrigger>
        <TabsTrigger value="candlestick-pattern" className="flex items-center gap-1.5">
          <BarChart4 className="h-4 w-4" /> Mẫu hình nến
        </TabsTrigger>
      </TabsList>

      <Card>
        <CardContent className="pt-6">
          {/* Form cảnh báo ngưỡng giá */}
          <TabsContent value="price-threshold" className="mt-0">
            <Form {...priceThresholdForm}>
              <form onSubmit={priceThresholdForm.handleSubmit(onSubmitPriceThreshold)} className="space-y-6">
                <FormField
                  control={priceThresholdForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ngưỡng giá BTC (USDT)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ví dụ: 65000"
                          {...field}
                          onChange={(e) => {
                            field.onChange(parseFloat(e.target.value) || 0);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Nhập giá BTC mà bạn muốn nhận thông báo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={priceThresholdForm.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Điều kiện</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="above" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Khi giá vượt lên trên mức này
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="below" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Khi giá giảm xuống dưới mức này
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={priceThresholdForm.control}
                  name="notifyVia"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Kênh nhận thông báo</FormLabel>
                        <FormDescription>
                          Chọn kênh mà bạn muốn nhận thông báo
                        </FormDescription>
                      </div>
                      {notificationOptions.map((option) => (
                        <FormField
                          key={option.id}
                          control={priceThresholdForm.control}
                          name="notifyVia"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={option.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, option.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== option.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  <Bell className="mr-2 h-4 w-4" />
                  Tạo cảnh báo ngưỡng giá
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Form cảnh báo biến động giá */}
          <TabsContent value="price-change" className="mt-0">
            <Form {...priceChangeForm}>
              <form onSubmit={priceChangeForm.handleSubmit(onSubmitPriceChange)} className="space-y-6">
                <FormField
                  control={priceChangeForm.control}
                  name="percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phần trăm thay đổi (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Ví dụ: 5"
                          {...field}
                          onChange={(e) => {
                            field.onChange(parseFloat(e.target.value) || 0);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Nhập % thay đổi giá BTC mà bạn muốn nhận thông báo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={priceChangeForm.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Chiều biến động</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="increase" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Khi giá tăng trên mức % này
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="decrease" />
                            </FormControl>
                            <FormLabel className="font-normal">
                              Khi giá giảm dưới mức % này
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={priceChangeForm.control}
                  name="timeframe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Khung thời gian</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn khung thời gian" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1h">1 giờ</SelectItem>
                          <SelectItem value="24h">24 giờ</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Chọn khung thời gian để tính toán % thay đổi
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={priceChangeForm.control}
                  name="notifyVia"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Kênh nhận thông báo</FormLabel>
                        <FormDescription>
                          Chọn kênh mà bạn muốn nhận thông báo
                        </FormDescription>
                      </div>
                      {notificationOptions.map((option) => (
                        <FormField
                          key={option.id}
                          control={priceChangeForm.control}
                          name="notifyVia"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={option.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, option.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== option.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  <Bell className="mr-2 h-4 w-4" />
                  Tạo cảnh báo biến động giá
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* Form cảnh báo mẫu hình nến */}
          <TabsContent value="candlestick-pattern" className="mt-0">
            <Form {...candlestickPatternForm}>
              <form onSubmit={candlestickPatternForm.handleSubmit(onSubmitCandlestickPattern)} className="space-y-6">
                <FormField
                  control={candlestickPatternForm.control}
                  name="patterns"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Mẫu hình nến</FormLabel>
                        <FormDescription>
                          Chọn các mẫu hình nến bạn muốn được thông báo
                        </FormDescription>
                      </div>
                      {candlestickPatterns.map((pattern) => (
                        <FormField
                          key={pattern.id}
                          control={candlestickPatternForm.control}
                          name="patterns"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={pattern.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(pattern.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, pattern.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== pattern.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {pattern.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={candlestickPatternForm.control}
                  name="timeframe"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Khung thời gian</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn khung thời gian" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1h">1 giờ</SelectItem>
                          <SelectItem value="4h">4 giờ</SelectItem>
                          <SelectItem value="1d">1 ngày</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Chọn khung thời gian để phát hiện mẫu hình
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={candlestickPatternForm.control}
                  name="notifyVia"
                  render={() => (
                    <FormItem>
                      <div className="mb-4">
                        <FormLabel className="text-base">Kênh nhận thông báo</FormLabel>
                        <FormDescription>
                          Chọn kênh mà bạn muốn nhận thông báo
                        </FormDescription>
                      </div>
                      {notificationOptions.map((option) => (
                        <FormField
                          key={option.id}
                          control={candlestickPatternForm.control}
                          name="notifyVia"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={option.id}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(option.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, option.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== option.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {option.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  <Bell className="mr-2 h-4 w-4" />
                  Tạo cảnh báo mẫu hình nến
                </Button>
              </form>
            </Form>
          </TabsContent>
        </CardContent>
      </Card>
    </Tabs>
  );
} 