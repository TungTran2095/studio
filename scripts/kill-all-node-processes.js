const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function killAllNodeProcesses() {
  try {
    console.log('💀 KILLING ALL NODE PROCESSES...\n');

    // 1. Tìm tất cả process Node.js
    console.log('1. Finding all Node.js processes...');
    try {
      const { stdout: tasklistOutput } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
      const lines = tasklistOutput.split('\n').filter(line => line.trim() && !line.includes('Image Name'));
      
      if (lines.length === 0) {
        console.log('✅ No Node.js processes found');
        return;
      }

      console.log(`📋 Found ${lines.length} Node.js processes:`);
      lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const pid = parts[1].replace(/"/g, '');
          console.log(`   - PID: ${pid}`);
        }
      });

      // 2. Kill tất cả process Node.js
      console.log('\n2. Killing all Node.js processes...');
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 2) {
          const pid = parts[1].replace(/"/g, '');
          try {
            console.log(`🔪 Killing Node.js process PID: ${pid}`);
            await execAsync(`taskkill /PID ${pid} /F`);
            console.log(`✅ Killed process ${pid}`);
          } catch (killError) {
            console.log(`⚠️  Could not kill process ${pid}: ${killError.message}`);
          }
        }
      }

    } catch (tasklistError) {
      console.log('⚠️  Could not find Node.js processes:', tasklistError.message);
    }

    // 3. Tìm và kill process trên port 9002
    console.log('\n3. Finding processes on port 9002...');
    try {
      const { stdout: netstatOutput } = await execAsync('netstat -ano | findstr :9002');
      const lines = netstatOutput.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        console.log('✅ No processes found on port 9002');
      } else {
        console.log(`📋 Found ${lines.length} processes on port 9002:`);
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            const pid = parts[4];
            if (pid && pid !== '0') {
              console.log(`   - PID: ${pid}`);
              try {
                console.log(`🔪 Killing process on port 9002, PID: ${pid}`);
                await execAsync(`taskkill /PID ${pid} /F`);
                console.log(`✅ Killed process ${pid}`);
              } catch (killError) {
                console.log(`⚠️  Could not kill process ${pid}: ${killError.message}`);
              }
            }
          }
        }
      }
    } catch (netstatError) {
      console.log('⚠️  Could not find processes on port 9002:', netstatError.message);
    }

    // 4. Đợi một chút
    console.log('\n4. Waiting for processes to be killed...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 5. Kiểm tra lại
    console.log('\n5. Final check...');
    try {
      const { stdout: finalCheck } = await execAsync('tasklist /FI "IMAGENAME eq node.exe" /FO CSV');
      const finalLines = finalCheck.split('\n').filter(line => line.trim() && !line.includes('Image Name'));
      
      if (finalLines.length === 0) {
        console.log('✅ All Node.js processes killed successfully!');
      } else {
        console.log(`⚠️  ${finalLines.length} Node.js processes still running:`);
        finalLines.forEach(line => {
          const parts = line.split(',');
          if (parts.length >= 2) {
            const pid = parts[1].replace(/"/g, '');
            console.log(`   - PID: ${pid}`);
          }
        });
      }
    } catch (finalCheckError) {
      console.log('⚠️  Could not perform final check:', finalCheckError.message);
    }

    console.log('\n🎯 Kill operation completed!');
    console.log('💡 You can now restart the server with: npm run dev');

  } catch (error) {
    console.error('❌ Kill operation failed:', error.message);
  }
}

// Chạy kill operation
killAllNodeProcesses(); 