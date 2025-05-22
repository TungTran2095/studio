/**
 * Service để truy xuất dữ liệu thị trường từ CoinMarketCap API
 */

const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const COINMARKETCAP_API_URL = 'https://pro-api.coinmarketcap.com/v1';

export interface CryptoPrice {
  symbol: string;
  price: number;
  percentChange24h: number;
  marketCap: number;
  volume24h: number;
  lastUpdated: string;
}

export interface MarketOverview {
  cryptos: CryptoPrice[];
  btcDominance: number;
  totalMarketCap: number;
  totalVolume24h: number;
  marketCapChangePercentage24h: number;
}

/**
 * Lấy giá và thông tin của một loại tiền điện tử
 */
export async function getCryptoPrice(symbol: string): Promise<CryptoPrice | null> {
  if (!COINMARKETCAP_API_KEY) {
    console.error('Thiếu CoinMarketCap API Key');
    return null;
  }

  try {
    // Convert symbol sang format chuẩn (không có USDT suffix)
    const cleanSymbol = symbol.replace('USDT', '');
    
    const response = await fetch(`${COINMARKETCAP_API_URL}/cryptocurrency/quotes/latest?symbol=${cleanSymbol}`, {
      headers: {
        'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.data || !data.data[cleanSymbol]) {
      return null;
    }
    
    const cryptoData = data.data[cleanSymbol];
    const quote = cryptoData.quote.USD;
    
    return {
      symbol: cleanSymbol,
      price: quote.price,
      percentChange24h: quote.percent_change_24h,
      marketCap: quote.market_cap,
      volume24h: quote.volume_24h,
      lastUpdated: quote.last_updated
    };
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu từ CoinMarketCap:', error);
    return null;
  }
}

/**
 * Lấy tổng quan thị trường bao gồm top 10 tiền điện tử
 */
export async function getMarketOverview(): Promise<MarketOverview | null> {
  if (!COINMARKETCAP_API_KEY) {
    console.error('Thiếu CoinMarketCap API Key');
    return null;
  }

  try {
    // Lấy top 10 đồng có market cap cao nhất
    const response = await fetch(`${COINMARKETCAP_API_URL}/cryptocurrency/listings/latest?limit=10`, {
      headers: {
        'X-CMC_PRO_API_KEY': COINMARKETCAP_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || !data.data || !Array.isArray(data.data)) {
      return null;
    }
    
    const cryptos: CryptoPrice[] = data.data.map((crypto: any) => {
      const quote = crypto.quote.USD;
      return {
        symbol: crypto.symbol,
        price: quote.price,
        percentChange24h: quote.percent_change_24h,
        marketCap: quote.market_cap,
        volume24h: quote.volume_24h,
        lastUpdated: quote.last_updated
      };
    });
    
    // Tính toán các chỉ số tổng quan thị trường
    const btcMarketCap = cryptos.find(c => c.symbol === 'BTC')?.marketCap || 0;
    const totalMarketCap = cryptos.reduce((sum, crypto) => sum + crypto.marketCap, 0);
    const totalVolume24h = cryptos.reduce((sum, crypto) => sum + crypto.volume24h, 0);
    const btcDominance = (btcMarketCap / totalMarketCap) * 100;
    
    // Tính toán sự thay đổi tổng thể về vốn hóa thị trường (trung bình có trọng số)
    const marketCapChangePercentage24h = cryptos.reduce(
      (sum, crypto) => sum + (crypto.percentChange24h * (crypto.marketCap / totalMarketCap)), 
      0
    );
    
    return {
      cryptos,
      btcDominance,
      totalMarketCap,
      totalVolume24h,
      marketCapChangePercentage24h
    };
  } catch (error) {
    console.error('Lỗi khi lấy tổng quan thị trường từ CoinMarketCap:', error);
    return null;
  }
}

/**
 * Hàm giả lập để sử dụng trong môi trường dev khi không có API key
 */
export function getMockMarketData(): MarketOverview {
  const now = new Date().toISOString();
  return {
    cryptos: [
      {
        symbol: 'BTC',
        price: 68542.23,
        percentChange24h: 2.34,
        marketCap: 1352459853291,
        volume24h: 43256789234,
        lastUpdated: now
      },
      {
        symbol: 'ETH',
        price: 3542.76,
        percentChange24h: 1.82,
        marketCap: 426789123456,
        volume24h: 21456789012,
        lastUpdated: now
      },
      {
        symbol: 'BNB',
        price: 576.32,
        percentChange24h: -0.75,
        marketCap: 89123456789,
        volume24h: 5234567890,
        lastUpdated: now
      },
      {
        symbol: 'SOL',
        price: 138.54,
        percentChange24h: 4.35,
        marketCap: 62345678901,
        volume24h: 8765432109,
        lastUpdated: now
      },
      {
        symbol: 'XRP',
        price: 0.6543,
        percentChange24h: -1.24,
        marketCap: 36789012345,
        volume24h: 3210987654,
        lastUpdated: now
      }
    ],
    btcDominance: 51.23,
    totalMarketCap: 2643568901234,
    totalVolume24h: 156789012345,
    marketCapChangePercentage24h: 1.85
  };
}

/**
 * Format giá với đơn vị tiền tệ
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    // Xử lý các altcoin có giá rất thấp
    return `$${price.toLocaleString('en-US', { minimumFractionDigits: price < 0.0001 ? 8 : (price < 0.01 ? 6 : 4), maximumFractionDigits: price < 0.0001 ? 8 : (price < 0.01 ? 6 : 4) })}`;
  }
}

/**
 * Format phần trăm thay đổi
 */
export function formatPercentChange(percentChange: number): string {
  const sign = percentChange >= 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(2)}%`;
}

/**
 * Format vốn hóa thị trường hoặc khối lượng giao dịch với đơn vị tỷ/triệu USD
 */
export function formatMarketCap(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  } else if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  } else {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
} 