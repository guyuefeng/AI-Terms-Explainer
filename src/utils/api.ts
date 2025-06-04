import {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ApiError,
  ChatMessage
} from '../types/api';
import { AppError, ErrorType, ModelConfig } from '../types/app';

/**
 * API 实用程序类
 * 处理多模型 API 调用
 */
export class ApiUtils {
  private static readonly REQUEST_TIMEOUT = 30000; // 30秒

  /**
   * 创建系统提示消息
   * @returns ChatMessage
   */
  private static createSystemMessage(): ChatMessage {
    return {
      role: 'system',
      content: '你是一个专业的AI术语解释器，请用通俗易懂的语言和生动的类比来解释AI术语。解释要简洁明了，让普通人也能理解。'
    };
  }

  /**
   * 创建用户消息
   * @param term - 要解释的术语
   * @returns ChatMessage
   */
  private static createUserMessage(term: string): ChatMessage {
    return {
      role: 'user',
      content: `请用通俗易懂的语言解释这个AI术语：${term}`
    };
  }

  /**
   * 使用指定模型解释 AI 术语
   * @param model - 模型配置
   * @param term - 要解释的术语
   * @returns Promise<string> - 解释结果
   * @throws AppError - 如果请求失败
   */
  static async explainTermWithModel(model: ModelConfig, term: string): Promise<string> {
    if (!model) {
      throw new AppError(ErrorType.MODEL_NOT_FOUND, '模型配置不存在');
    }

    if (!model.apiKey?.trim()) {
      throw new AppError(ErrorType.MODEL_NOT_CONFIGURED, `模型 ${model.displayName} 的API Key未配置`);
    }

    if (!term.trim()) {
      throw new AppError(ErrorType.TERM_MISSING, '请输入AI术语');
    }

    const request: ChatCompletionRequest = {
      model: model.defaultModel,
      messages: [
        this.createSystemMessage(),
        this.createUserMessage(term)
      ],
      temperature: model.temperature || 0.7,
      max_tokens: model.maxTokens || 1000
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      // 构建API URL
      const apiUrl = model.apiUrl.endsWith('/') 
        ? `${model.apiUrl}chat/completions`
        : `${model.apiUrl}/chat/completions`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`
        },
        body: JSON.stringify(request),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `API请求失败 (${response.status})`;
        
        try {
          const errorData: ApiError = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch {
          // 如果解析错误响应失败，使用默认错误消息
        }

        throw new AppError(
          ErrorType.API_ERROR,
          `${model.displayName}: ${errorMessage}`
        );
      }

      const data: ChatCompletionResponse = await response.json();

      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      } else {
        throw new AppError(ErrorType.API_ERROR, `${model.displayName}: 无法获取解释结果`);
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new AppError(ErrorType.NETWORK_ERROR, `${model.displayName}: 请求超时，请稍后重试`);
        }

        if (error.message.includes('fetch')) {
          throw new AppError(ErrorType.NETWORK_ERROR, `${model.displayName}: 网络连接失败，请检查网络设置`);
        }
      }

      throw new AppError(
        ErrorType.API_ERROR,
        `${model.displayName}: 获取解释失败，请稍后重试`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * 验证 API Key 格式
   * @param apiKey - 要验证的 API Key
   * @returns boolean - 是否有效
   */
  static validateApiKey(apiKey: string): boolean {
    if (!apiKey || typeof apiKey !== 'string') {
      return false;
    }

    const trimmedKey = apiKey.trim();
    
    if (trimmedKey.length < 10) {
      return false;
    }

    // 支持多种API Key格式
    return /^(sk-|ak-|key-|api-)/i.test(trimmedKey) || trimmedKey.length > 20;
  }

  /**
   * 验证 API URL 格式
   * @param url - 要验证的 URL
   * @returns boolean - 是否有效
   */
  static validateApiUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://');
    } catch {
      return false;
    }
  }

  /**
   * 测试模型连接
   * @param model - 模型配置
   * @returns Promise<boolean> - 连接是否成功
   */
  static async testModelConnection(model: ModelConfig): Promise<boolean> {
    try {
      await this.explainTermWithModel(model, 'test');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取预设模型配置
   * @returns ModelConfig[] - 预设模型列表
   */
  static getPresetModels(): Omit<ModelConfig, 'apiKey'>[] {
    return [
      {
        id: 'openai-gpt35',
        displayName: 'OpenAI GPT-3.5',
        apiUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-3.5-turbo',
        isEnabled: true,
        temperature: 0.7,
        maxTokens: 1000,
        description: 'OpenAI 官方 GPT-3.5 模型，平衡性能和成本'
      },
      {
        id: 'openai-gpt4',
        displayName: 'OpenAI GPT-4',
        apiUrl: 'https://api.openai.com/v1',
        defaultModel: 'gpt-4',
        isEnabled: false,
        temperature: 0.7,
        maxTokens: 1000,
        description: 'OpenAI 最先进的 GPT-4 模型，更强的理解能力'
      },
      {
        id: 'chatanywhere-gpt35',
        displayName: 'ChatAnywhere GPT-3.5',
        apiUrl: 'https://api.chatanywhere.tech/v1',
        defaultModel: 'gpt-3.5-turbo',
        isEnabled: true,
        temperature: 0.7,
        maxTokens: 1000,
        description: '第三方 GPT-3.5 服务，更实惠的选择'
      },
      {
        id: 'claude-3',
        displayName: 'Anthropic Claude-3',
        apiUrl: 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-sonnet-20240229',
        isEnabled: false,
        temperature: 0.7,
        maxTokens: 1000,
        description: 'Anthropic Claude-3 模型，出色的推理能力'
      }
    ];
  }
} 