import { NextRequest, NextResponse } from 'next/server';
import Binance from 'binance-api-node';

// Helper function để làm tròn quantity theo LOT_SIZE filter
function roundQuantityToLotSize(quantity: number, lotSizeFilter: any): number {
  const stepSize = parseFloat(lotSizeFilter.stepSize);
  const minQty = parseFloat(lotSizeFilter.minQty);
  const maxQty = parseFloat(lotSizeFilter.maxQty);
  
  // Đảm bảo quantity >= minQty
  if (quantity < minQty) {
    return minQty;
  }
  
  // Đảm bảo quantity <= maxQty
  if (quantity > maxQty) {
    return maxQty;
  }
  
  // Làm tròn theo stepSize
  const precision = stepSize.toString().split('.')[1]?.length || 0;
  const rounded = Math.floor(quantity / stepSize) * stepSize;
  
  return parseFloat(rounded.toFixed(precision));
}

// POST method - tương thích với BotExecutor
export async function POST(req: NextRequest) {
  return await handleOrder(req);
}

// PUT method - tương thích với managePosition
export async function PUT(req: NextRequest) {
  return await handleOrder(req);
}

async function handleOrder(req: NextRequest) {
  try {
    const { symbol, side, type, quantity, price, apiKey, apiSecret, isTestnet } = await req.json();

    if (!symbol || !side || !type || !quantity || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = Binance({
      apiKey,
      apiSecret,
      ...(isTestnet && { httpBase: 'https://testnet.binance.vision' })
    });

    // Lấy thông tin symbol để kiểm tra filters
    const exchangeInfo = await client.exchangeInfo();
    const symbolInfo = exchangeInfo.symbols.find((s: any) => s.symbol === symbol);
    
    if (!symbolInfo) {
      return NextResponse.json({ error: 'Symbol not found' }, { status: 400 });
    }

    // Tìm LOT_SIZE filter
    const lotSizeFilter = symbolInfo.filters.find((f: any) => f.filterType === 'LOT_SIZE');
    
    if (!lotSizeFilter) {
      return NextResponse.json({ error: 'LOT_SIZE filter not found for symbol' }, { status: 400 });
    }

    // Làm tròn quantity theo LOT_SIZE filter
    const adjustedQuantity = roundQuantityToLotSize(parseFloat(quantity), lotSizeFilter);
    
    console.log(`[Order] Original quantity: ${quantity}, Adjusted quantity: ${adjustedQuantity}`);
    console.log(`[Order] LOT_SIZE filter:`, lotSizeFilter);

    const orderParams: any = {
      symbol,
      side,
      type,
      quantity: adjustedQuantity.toString()
    };

    if (type === 'LIMIT' && price) {
      orderParams.price = price.toString();
      orderParams.timeInForce = 'GTC';
    }

    const order = await client.order(orderParams);

    return NextResponse.json(order);
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ 
      error: 'Failed to create order',
      details: error.message 
    }, { status: 500 });
  }
} 