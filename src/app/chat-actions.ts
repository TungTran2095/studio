'use server';

import { createClient } from '@supabase/supabase-js';
import { chat } from '@/ai/flows/chat';
import { attendanceChat } from '@/ai/flows/attendance-chat';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export type SendChatArgs = {
  userId: string;
  conversationId?: number;
  prompt: string;
};

export async function sendChatMessage(args: SendChatArgs) {
  const { userId, conversationId, prompt } = args;

  try {
    let convId = conversationId ?? null;

    if (!convId) {
      const { data: conv, error: convErr } = await supabaseAdmin
        .from('chat_conversations')
        .insert({ user_id: userId, title: prompt.slice(0, 80) })
        .select('id')
        .single();
      if (convErr) throw convErr;
      convId = conv.id as number;
    }

    const { error: insUserMsgErr } = await supabaseAdmin
      .from('chat_messages')
      .insert({ conversation_id: convId, user_id: userId, role: 'user', content: prompt });
    if (insUserMsgErr) throw insUserMsgErr;

    // Phân tích prompt để xác định có phải attendance query không
    const isAttendanceQuery = isAttendanceRelated(prompt);
    console.log('Chat prompt analysis:', { prompt, isAttendanceQuery });
    
    let aiRes;
    if (isAttendanceQuery) {
      console.log('Using attendance chat...');
      aiRes = await attendanceChat({ prompt, userId });
      console.log('Attendance chat result:', aiRes);
    } else {
      console.log('Using regular chat...');
      aiRes = await chat({ prompt, userId });
      console.log('Regular chat result:', aiRes);
    }

    const reply = aiRes.reply;
    const hasData = aiRes.hasData || false;

    const { error: insAssistantErr } = await supabaseAdmin
      .from('chat_messages')
      .insert({ conversation_id: convId, user_id: userId, role: 'assistant', content: reply });
    if (insAssistantErr) throw insAssistantErr;

    return { conversationId: convId, reply, hasData };
  } catch (e: any) {
    console.error('sendChatMessage error:', e);
    return { error: e.message || 'Không thể gửi tin nhắn' };
  }
}

/**
 * Kiểm tra xem prompt có liên quan đến attendance không
 */
function isAttendanceRelated(prompt: string): boolean {
  const lowerPrompt = prompt.toLowerCase();
  const attendanceKeywords = [
    'chấm công', 'attendance', 'điểm danh', 'checkin', 'check in',
    'giờ làm', 'thời gian làm việc', 'trạng thái chấm công',
    'vắng mặt', 'đi muộn', 'về sớm', 'nghỉ phép', 'làm thêm giờ',
    'đơn vị', 'bộ phận', 'phòng ban', 'office', 'department',
    'nhân viên', 'employee', 'staff', 'worker',
    'thống kê chấm công', 'báo cáo chấm công', 'số liệu chấm công',
    'lịch sử chấm công', 'dữ liệu chấm công'
  ];
  
  return attendanceKeywords.some(keyword => lowerPrompt.includes(keyword));
}

export async function getConversationMessages(conversationId: number, userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { messages: data };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function listConversations(userId: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .select('id, title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { conversations: data };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteConversation(conversationId: number, userId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);
    if (error) throw error;
    return { ok: true };
  } catch (e: any) {
    return { error: e.message };
  }
}


