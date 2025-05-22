"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertsManager } from "./alerts-manager";
import { NotificationsPanel } from "./notifications-panel";
import { CreateAlertForm } from "./create-alert-form";
import { usePriceAlerts } from "../hooks/use-price-alerts";
import { 
  Bell, 
  BellOff, 
  BellRing, 
  AlertTriangle, 
  LineChart, 
  RefreshCcw, 
  Settings 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

export function AlertsPanel() {
  const { marketState, unreadCount } = usePriceAlerts();
  const [activeTab, setActiveTab] = useState("active-alerts");

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold">Hệ thống cảnh báo thông minh</CardTitle>
        <CardDescription>
          Theo dõi và nhận thông báo về các biến động giá quan trọng
        </CardDescription>
        <div className="text-sm text-muted-foreground mt-2">
          Giá BTC hiện tại: <span className="font-semibold text-primary">{marketState.btcPrice.toLocaleString()} USDT</span>
          <span className="ml-2">
            <span className={marketState.priceChange24h >= 0 ? "text-green-500" : "text-red-500"}>
              {marketState.priceChange24h >= 0 ? "+" : ""}{marketState.priceChange24h.toFixed(2)}% (24h)
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="active-alerts">Cảnh báo đang hoạt động</TabsTrigger>
            <TabsTrigger value="create-alert">Tạo cảnh báo mới</TabsTrigger>
            <TabsTrigger value="notifications" className="relative">
              Thông báo
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active-alerts" className="space-y-4">
            <AlertsManager />
          </TabsContent>
          
          <TabsContent value="create-alert" className="space-y-4">
            <CreateAlertForm onSuccess={() => setActiveTab("active-alerts")} />
          </TabsContent>
          
          <TabsContent value="notifications" className="space-y-4">
            <NotificationsPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 