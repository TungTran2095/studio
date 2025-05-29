-- Research Projects Table
CREATE TABLE IF NOT EXISTS research_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    objective TEXT,
    status VARCHAR(50) DEFAULT 'active',
    progress INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research Models Table
CREATE TABLE IF NOT EXISTS research_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES research_projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'prediction',
    algorithm_type VARCHAR(100) NOT NULL,
    description TEXT,
    hyperparameters JSONB DEFAULT '{}',
    dataset_id UUID,
    target_column VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    training_started_at TIMESTAMP WITH TIME ZONE,
    training_completed_at TIMESTAMP WITH TIME ZONE,
    training_error TEXT,
    performance_metrics JSONB,
    model_artifacts JSONB,
    training_config JSONB,
    training_logs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research Datasets Table
CREATE TABLE IF NOT EXISTS research_datasets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    file_path VARCHAR(500),
    columns JSONB,
    rows INTEGER,
    file_size BIGINT,
    file_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'uploaded',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_research_models_project_id ON research_models(project_id);
CREATE INDEX IF NOT EXISTS idx_research_models_status ON research_models(status);
CREATE INDEX IF NOT EXISTS idx_research_datasets_status ON research_datasets(status);

-- Insert sample data
INSERT INTO research_projects (name, description, objective) VALUES 
('Crypto Price Prediction', 'Dự đoán giá cryptocurrency sử dụng LSTM và ML models', 'Tối ưu hóa độ chính xác dự đoán giá Bitcoin và Ethereum'),
('Stock Market Analysis', 'Phân tích thị trường chứng khoán với các chỉ số tài chính', 'Xây dựng strategy trading tự động')
ON CONFLICT DO NOTHING; 