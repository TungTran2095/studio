import { createClient } from '@supabase/supabase-js';

// Define the structure for your database tables (optional but recommended)
// Match the column names and types from your Supabase table definition
export interface MessageHistory {
  id: number; // Corresponds to bigint or int8, primary key
  created_at: string; // Corresponds to timestamptz
  role: 'user' | 'bot' | 'model'; // Cho phép 'model' như một vai trò hợp lệ, sẽ được chuyển sang 'bot' khi xử lý
  content: string; // Corresponds to text
}

// Define structure for OHLCV data
export interface OhlcvHistory {
    open_time: string; // ISO string (timestamptz), PRIMARY KEY
    open: number; // numeric
    high: number; // numeric
    low: number; // numeric
    close: number; // numeric
    volume: number; // numeric
    close_time: string; // ISO string (timestamptz)
    quote_asset_volume: number; // numeric
    number_of_trades: number; // bigint
    taker_buy_base_asset_volume: number; // numeric
    taker_buy_quote_asset_volume: number; // numeric
    inserted_at: string; // ISO string (timestamptz)
}


// Define Database interface
// This helps TypeScript understand your Supabase schema
export interface Database {
  public: {
    Tables: {
      message_history: {
        Row: MessageHistory; // The data expected from SELECT
        Insert: Omit<MessageHistory, 'id' | 'created_at'>;
        Update: Partial<Omit<MessageHistory, 'id' | 'created_at'>>;
      };
      // Add the new OHLCV table definition
      OHLCV_BTC_USDT_1m: {
          Row: OhlcvHistory; // Data type for SELECT
          // For Insert, omit fields auto-generated or defaulted by DB (inserted_at)
          Insert: Omit<OhlcvHistory, 'inserted_at'>;
          // For Update, typically update based on primary key (open_time)
          // Make other fields optional
          Update: Partial<Omit<OhlcvHistory, 'open_time' | 'inserted_at'>>;
      }
    };
    Views: {
      // Add views if needed
    };
    Functions: {
      // Add functions if needed
    };
  };
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helper function to validate URL format (moved before usage)
function isValidUrl(string: string | undefined): string is string {
  if (!string) return false;
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

let supabaseInstance = null;

if (!supabaseUrl) {
  console.error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
} else if (!isValidUrl(supabaseUrl)) {
    console.error(`Invalid URL in NEXT_PUBLIC_SUPABASE_URL: "${supabaseUrl}"`);
} else if (!supabaseAnonKey) {
  console.error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY');
} else {
  try {
    // Initialize the Supabase client ONLY if URL and Key are valid
    // Pass the Database generic for type safety
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey);
    console.log("Supabase client initialized successfully.");
  } catch (error: any) {
      console.error('Error initializing Supabase client:', error.message);
  }
}

// Export the potentially null instance
export const supabase = supabaseInstance;

if (!supabase) {
  console.error('Supabase client could not be initialized. Check environment variables and URL format.');
}
