import { NextResponse } from 'next/server';
import { TimeCheck } from '@/lib/time-check';
import { TimeSync } from '@/lib/time-sync';

export async function GET() {
  try {
    // Tạo báo cáo chi tiết về thời gian
    const report = await TimeCheck.generateReport();
    
    // Lấy giá trị offset đề xuất
    const suggestedOffset = await TimeCheck.suggestOffset();
    
    // Lấy thông tin về độ chênh lệch
    const driftInfo = await TimeCheck.checkTimeDrift();
    
    // Thông tin về hiệu số hiện tại
    const currentOffset = TimeSync.getOffset();
    
    // Tạo response đầy đủ thông tin
    return NextResponse.json({
      success: true,
      report: report,
      driftInfo: driftInfo,
      currentSettings: {
        offset: currentOffset,
        isSynchronized: TimeSync.isSynchronized,
      },
      suggestion: {
        offset: suggestedOffset,
        recvWindow: TimeSync.getOptimalRecvWindow(),
      }
    });
  } catch (error: any) {
    console.error('Lỗi API time-check:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi không xác định khi kiểm tra thời gian'
    }, { status: 500 });
  }
}

// Đồng bộ hóa với Binance và cập nhật offset
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Kiểm tra body.autoSync để quyết định có tự động đồng bộ hay không
    const autoSync = body.autoSync ?? true;
    
    if (autoSync) {
      // Tự động đề xuất và cập nhật offset
      const suggestedOffset = await TimeCheck.suggestOffset();
      TimeSync.setOffset(suggestedOffset);
      
      console.log(`[API] Đã tự động đồng bộ thời gian, thiết lập offset = ${suggestedOffset}ms`);
      
      // Trả về thông tin sau khi đồng bộ
      return NextResponse.json({
        success: true,
        message: 'Đã tự động đồng bộ thời gian với Binance server',
        newOffset: suggestedOffset,
        timeInfo: await TimeCheck.checkTimeDrift(),
      });
    } else if (body.offset !== undefined) {
      // Đặt offset thủ công từ người dùng
      const manualOffset = Number(body.offset);
      TimeSync.setOffset(manualOffset);
      
      console.log(`[API] Đã đặt offset thủ công = ${manualOffset}ms`);
      
      return NextResponse.json({
        success: true,
        message: 'Đã thiết lập offset thủ công',
        newOffset: manualOffset,
        timeInfo: await TimeCheck.checkTimeDrift(),
      });
    } else {
      // Chỉ đồng bộ với server nhưng không thay đổi offset
      await TimeSync.syncWithServer();
      
      return NextResponse.json({
        success: true,
        message: 'Đã đồng bộ với Binance server nhưng không thay đổi offset',
        currentOffset: TimeSync.getOffset(),
        timeInfo: await TimeCheck.checkTimeDrift(),
      });
    }
  } catch (error: any) {
    console.error('Lỗi API time-check POST:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi không xác định khi đồng bộ thời gian'
    }, { status: 500 });
  }
} 