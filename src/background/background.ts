import { StorageUtils } from '../utils/storage';
import { I18nUtils } from '../utils/i18n';
import { ModelManager } from '../utils/models';
import { AppConfig } from '../types/app';

/**
 * Background Service Worker for Chrome Extension
 * 处理扩展程序的后台逻辑，支持多模型和全屏模式
 */

/**
 * 安装事件处理器
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed:', details);
  
  try {
    // 设置默认配置
    await initializeDefaultSettings();
    
    // 处理不同安装原因
    switch (details.reason) {
      case 'install':
        await handleFirstInstall();
        break;
      case 'update':
        await handleUpdate(details.previousVersion);
        break;
      case 'chrome_update':
        await handleChromeUpdate();
        break;
    }
  } catch (error) {
    console.error('Failed to handle installation:', error);
  }
});

/**
 * 扩展程序启动事件处理器
 */
chrome.runtime.onStartup.addListener(async () => {
  console.log('Extension started');
  
  try {
    await performStartupTasks();
  } catch (error) {
    console.error('Failed to perform startup tasks:', error);
  }
});

/**
 * 扩展图标点击事件处理器 - 直接打开全屏模式
 */
chrome.action.onClicked.addListener(async () => {
  try {
    console.log('Extension icon clicked, opening fullscreen mode');
    const url = chrome.runtime.getURL('fullscreen.html');
    await chrome.tabs.create({ url });
  } catch (error) {
    console.error('Failed to open fullscreen mode:', error);
    // 如果打开新标签页失败，尝试在当前标签页打开
    try {
      const url = chrome.runtime.getURL('fullscreen.html');
      await chrome.tabs.update({ url });
    } catch (fallbackError) {
      console.error('Failed to open fullscreen mode in current tab:', fallbackError);
    }
  }
});

/**
 * 消息处理器
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message, 'from', sender);
  
  // 处理异步消息
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      console.error('Message handling error:', error);
      sendResponse({ error: error.message });
    });
  
  // 返回 true 表示异步响应
  return true;
});

/**
 * 上下文菜单点击处理器
 */
chrome.contextMenus?.onClicked?.addListener(async (info, tab) => {
  try {
    await handleContextMenuClick(info, tab);
  } catch (error) {
    console.error('Context menu click error:', error);
  }
});

/**
 * 快捷键命令处理器
 */
chrome.commands?.onCommand?.addListener(async (command) => {
  try {
    await handleCommand(command);
  } catch (error) {
    console.error('Command handling error:', error);
  }
});

/**
 * 处理消息
 * @param message - 消息对象
 * @param sender - 发送者信息
 * @returns Promise<any> - 响应数据
 */
async function handleMessage(message: any, sender: chrome.runtime.MessageSender): Promise<any> {
  const { type, data } = message;
  
  switch (type) {
    case 'GET_STORAGE':
      return await StorageUtils.get(data.keys);
      
    case 'SET_STORAGE':
      await StorageUtils.set(data);
      return { success: true };
      
    case 'CLEAR_STORAGE':
      await StorageUtils.clear();
      return { success: true };
      
    case 'GET_TAB_INFO':
      if (sender.tab) {
        return {
          tabId: sender.tab.id,
          url: sender.tab.url,
          title: sender.tab.title
        };
      }
      throw new Error('No tab information available');
      
    case 'SHOW_NOTIFICATION':
      await showNotification(data.title, data.message, data.type);
      return { success: true };
      
    case 'GET_LANGUAGE':
      return { language: I18nUtils.getCurrentLanguage() };
      
    case 'OPEN_FULLSCREEN':
      await openFullscreenPage(data?.term);
      return { success: true };
      
    case 'OPEN_POPUP_WITH_TERM':
      // 当内容脚本请求打开弹窗时，改为打开全屏页面
      await openFullscreenPage(data?.term);
      return { success: true };
      
    case 'GET_MODELS':
      return { models: await ModelManager.getAllModels() };
      
    case 'GET_ENABLED_MODELS':
      return { models: await ModelManager.getEnabledModels() };
      
    case 'GET_DEFAULT_MODEL_ID':
      return { modelId: await ModelManager.getDefaultModelId() };
      
    case 'SET_DEFAULT_MODEL':
      await ModelManager.setDefaultModel(data.modelId);
      return { success: true };
      
    case 'SAVE_MODEL':
      await ModelManager.saveModel(data.model);
      return { success: true };
      
    case 'DELETE_MODEL':
      await ModelManager.deleteModel(data.modelId);
      return { success: true };
      
    case 'TEST_MODEL':
      const testResult = await ModelManager.testModel(data.model);
      return testResult;
      
    default:
      throw new Error(`Unknown message type: ${type}`);
  }
}

/**
 * 处理快捷键命令
 * @param command - 命令名称
 */
async function handleCommand(command: string): Promise<void> {
  switch (command) {
    case 'explain-selection':
      await handleExplainSelectionCommand();
      break;
      
    case 'open-fullscreen':
      await openFullscreenPage();
      break;
      
    default:
      console.warn('Unknown command:', command);
  }
}

/**
 * 处理解释选中文本命令
 */
async function handleExplainSelectionCommand(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      await openFullscreenPage();
      return;
    }
    
    // 尝试获取选中的文本
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'GET_SELECTION'
    });
    
    if (response?.selection) {
      await openFullscreenPage(response.selection);
    } else {
      await openFullscreenPage();
    }
  } catch (error) {
    console.error('Failed to handle explain selection command:', error);
    await openFullscreenPage();
  }
}

/**
 * 打开全屏页面
 * @param term - 可选的术语参数
 */
async function openFullscreenPage(term?: string): Promise<void> {
  try {
    const url = chrome.runtime.getURL('fullscreen.html');
    if (term) {
      const fullUrl = `${url}?term=${encodeURIComponent(term)}`;
      await chrome.tabs.create({ url: fullUrl });
    } else {
      await chrome.tabs.create({ url });
    }
  } catch (error) {
    console.error('Failed to open fullscreen page:', error);
    throw error;
  }
}

/**
 * 初始化默认设置
 */
async function initializeDefaultSettings(): Promise<void> {
  try {
    const existingData = await StorageUtils.get(['config']);
    
    if (!existingData.config) {
      const defaultConfig: Partial<AppConfig> = {
        selectedModelId: '',
        theme: 'auto' as const,
        language: I18nUtils.getCurrentLanguage(),
        displayMode: 'fullscreen' as const,
        autoDetectTerms: true,
        showWelcomeMessage: true
      };
      
      await StorageUtils.set({ config: defaultConfig });
      console.log('Default settings initialized');
    }
    
    // 确保模型配置已初始化
    await ModelManager.initializeDefaultModels();
    
  } catch (error) {
    console.error('Failed to initialize default settings:', error);
  }
}

/**
 * 处理首次安装
 */
async function handleFirstInstall(): Promise<void> {
  console.log('First time installation');
  
  try {
    // 创建上下文菜单
    await createContextMenus();
    
    // 显示欢迎通知
    await showNotification(
      I18nUtils.getMessage('appName', 'AI术语解释器'),
      I18nUtils.getMessage('welcomeMessage', '欢迎使用AI术语解释器！现在支持多种模型。'),
      'info'
    );
    
    // 打开欢迎页面（全屏模式）
    setTimeout(() => {
      openFullscreenPage();
    }, 1000);
    
  } catch (error) {
    console.error('Failed to handle first install:', error);
  }
}

/**
 * 处理更新
 * @param previousVersion - 之前的版本号
 */
async function handleUpdate(previousVersion?: string): Promise<void> {
  console.log(`Updated from version ${previousVersion}`);
  
  try {
    // 更新上下文菜单
    await createContextMenus();
    
    // 数据迁移逻辑
    if (previousVersion && compareVersions(previousVersion, '2.0.0') < 0) {
      await migrateDataFromV1();
    }
    
    // 显示更新通知
    await showNotification(
      I18nUtils.getMessage('appName', 'AI术语解释器'),
      I18nUtils.getMessage('updateMessage', '扩展已更新！现在支持多模型和全屏模式。'),
      'info'
    );
    
  } catch (error) {
    console.error('Failed to handle update:', error);
  }
}

/**
 * 处理 Chrome 更新
 */
async function handleChromeUpdate(): Promise<void> {
  console.log('Chrome browser updated');
  
  try {
    // 重新创建上下文菜单
    await createContextMenus();
  } catch (error) {
    console.error('Failed to handle Chrome update:', error);
  }
}

/**
 * 执行启动任务
 */
async function performStartupTasks(): Promise<void> {
  try {
    // 清理过期数据
    await cleanupExpiredData();
    
    // 验证配置
    await validateConfiguration();
    
    // 确保模型配置存在
    await ModelManager.initializeDefaultModels();
    
  } catch (error) {
    console.error('Failed to perform startup tasks:', error);
  }
}

/**
 * 创建上下文菜单
 */
async function createContextMenus(): Promise<void> {
  try {
    // 清除现有菜单
    await chrome.contextMenus?.removeAll();
    
    // 创建主菜单项
    chrome.contextMenus?.create({
      id: 'explain-selection',
      title: I18nUtils.getMessage('explainSelection', '解释选中的AI术语'),
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
    
    // 创建页面菜单项
    chrome.contextMenus?.create({
      id: 'open-fullscreen',
      title: I18nUtils.getMessage('openFullscreen', '打开AI术语解释器'),
      contexts: ['page'],
      documentUrlPatterns: ['http://*/*', 'https://*/*']
    });
    
    console.log('Context menus created');
  } catch (error) {
    console.error('Failed to create context menus:', error);
  }
}

/**
 * 处理上下文菜单点击
 * @param info - 点击信息
 */
async function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  _tab?: chrome.tabs.Tab
): Promise<void> {
  switch (info.menuItemId) {
    case 'explain-selection':
      if (info.selectionText) {
        await openFullscreenPage(info.selectionText.trim());
      } else {
        await openFullscreenPage();
      }
      break;
      
    case 'open-fullscreen':
      await openFullscreenPage();
      break;
      
    default:
      console.warn('Unknown context menu item:', info.menuItemId);
  }
}

/**
 * 显示通知
 * @param title - 通知标题
 * @param message - 通知消息
 * @param _type - 通知类型（暂未使用，为未来扩展保留）
 */
async function showNotification(title: string, message: string, _type: 'info' | 'error' | 'success' = 'info'): Promise<void> {
  try {
    await chrome.notifications?.create({
      type: 'basic',
      iconUrl: 'images/icon48.png',
      title,
      message
    });
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

/**
 * 清理过期数据
 */
async function cleanupExpiredData(): Promise<void> {
  try {
    const data = await StorageUtils.get(['history']);
    
    if (data.history) {
      const oneMonthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      const filteredHistory = data.history.filter(item => item.timestamp > oneMonthAgo);
      
      if (filteredHistory.length !== data.history.length) {
        await StorageUtils.set({ history: filteredHistory });
        console.log(`Cleaned up ${data.history.length - filteredHistory.length} expired history items`);
      }
    }
  } catch (error) {
    console.error('Failed to cleanup expired data:', error);
  }
}

/**
 * 验证配置
 */
async function validateConfiguration(): Promise<void> {
  try {
    const data = await StorageUtils.get(['config']);
    
    if (data.config) {
      // 验证配置的有效性
      const config = data.config;
      let needsUpdate = false;
      
      // 确保有默认的显示模式
      if (!config.displayMode) {
        config.displayMode = 'fullscreen';
        needsUpdate = true;
      }
      
      // 确保有主题设置
      if (!config.theme) {
        config.theme = 'auto';
        needsUpdate = true;
      }
      
      // 确保有语言设置
      if (!config.language) {
        config.language = I18nUtils.getCurrentLanguage();
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await StorageUtils.set({ config });
        console.log('Configuration validated and updated');
      }
    }
    
    // 验证选中的模型是否仍然可用
    const selectedModelId = data.config?.selectedModelId;
    if (selectedModelId) {
      const model = await ModelManager.getModelById(selectedModelId);
      if (!model || !model.isEnabled || !model.apiKey?.trim()) {
        // 如果选中的模型不可用，选择第一个可用的模型
        const defaultModelId = await ModelManager.getDefaultModelId();
        if (defaultModelId !== selectedModelId) {
          const config = data.config || {};
          config.selectedModelId = defaultModelId || '';
          await StorageUtils.set({ config });
        }
      }
    }
    
  } catch (error) {
    console.error('Failed to validate configuration:', error);
  }
}

/**
 * 从 V1 迁移数据
 */
async function migrateDataFromV1(): Promise<void> {
  try {
    console.log('Migrating data from V1...');
    
    // 迁移旧的API Key设置（使用通用方法获取任何可能存在的键）
    try {
      const result = await chrome.storage.local.get(['apiKey']);
      if (result.apiKey) {
        // 检查是否已经有模型配置
        const models = await ModelManager.getAllModels();
        const chatAnywhereModel = models.find(m => m.id === 'chatanywhere-gpt35');
        
        if (chatAnywhereModel && !chatAnywhereModel.apiKey) {
          // 将旧的API Key迁移到ChatAnywhere模型
          chatAnywhereModel.apiKey = result.apiKey;
          chatAnywhereModel.isEnabled = true;
          await ModelManager.saveModel(chatAnywhereModel);
          
          // 设置为默认模型
          await ModelManager.setDefaultModel(chatAnywhereModel.id);
          
          console.log('Migrated API key to ChatAnywhere model');
        }
        
        // 清除旧的API Key
        await chrome.storage.local.remove(['apiKey']);
      }
    } catch (error) {
      console.log('No old API key to migrate');
    }
    
    // 迁移其他旧配置
    try {
      const oldConfigResult = await chrome.storage.local.get(['defaultModel', 'maxTokens', 'temperature']);
      if (oldConfigResult.defaultModel || oldConfigResult.maxTokens || oldConfigResult.temperature) {
        // 应用到所有模型的默认设置
        const models = await ModelManager.getAllModels();
        
        for (const model of models) {
          let needsUpdate = false;
          
          if (oldConfigResult.defaultModel && model.defaultModel === 'gpt-3.5-turbo') {
            model.defaultModel = oldConfigResult.defaultModel;
            needsUpdate = true;
          }
          if (oldConfigResult.maxTokens) {
            model.maxTokens = oldConfigResult.maxTokens;
            needsUpdate = true;
          }
          if (oldConfigResult.temperature !== undefined) {
            model.temperature = oldConfigResult.temperature;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            await ModelManager.saveModel(model);
          }
        }
        
        // 清除旧配置
        await chrome.storage.local.remove(['defaultModel', 'maxTokens', 'temperature']);
        console.log('Migrated old configuration settings');
      }
    } catch (error) {
      console.log('No old configuration to migrate');
    }
    
  } catch (error) {
    console.error('Failed to migrate data from V1:', error);
  }
}

/**
 * 比较版本号
 * @param a - 版本 A
 * @param b - 版本 B
 * @returns number - 比较结果 (-1, 0, 1)
 */
function compareVersions(a: string, b: string): number {
  const parseVersion = (version: string) => version.split('.').map(Number);
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);
  
  for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
    const numA = versionA[i] || 0;
    const numB = versionB[i] || 0;
    
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  
  return 0;
}

// 导出类型定义（如果需要）
export type {} 