'use server';

/**
 * @fileOverview Chat functionality with attendance data integration.
 * 
 * - attendanceChat - A function that processes chat messages with attendance data queries.
 * - AttendanceChatInput - The input type for the attendanceChat function.
 * - AttendanceChatOutput - The return type for the attendanceChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { 
  queryAttendanceData, 
  getAttendanceStats, 
  searchEmployees, 
  getAllOffices, 
  getAllAttendanceStatuses,
  getAttendanceByDateRange,
  type AttendanceQuery 
} from '@/app/attendance-query-actions';

const AttendanceChatInputSchema = z.object({
  prompt: z.string().describe('The user prompt or question about attendance data.'),
  userId: z.string().describe('The user ID for context.'),
});

export type AttendanceChatInput = z.infer<typeof AttendanceChatInputSchema>;

const AttendanceChatOutputSchema = z.object({
  reply: z.string().describe('The AI response to the user query.'),
  hasData: z.boolean().describe('Whether the response contains data.'),
  attendanceData: z.any().optional().describe('Attendance data if relevant to the query.'),
});

export type AttendanceChatOutput = z.infer<typeof AttendanceChatOutputSchema>;

/**
 * Phân tích prompt để xác định loại query attendance
 */
function analyzeAttendanceQuery(prompt: string): {
  queryType: 'stats' | 'search' | 'list' | 'general';
  query: AttendanceQuery;
  searchTerm?: string;
} {
  const lowerPrompt = prompt.toLowerCase();
  
  // Xác định loại query
  if (lowerPrompt.includes('thống kê') || lowerPrompt.includes('số liệu') || lowerPrompt.includes('báo cáo')) {
    return { queryType: 'stats', query: {} };
  }
  
  if (lowerPrompt.includes('tìm') || lowerPrompt.includes('search') || lowerPrompt.includes('nhân viên')) {
    // Extract search term
    const searchMatch = prompt.match(/['"]([^'"]+)['"]|tìm\s+(.+?)(?:\s|$)/i);
    const searchTerm = searchMatch ? (searchMatch[1] || searchMatch[2]) : '';
    return { queryType: 'search', query: {}, searchTerm };
  }
  
  if (lowerPrompt.includes('danh sách') || lowerPrompt.includes('list')) {
    return { queryType: 'list', query: {} };
  }
  
  // Default to general query
  return { queryType: 'general', query: {} };
}

/**
 * Xử lý attendance query và trả về dữ liệu
 */
async function processAttendanceQuery(prompt: string): Promise<{ data?: any; error?: string }> {
  try {
    const { queryType, query, searchTerm } = analyzeAttendanceQuery(prompt);
    
    console.log('Analyzed query:', { queryType, query, searchTerm });
    
    switch (queryType) {
      case 'stats':
        console.log('Processing stats query...');
        const statsResult = await getAttendanceStats(query);
        console.log('Stats result:', statsResult);
        return statsResult;
        
      case 'search':
        if (searchTerm) {
          console.log('Processing search query for:', searchTerm);
          const searchResult = await searchEmployees(searchTerm);
          console.log('Search result:', searchResult);
          return searchResult;
        }
        return { error: 'Không tìm thấy từ khóa tìm kiếm' };
        
      case 'list':
        console.log('Processing list query...');
        // Lấy danh sách offices và statuses
        const [officesResult, statusesResult] = await Promise.all([
          getAllOffices(),
          getAllAttendanceStatuses()
        ]);
        
        console.log('List results:', { officesResult, statusesResult });
        
        return {
          data: {
            offices: officesResult.data || [],
            statuses: statusesResult.data || []
          }
        };
        
      default:
        console.log('Processing general query...');
        // For general queries, try to get basic stats
        const generalStatsResult = await getAttendanceStats({ limit: 100 });
        return generalStatsResult;
    }
  } catch (error: any) {
    console.error('Process attendance query error:', error);
    return { error: error.message || 'Không thể xử lý truy vấn chấm công' };
  }
}

export async function attendanceChat(input: AttendanceChatInput): Promise<AttendanceChatOutput> {
  try {
    const { prompt, userId } = input;
    
    console.log('Attendance chat input:', { prompt, userId });
    
    // Xử lý attendance query
    const queryResult = await processAttendanceQuery(prompt);
    
    console.log('Query result:', queryResult);
    
    // Tạo context cho AI
    let dataContext = '';
    let hasData = false;
    
    if (queryResult.data) {
      hasData = true;
      dataContext = `\n\nDữ liệu chấm công:\n${JSON.stringify(queryResult.data, null, 2)}`;
      console.log('Has data:', hasData, 'Data context length:', dataContext.length);
    }
    
    if (queryResult.error) {
      dataContext = `\n\nLỗi truy vấn dữ liệu: ${queryResult.error}`;
      console.log('Query error:', queryResult.error);
    }

    console.log('Processing attendance query for prompt:', prompt);

    // Tạo response đơn giản từ dữ liệu
    let reply = 'Không có dữ liệu chấm công.';
    
    if (queryResult.data) {
      // Format dữ liệu thành response dễ đọc
      const data = queryResult.data;
      
      if (data.byStatus) {
        // Thống kê theo trạng thái
        reply = `📊 **Thống kê chấm công hôm nay:**\n\n`;
        reply += `📈 **Tổng số bản ghi:** ${data.totalRecords}\n\n`;
        reply += `📋 **Phân bố theo trạng thái:**\n`;
        
        // Sắp xếp theo số lượng giảm dần
        const sortedStatuses = Object.entries(data.byStatus)
          .sort(([,a], [,b]) => (b as number) - (a as number));
        
        sortedStatuses.forEach(([status, count]) => {
          const percentage = ((count as number) / data.totalRecords * 100).toFixed(1);
          reply += `• **${status}:** ${count} (${percentage}%)\n`;
        });
        
        if (data.byOffice) {
          reply += `\n🏢 **Top 10 đơn vị có nhiều bản ghi nhất:**\n`;
          const sortedOffices = Object.entries(data.byOffice)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 10);
          
          sortedOffices.forEach(([office, count]) => {
            reply += `• **${office}:** ${count}\n`;
          });
        }
        
        reply += `\n💡 **Insights:**\n`;
        const topStatus = sortedStatuses[0];
        if (topStatus) {
          reply += `- Trạng thái phổ biến nhất: **${topStatus[0]}** (${topStatus[1]} bản ghi)\n`;
        }
        
        const validCount = data.byStatus['Hợp lệ'] || 0;
        const validPercentage = (validCount / data.totalRecords * 100).toFixed(1);
        reply += `- Tỷ lệ chấm công hợp lệ: **${validPercentage}%** (${validCount}/${data.totalRecords})\n`;
        
        const lateCount = data.byStatus['Đi muộn'] || 0;
        const latePercentage = (lateCount / data.totalRecords * 100).toFixed(1);
        reply += `- Tỷ lệ đi muộn: **${latePercentage}%** (${lateCount}/${data.totalRecords})\n`;
      } else if (Array.isArray(data)) {
        // Kết quả tìm kiếm nhân viên
        reply = `🔍 **Kết quả tìm kiếm nhân viên:**\n\n`;
        if (data.length === 0) {
          reply += `Không tìm thấy nhân viên nào.`;
        } else {
          reply += `Tìm thấy **${data.length}** nhân viên:\n\n`;
          data.slice(0, 10).forEach((employee, index) => {
            reply += `${index + 1}. **${employee.fullName}** (Mã: ${employee.userCode})\n`;
            reply += `   Đơn vị: ${employee.officeName}\n\n`;
          });
          if (data.length > 10) {
            reply += `... và ${data.length - 10} nhân viên khác.`;
          }
        }
      } else if (data.offices && data.statuses) {
        // Danh sách offices và statuses
        reply = `📋 **Danh sách hệ thống:**\n\n`;
        reply += `🏢 **Đơn vị (${data.offices.length} đơn vị):**\n`;
        data.offices.slice(0, 10).forEach((office, index) => {
          reply += `${index + 1}. ${office}\n`;
        });
        if (data.offices.length > 10) {
          reply += `... và ${data.offices.length - 10} đơn vị khác.\n\n`;
        }
        
        reply += `\n📊 **Trạng thái chấm công (${data.statuses.length} trạng thái):**\n`;
        data.statuses.forEach((status, index) => {
          reply += `${index + 1}. ${status}\n`;
        });
      }
    } else if (queryResult.error) {
      reply = `❌ **Lỗi:** ${queryResult.error}`;
    }
    
    console.log('Generated reply:', reply);

    return {
      reply,
      hasData,
      attendanceData: queryResult.data,
    };
  } catch (error: any) {
    console.error('Attendance chat error:', error);
    return {
      reply: 'Xin lỗi, đã có lỗi xảy ra khi xử lý câu hỏi về chấm công.',
      hasData: false,
    };
  }
}

const attendanceChatPrompt = ai.definePrompt({
  name: 'attendanceChatPrompt',
  input: { schema: AttendanceChatInputSchema },
  output: { schema: AttendanceChatOutputSchema },
  prompt: `Bạn là trợ lý AI chuyên về dữ liệu chấm công. Trả lời câu hỏi của người dùng về dữ liệu chấm công một cách hữu ích và chi tiết.

Người dùng hỏi: {{{prompt}}}
User ID: {{{userId}}}

Trả lời bằng tiếng Việt một cách tự nhiên và hữu ích.`,
});

const attendanceChatFlow = ai.defineFlow(
  {
    name: 'attendanceChatFlow',
    inputSchema: AttendanceChatInputSchema,
    outputSchema: AttendanceChatOutputSchema,
  },
  async input => {
    return await attendanceChat(input);
  }
);

export { attendanceChatFlow };
