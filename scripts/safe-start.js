/**
 * Script khởi động an toàn cho ứng dụng
 * - Đồng bộ thời gian với Binance API
 * - Kiểm tra và giải phóng port nếu cần
 * - Khởi động ứng dụng với Next.js
 */

const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { TimeSync } = require('../src/lib/time-sync');

// Cổng mặc định của ứng dụng
const PORT = 3000;

// Hàm sleep để đợi giữa các bước
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Đường dẫn đến script killport
const killportPath = path.join(__dirname, '../killport.js');

// Kiểm tra và giải phóng port nếu đang bị chiếm
async function freePortIfNeeded(port) {
  return new Promise((resolve) => {
    console.log(`Kiểm tra xem cổng ${port} có đang bị chiếm không...`);
    
    // Lệnh kiểm tra port
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port} | findstr LISTENING`
      : `lsof -i:${port} -t`;
    
    exec(command, async (error) => {
      // Nếu không có lỗi, cổng đang bị chiếm
      if (!error) {
        console.log(`Cổng ${port} đang bị chiếm. Đang cố gắng giải phóng...`);
        
        // Chạy script killport
        await new Promise((resolveKill) => {
          const killport = spawn('node', [killportPath, port], { stdio: 'inherit' });
          
          killport.on('close', (code) => {
            if (code === 0) {
              console.log(`Script killport đã chạy thành công.`);
            } else {
              console.warn(`Script killport đã thoát với mã ${code}.`);
            }
            resolveKill();
          });
        });
        
        // Đợi một chút để đảm bảo port đã được giải phóng
        await sleep(2000);
      } else {
        console.log(`Cổng ${port} không bị chiếm, có thể tiếp tục.`);
      }
      
      resolve();
    });
  });
}

// Đồng bộ thời gian với Binance API
async function syncTimeWithBinance() {
  console.log('Đồng bộ thời gian với Binance API...');
  try {
    await TimeSync.syncWithServer();
    console.log('Đồng bộ thời gian thành công!');
    
    // Đặt offset cực lớn để đảm bảo an toàn
    TimeSync.setOffset(-200000); // -200s
    console.log('Đã đặt offset thời gian thành -200000ms cho độ an toàn cao');
    
    return true;
  } catch (error) {
    console.error('Lỗi khi đồng bộ thời gian:', error);
    
    // Vẫn tiếp tục nhưng với offset an toàn
    TimeSync.setOffset(-240000); // -240s
    console.log('Đặt offset thời gian mặc định -240000ms');
    
    return false;
  }
}

// Khởi động ứng dụng Next.js
function startNextApp() {
  console.log('Khởi động ứng dụng Next.js...');
  
  // Sử dụng spawn để cho phép kiểm soát quá trình con
  const nextProcess = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    shell: true
  });
  
  nextProcess.on('error', (error) => {
    console.error('Lỗi khi khởi động ứng dụng:', error);
  });
  
  nextProcess.on('close', (code) => {
    if (code !== 0) {
      console.warn(`Ứng dụng đã thoát với mã lỗi ${code}`);
    }
  });
  
  console.log('Ứng dụng đã được khởi động. Nhấn Ctrl+C để thoát.');
}

// Hàm chính
async function main() {
  console.log('=== KHỞI ĐỘNG AN TOÀN CRYPTO TRADING APP ===');
  
  try {
    // Bước 1: Kiểm tra và giải phóng port
    await freePortIfNeeded(PORT);
    
    // Bước 2: Đồng bộ thời gian với Binance API
    await syncTimeWithBinance();
    
    // Bước 3: Khởi động ứng dụng
    startNextApp();
  } catch (error) {
    console.error('Lỗi không mong muốn:', error);
  }
}

// Chạy script
main(); 