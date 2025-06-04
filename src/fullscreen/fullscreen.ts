/**
 * 全屏模式主逻辑
 * 支持多模型、历史记录、设置等功能
 */

import { ModelConfig, AppConfig, ExplanationHistory, UIState, AppError, ErrorType } from '../types/app';
import { ApiUtils } from '../utils/api';
import { ModelManager } from '../utils/models';
import { StorageUtils } from '../utils/storage';

/**
 * 全屏应用程序类
 */
class FullscreenApp {
  private currentState: UIState = {
    isLoading: false,
    hasError: false
  };

  private models: ModelConfig[] = [];
  private currentModelId: string | null = null;
  private history: ExplanationHistory[] = [];
  private config: Partial<AppConfig> = {};

  // DOM 元素引用
  private elements = {
    // 输入相关
    termInput: document.getElementById('termInput') as HTMLInputElement,
    explainBtn: document.getElementById('explainBtn') as HTMLButtonElement,
    modelSelect: document.getElementById('modelSelect') as HTMLSelectElement,
    
    // 状态显示
    loadingState: document.getElementById('loadingState') as HTMLElement,
    errorState: document.getElementById('errorState') as HTMLElement,
    resultState: document.getElementById('resultState') as HTMLElement,
    emptyState: document.getElementById('emptyState') as HTMLElement,
    
    // 结果相关
    resultTerm: document.getElementById('resultTerm') as HTMLElement,
    resultModel: document.getElementById('resultModel') as HTMLElement,
    resultText: document.getElementById('resultText') as HTMLElement,
    errorMessage: document.getElementById('errorMessage') as HTMLElement,
    currentModel: document.getElementById('currentModel') as HTMLElement,
    
    // 按钮
    retryBtn: document.getElementById('retryBtn') as HTMLButtonElement,
    copyBtn: document.getElementById('copyBtn') as HTMLButtonElement,
    shareBtn: document.getElementById('shareBtn') as HTMLButtonElement,
    saveBtn: document.getElementById('saveBtn') as HTMLButtonElement,
    settingsBtn: document.getElementById('settingsBtn') as HTMLButtonElement,
    historyBtn: document.getElementById('historyBtn') as HTMLButtonElement,
    themeBtn: document.getElementById('themeBtn') as HTMLButtonElement,
    
    // 面板
    settingsPanel: document.getElementById('settingsPanel') as HTMLElement,
    historyPanel: document.getElementById('historyPanel') as HTMLElement,
    overlay: document.getElementById('overlay') as HTMLElement,
    closePanelBtn: document.getElementById('closePanelBtn') as HTMLButtonElement,
    closeHistoryBtn: document.getElementById('closeHistoryBtn') as HTMLButtonElement,
    clearHistoryBtn: document.getElementById('clearHistoryBtn') as HTMLButtonElement,
    historyList: document.getElementById('historyList') as HTMLElement,
  };

  constructor() {
    this.init();
  }

  /**
   * 初始化应用程序
   */
  private async init(): Promise<void> {
    try {
      // 初始化数据
      await this.loadData();
      
      // 绑定事件
      this.bindEvents();
      
      // 初始化UI
      await this.initializeUI();
      
      // 检查URL参数（支持从其他页面传递术语）
      this.handleUrlParams();
      
      console.log('Fullscreen app initialized');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError('应用初始化失败，请刷新页面重试');
    }
  }

  /**
   * 加载数据
   */
  private async loadData(): Promise<void> {
    try {
      // 初始化默认模型
      await ModelManager.initializeDefaultModels();
      
      // 加载模型列表
      this.models = await ModelManager.getAllModels();
      
      // 获取当前选中的模型
      this.currentModelId = await ModelManager.getDefaultModelId();
      
      // 加载配置
      const data = await StorageUtils.get(['config', 'history']);
      this.config = data.config || {};
      this.history = data.history || [];
      
      // 应用主题
      this.applyTheme();
      
    } catch (error) {
      console.error('Failed to load data:', error);
      throw error;
    }
  }

  /**
   * 绑定事件监听器
   */
  private bindEvents(): void {
    // 输入相关事件
    this.elements.termInput?.addEventListener('input', this.handleInputChange.bind(this));
    this.elements.termInput?.addEventListener('keydown', this.handleKeyDown.bind(this));
    this.elements.explainBtn?.addEventListener('click', this.handleExplain.bind(this));
    this.elements.modelSelect?.addEventListener('change', this.handleModelChange.bind(this));
    
    // 结果操作按钮
    this.elements.retryBtn?.addEventListener('click', this.handleRetry.bind(this));
    this.elements.copyBtn?.addEventListener('click', this.handleCopy.bind(this));
    this.elements.shareBtn?.addEventListener('click', this.handleShare.bind(this));
    this.elements.saveBtn?.addEventListener('click', this.handleSave.bind(this));
    
    // 头部按钮
    this.elements.settingsBtn?.addEventListener('click', this.openSettingsPanel.bind(this));
    this.elements.historyBtn?.addEventListener('click', this.openHistoryPanel.bind(this));
    this.elements.themeBtn?.addEventListener('click', this.toggleTheme.bind(this));
    
    // 面板控制
    this.elements.closePanelBtn?.addEventListener('click', this.closeSettingsPanel.bind(this));
    this.elements.closeHistoryBtn?.addEventListener('click', this.closeHistoryPanel.bind(this));
    this.elements.clearHistoryBtn?.addEventListener('click', this.clearHistory.bind(this));
    this.elements.overlay?.addEventListener('click', this.closePanels.bind(this));
    
    // 键盘快捷键
    document.addEventListener('keydown', this.handleGlobalKeyDown.bind(this));
  }

  /**
   * 初始化UI
   */
  private async initializeUI(): Promise<void> {
    // 更新模型选择器
    this.updateModelSelector();
    
    // 更新历史记录
    this.updateHistoryList();
    
    // 生成设置面板
    this.generateSettingsPanel();
    
    // 设置初始状态
    this.showEmptyState();
  }

  /**
   * 处理URL参数
   */
  private handleUrlParams(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const term = urlParams.get('term');
    
    if (term) {
      this.elements.termInput.value = term;
      this.updateExplainButton();
      // 可以选择自动解释
      // this.handleExplain();
    }
  }

  /**
   * 处理输入变化
   */
  private handleInputChange(): void {
    this.updateExplainButton();
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (!this.elements.explainBtn.disabled) {
        this.handleExplain();
      }
    }
  }

  /**
   * 处理全局键盘快捷键
   */
  private handleGlobalKeyDown(event: KeyboardEvent): void {
    // Ctrl/Cmd + Enter: 解释
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      if (!this.elements.explainBtn.disabled) {
        this.handleExplain();
      }
    }
    
    // Escape: 关闭面板
    if (event.key === 'Escape') {
      this.closePanels();
    }
    
    // Ctrl/Cmd + K: 焦点到输入框
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.elements.termInput.focus();
      this.elements.termInput.select();
    }
  }

  /**
   * 处理模型变化
   */
  private async handleModelChange(): Promise<void> {
    const selectedModelId = this.elements.modelSelect.value;
    
    if (selectedModelId && selectedModelId !== this.currentModelId) {
      try {
        await ModelManager.setDefaultModel(selectedModelId);
        this.currentModelId = selectedModelId;
        console.log('Model changed to:', selectedModelId);
      } catch (error) {
        console.error('Failed to change model:', error);
        this.showError('切换模型失败');
        // 恢复之前的选择
        this.elements.modelSelect.value = this.currentModelId || '';
      }
    }
  }

  /**
   * 处理解释请求
   */
  private async handleExplain(): Promise<void> {
    const term = this.elements.termInput.value.trim();
    
    if (!term) {
      this.showError('请输入要解释的术语');
      return;
    }

    if (!this.currentModelId) {
      this.showError('请选择一个模型');
      return;
    }

    try {
      this.setLoadingState(true);
      this.showLoadingState();
      
      const model = await ModelManager.getModelById(this.currentModelId);
      if (!model) {
        throw new AppError(ErrorType.MODEL_NOT_FOUND, '模型配置不存在');
      }

      this.elements.currentModel.textContent = model.displayName;
      
      const explanation = await ApiUtils.explainTermWithModel(model, term);
      
      this.showResult({
        term,
        explanation,
        modelId: this.currentModelId,
        modelName: model.displayName
      });
      
    } catch (error) {
      console.error('Explanation failed:', error);
      this.showError(error instanceof AppError ? error.message : '解释失败，请稍后重试');
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * 处理重试
   */
  private handleRetry(): void {
    this.handleExplain();
  }

  /**
   * 处理复制
   */
  private async handleCopy(): Promise<void> {
    try {
      const content = this.elements.resultText.textContent || '';
      await navigator.clipboard.writeText(content);
      this.showToast('已复制到剪贴板');
    } catch (error) {
      console.error('Failed to copy:', error);
      this.showToast('复制失败');
    }
  }

  /**
   * 处理分享
   */
  private async handleShare(): Promise<void> {
    const term = this.elements.resultTerm.textContent || '';
    const explanation = this.elements.resultText.textContent || '';
    
    const shareData = {
      title: `AI术语解释：${term}`,
      text: explanation,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // 降级到复制链接
        const shareText = `${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
        await navigator.clipboard.writeText(shareText);
        this.showToast('分享内容已复制到剪贴板');
      }
    } catch (error) {
      console.error('Failed to share:', error);
      this.showToast('分享失败');
    }
  }

  /**
   * 处理保存到历史
   */
  private async handleSave(): Promise<void> {
    const term = this.elements.resultTerm.textContent || '';
    const explanation = this.elements.resultText.textContent || '';
    
    if (!term || !explanation || !this.currentModelId) {
      this.showToast('保存失败：数据不完整');
      return;
    }

    try {
      const historyItem: ExplanationHistory = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        term,
        explanation,
        modelId: this.currentModelId,
        timestamp: Date.now()
      };

      this.history.unshift(historyItem);
      
      // 限制历史记录数量
      if (this.history.length > 100) {
        this.history = this.history.slice(0, 100);
      }

      await StorageUtils.set({ history: this.history });
      this.updateHistoryList();
      this.showToast('已保存到历史记录');
      
    } catch (error) {
      console.error('Failed to save history:', error);
      this.showToast('保存失败');
    }
  }

  /**
   * 打开设置面板
   */
  private openSettingsPanel(): void {
    this.generateSettingsPanel();
    this.elements.settingsPanel.classList.add('open');
    this.elements.overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  /**
   * 关闭设置面板
   */
  private closeSettingsPanel(): void {
    this.elements.settingsPanel.classList.remove('open');
    this.closePanels();
  }

  /**
   * 打开历史记录面板
   */
  private openHistoryPanel(): void {
    this.updateHistoryList();
    this.elements.historyPanel.classList.add('open');
    this.elements.overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  /**
   * 关闭历史记录面板
   */
  private closeHistoryPanel(): void {
    this.elements.historyPanel.classList.remove('open');
    this.closePanels();
  }

  /**
   * 关闭所有面板
   */
  private closePanels(): void {
    this.elements.settingsPanel.classList.remove('open');
    this.elements.historyPanel.classList.remove('open');
    this.elements.overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  /**
   * 清除历史记录
   */
  private async clearHistory(): Promise<void> {
    if (confirm('确定要清除所有历史记录吗？')) {
      try {
        this.history = [];
        await StorageUtils.set({ history: [] });
        this.updateHistoryList();
        this.showToast('历史记录已清除');
      } catch (error) {
        console.error('Failed to clear history:', error);
        this.showToast('清除失败');
      }
    }
  }

  /**
   * 切换主题
   */
  private toggleTheme(): void {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 保存主题设置
    this.config.theme = newTheme as 'light' | 'dark';
    StorageUtils.set({ config: this.config }).catch(console.error);
  }

  /**
   * 应用主题
   */
  private applyTheme(): void {
    const theme = this.config.theme || 'auto';
    
    if (theme === 'auto') {
      // 使用系统主题
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }

  /**
   * 更新模型选择器
   */
  private updateModelSelector(): void {
    const select = this.elements.modelSelect;
    select.innerHTML = '<option value="">选择模型...</option>';
    
    const enabledModels = this.models.filter(model => model.isEnabled && model.apiUrl?.trim());
    
    enabledModels.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id;
      option.textContent = model.displayName;
      select.appendChild(option);
    });
    
    if (this.currentModelId) {
      select.value = this.currentModelId;
    }
    
    this.updateExplainButton();
  }

  /**
   * 更新解释按钮状态
   */
  private updateExplainButton(): void {
    const hasInput = this.elements.termInput.value.trim().length > 0;
    const hasModel = this.elements.modelSelect.value.length > 0;
    const isReady = hasInput && hasModel && !this.currentState.isLoading;
    
    this.elements.explainBtn.disabled = !isReady;
  }

  /**
   * 设置加载状态
   */
  private setLoadingState(loading: boolean): void {
    this.currentState.isLoading = loading;
    this.elements.explainBtn.setAttribute('aria-busy', loading.toString());
    this.updateExplainButton();
  }

  /**
   * 显示空状态
   */
  private showEmptyState(): void {
    this.hideAllStates();
    this.elements.emptyState.classList.remove('hide');
  }

  /**
   * 显示加载状态
   */
  private showLoadingState(): void {
    this.hideAllStates();
    this.elements.loadingState.classList.add('show');
  }

  /**
   * 显示错误状态
   */
  private showError(message: string): void {
    this.hideAllStates();
    this.elements.errorMessage.textContent = message;
    this.elements.errorState.classList.add('show');
    this.currentState.hasError = true;
    this.currentState.errorMessage = message;
  }

  /**
   * 显示结果
   */
  private showResult(result: { term: string; explanation: string; modelId: string; modelName: string }): void {
    this.hideAllStates();
    
    this.elements.resultTerm.textContent = result.term;
    this.elements.resultModel.textContent = `使用 ${result.modelName} 生成`;
    this.elements.resultText.textContent = result.explanation;
    
    this.elements.resultState.classList.add('show');
    
    this.currentState.hasError = false;
    this.currentState.result = result.explanation;
    this.currentState.currentModelId = result.modelId;
  }

  /**
   * 隐藏所有状态
   */
  private hideAllStates(): void {
    this.elements.emptyState.classList.add('hide');
    this.elements.loadingState.classList.remove('show');
    this.elements.errorState.classList.remove('show');
    this.elements.resultState.classList.remove('show');
  }

  /**
   * 显示提示消息
   */
  private showToast(message: string): void {
    // 创建临时提示元素
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--md-sys-color-surface);
      color: var(--md-sys-color-on-surface);
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: var(--md-sys-elevation-2);
      z-index: 1000;
      animation: slideUp 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease-in forwards';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }

  /**
   * 更新历史记录列表
   */
  private updateHistoryList(): void {
    const container = this.elements.historyList;
    container.innerHTML = '';
    
    if (this.history.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--md-sys-color-on-surface-variant);">
          <p>暂无历史记录</p>
        </div>
      `;
      return;
    }
    
    this.history.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <div class="history-item-header">
          <span class="history-item-term">${this.escapeHtml(item.term)}</span>
          <span class="history-item-time">${this.formatTime(item.timestamp)}</span>
        </div>
        <div class="history-item-model">使用 ${this.getModelDisplayName(item.modelId)} 生成</div>
        <div class="history-item-preview">${this.escapeHtml(item.explanation.substring(0, 100))}...</div>
      `;
      
      historyItem.addEventListener('click', () => {
        this.loadHistoryItem(item);
      });
      
      container.appendChild(historyItem);
    });
  }

  /**
   * 加载历史记录项
   */
  private loadHistoryItem(item: ExplanationHistory): void {
    this.elements.termInput.value = item.term;
    this.showResult({
      term: item.term,
      explanation: item.explanation,
      modelId: item.modelId,
      modelName: this.getModelDisplayName(item.modelId)
    });
    this.closeHistoryPanel();
    this.updateExplainButton();
  }

  /**
   * 获取模型显示名称
   */
  private getModelDisplayName(modelId: string): string {
    const model = this.models.find(m => m.id === modelId);
    return model ? model.displayName : '未知模型';
  }

  /**
   * 格式化时间
   */
  private formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '刚才';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    
    return date.toLocaleDateString('zh-CN');
  }

  /**
   * 转义HTML
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 生成设置面板
   */
  private generateSettingsPanel(): void {
    const panelBody = this.elements.settingsPanel.querySelector('.panel-body');
    if (!panelBody) return;
    
    panelBody.innerHTML = `
      <div class="settings-content">
        <div class="settings-section">
          <h3 class="settings-section-title">模型管理</h3>
          <div class="models-list" id="modelsList">
            <!-- 模型列表将通过JavaScript生成 -->
          </div>
          <button type="button" class="add-model-btn" id="addModelBtn">
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z"/>
            </svg>
            添加新模型
          </button>
        </div>
        
        <div class="settings-section">
          <h3 class="settings-section-title">应用设置</h3>
          <div class="setting-item">
            <label for="themeSelect">主题模式</label>
            <select id="themeSelect" class="setting-select">
              <option value="auto">跟随系统</option>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
            </select>
          </div>
        </div>
      </div>
    `;
    
    // 更新模型列表
    this.updateModelsList();
    
    // 绑定设置面板事件
    this.bindSettingsPanelEvents();
  }

  /**
   * 更新模型列表
   */
  private updateModelsList(): void {
    const container = document.getElementById('modelsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    this.models.forEach(model => {
      const modelItem = document.createElement('div');
      modelItem.className = 'model-item';
      modelItem.innerHTML = `
        <div class="model-item-header">
          <div class="model-item-info">
            <span class="model-item-name">${this.escapeHtml(model.displayName)}</span>
            <span class="model-item-id">${this.escapeHtml(model.id)}</span>
          </div>
          <div class="model-item-actions">
            <button type="button" class="model-action-btn edit-model" data-model-id="${model.id}" title="编辑">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z"/>
              </svg>
            </button>
            <button type="button" class="model-action-btn delete-model" data-model-id="${model.id}" title="删除">
              <svg viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="model-item-status">
          <span class="model-status ${model.isEnabled && model.apiUrl ? 'enabled' : 'disabled'}">
            ${model.isEnabled && model.apiUrl ? '已启用' : '未配置'}
          </span>
          <span class="model-url">${this.escapeHtml(model.apiUrl)}</span>
        </div>
      `;
      
      container.appendChild(modelItem);
    });
  }

  /**
   * 绑定设置面板事件
   */
  private bindSettingsPanelEvents(): void {
    // 添加模型按钮
    const addModelBtn = document.getElementById('addModelBtn');
    addModelBtn?.addEventListener('click', this.showAddModelDialog.bind(this));
    
    // 模型操作按钮
    document.querySelectorAll('.edit-model').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modelId = (e.currentTarget as HTMLElement).dataset.modelId;
        if (modelId) this.showEditModelDialog(modelId);
      });
    });
    
    document.querySelectorAll('.delete-model').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modelId = (e.currentTarget as HTMLElement).dataset.modelId;
        if (modelId) this.deleteModel(modelId);
      });
    });
    
    // 主题选择
    const themeSelect = document.getElementById('themeSelect') as HTMLSelectElement;
    if (themeSelect) {
      themeSelect.value = this.config.theme || 'auto';
      themeSelect.addEventListener('change', (e) => {
        const theme = (e.target as HTMLSelectElement).value as 'auto' | 'light' | 'dark';
        this.config.theme = theme;
        this.applyTheme();
        StorageUtils.set({ config: this.config }).catch(console.error);
      });
    }
  }

  /**
   * 显示添加模型对话框
   */
  private showAddModelDialog(): void {
    // 这里可以实现模型添加对话框
    const modelId = prompt('请输入模型ID（字母、数字、下划线、连字符）:');
    if (!modelId || !/^[a-zA-Z0-9_-]+$/.test(modelId)) {
      this.showToast('模型ID格式不正确');
      return;
    }
    
    const displayName = prompt('请输入显示名称:');
    if (!displayName?.trim()) {
      this.showToast('显示名称不能为空');
      return;
    }
    
    const apiUrl = prompt('请输入API地址:', 'https://api.openai.com/v1');
    if (!apiUrl || !ApiUtils.validateApiUrl(apiUrl)) {
      this.showToast('API地址格式不正确');
      return;
    }
    
    const defaultModel = prompt('请输入默认模型名称:', 'gpt-3.5-turbo');
    if (!defaultModel?.trim()) {
      this.showToast('默认模型名称不能为空');
      return;
    }
    
    const apiKey = prompt('请输入API密钥:');
    if (apiKey && !ApiUtils.validateApiKey(apiKey)) {
      this.showToast('API密钥格式不正确');
      return;
    }
    
    const newModel: ModelConfig = {
      id: modelId,
      displayName: displayName.trim(),
      apiUrl: apiUrl.trim(),
      defaultModel: defaultModel.trim(),
      apiKey: apiKey?.trim() || '',
      isEnabled: !!apiKey?.trim(),
      temperature: 0.7,
      maxTokens: 1000,
      description: ''
    };
    
    this.addModel(newModel);
  }

  /**
   * 显示编辑模型对话框
   */
  private showEditModelDialog(modelId: string): void {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return;
    
    // 简化的编辑实现
    const apiKey = prompt('请输入API密钥:', model.apiKey);
    if (apiKey !== null) {
      model.apiKey = apiKey.trim();
      model.isEnabled = !!apiKey.trim();
      this.updateModel(model);
    }
  }

  /**
   * 添加模型
   */
  private async addModel(model: ModelConfig): Promise<void> {
    try {
      await ModelManager.saveModel(model);
      this.models = await ModelManager.getAllModels();
      this.updateModelsList();
      this.updateModelSelector();
      this.showToast('模型添加成功');
    } catch (error) {
      console.error('Failed to add model:', error);
      this.showToast('添加模型失败');
    }
  }

  /**
   * 更新模型
   */
  private async updateModel(model: ModelConfig): Promise<void> {
    try {
      await ModelManager.saveModel(model);
      this.models = await ModelManager.getAllModels();
      this.updateModelsList();
      this.updateModelSelector();
      this.showToast('模型更新成功');
    } catch (error) {
      console.error('Failed to update model:', error);
      this.showToast('更新模型失败');
    }
  }

  /**
   * 删除模型
   */
  private async deleteModel(modelId: string): Promise<void> {
    const model = this.models.find(m => m.id === modelId);
    if (!model) return;
    
    if (confirm(`确定要删除模型 "${model.displayName}" 吗？`)) {
      try {
        await ModelManager.deleteModel(modelId);
        this.models = await ModelManager.getAllModels();
        
        // 如果删除的是当前选中的模型，重置选择
        if (this.currentModelId === modelId) {
          this.currentModelId = await ModelManager.getDefaultModelId();
        }
        
        this.updateModelsList();
        this.updateModelSelector();
        this.showToast('模型删除成功');
      } catch (error) {
        console.error('Failed to delete model:', error);
        this.showToast('删除模型失败');
      }
    }
  }
}

// 初始化应用程序
document.addEventListener('DOMContentLoaded', () => {
  new FullscreenApp();
});

// 添加必要的CSS动画
const style = document.createElement('style');
style.textContent = `
  @keyframes slideUp {
    from { transform: translate(-50%, 100%); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  
  @keyframes slideDown {
    from { transform: translate(-50%, 0); opacity: 1; }
    to { transform: translate(-50%, 100%); opacity: 0; }
  }
  
  .settings-content {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }
  
  .settings-section {
    background: var(--md-sys-color-surface-variant);
    border-radius: 12px;
    padding: 16px;
  }
  
  .settings-section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
    margin-bottom: 16px;
  }
  
  .models-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
  }
  
  .model-item {
    background: var(--md-sys-color-surface);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--md-sys-color-outline-variant);
  }
  
  .model-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .model-item-info {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .model-item-name {
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }
  
  .model-item-id {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant);
    font-family: monospace;
  }
  
  .model-item-actions {
    display: flex;
    gap: 4px;
  }
  
  .model-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--md-sys-color-on-surface-variant);
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .model-action-btn:hover {
    background: var(--md-sys-color-primary-container);
    color: var(--md-sys-color-primary);
  }
  
  .model-item-status {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }
  
  .model-status {
    padding: 2px 6px;
    border-radius: 4px;
    font-weight: 500;
  }
  
  .model-status.enabled {
    background: #e8f5e8;
    color: #2e7d2e;
  }
  
  .model-status.disabled {
    background: #ffeaa7;
    color: #d68910;
  }
  
  .model-url {
    color: var(--md-sys-color-on-surface-variant);
    font-family: monospace;
  }
  
  .add-model-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 12px;
    border: 2px dashed var(--md-sys-color-outline);
    border-radius: 8px;
    background: transparent;
    color: var(--md-sys-color-primary);
    font-family: inherit;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .add-model-btn:hover {
    background: var(--md-sys-color-primary-container);
    border-color: var(--md-sys-color-primary);
  }
  
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }
  
  .setting-item label {
    font-weight: 500;
    color: var(--md-sys-color-on-surface);
  }
  
  .setting-select {
    padding: 6px 12px;
    border: 1px solid var(--md-sys-color-outline);
    border-radius: 6px;
    background: var(--md-sys-color-surface);
    color: var(--md-sys-color-on-surface);
    font-family: inherit;
    cursor: pointer;
  }
`;

document.head.appendChild(style);

// 设置按钮点击事件
document.getElementById('settingsBtn')?.addEventListener('click', () => {
  const settingsPanel = document.getElementById('settingsPanel');
  const overlay = document.getElementById('overlay');
  if (settingsPanel && overlay) {
    settingsPanel.classList.add('active');
    overlay.classList.add('active');
    // 初始化模型管理
    modelManager.init();
  }
});

// 关闭设置面板
document.getElementById('closePanelBtn')?.addEventListener('click', () => {
  const settingsPanel = document.getElementById('settingsPanel');
  const overlay = document.getElementById('overlay');
  if (settingsPanel && overlay) {
    settingsPanel.classList.remove('active');
    overlay.classList.remove('active');
  }
});

// 点击遮罩层关闭设置面板
document.getElementById('overlay')?.addEventListener('click', () => {
  const settingsPanel = document.getElementById('settingsPanel');
  const overlay = document.getElementById('overlay');
  if (settingsPanel && overlay) {
    settingsPanel.classList.remove('active');
    overlay.classList.remove('active');
  }
});

// 模型管理功能
const modelManager = {
  async loadModels() {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_MODELS' });
      this.renderModelList(resp.models || []);
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  },

  renderModelList(models: ModelConfig[]) {
    const list = document.getElementById('modelList');
    if (!list) return;

    list.innerHTML = '';
    models.forEach(model => {
      const li = document.createElement('li');
      li.innerHTML = `
        <strong>${model.displayName}</strong>
        <span>${model.id}</span>
        ${model.isEnabled ? '<span class="default-badge">启用</span>' : ''}
        <button class="editModelBtn" data-id="${model.id}">编辑</button>
        <button class="deleteModelBtn" data-id="${model.id}">删除</button>
        ${!model.isEnabled ? `<button class="setDefaultModelBtn" data-id="${model.id}">启用</button>` : ''}
      `;
      list.appendChild(li);
    });
  },

  showForm(model?: Partial<ModelConfig>) {
    const formContainer = document.getElementById('modelFormContainer');
    const form = document.getElementById('modelForm') as HTMLFormElement;
    if (!formContainer || !form) return;

    formContainer.style.display = 'flex';
    form.reset();

    if (model) {
      (form.elements.namedItem('id') as HTMLInputElement).value = model.id || '';
      (form.elements.namedItem('displayName') as HTMLInputElement).value = model.displayName || '';
      (form.elements.namedItem('apiUrl') as HTMLInputElement).value = model.apiUrl || '';
      (form.elements.namedItem('defaultModel') as HTMLInputElement).value = model.defaultModel || '';
      (form.elements.namedItem('apiKey') as HTMLInputElement).value = model.apiKey || '';
      (form.elements.namedItem('id') as HTMLInputElement).readOnly = !!model.id;
    } else {
      (form.elements.namedItem('id') as HTMLInputElement).readOnly = false;
    }
  },

  hideForm() {
    const formContainer = document.getElementById('modelFormContainer');
    if (formContainer) {
      formContainer.style.display = 'none';
    }
  },

  async saveModelFromForm() {
    const form = document.getElementById('modelForm') as HTMLFormElement;
    if (!form) return;

    const model: ModelConfig = {
      id: (form.elements.namedItem('id') as HTMLInputElement).value.trim(),
      displayName: (form.elements.namedItem('displayName') as HTMLInputElement).value.trim(),
      apiUrl: (form.elements.namedItem('apiUrl') as HTMLInputElement).value.trim(),
      defaultModel: (form.elements.namedItem('defaultModel') as HTMLInputElement).value.trim(),
      apiKey: (form.elements.namedItem('apiKey') as HTMLInputElement).value.trim(),
      isEnabled: false,
      temperature: 0.7,
      maxTokens: 2000
    };

    try {
      await chrome.runtime.sendMessage({ type: 'SAVE_MODEL', model });
      this.hideForm();
      await this.loadModels();
    } catch (error) {
      console.error('Failed to save model:', error);
    }
  },

  async deleteModel(id: string) {
    if (!confirm('确定要删除该模型吗？')) return;

    try {
      await chrome.runtime.sendMessage({ type: 'DELETE_MODEL', modelId: id });
      await this.loadModels();
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  },

  async setDefaultModel(id: string) {
    try {
      await chrome.runtime.sendMessage({ type: 'SET_DEFAULT_MODEL', modelId: id });
      await this.loadModels();
    } catch (error) {
      console.error('Failed to set default model:', error);
    }
  },

  bindEvents() {
    // 添加模型按钮
    document.getElementById('addModelBtn')?.addEventListener('click', () => {
      this.showForm();
    });

    // 取消按钮
    document.getElementById('cancelModelBtn')?.addEventListener('click', () => {
      this.hideForm();
    });

    // 表单提交
    document.getElementById('modelForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveModelFromForm();
    });

    // 模型列表事件委托
    document.getElementById('modelList')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const id = target.getAttribute('data-id');
      if (!id) return;

      if (target.classList.contains('editModelBtn')) {
        this.editModel(id);
      } else if (target.classList.contains('deleteModelBtn')) {
        this.deleteModel(id);
      } else if (target.classList.contains('setDefaultModelBtn')) {
        this.setDefaultModel(id);
      }
    });
  },

  async editModel(id: string) {
    try {
      const resp = await chrome.runtime.sendMessage({ type: 'GET_MODELS' });
      const model = (resp.models || []).find((m: ModelConfig) => m.id === id);
      if (model) {
        this.showForm(model);
      }
    } catch (error) {
      console.error('Failed to edit model:', error);
    }
  },

  init() {
    this.bindEvents();
    this.loadModels();
  }
}; 