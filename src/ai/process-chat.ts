/**
 * Process Chat
 * 
 * Module xử lý tin nhắn chat sử dụng hệ thống cũ
 */

import { ChatMessage } from '@/types/chat';
import { YinsenAgent } from '@/agent';

// Cache các instance agent
const agentInstances: Record<string, YinsenAgent> = {};

/**
 * Xử lý tin nhắn chat và trả về phản hồi
 */
export async function processChat(
  messages: ChatMessage[], 
  userId: string
): Promise<ChatMessage> {
  console.log(`[process-chat] Xử lý ${messages.length} tin nhắn cho người dùng ${userId}`);
  
  // Tạo một ID duy nhất cho agent dựa trên thông tin người dùng
  const agentId = `${userId || 'guest'}`;
  
  // Khởi tạo hoặc lấy agent đã tồn tại
  if (!agentInstances[agentId]) {
    console.log(`[process-chat] Khởi tạo agent mới cho người dùng ${userId || 'khách'}`);
    
    // Khởi tạo context ban đầu cho AI Agent
    const initialContext = {
      userName: userId || 'khách',
      apiKey: '',
      apiSecret: '',
      isTestnet: true
    };
    
    // Khởi tạo Agent và lưu vào cache
    agentInstances[agentId] = new YinsenAgent(initialContext);
  }
  
  // Lấy agent từ cache
  const agent = agentInstances[agentId];
  
  // Lấy tin nhắn cuối cùng (từ người dùng)
  const lastMessage = messages[messages.length - 1];
  
  try {
    // Xử lý tin nhắn
    console.log(`[process-chat] Xử lý tin nhắn "${lastMessage.content}" từ ${userId || 'khách'}`);
    const result = await agent.processMessage(lastMessage.content);
    
    // Tạo tin nhắn phản hồi
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: result.response,
      metadata: {
        actions: result.actions || [],
        timestamp: Date.now()
      }
    };
    
    return assistantMessage;
  } catch (error: any) {
    console.error(`[process-chat] Lỗi khi xử lý tin nhắn:`, error);
    
    // Trả về tin nhắn lỗi
    return {
      role: 'assistant',
      content: `Đã xảy ra lỗi khi xử lý tin nhắn: ${error.message || 'Lỗi không xác định'}`,
      metadata: {
        error: true,
        timestamp: Date.now()
      }
    };
  }
} 