/**
 * 模型配置接口
 */
export interface ModelConfig {
  id: string;                    // 模型标识
  displayName: string;          // 显示名称
  apiUrl: string;               // API地址
  defaultModel: string;         // 默认模型名称
  apiKey: string;               // API密钥
  isEnabled: boolean;           // 是否启用
  temperature?: number;         // 温度参数
  maxTokens?: number;          // 最大令牌数
  description?: string;         // 模型描述
}

/**
 * 应用程序配置接口
 */
export interface AppConfig {
  selectedModelId: string;      // 当前选中的模型ID
  theme: 'auto' | 'light' | 'dark';
  language: string;
  displayMode: 'popup' | 'fullscreen';
  autoDetectTerms: boolean;
  showWelcomeMessage: boolean;
}

/**
 * 存储数据接口
 */
export interface StorageData {
  models?: ModelConfig[];       // 模型配置列表
  config?: Partial<AppConfig>;  // 应用配置
  history?: ExplanationHistory[];
}

/**
 * 解释历史记录接口
 */
export interface ExplanationHistory {
  id: string;
  term: string;
  explanation: string;
  modelId: string;              // 使用的模型ID
  timestamp: number;
}

/**
 * UI 状态接口
 */
export interface UIState {
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  result?: string;
  currentModelId?: string;
}

/**
 * 表单数据接口
 */
export interface FormData {
  term: string;
  modelId: string;
}

/**
 * 模型表单数据接口
 */
export interface ModelFormData {
  id: string;
  displayName: string;
  apiUrl: string;
  defaultModel: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  description: string;
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  MODEL_NOT_CONFIGURED = 'MODEL_NOT_CONFIGURED',
  TERM_MISSING = 'TERM_MISSING',
  API_ERROR = 'API_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND'
}

/**
 * 应用程序错误类
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly details?: string;

  constructor(type: ErrorType, message: string, details?: string) {
    super(message);
    this.type = type;
    this.details = details;
    this.name = 'AppError';
  }
} 