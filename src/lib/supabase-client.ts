import { createClient } from '@supabase/supabase-js';

// Define the structure for your database tables (optional but recommended)
// Match the column names and types from your Supabase table definition
export interface MessageHistory {
  id: number; // Corresponds to bigint or int8, primary key
  created_at: string; // Corresponds to timestamptz
  role: 'user' | 'bot'; // Chỉ cho phép 'user' và 'bot' như vai trò hợp lệ
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

// Define structure for Book data
export interface Book {
  id: string;         // Unique identifier
  title: string;      // Book title
  author: string;     // Author name
  description: string; // Book description
  file_path: string;  // Path in Supabase Storage
  cover_path: string; // Path to cover image in Supabase Storage
  file_type: string;  // File type (PDF, EPUB, etc.)
  created_at: string; // When the book was added
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
      };
      // Book table definition if needed
      books: {
        Row: Book;
        Insert: Omit<Book, 'id' | 'created_at'>;
        Update: Partial<Omit<Book, 'id' | 'created_at'>>;
      }
    };
    Views: {
      // Add views if needed
    };
    Functions: {
      // Add functions if needed
    };
  };
  storage: {
    Buckets: {
      books: {
        Row: {
          id: string;
          name: string;
          owner: string;
          created_at: string;
          updated_at: string;
          public: boolean;
        }
      }
    };
    Objects: {
      books: {
        Row: {
          name: string;
          bucket_id: string;
          owner: string;
          created_at: string;
          updated_at: string;
          last_accessed_at: string;
          metadata: Record<string, any>;
          id: string;
          size: number;
          mime_type: string;
        }
      }
    }
  }
}


// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
let supabaseInstance: any = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    // Validate URL format
    if (!supabaseUrl.startsWith('https://')) {
      console.error(`Invalid URL in NEXT_PUBLIC_SUPABASE_URL: "${supabaseUrl}"`);
    } else {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
      console.log('✅ Supabase client initialized successfully');
    }
  } catch (error) {
    console.error('❌ Error creating Supabase client:', error);
  }
} else {
  console.warn('⚠️ Supabase environment variables not available - client not initialized');
  if (!supabaseUrl) {
    console.error('Missing environment variable NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey) {
    console.error('Missing environment variable NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// Export the potentially null instance
export const supabase = supabaseInstance;

if (!supabase) {
  console.error('Supabase client could not be initialized. Check environment variables and URL format.');
}

// Helper function to build a Storage URL for a given file path
export function getStorageUrl(bucket: string, filePath: string): string | null {
  if (!supabase || !supabaseUrl) return null;

  // Ensure filePath is properly formatted (no leading slash)
  const cleanPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
  
  // Construct the storage URL
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
}

// Helper to fetch book list from storage
export async function listBooksFromStorage(): Promise<{
  data: Array<{
    name: string;
    id: string;
    metadata: Record<string, any> | null;
  }> | null;
  error: Error | null;
}> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase client not initialized') };
  }

  try {
    const { data, error } = await supabase.storage.from('books').list();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error listing books from storage:', error);
    return { data: null, error: error as Error };
  }
}
