import { NextRequest, NextResponse } from 'next/server';
import { fetchBinanceAssets } from '@/actions/binance';

export async function POST(request: NextRequest) {
  try {
    const { apiKey, apiSecret, isTestnet } = await request.json();
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ success: false, error: 'Thiếu API key hoặc secret.' }, { status: 400 });
    }
    const result = await fetchBinanceAssets({ apiKey, apiSecret, isTestnet: !!isTestnet });
    if (result.success) {
      return NextResponse.json({ success: true, data: result.data });
    } else {
      return NextResponse.json({ success: false, error: result.error || 'Không lấy được tài sản.' }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Lỗi không xác định.' }, { status: 500 });
  }
} 