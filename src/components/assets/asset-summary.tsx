import type { FC } from "react";
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

// Placeholder data for assets
const assets = [
  { asset: "Bitcoin", symbol: "BTC", quantity: 0.5, value: 30000, totalValue: 15000 },
  { asset: "Ethereum", symbol: "ETH", quantity: 10, value: 2000, totalValue: 20000 },
  { asset: "Cardano", symbol: "ADA", quantity: 5000, value: 0.5, totalValue: 2500 },
  { asset: "Solana", symbol: "SOL", quantity: 100, value: 40, totalValue: 4000 },
  { asset: "USD Tether", symbol: "USDT", quantity: 5000, value: 1, totalValue: 5000 },
];

// Calculate total portfolio value
const totalPortfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);

export const AssetSummary: FC = () => {
  return (
    <div className="flex flex-col h-full w-full bg-card text-card-foreground">
      <CardHeader className="p-3 border-b border-border flex-shrink-0">
        <CardTitle className="text-lg font-medium text-center">Asset Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
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
              {assets.map((asset) => (
                <TableRow key={asset.symbol}>
                  <TableCell className="font-medium">{asset.asset}</TableCell>
                  <TableCell>{asset.symbol}</TableCell>
                  <TableCell className="text-right">{asset.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right">${asset.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
             <TableCaption className="sticky bottom-0 bg-card py-2">
                Total Portfolio Value: ${totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </TableCaption>
          </Table>
        </ScrollArea>
      </CardContent>
    </div>
  );
};
