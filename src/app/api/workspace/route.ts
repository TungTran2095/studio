import { NextRequest, NextResponse } from 'next/server';
import { isWorkspaceRequest, identifyWorkspaceAction, executeWorkspaceAction } from '@/ai/tools/workspace-tools';

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json({ 
        success: false, 
        error: 'Message is required' 
      }, { status: 400 });
    }
    
    console.log(`🤖 [WorkspaceAPI] Processing message: "${message}"`);
    
    // Check if this is a workspace request
    if (!isWorkspaceRequest(message)) {
      return NextResponse.json({
        success: true,
        isWorkspaceRequest: false,
        response: '🤖 Đây không phải yêu cầu workspace. Tôi có thể giúp bạn với:\n- Thu thập dữ liệu crypto\n- Quản lý jobs\n- Tin tức thị trường\n- Dữ liệu real-time\n\nHãy thử các ví dụ!'
      });
    }
    
    // Identify and execute workspace action
    const workspaceRequest = identifyWorkspaceAction(message);
    
    if (workspaceRequest.action === 'none') {
      return NextResponse.json({
        success: true,
        isWorkspaceRequest: true,
        response: '🤖 Tôi nhận ra đây là yêu cầu workspace, nhưng chưa hiểu rõ. Vui lòng thử các ví dụ cụ thể hơn.'
      });
    }
    
    // Execute workspace action
    const workspaceResponse = await executeWorkspaceAction(workspaceRequest.action, workspaceRequest.params);
    
    return NextResponse.json({
      success: true,
      isWorkspaceRequest: true,
      action: workspaceRequest.action,
      params: workspaceRequest.params,
      response: `🤖 **Yinsen đã thực hiện yêu cầu workspace:**\n\n${workspaceResponse}\n\n💡 *Tôi có thể giúp bạn quản lý thu thập dữ liệu, jobs, tin tức và dữ liệu real-time!*`
    });
    
  } catch (error: any) {
    console.error('❌ [WorkspaceAPI] Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
      response: `❌ Lỗi khi xử lý yêu cầu workspace: ${error?.message || 'Unknown error'}`
    }, { status: 500 });
  }
} 