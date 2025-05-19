import { NextResponse } from 'next/server';

// Hàm lấy IP từ request
async function getRequestIP(request: Request): Promise<string> {
  // Thử lấy IP từ headers forwarded hoặc x-forwarded-for (nếu đang ở sau proxy)
  const forwarded = request.headers.get('x-forwarded-for') 
    || request.headers.get('forwarded')
    || 'unknown';
    
  // Nếu có nhiều IP, lấy IP đầu tiên
  const ipList = forwarded.split(',');
  const clientIP = ipList[0].trim() || 'unknown';
  
  if (clientIP !== 'unknown') {
    return clientIP;
  }
  
  // Nếu không tìm thấy từ headers, thử gọi API bên ngoài
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.error('Lỗi khi lấy IP từ ipify:', error);
    
    // Thử lại với API khác
    try {
      const response = await fetch('https://icanhazip.com');
      const ip = await response.text();
      return ip.trim() || 'unknown';
    } catch (error2) {
      console.error('Lỗi khi lấy IP từ icanhazip:', error2);
      return 'unknown';
    }
  }
}

// API endpoint để kiểm tra thông tin IP
export async function GET(request: Request) {
  try {
    const ip = await getRequestIP(request);
    
    // Thử lấy thêm thông tin về địa lý từ IP
    let geoInfo = null;
    try {
      const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
      geoInfo = await geoResponse.json();
    } catch (geoError) {
      console.error('Lỗi khi lấy thông tin địa lý từ IP:', geoError);
    }
    
    return NextResponse.json({
      success: true,
      ip: ip,
      geo: geoInfo,
      timestamp: new Date().toISOString(),
      instructions: {
        binance_mainnet: `Để sử dụng API trên Binance Mainnet, bạn cần thêm IP này vào danh sách được phép của API key`,
        binance_testnet: `Để sử dụng API trên Binance Testnet, truy cập https://testnet.binance.vision và đăng ký IP này`,
      }
    });
  } catch (error: any) {
    console.error('Lỗi kiểm tra IP:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Lỗi không xác định khi kiểm tra IP'
    }, { status: 500 });
  }
} 