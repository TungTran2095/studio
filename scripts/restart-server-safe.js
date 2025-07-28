const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function restartServerSafe() {
  try {
    console.log('🔄 RESTARTING SERVER SAFELY...');
    
    // Bước 1: Kill tất cả process trên port 9002
    console.log('🔪 Killing processes trên port 9002...');
    try {
      const { stdout: netstatOutput } = await execAsync('netstat -ano | findstr :9002');
      const lines = netstatOutput.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5) {
          const pid = parts[4];
          if (pid && pid !== '0') {
            console.log(`🔪 Killing process PID: ${pid}`);
            try {
              await execAsync(`taskkill /PID ${pid} /F`);
              console.log(`✅ Đã kill process ${pid}`);
            } catch (killError) {
              console.log(`⚠️ Không thể kill process ${pid}:`, killError.message);
            }
          }
        }
      }
    } catch (netstatError) {
      console.log('ℹ️ Không có process nào trên port 9002');
    }

    // Bước 2: Đợi để đảm bảo port được giải phóng
    console.log('⏳ Đợi 5 giây để port được giải phóng...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Bước 3: Kiểm tra port đã được giải phóng chưa
    try {
      await execAsync('netstat -ano | findstr :9002');
      console.log('⚠️ Port 9002 vẫn còn process, đợi thêm...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.log('✅ Port 9002 đã được giải phóng');
    }

    // Bước 4: Start server
    console.log('🚀 Starting server...');
    console.log('💡 Sử dụng lệnh: npm run dev');
    console.log('💡 Hoặc: npm run dev-clean');
    
    // Không tự động start để tránh conflict
    console.log('\n✅ READY TO START SERVER!');
    console.log('📝 Hãy chạy: npm run dev');

  } catch (error) {
    console.error('❌ Lỗi:', error);
  }
}

// Chạy script
restartServerSafe().then(() => {
  console.log('\n🏁 Hoàn thành');
  process.exit(0);
}).catch(error => {
  console.error('❌ Lỗi:', error);
  process.exit(1);
}); 