import { ModelConfig, AppError, ErrorType } from '../types/app';
import { StorageUtils } from './storage';
import { ApiUtils } from './api';

/**
 * 模型管理实用程序类
 * 处理模型的增删改查操作
 */
export class ModelManager {
  /**
   * 获取所有模型配置
   * @returns Promise<ModelConfig[]> - 模型列表
   */
  static async getAllModels(): Promise<ModelConfig[]> {
    try {
      const data = await StorageUtils.get(['models']);
      return data.models || [];
    } catch (error) {
      console.error('Failed to get models:', error);
      return [];
    }
  }

  /**
   * 根据ID获取模型配置
   * @param modelId - 模型ID
   * @returns Promise<ModelConfig | null> - 模型配置
   */
  static async getModelById(modelId: string): Promise<ModelConfig | null> {
    const models = await this.getAllModels();
    return models.find(model => model.id === modelId) || null;
  }

  /**
   * 获取已启用的模型列表
   * @returns Promise<ModelConfig[]> - 已启用模型列表
   */
  static async getEnabledModels(): Promise<ModelConfig[]> {
    const models = await this.getAllModels();
    return models.filter(model => model.isEnabled && model.apiKey?.trim());
  }

  /**
   * 添加或更新模型配置
   * @param model - 模型配置
   * @returns Promise<void>
   */
  static async saveModel(model: ModelConfig): Promise<void> {
    const models = await this.getAllModels();
    const existingIndex = models.findIndex(m => m.id === model.id);

    if (existingIndex >= 0) {
      models[existingIndex] = model;
    } else {
      models.push(model);
    }

    await StorageUtils.set({ models });
  }

  /**
   * 删除模型配置
   * @param modelId - 模型ID
   * @returns Promise<void>
   */
  static async deleteModel(modelId: string): Promise<void> {
    const models = await this.getAllModels();
    const filteredModels = models.filter(m => m.id !== modelId);
    await StorageUtils.set({ models: filteredModels });
  }

  /**
   * 验证模型配置
   * @param model - 模型配置
   * @returns string[] - 验证错误列表
   */
  static validateModel(model: Partial<ModelConfig>): string[] {
    const errors: string[] = [];

    if (!model.id?.trim()) {
      errors.push('模型ID不能为空');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(model.id)) {
      errors.push('模型ID只能包含字母、数字、下划线和连字符');
    }

    if (!model.displayName?.trim()) {
      errors.push('显示名称不能为空');
    }

    if (!model.apiUrl?.trim()) {
      errors.push('API地址不能为空');
    } else if (!ApiUtils.validateApiUrl(model.apiUrl)) {
      errors.push('API地址格式不正确');
    }

    if (!model.defaultModel?.trim()) {
      errors.push('默认模型名称不能为空');
    }

    if (model.apiKey && !ApiUtils.validateApiKey(model.apiKey)) {
      errors.push('API密钥格式不正确');
    }

    if (model.temperature !== undefined) {
      if (typeof model.temperature !== 'number' || model.temperature < 0 || model.temperature > 2) {
        errors.push('温度参数必须是0-2之间的数字');
      }
    }

    if (model.maxTokens !== undefined) {
      if (typeof model.maxTokens !== 'number' || model.maxTokens < 1 || model.maxTokens > 32000) {
        errors.push('最大令牌数必须是1-32000之间的整数');
      }
    }

    return errors;
  }

  /**
   * 检查模型ID是否已存在
   * @param modelId - 模型ID
   * @param excludeId - 排除的ID（用于编辑时）
   * @returns Promise<boolean> - 是否已存在
   */
  static async isModelIdExists(modelId: string, excludeId?: string): Promise<boolean> {
    const models = await this.getAllModels();
    return models.some(model => model.id === modelId && model.id !== excludeId);
  }

  /**
   * 初始化默认模型配置
   * @returns Promise<void>
   */
  static async initializeDefaultModels(): Promise<void> {
    const existingModels = await this.getAllModels();
    
    if (existingModels.length === 0) {
      const presetModels = ApiUtils.getPresetModels();
      const defaultModels: ModelConfig[] = presetModels.map(preset => ({
        ...preset,
        apiKey: '' // 初始时API Key为空
      }));

      await StorageUtils.set({ models: defaultModels });
      console.log('Default models initialized');
    }
  }

  /**
   * 测试模型连接
   * @param model - 模型配置
   * @returns Promise<{ success: boolean; error?: string }> - 测试结果
   */
  static async testModel(model: ModelConfig): Promise<{ success: boolean; error?: string }> {
    try {
      if (!model.apiKey?.trim()) {
        return { success: false, error: 'API密钥未配置' };
      }

      const isConnected = await ApiUtils.testModelConnection(model);
      return { success: isConnected, error: isConnected ? undefined : '连接测试失败' };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : '连接测试失败' 
      };
    }
  }

  /**
   * 获取默认模型ID
   * @returns Promise<string | null> - 默认模型ID
   */
  static async getDefaultModelId(): Promise<string | null> {
    const data = await StorageUtils.get(['config']);
    const selectedModelId = data.config?.selectedModelId;

    if (selectedModelId) {
      const model = await this.getModelById(selectedModelId);
      if (model && model.isEnabled && model.apiKey?.trim()) {
        return selectedModelId;
      }
    }

    // 如果没有选中的模型或选中的模型不可用，返回第一个可用的模型
    const enabledModels = await this.getEnabledModels();
    return enabledModels.length > 0 ? enabledModels[0].id : null;
  }

  /**
   * 设置默认模型
   * @param modelId - 模型ID
   * @returns Promise<void>
   */
  static async setDefaultModel(modelId: string): Promise<void> {
    const model = await this.getModelById(modelId);
    if (!model) {
      throw new AppError(ErrorType.MODEL_NOT_FOUND, '模型不存在');
    }

    if (!model.isEnabled || !model.apiKey?.trim()) {
      throw new AppError(ErrorType.MODEL_NOT_CONFIGURED, '模型未配置或未启用');
    }

    const data = await StorageUtils.get(['config']);
    const config = data.config || {};
    config.selectedModelId = modelId;

    await StorageUtils.set({ config });
  }

  /**
   * 导入模型配置
   * @param models - 模型配置数组
   * @returns Promise<{ success: number; errors: string[] }> - 导入结果
   */
  static async importModels(models: ModelConfig[]): Promise<{ success: number; errors: string[] }> {
    const errors: string[] = [];
    let successCount = 0;

    for (const model of models) {
      try {
        const validationErrors = this.validateModel(model);
        if (validationErrors.length > 0) {
          errors.push(`模型 ${model.id}: ${validationErrors.join(', ')}`);
          continue;
        }

        const isExists = await this.isModelIdExists(model.id);
        if (isExists) {
          errors.push(`模型 ${model.id}: ID已存在`);
          continue;
        }

        await this.saveModel(model);
        successCount++;
      } catch (error) {
        errors.push(`模型 ${model.id}: ${error instanceof Error ? error.message : '导入失败'}`);
      }
    }

    return { success: successCount, errors };
  }

  /**
   * 导出模型配置
   * @param includeApiKeys - 是否包含API密钥
   * @returns Promise<ModelConfig[]> - 模型配置数组
   */
  static async exportModels(includeApiKeys = false): Promise<ModelConfig[]> {
    const models = await this.getAllModels();
    
    if (!includeApiKeys) {
      return models.map(model => ({
        ...model,
        apiKey: '' // 导出时移除API密钥
      }));
    }

    return models;
  }
} 