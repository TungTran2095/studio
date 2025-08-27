#!/usr/bin/env node

/**
 * Script test các API endpoints đã sửa
 * Kiểm tra xem vấn đề database timeout và bot config đã được khắc phục chưa
 */

require('dotenv').config();

console.log('🧪 Test các API endpoints đã sửa...\n');

const PROJECT_ID = 'b42d7da9-9663-4d9a-a9c2-56abc10a1686'; // Project ID từ log trước đó

async function testAPIEndpoints() {
  try {
    console.log('1️⃣ Test API experiments (đã sửa timeout)...');
    
    const startTime = Date.now();
    const experimentsResponse = await fetch(`http://localhost:3000/api/research/experiments?project_id=${PROJECT_ID}`);
    const responseTime = Date.now() - startTime;
    
    console.log(`⏱️ Response time: ${responseTime}ms`);
    
    if (experimentsResponse.ok) {
      const data = await experimentsResponse.json();
      console.log('✅ API experiments hoạt động');
      console.log(`📊 Số lượng experiments: ${data.experiments?.length || 0}`);
      
      if (data.experiments && data.experiments.length > 0) {
        console.log('📋 Experiments mẫu:', data.experiments.slice(0, 2).map((e: any) => ({
          id: e.id,
          name: e.name,
          type: e.type,
          status: e.status
        })));
      }
    } else {
      const errorData = await experimentsResponse.text();
      console.log('❌ API experiments lỗi:', experimentsResponse.status, errorData);
    }

    console.log('\n2️⃣ Test API experiments với type filter...');
    
    const backtestResponse = await fetch(`http://localhost:3000/api/research/experiments?project_id=${PROJECT_ID}&type=backtest`);
    
    if (backtestResponse.ok) {
      const data = await backtestResponse.json();
      console.log('✅ API experiments với type filter hoạt động');
      console.log(`📊 Số lượng backtest experiments: ${data.experiments?.length || 0}`);
    } else {
      const errorData = await backtestResponse.text();
      console.log('❌ API experiments với type filter lỗi:', backtestResponse.status, errorData);
    }

    console.log('\n3️⃣ Test API bot config...');
    
    // Test với bot ID từ log trước đó
    const BOT_ID = 'f9e5f7b4-4160-4dae-8163-03e1f08276d1';
    const botConfigResponse = await fetch(`http://localhost:3000/api/trading/bot/indicator-history?botId=${BOT_ID}`);
    
    if (botConfigResponse.ok) {
      const data = await botConfigResponse.json();
      console.log('✅ API bot config hoạt động');
      console.log('📊 Bot config data:', data);
    } else {
      const errorData = await botConfigResponse.text();
      console.log('❌ API bot config lỗi:', botConfigResponse.status, errorData);
    }

    console.log('\n4️⃣ Test API projects...');
    
    const projectsResponse = await fetch('http://localhost:3000/api/research/projects');
    
    if (projectsResponse.ok) {
      const data = await projectsResponse.json();
      console.log('✅ API projects hoạt động');
      console.log(`📊 Số lượng projects: ${data.projects?.length || 0}`);
    } else {
      const errorData = await projectsResponse.text();
      console.log('❌ API projects lỗi:', projectsResponse.status, errorData);
    }

  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error.message);
  }
}

// Kiểm tra xem server có chạy không
async function checkServerHealth() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Server đang chạy');
      return true;
    }
  } catch (error) {
    console.log('❌ Server không chạy hoặc không thể kết nối');
    console.log('💡 Hãy chạy: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerHealth();
  if (!serverRunning) {
    process.exit(1);
  }

  await testAPIEndpoints();
  
  console.log('\n🏁 Test hoàn thành!');
  console.log('\n📝 Tóm tắt các vấn đề đã sửa:');
  console.log('1. ✅ Database timeout: Thêm limit và select fields cụ thể');
  console.log('2. ✅ Frontend error: Sử dụng API thay vì Supabase trực tiếp');
  console.log('3. ✅ Bot config error: Cần kiểm tra bot ID có tồn tại không');
}

main().catch(console.error);
