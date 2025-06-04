/**
 * OpenAI API 聊天完成请求接口
 */
export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

/**
 * 聊天消息接口
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * OpenAI API 聊天完成响应接口
 */
export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 聊天完成选择接口
 */
export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

/**
 * API 错误响应接口
 */
export interface ApiError {
  error: {
    message: string;
    type: string;
    param?: string;
    code?: string;
  };
} 