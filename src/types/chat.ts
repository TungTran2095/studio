/**
 * Định nghĩa các type liên quan đến chat
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: string[];
  metadata?: Record<string, any>;
}

export interface ChatHistory {
  messages: ChatMessage[];
  userId: string;
  conversationId?: string;
  timestamp: number;
}

export interface ChatResponse {
  message: ChatMessage;
  actions?: ChatAction[];
}

export interface ChatAction {
  type: 'suggest' | 'execute';
  content: string;
  metadata?: Record<string, any>;
} 