import { NextApiRequest, NextApiResponse } from 'next';
import { getAllScenarios } from '@/agent/scenarios';
import { toolManager } from '@/agent/tools';

/**
 * API endpoint hiển thị thông tin về hệ thống AI Agent
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    // Lấy thông tin về các kịch bản
    const scenarios = getAllScenarios().map(scenario => ({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      triggers: scenario.triggers,
      requiredTools: scenario.requiredTools
    }));
    
    // Lấy thông tin về các công cụ
    const tools = toolManager.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description
    }));
    
    // Gửi kết quả về cho client
    return res.status(200).json({
      name: "Yinsen AI Agent",
      version: "1.0.0",
      description: "Hệ thống trợ lý giao dịch tiền điện tử bằng tiếng Việt",
      capabilities: [
        "Trò chuyện tổng quát",
        "Kiểm tra số dư tài khoản",
        "Giao dịch tiền điện tử",
        "Phân tích thị trường",
        "Phân tích kỹ thuật",
        "Tối ưu hóa danh mục đầu tư",
        "Đề xuất chiến lược giao dịch"
      ],
      scenarios,
      tools,
      totalScenarios: scenarios.length,
      totalTools: tools.length
    });
  } catch (error: any) {
    console.error('[API] Lỗi khi lấy thông tin AI Agent:', error);
    return res.status(500).json({
      error: 'Đã xảy ra lỗi khi lấy thông tin AI Agent',
      message: error.message || 'Unknown error'
    });
  }
} 