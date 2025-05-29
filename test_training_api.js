const fetch = require('node-fetch');

async function testTrainingAPI() {
  try {
    console.log('🧪 Testing Training API with Date Range...');
    
    // 1. Test dataset API with specific date range
    console.log('\n📊 Testing Dataset API with date range...');
    const datasetResponse = await fetch('http://localhost:9002/api/datasets/supabase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sampleSize: 500,
        trainTestSplit: 80,
        startDate: '2025-02-25',
        endDate: '2025-02-28'
      })
    });
    
    if (datasetResponse.ok) {
      const datasetData = await datasetResponse.json();
      console.log('✅ Dataset API working:', {
        total: datasetData.dataset.total,
        trainSize: datasetData.dataset.metadata.trainSize,
        testSize: datasetData.dataset.metadata.testSize,
        dateRange: `${datasetData.dataset.metadata.startDate} to ${datasetData.dataset.metadata.endDate}`
      });
    } else {
      const error = await datasetResponse.text();
      console.log('❌ Dataset API failed:', error);
      return;
    }
    
    // 2. Test training API with reduced stderr output
    console.log('\n🚀 Testing Training API with improved logging...');
    const trainingResponse = await fetch('http://localhost:9002/api/models/train', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model_id: 'test_model_' + Date.now(),
        project_id: 'test_project',
        algorithm_type: 'Linear Regression',
        parameters: {
          fit_intercept: true,
          normalize: false,
          n_jobs: 1,
          lookback_window: 5
        },
        dataset_config: {
          sampleSize: 500,
          trainTestSplit: 80,
          startDate: '2025-02-25',
          endDate: '2025-02-28'
        }
      })
    });
    
    if (trainingResponse.ok) {
      const trainingData = await trainingResponse.json();
      console.log('✅ Training API working:', {
        success: trainingData.success,
        message: trainingData.message,
        dataset_info: trainingData.dataset_info
      });
      
      // Wait a bit for training to complete
      console.log('\n⏳ Waiting for training to complete...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      console.log('✅ Training should be completed. Check server logs for stderr output.');
      
    } else {
      const error = await trainingResponse.text();
      console.log('❌ Training API failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testTrainingAPI(); 