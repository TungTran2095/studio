/**
 * A2A (Agent-to-Agent Protocol) Handler cho Yinsen
 * 
 * File này triển khai A2A protocol để Yinsen có thể giao tiếp với các agent khác,
 * trao đổi khả năng, và thực hiện phối hợp.
 */

/**
 * Định nghĩa cấu trúc tin nhắn A2A
 */
export interface A2AMessage {
  messageId: string;
  senderId: string;
  receiverId: string;
  content: any;
  metadata: {
    messageType: 'request' | 'response' | 'notification';
    timestamp: number;
    capabilities?: string[];
    conversationId?: string;
  };
}

/**
 * Định nghĩa kiểu kết nối agent
 */
interface AgentConnection {
  endpoint: string;
  capabilities: string[];
  lastSeen?: number;
  status: 'online' | 'offline' | 'busy';
}

/**
 * Xử lý A2A Protocol cho Yinsen
 */
export class A2AProtocolHandler {
  private agentId: string;
  private connectedAgents: Map<string, AgentConnection> = new Map();
  private capabilities: string[] = [];
  private messageQueue: A2AMessage[] = [];
  private messageCallbacks: Map<string, (response: A2AMessage) => void> = new Map();
  
  constructor(agentId: string) {
    this.agentId = agentId;
    console.log(`[A2A] Khởi tạo A2A Protocol Handler cho agent ${agentId}`);
  }
  
  /**
   * Đăng ký khả năng của agent
   */
  public registerCapabilities(capabilities: string[]): void {
    this.capabilities = [...capabilities];
    console.log(`[A2A] Agent ${this.agentId} đã đăng ký ${capabilities.length} khả năng: ${capabilities.join(', ')}`);
  }
  
  /**
   * Đăng ký agent mới
   */
  public registerAgent(agentId: string, endpoint: string, capabilities: string[]): void {
    this.connectedAgents.set(agentId, { 
      endpoint, 
      capabilities,
      lastSeen: Date.now(),
      status: 'online'
    });
    
    console.log(`[A2A] Đã đăng ký agent ${agentId} với ${capabilities.length} khả năng`);
    this.announcePresence(agentId);
  }
  
  /**
   * Thông báo sự hiện diện cho agent khác
   */
  private announcePresence(targetAgentId?: string): void {
    const message: A2AMessage = {
      messageId: this.generateMessageId(),
      senderId: this.agentId,
      receiverId: targetAgentId || 'broadcast',
      content: {
        action: 'announce',
        capabilities: this.capabilities
      },
      metadata: {
        messageType: 'notification',
        timestamp: Date.now(),
        capabilities: this.capabilities
      }
    };
    
    if (targetAgentId) {
      this.transmitMessage(message);
    } else {
      // Gửi đến tất cả agent đã kết nối
      this.broadcastMessage(message);
    }
  }
  
  /**
   * Tìm kiếm agent có khả năng cụ thể
   */
  public discoverAgents(capability: string): string[] {
    const capableAgents: string[] = [];
    
    this.connectedAgents.forEach((connection, agentId) => {
      if (connection.capabilities.includes(capability)) {
        capableAgents.push(agentId);
      }
    });
    
    return capableAgents;
  }
  
  /**
   * Gửi tin nhắn đến agent khác
   */
  public async sendMessage(
    receiverId: string, 
    content: any, 
    messageType: 'request' | 'response' | 'notification' = 'request',
    conversationId?: string
  ): Promise<A2AMessage> {
    const message: A2AMessage = {
      messageId: this.generateMessageId(),
      senderId: this.agentId,
      receiverId,
      content,
      metadata: {
        messageType,
        timestamp: Date.now(),
        conversationId: conversationId || `conv_${Date.now()}`
      }
    };
    
    // Thêm vào hàng đợi và gửi
    this.messageQueue.push(message);
    await this.transmitMessage(message);
    
    return message;
  }
  
  /**
   * Gửi tin nhắn đến tất cả agent đã kết nối
   */
  private async broadcastMessage(message: A2AMessage): Promise<void> {
    const broadcastPromises: Promise<void>[] = [];
    
    this.connectedAgents.forEach((connection, agentId) => {
      const targetMessage: A2AMessage = {
        ...message,
        receiverId: agentId
      };
      
      broadcastPromises.push(this.transmitMessage(targetMessage));
    });
    
    await Promise.all(broadcastPromises);
  }
  
  /**
   * Gửi tin nhắn qua HTTP/WebSocket
   */
  private async transmitMessage(message: A2AMessage): Promise<void> {
    const connection = this.connectedAgents.get(message.receiverId);
    
    if (!connection && message.receiverId !== 'broadcast') {
      console.warn(`[A2A] Không thể gửi tin nhắn đến agent không xác định: ${message.receiverId}`);
      return;
    }
    
    console.log(`[A2A] Gửi tin nhắn ${message.messageId} đến ${message.receiverId}`);
    
    try {
      // Trong triển khai thực tế, đây sẽ gửi HTTP request hoặc WebSocket message
      // đến endpoint của agent
      
      if (connection) {
        // Giả lập gửi tin nhắn thành công
        console.log(`[A2A] Đã gửi tin nhắn đến ${message.receiverId} thành công`);
      } else if (message.receiverId === 'broadcast') {
        console.log(`[A2A] Đã gửi tin nhắn broadcast thành công`);
      }
    } catch (error: any) {
      console.error(`[A2A] Lỗi khi gửi tin nhắn đến ${message.receiverId}:`, error);
      
      // Cập nhật trạng thái agent nếu không thể kết nối
      if (connection) {
        connection.status = 'offline';
        this.connectedAgents.set(message.receiverId, connection);
      }
    }
  }
  
  /**
   * Xử lý tin nhắn đến
   */
  public async handleIncomingMessage(message: A2AMessage): Promise<void> {
    console.log(`[A2A] Nhận tin nhắn ${message.messageId} từ ${message.senderId}`);
    
    // Cập nhật trạng thái agent
    if (this.connectedAgents.has(message.senderId)) {
      const connection = this.connectedAgents.get(message.senderId)!;
      connection.lastSeen = Date.now();
      connection.status = 'online';
      this.connectedAgents.set(message.senderId, connection);
    } else {
      // Thêm agent mới nếu chưa biết
      this.connectedAgents.set(message.senderId, {
        endpoint: 'unknown', // Sẽ cập nhật sau
        capabilities: message.metadata.capabilities || [],
        lastSeen: Date.now(),
        status: 'online'
      });
    }
    
    // Xử lý dựa trên loại tin nhắn
    if (message.metadata.messageType === 'request') {
      await this.handleRequest(message);
    } else if (message.metadata.messageType === 'response') {
      await this.handleResponse(message);
    } else if (message.metadata.messageType === 'notification') {
      await this.handleNotification(message);
    }
  }
  
  /**
   * Xử lý yêu cầu từ agent khác
   */
  private async handleRequest(message: A2AMessage): Promise<void> {
    console.log(`[A2A] Xử lý yêu cầu ${message.messageId} từ ${message.senderId}`);
    
    // Mô phỏng xử lý yêu cầu và gửi phản hồi
    // Trong triển khai thực tế, đây sẽ gọi đến các hàm xử lý dựa trên nội dung
    
    const response: A2AMessage = {
      messageId: this.generateMessageId(),
      senderId: this.agentId,
      receiverId: message.senderId,
      content: {
        action: 'response',
        requestId: message.messageId,
        result: {
          status: 'success',
          data: {}
        }
      },
      metadata: {
        messageType: 'response',
        timestamp: Date.now(),
        conversationId: message.metadata.conversationId
      }
    };
    
    // Gửi phản hồi
    await this.transmitMessage(response);
  }
  
  /**
   * Xử lý phản hồi từ agent khác
   */
  private async handleResponse(message: A2AMessage): Promise<void> {
    console.log(`[A2A] Xử lý phản hồi ${message.messageId} từ ${message.senderId}`);
    
    // Tìm callback cho tin nhắn này
    const requestId = message.content.requestId;
    if (requestId && this.messageCallbacks.has(requestId)) {
      const callback = this.messageCallbacks.get(requestId)!;
      callback(message);
      this.messageCallbacks.delete(requestId);
    }
  }
  
  /**
   * Xử lý thông báo từ agent khác
   */
  private async handleNotification(message: A2AMessage): Promise<void> {
    console.log(`[A2A] Xử lý thông báo ${message.messageId} từ ${message.senderId}`);
    
    // Xử lý thông báo về khả năng
    if (message.content.action === 'announce' && message.content.capabilities) {
      const connection = this.connectedAgents.get(message.senderId) || {
        endpoint: 'unknown',
        capabilities: [],
        lastSeen: Date.now(),
        status: 'online'
      };
      
      connection.capabilities = message.content.capabilities;
      this.connectedAgents.set(message.senderId, connection);
      
      console.log(`[A2A] Đã cập nhật khả năng cho agent ${message.senderId}`);
    }
  }
  
  /**
   * Ủy thác nhiệm vụ cho agent khác
   */
  public async delegateTask(agentId: string, task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Tạo và gửi tin nhắn yêu cầu
      this.sendMessage(agentId, task, 'request')
        .then(message => {
          // Đăng ký callback để xử lý phản hồi
          this.messageCallbacks.set(message.messageId, (response) => {
            resolve(response.content.result);
          });
          
          // Thiết lập timeout để tránh chờ vô hạn
          setTimeout(() => {
            if (this.messageCallbacks.has(message.messageId)) {
              this.messageCallbacks.delete(message.messageId);
              reject(new Error(`Timeout khi chờ phản hồi từ agent ${agentId}`));
            }
          }, 30000); // 30 giây timeout
        })
        .catch(error => {
          reject(error);
        });
    });
  }
  
  /**
   * Tạo ID tin nhắn duy nhất
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }
} 