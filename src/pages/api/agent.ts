import { NextApiRequest, NextApiResponse } from 'next';
import { ChatMessage } from '@/types/chat';
import { processChat } from '@/ai/process-chat';
import { processQueryWithUpgrades, initializeAgentUpgrades } from '@/integrations/activate-upgrades';

// Khởi tạo các cải tiến khi server khởi động
initializeAgentUpgrades().catch(error => {
  console.error('[API/agent] Lỗi khi khởi tạo cải tiến agent:', error);
});

// Cache các agent đã khởi tạo
const agentInstances: Record<string, any> = {};

/**
 * API endpoint xử lý tin nhắn thông qua AI Agent
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  try {
    const { messages, userId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Thiếu messages trong request body' });
    }

    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage.role !== 'user') {
      return res.status(400).json({ error: 'Tin nhắn cuối cùng phải từ người dùng' });
    }
    
    // Sử dụng hệ thống nâng cấp để xử lý truy vấn
    try {
      console.log(`[API/agent] Xử lý truy vấn người dùng với hệ thống nâng cấp: "${lastMessage.content}"`);
      
      const context = {
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content
        })),
        userId
      };
      
      const result = await processQueryWithUpgrades(lastMessage.content, context);
      
      // Kiểm tra xem có lỗi không bằng cách kiểm tra kết quả
      const hasError = !result || !result.result || typeof result.result === 'string' && result.result.includes('Lỗi');
      
      if (hasError) {
        console.log('[API/agent] Hệ thống nâng cấp không xử lý được, chuyển sang xử lý thông thường');
        // Nếu không xử lý được, sử dụng hệ thống cũ
        const assistantMessage = await processChat(messages, userId);
        return res.status(200).json({ message: assistantMessage });
      }
      
      // Trả về kết quả từ hệ thống nâng cấp
      return res.status(200).json({ 
        message: {
          role: 'assistant',
          content: result.result,
          tools: result.tools,
          metadata: {
            format: result.format,
            timestamp: Date.now()
          }
        }
      });
    } catch (upgradeError: any) {
      console.error('[API/agent] Lỗi khi xử lý với hệ thống nâng cấp:', upgradeError);
      console.log('[API/agent] Chuyển sang xử lý thông thường');
      
      // Nếu có lỗi, sử dụng hệ thống cũ
      const assistantMessage = await processChat(messages, userId);
      return res.status(200).json({ message: assistantMessage });
    }
  } catch (error: any) {
    console.error('[API/agent] Error:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 