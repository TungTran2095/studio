'use server';

import { createClient } from '@supabase/supabase-js';
import type { WorkLogEntry } from '@/lib/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function getWorklogsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<WorkLogEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('worklogs')
      .select('*')
      .eq('user_id', userId)
      .gte('timestamp', startDate)
      .lte('timestamp', endDate)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching worklogs by date range:', error);
      return [];
    }

    return data.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp)
    })) as WorkLogEntry[];
  } catch (error) {
    console.error('Error in getWorklogsByDateRange:', error);
    return [];
  }
}

export async function getWorklogsByCategory(
  userId: string,
  category: string
): Promise<WorkLogEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('worklogs')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching worklogs by category:', error);
      return [];
    }

    return data.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp)
    })) as WorkLogEntry[];
  } catch (error) {
    console.error('Error in getWorklogsByCategory:', error);
    return [];
  }
}

export async function getWorklogsByKeyword(
  userId: string,
  keyword: string
): Promise<WorkLogEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('worklogs')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${keyword}%,description.ilike.%${keyword}%`)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching worklogs by keyword:', error);
      return [];
    }

    return data.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp)
    })) as WorkLogEntry[];
  } catch (error) {
    console.error('Error in getWorklogsByKeyword:', error);
    return [];
  }
}

export async function getWorklogsStats(userId: string) {
  try {
    // Lấy thống kê tổng quan
    const { data: totalData, error: totalError } = await supabaseAdmin
      .from('worklogs')
      .select('id')
      .eq('user_id', userId);

    if (totalError) {
      console.error('Error fetching total worklogs:', totalError);
      return null;
    }

    // Lấy thống kê theo ngày
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const { data: todayData, error: todayError } = await supabaseAdmin
      .from('worklogs')
      .select('id')
      .eq('user_id', userId)
      .gte('timestamp', startOfToday.toISOString())
      .lte('timestamp', endOfToday.toISOString());

    if (todayError) {
      console.error('Error fetching today worklogs:', todayError);
      return null;
    }

    // Lấy thống kê theo tuần
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const { data: weekData, error: weekError } = await supabaseAdmin
      .from('worklogs')
      .select('id')
      .eq('user_id', userId)
      .gte('timestamp', startOfWeek.toISOString())
      .lte('timestamp', endOfWeek.toISOString());

    if (weekError) {
      console.error('Error fetching week worklogs:', weekError);
      return null;
    }

    // Lấy thống kê theo tháng
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    const { data: monthData, error: monthError } = await supabaseAdmin
      .from('worklogs')
      .select('id')
      .eq('user_id', userId)
      .gte('timestamp', startOfMonth.toISOString())
      .lte('timestamp', endOfMonth.toISOString());

    if (monthError) {
      console.error('Error fetching month worklogs:', monthError);
      return null;
    }

    // Lấy thống kê theo category
    const { data: categoryData, error: categoryError } = await supabaseAdmin
      .from('worklogs')
      .select('category')
      .eq('user_id', userId);

    if (categoryError) {
      console.error('Error fetching category stats:', categoryError);
      return null;
    }

    const categoryStats = categoryData.reduce((acc: Record<string, number>, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});

    return {
      total: totalData.length,
      today: todayData.length,
      thisWeek: weekData.length,
      thisMonth: monthData.length,
      categoryStats
    };
  } catch (error) {
    console.error('Error in getWorklogsStats:', error);
    return null;
  }
}

export async function getRecentWorklogs(userId: string, limit: number = 5): Promise<WorkLogEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('worklogs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent worklogs:', error);
      return [];
    }

    return data.map(entry => ({
      ...entry,
      timestamp: new Date(entry.timestamp)
    })) as WorkLogEntry[];
  } catch (error) {
    console.error('Error in getRecentWorklogs:', error);
    return [];
  }
}








