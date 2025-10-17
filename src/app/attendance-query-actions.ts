'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export type AttendanceQuery = {
  userId?: string;
  startDate?: string;
  endDate?: string;
  officeName?: string;
  statusName?: string;
  fullName?: string;
  userCode?: string;
  limit?: number;
};

export type AttendanceStats = {
  totalRecords: number;
  byStatus: Record<string, number>;
  byOffice: Record<string, number>;
  byDate: Record<string, number>;
  recentRecords: any[];
};

/**
 * Truy vấn dữ liệu chấm công với các điều kiện lọc
 */
export async function queryAttendanceData(query: AttendanceQuery) {
  try {
    let supabaseQuery = supabaseAdmin
      .from('Chamcong')
      .select('*');

    // Áp dụng các bộ lọc
    if (query.userId) {
      supabaseQuery = supabaseQuery.eq('user_id', query.userId);
    }
    
    if (query.startDate) {
      supabaseQuery = supabaseQuery.gte('TimeKeepingDate', query.startDate);
    }
    
    if (query.endDate) {
      supabaseQuery = supabaseQuery.lte('TimeKeepingDate', query.endDate);
    }
    
    if (query.officeName) {
      supabaseQuery = supabaseQuery.eq('OfficeName', query.officeName);
    }
    
    if (query.statusName) {
      supabaseQuery = supabaseQuery.eq('statusname', query.statusName);
    }
    
    if (query.fullName) {
      supabaseQuery = supabaseQuery.ilike('FullName', `%${query.fullName}%`);
    }
    
    if (query.userCode) {
      supabaseQuery = supabaseQuery.ilike('UserCode', `%${query.userCode}%`);
    }

    // Sắp xếp theo ngày giảm dần
    supabaseQuery = supabaseQuery.order('TimeKeepingDate', { ascending: false });

    // Giới hạn số lượng kết quả
    if (query.limit) {
      supabaseQuery = supabaseQuery.limit(query.limit);
    }

    const { data, error } = await supabaseQuery;
    
    if (error) {
      console.error('Query attendance data error:', error);
      return { error: error.message };
    }

    return { data: data || [] };
  } catch (e: any) {
    console.error('Query attendance data error:', e);
    return { error: e.message || 'Không thể truy vấn dữ liệu chấm công' };
  }
}

/**
 * Lấy thống kê chấm công
 */
export async function getAttendanceStats(query: AttendanceQuery): Promise<{ data?: AttendanceStats; error?: string }> {
  try {
    const result = await queryAttendanceData(query);
    
    if (result.error) {
      return { error: result.error };
    }

    const records = result.data || [];
    
    // Thống kê theo trạng thái
    const byStatus: Record<string, number> = {};
    records.forEach(record => {
      const status = record.statusname || 'Không xác định';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    // Thống kê theo đơn vị
    const byOffice: Record<string, number> = {};
    records.forEach(record => {
      const office = record.OfficeName || 'Không xác định';
      byOffice[office] = (byOffice[office] || 0) + 1;
    });

    // Thống kê theo ngày
    const byDate: Record<string, number> = {};
    records.forEach(record => {
      const date = record.TimeKeepingDate || 'Không xác định';
      byDate[date] = (byDate[date] || 0) + 1;
    });

    // Lấy 10 bản ghi gần nhất
    const recentRecords = records.slice(0, 10).map(record => ({
      id: record.Id,
      fullName: record.FullName,
      officeName: record.OfficeName,
      statusName: record.statusname,
      timeKeepingDate: record.TimeKeepingDate,
      checkInAddress: record.CheckInAddress,
      userCode: record.UserCode
    }));

    const stats: AttendanceStats = {
      totalRecords: records.length,
      byStatus,
      byOffice,
      byDate,
      recentRecords
    };

    return { data: stats };
  } catch (e: any) {
    console.error('Get attendance stats error:', e);
    return { error: e.message || 'Không thể lấy thống kê chấm công' };
  }
}

/**
 * Tìm kiếm nhân viên theo tên hoặc mã nhân viên
 */
export async function searchEmployees(searchTerm: string, limit: number = 20) {
  try {
    const { data, error } = await supabaseAdmin
      .from('Chamcong')
      .select('FullName, UserCode, OfficeName')
      .or(`FullName.ilike.%${searchTerm}%,UserCode.ilike.%${searchTerm}%`)
      .limit(limit);

    if (error) {
      console.error('Search employees error:', error);
      return { error: error.message };
    }

    // Loại bỏ trùng lặp
    const uniqueEmployees = Array.from(
      new Map(
        (data || []).map(item => [
          `${item.FullName}-${item.UserCode}`,
          {
            fullName: item.FullName,
            userCode: item.UserCode,
            officeName: item.OfficeName
          }
        ])
      ).values()
    );

    return { data: uniqueEmployees };
  } catch (e: any) {
    console.error('Search employees error:', e);
    return { error: e.message || 'Không thể tìm kiếm nhân viên' };
  }
}

/**
 * Lấy danh sách tất cả đơn vị
 */
export async function getAllOffices() {
  try {
    const { data, error } = await supabaseAdmin
      .from('Chamcong')
      .select('OfficeName')
      .not('OfficeName', 'is', null);

    if (error) {
      console.error('Get offices error:', error);
      return { error: error.message };
    }

    // Lấy danh sách unique offices
    const offices = Array.from(
      new Set((data || []).map(item => item.OfficeName).filter(Boolean))
    ).sort();

    return { data: offices };
  } catch (e: any) {
    console.error('Get offices error:', e);
    return { error: e.message || 'Không thể lấy danh sách đơn vị' };
  }
}

/**
 * Lấy danh sách tất cả trạng thái chấm công
 */
export async function getAllAttendanceStatuses() {
  try {
    const { data, error } = await supabaseAdmin
      .from('Chamcong')
      .select('statusname')
      .not('statusname', 'is', null);

    if (error) {
      console.error('Get statuses error:', error);
      return { error: error.message };
    }

    // Lấy danh sách unique statuses
    const statuses = Array.from(
      new Set((data || []).map(item => item.statusname).filter(Boolean))
    ).sort();

    return { data: statuses };
  } catch (e: any) {
    console.error('Get statuses error:', e);
    return { error: e.message || 'Không thể lấy danh sách trạng thái' };
  }
}

/**
 * Lấy thống kê chấm công theo khoảng thời gian
 */
export async function getAttendanceByDateRange(startDate: string, endDate: string, officeName?: string) {
  try {
    const query: AttendanceQuery = {
      startDate,
      endDate,
      officeName,
      limit: 1000 // Tăng limit để có đủ dữ liệu thống kê
    };

    const result = await getAttendanceStats(query);
    
    if (result.error) {
      return { error: result.error };
    }

    return { data: result.data };
  } catch (e: any) {
    console.error('Get attendance by date range error:', e);
    return { error: e.message || 'Không thể lấy thống kê theo khoảng thời gian' };
  }
}
