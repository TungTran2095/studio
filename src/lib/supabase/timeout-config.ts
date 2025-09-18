import { createClient } from '@supabase/supabase-js';

// Cấu hình timeout cho Supabase
export const SUPABASE_TIMEOUT_CONFIG = {
  // Timeout cho các query thông thường (30 giây)
  DEFAULT_TIMEOUT: 30000,
  
  // Timeout cho các query phức tạp (5 phút)
  COMPLEX_QUERY_TIMEOUT: 300000,
  
  // Timeout cho các query rất phức tạp (10 phút)
  HEAVY_QUERY_TIMEOUT: 600000,
  
  // Limit cho các query để tránh timeout
  DEFAULT_LIMIT: 10000,
  MEDIUM_LIMIT: 5000,
  SMALL_LIMIT: 1000,
  
  // Batch size cho các operation lớn
  BATCH_SIZE: 1000
};

// Tạo Supabase client với timeout configuration
export function createSupabaseClientWithTimeout(timeout: number = SUPABASE_TIMEOUT_CONFIG.DEFAULT_TIMEOUT) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase environment variables not found');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    db: {
      schema: 'public',
    },
    auth: {
      persistSession: false,
    },
    global: {
      headers: {
        'x-connection-timeout': timeout.toString(),
      },
    },
  });
}

// Helper function để retry query với timeout
export async function executeWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeout: number = SUPABASE_TIMEOUT_CONFIG.DEFAULT_TIMEOUT,
  retries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Query timeout after ${timeout}ms`)), timeout);
      });
      
      const result = await Promise.race([queryFn(), timeoutPromise]);
      return result;
    } catch (error: any) {
      console.log(`Query attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('All query attempts failed');
}

// Helper function để chunk large queries
export async function executeChunkedQuery<T>(
  queryFn: (offset: number, limit: number) => Promise<{ data: T[] | null; error: any }>,
  chunkSize: number = SUPABASE_TIMEOUT_CONFIG.BATCH_SIZE
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    try {
      const { data, error } = await queryFn(offset, chunkSize);
      
      if (error) {
        throw error;
      }
      
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        results.push(...data);
        offset += chunkSize;
        
        // Nếu kết quả ít hơn chunk size, có nghĩa là đã hết dữ liệu
        if (data.length < chunkSize) {
          hasMore = false;
        }
      }
    } catch (error) {
      console.error(`Error in chunked query at offset ${offset}:`, error);
      throw error;
    }
  }
  
  return results;
}
