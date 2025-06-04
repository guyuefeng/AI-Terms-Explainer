import { StorageData } from '../types/app';

/**
 * Chrome 存储实用程序类
 * 提供类型安全的存储操作
 */
export class StorageUtils {
  /**
   * 从 Chrome 同步存储获取数据
   * @param keys - 要获取的键数组
   * @returns Promise<StorageData>
   */
  static async get(keys: (keyof StorageData)[]): Promise<StorageData> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.get(keys, (result: { [key: string]: unknown }) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result as StorageData);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 设置 Chrome 同步存储数据
   * @param data - 要存储的数据
   * @returns Promise<void>
   */
  static async set(data: Partial<StorageData>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 从 Chrome 同步存储删除数据
   * @param keys - 要删除的键数组
   * @returns Promise<void>
   */
  static async remove(keys: (keyof StorageData)[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 清除所有 Chrome 同步存储数据
   * @returns Promise<void>
   */
  static async clear(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.sync.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
} 