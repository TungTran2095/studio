import { NextRequest, NextResponse } from 'next/server';
import { AgentMemory } from '@/ai/memory/agent-memory';
import { ReinforcementLearningModel } from '@/ai/models/reinforcement-learning';
import { MarketAnalysisAgent } from '@/agents/market-analysis-agent';
import { MultiAgentSystem } from '@/agents/multi-agent-system';

// Khởi tạo các thành phần của hệ thống agent
const agentMemory = new AgentMemory({
  experienceCapacity: 1000,
  longTermMemoryEnabled: true
});

const marketAnalysisAgent = new MarketAnalysisAgent(agentMemory);
const rlModel = new ReinforcementLearningModel(agentMemory);
const multiAgentSystem = new MultiAgentSystem(
  agentMemory,
  marketAnalysisAgent,
  rlModel,
  {
    mode: 'assisted',
    humanApprovalRequired: true
  }
);

/**
 * API Endpoint để yêu cầu AI Agent phân tích
 * 
 * Request: 
 * {
 *   "symbol": "BTC",
 *   "type": "market_analysis" | "decision" | "recommendation"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Đọc dữ liệu từ request
    const data = await request.json();
    const { symbol, type } = data;
    
    // Kiểm tra tham số đầu vào
    if (!symbol) {
      return NextResponse.json(
        { error: 'Thiếu tham số symbol' },
        { status: 400 }
      );
    }
    
    // Chuẩn hóa symbol
    const normalizedSymbol = symbol.toUpperCase();
    
    // Xử lý phân tích dựa trên loại yêu cầu
    switch (type) {
      case 'market_analysis':
        // Chỉ phân tích thị trường
        const marketInsight = await marketAnalysisAgent.analyzeMarket(normalizedSymbol);
        return NextResponse.json({
          success: true,
          data: marketInsight
        });
        
      case 'decision':
        // Phân tích và đưa ra quyết định
        const decision = await multiAgentSystem.analyzeAndDecide(normalizedSymbol);
        return NextResponse.json({
          success: true,
          data: decision
        });
        
      case 'recommendation':
      default:
        // Phân tích và đưa ra khuyến nghị (mặc định)
        const recommendation = await multiAgentSystem.analyzeAndDecide(normalizedSymbol);
        
        // Định dạng lại phản hồi để dễ đọc hơn cho người dùng
        return NextResponse.json({
          success: true,
          data: {
            symbol: normalizedSymbol,
            recommendation: recommendation.action.type,
            confidence: recommendation.confidence,
            reasoning: recommendation.reasoning,
            expectedProfit: recommendation.expectedOutcome.profitPotential,
            risk: recommendation.expectedOutcome.risk,
            timeframe: recommendation.expectedOutcome.timeframe,
            marketCondition: multiAgentSystem.getSystemState().markets[normalizedSymbol]?.marketCondition || 'unknown',
            timestamp: new Date().toISOString()
          }
        });
    }
  } catch (error: any) {
    console.error('[API/agent/analyze] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Lỗi khi phân tích' 
      },
      { status: 500 }
    );
  }
} 