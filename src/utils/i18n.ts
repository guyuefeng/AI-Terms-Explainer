/**
 * 国际化实用程序类
 * 处理多语言支持
 */
export class I18nUtils {
  private static cache = new Map<string, string>();

  /**
   * 获取本地化消息
   * @param key - 消息键
   * @param substitutions - 替换参数
   * @returns 本地化消息
   */
  static getMessage(key: string, substitutions?: string | string[]): string {
    try {
      // 尝试从缓存获取
      const cacheKey = `${key}_${JSON.stringify(substitutions || '')}`;
      if (this.cache.has(cacheKey)) {
        return this.cache.get(cacheKey)!;
      }

      let message: string;
      
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        message = chrome.i18n.getMessage(key, substitutions);
      } else {
        // 开发环境回退
        message = this.getFallbackMessage(key);
      }

      // 缓存结果
      this.cache.set(cacheKey, message);
      
      return message || key;
    } catch (error) {
      console.warn(`Failed to get i18n message for key: ${key}`, error);
      return key;
    }
  }

  /**
   * 获取当前语言
   * @returns 语言代码
   */
  static getCurrentLanguage(): string {
    try {
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        return chrome.i18n.getUILanguage();
      }
      return navigator.language || 'zh-CN';
    } catch (error) {
      console.warn('Failed to get current language', error);
      return 'zh-CN';
    }
  }

  /**
   * 检查是否为 RTL 语言
   * @returns 是否为 RTL
   */
  static isRTL(): boolean {
    const language = this.getCurrentLanguage();
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.some(lang => language.startsWith(lang));
  }

  /**
   * 格式化数字
   * @param num - 数字
   * @returns 格式化后的数字字符串
   */
  static formatNumber(num: number): string {
    try {
      return new Intl.NumberFormat(this.getCurrentLanguage()).format(num);
    } catch (error) {
      return num.toString();
    }
  }

  /**
   * 格式化日期
   * @param date - 日期
   * @returns 格式化后的日期字符串
   */
  static formatDate(date: Date): string {
    try {
      return new Intl.DateTimeFormat(this.getCurrentLanguage(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  /**
   * 开发环境回退消息
   * @param key - 消息键
   * @returns 回退消息
   */
  private static getFallbackMessage(key: string): string {
    const fallbacks: Record<string, string> = {
      appName: '讲人话AI',
      apiKeyPlaceholder: '请输入OpenAI API Key',
      termPlaceholder: '请输入AI术语',
      explainButton: '解释',
      loading: '正在生成解释...',
      apiKeyMissing: '请输入API Key',
      termMissing: '请输入AI术语',
      apiError: 'API请求失败',
      networkError: '网络连接失败',
      unexpectedError: '发生未知错误'
    };

    return fallbacks[key] || key;
  }

  /**
   * 清除缓存
   */
  static clearCache(): void {
    this.cache.clear();
  }
} 