// Script khắc phục lỗi recvWindow
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/actions/binance.ts');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Tìm và thay thế giá trị recvWindow
  const updatedContent = content.replace(
    /recvWindow: 120000, \/\/ Tăng từ 60000 lên 120000/g,
    'recvWindow: 59000, // Giảm xuống 59000ms, phải nhỏ hơn giới hạn 60000ms'
  );
  
  // Cập nhật thông báo log
  const updatedContent2 = updatedContent.replace(
    /console.log\('\[createSafeBinanceClient\] Đã khởi tạo Binance client với timestamp cố định -90000ms'\);/g,
    'console.log(\'[createSafeBinanceClient] Đã khởi tạo Binance client với timestamp cố định -90000ms và recvWindow=59000ms\');'
  );
  
  fs.writeFileSync(filePath, updatedContent2, 'utf8');
  console.log('File đã được cập nhật thành công!');
} catch (error) {
  console.error('Lỗi:', error);
} 