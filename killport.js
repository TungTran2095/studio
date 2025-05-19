/**
 * Script để tự động giải phóng port 9002 đang bị chiếm
 * Cách sử dụng: node killport.js [port]
 * Mặc định sẽ giải phóng port 9002 nếu không chỉ định port
 */

const { exec } = require('child_process');

// Port mặc định là 9002, nhưng có thể nhập từ tham số dòng lệnh
const PORT = process.argv[2] || 9002;

// Hàm sleep để đợi giữa các lần thử
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm tìm tất cả PID chiếm cổng dựa trên hệ điều hành
function findPids(port) {
  return new Promise((resolve, reject) => {
    // Lệnh khác nhau cho Windows và Linux/Mac
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port}`
      : `lsof -i:${port} -t`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        // Nếu lỗi có thể không có process nào đang chiếm cổng
        resolve([]);
        return;
      }

      if (process.platform === 'win32') {
        // Xử lý output trên Windows - tìm tất cả các PID
        const lines = stdout.split('\n').filter(line => line.includes(`LISTENING`) || line.includes(`ESTABLISHED`));
        
        const pids = new Set(); // Sử dụng Set để loại bỏ trùng lặp
        
        for (const line of lines) {
          if (line.trim()) {
            // Lấy PID từ cột cuối cùng của output
            const pid = line.trim().split(/\s+/).pop();
            if (pid && !isNaN(parseInt(pid))) {
              pids.add(pid);
            }
          }
        }
        
        if (pids.size > 0) {
          console.log(`Tìm thấy ${pids.size} process đang sử dụng cổng ${port}: ${Array.from(pids).join(', ')}`);
          resolve(Array.from(pids));
        } else {
          resolve([]);
        }
      } else {
        // Trên Linux/Mac, mỗi dòng là một PID
        const pids = stdout.trim().split('\n').filter(pid => pid.trim());
        if (pids.length > 0) {
          console.log(`Tìm thấy ${pids.length} process đang sử dụng cổng ${port}: ${pids.join(', ')}`);
          resolve(pids);
        } else {
          resolve([]);
        }
      }
    });
  });
}

// Hàm kiểm tra xem port có còn bị chiếm không
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const command = process.platform === 'win32'
      ? `netstat -ano | findstr :${port} | findstr LISTENING`
      : `lsof -i:${port} -t`;
    
    exec(command, (error) => {
      // Nếu có lỗi, port không bị chiếm
      resolve(!error);
    });
  });
}

// Hàm kill process dựa trên PID
function killProcess(pid) {
  return new Promise((resolve, reject) => {
    console.log(`Đang kill process ${pid}...`);
    
    const command = process.platform === 'win32'
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Lỗi khi kill process ${pid}:`, error.message);
        resolve(false); // Không reject để cho phép thử các PID khác
        return;
      }
      console.log(`Đã kill process ${pid} thành công!`);
      resolve(true);
    });
  });
}

// Hàm giải phóng cổng với nhiều lần thử
async function freePort(port, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`Thử lần ${attempt}/${maxAttempts} để giải phóng cổng ${port}...`);
    
    // Tìm tất cả PID đang sử dụng cổng
    const pids = await findPids(port);
    
    if (pids.length === 0) {
      console.log(`Không tìm thấy process nào đang sử dụng cổng ${port}.`);
      
      // Kiểm tra lại xem cổng có thực sự được giải phóng chưa
      const inUse = await isPortInUse(port);
      if (!inUse) {
        console.log(`Xác nhận cổng ${port} đã được giải phóng.`);
        return true;
      } else {
        console.log(`Cổng ${port} vẫn bị chiếm nhưng không tìm thấy PID. Thử lại...`);
      }
    } else {
      // Kill tất cả các process tìm được
      let allKilled = true;
      for (const pid of pids) {
        const success = await killProcess(pid);
        if (!success) {
          allKilled = false;
        }
      }
      
      // Đợi một chút để chắc chắn process đã bị kill hoàn toàn
      await sleep(1000);
      
      // Kiểm tra lại xem cổng đã thực sự được giải phóng chưa
      const inUse = await isPortInUse(port);
      if (!inUse) {
        console.log(`Xác nhận cổng ${port} đã được giải phóng.`);
        return true;
      } else {
        console.log(`Cổng ${port} vẫn bị chiếm sau khi kill. Thử lại...`);
      }
    }
    
    // Đợi trước khi thử lại
    if (attempt < maxAttempts) {
      await sleep(2000);
    }
  }
  
  console.error(`Không thể giải phóng cổng ${port} sau ${maxAttempts} lần thử.`);
  return false;
}

// Chạy script
async function main() {
  try {
    console.log(`=== KILLPORT UTILITY ===`);
    console.log(`Đang cố gắng giải phóng cổng ${PORT}...`);
    
    const success = await freePort(PORT);
    
    if (success) {
      console.log(`✅ Cổng ${PORT} đã được giải phóng thành công.`);
    } else {
      console.error(`❌ Không thể giải phóng cổng ${PORT}. Bạn có thể thử kill process thủ công.`);
      console.log(`Gợi ý: Nếu bạn đang sử dụng Windows, hãy mở Task Manager và tìm process đang sử dụng cổng ${PORT}.`);
    }
  } catch (error) {
    console.error('Lỗi không mong muốn:', error);
  }
}

main(); 