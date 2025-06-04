/**
 * Content Script for AI Terms Explainer
 * 在网页中提供AI术语解释功能
 */

/**
 * 内容脚本主类
 */
class ContentScript {
  private isEnabled = true;
  private tooltip: HTMLElement | null = null;
  private tooltipTimeout: number | null = null;
  private readonly TOOLTIP_DELAY = 1000; // 1秒延迟
  private readonly TOOLTIP_ID = 'ai-terms-explainer-tooltip';

  constructor() {
    this.init();
  }

  /**
   * 初始化内容脚本
   */
  private init(): void {
    // 监听来自background的消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // 监听页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', this.onDOMReady.bind(this));
    } else {
      this.onDOMReady();
    }
  }

  /**
   * DOM准备就绪后的处理
   */
  private onDOMReady(): void {
    this.setupEventListeners();
    this.injectStyles();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听文本选择
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
    
    // 监听鼠标悬停（用于智能提示）
    document.addEventListener('mouseover', this.handleMouseOver.bind(this));
    document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    
    // 监听页面点击（隐藏工具提示）
    document.addEventListener('click', this.hideTooltip.bind(this));
    
    // 监听滚动（隐藏工具提示）
    document.addEventListener('scroll', this.hideTooltip.bind(this));
  }

  /**
   * 处理来自background的消息
   * @param message - 消息对象
   * @param _sender - 发送者信息（未使用）
   * @param sendResponse - 响应函数
   */
  private handleMessage(message: any, _sender: any, sendResponse: any): void {
    const { type, data } = message;
    
    switch (type) {
      case 'EXPLAIN_SELECTION':
        this.explainSelection(data.text);
        sendResponse({ success: true });
        break;
        
      case 'TOGGLE_FEATURE':
        this.isEnabled = data.enabled;
        sendResponse({ success: true });
        break;
        
      case 'GET_SELECTION':
        const selection = window.getSelection()?.toString().trim() || '';
        sendResponse({ selection });
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  /**
   * 处理文本选择
   */
  private handleTextSelection(): void {
    if (!this.isEnabled) return;
    
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    
    const selectedText = selection.toString().trim();
    if (selectedText && this.isLikelyAITerm(selectedText)) {
      this.showSelectionOptions(selectedText, selection);
    }
  }

  /**
   * 处理键盘事件
   * @param event - 键盘事件
   */
  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.isEnabled) return;
    
    // Ctrl+Shift+E 快捷键触发解释
    if (event.ctrlKey && event.shiftKey && event.key === 'E') {
      const selection = window.getSelection()?.toString().trim();
      if (selection) {
        this.explainSelection(selection);
      }
    }
  }

  /**
   * 处理鼠标悬停
   * @param event - 鼠标事件
   */
  private handleMouseOver(event: MouseEvent): void {
    if (!this.isEnabled) return;
    
    const target = event.target as HTMLElement;
    if (!target || target.nodeType !== Node.ELEMENT_NODE) return;
    
    // 检查是否是可能的AI术语
    const text = target.textContent?.trim();
    if (text && this.isLikelyAITerm(text) && text.length < 50) {
      this.scheduleTooltip(target, text);
    }
  }

  /**
   * 处理鼠标离开
   */
  private handleMouseOut(): void {
    this.cancelTooltip();
  }

  /**
   * 判断是否可能是AI术语
   * @param text - 文本内容
   * @returns boolean - 是否可能是AI术语
   */
  private isLikelyAITerm(text: string): boolean {
    if (!text || text.length < 2 || text.length > 50) return false;
    
    // AI术语关键词匹配
    const aiTerms = [
      'AI', '人工智能', 'Machine Learning', '机器学习', 'Deep Learning', '深度学习',
      'Neural Network', '神经网络', 'CNN', 'RNN', 'LSTM', 'GAN', 'Transformer',
      'GPT', 'BERT', 'Algorithm', '算法', 'Model', '模型', 'Training', '训练',
      'Inference', '推理', 'Supervised', '监督学习', 'Unsupervised', '无监督',
      'Reinforcement', '强化学习', 'NLP', '自然语言处理', 'Computer Vision', '计算机视觉',
      'Convolution', '卷积', 'Pooling', '池化', 'Activation', '激活函数',
      'Backpropagation', '反向传播', 'Gradient', '梯度', 'Loss', '损失函数',
      'Optimizer', '优化器', 'Epoch', '轮次', 'Batch', '批次', 'Learning Rate', '学习率'
    ];
    
    // 检查是否包含AI术语
    return aiTerms.some(term => 
      text.toLowerCase().includes(term.toLowerCase()) ||
      term.toLowerCase().includes(text.toLowerCase())
    );
  }

  /**
   * 显示选择选项
   * @param text - 选中的文本
   * @param selection - 选择对象
   */
  private showSelectionOptions(text: string, selection: Selection): void {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // 创建快速解释按钮
    const button = this.createQuickExplainButton(text);
    button.style.position = 'fixed';
    button.style.left = `${rect.left + window.scrollX}px`;
    button.style.top = `${rect.bottom + window.scrollY + 5}px`;
    button.style.zIndex = '10000';
    
    document.body.appendChild(button);
    
    // 5秒后自动移除
    setTimeout(() => {
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
    }, 5000);
  }

  /**
   * 创建快速解释按钮
   * @param text - 要解释的文本
   * @returns HTMLElement - 按钮元素
   */
  private createQuickExplainButton(text: string): HTMLElement {
    const button = document.createElement('button');
    button.className = 'ai-terms-explainer-quick-button';
    button.textContent = '解释 AI 术语';
    button.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.explainSelection(text);
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
    };
    
    return button;
  }

  /**
   * 调度工具提示显示
   * @param element - 目标元素
   * @param text - 文本内容
   */
  private scheduleTooltip(element: HTMLElement, text: string): void {
    this.cancelTooltip();
    
    this.tooltipTimeout = window.setTimeout(() => {
      this.showTooltip(element, text);
    }, this.TOOLTIP_DELAY);
  }

  /**
   * 取消工具提示
   */
  private cancelTooltip(): void {
    if (this.tooltipTimeout) {
      clearTimeout(this.tooltipTimeout);
      this.tooltipTimeout = null;
    }
  }

  /**
   * 显示工具提示
   * @param element - 目标元素
   * @param text - 文本内容
   */
  private showTooltip(element: HTMLElement, text: string): void {
    this.hideTooltip();
    
    const tooltip = document.createElement('div');
    tooltip.id = this.TOOLTIP_ID;
    tooltip.className = 'ai-terms-explainer-tooltip';
    tooltip.innerHTML = `
      <div class="tooltip-content">
        <span class="tooltip-text">点击解释: ${text}</span>
        <button class="tooltip-button" type="button">解释</button>
      </div>
    `;
    
    // 定位工具提示
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 5}px`;
    tooltip.style.zIndex = '10001';
    
    // 添加点击事件
    const button = tooltip.querySelector('.tooltip-button') as HTMLElement;
    if (button) {
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.explainSelection(text);
        this.hideTooltip();
      };
    }
    
    document.body.appendChild(tooltip);
    this.tooltip = tooltip;
    
    // 5秒后自动隐藏
    setTimeout(() => {
      this.hideTooltip();
    }, 5000);
  }

  /**
   * 隐藏工具提示
   */
  private hideTooltip(): void {
    if (this.tooltip && this.tooltip.parentNode) {
      this.tooltip.parentNode.removeChild(this.tooltip);
      this.tooltip = null;
    }
    
    // 清理所有快速按钮
    const buttons = document.querySelectorAll('.ai-terms-explainer-quick-button');
    buttons.forEach(button => {
      if (button.parentNode) {
        button.parentNode.removeChild(button);
      }
    });
  }

  /**
   * 解释选中的文本
   * @param text - 要解释的文本
   */
  private async explainSelection(text: string): Promise<void> {
    try {
      // 显示加载提示
      this.showLoadingIndicator(text);
      
      // 向background发送消息打开弹出窗口
      await chrome.runtime.sendMessage({
        type: 'OPEN_POPUP_WITH_TERM',
        data: { term: text }
      });
      
    } catch (error) {
      console.error('Failed to explain selection:', error);
      this.showErrorMessage('解释失败，请稍后重试');
    } finally {
      this.hideLoadingIndicator();
    }
  }

  /**
   * 显示加载指示器
   * @param text - 正在解释的文本
   */
  private showLoadingIndicator(text: string): void {
    const indicator = document.createElement('div');
    indicator.id = 'ai-terms-explainer-loading';
    indicator.className = 'ai-terms-explainer-loading';
    indicator.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <span>正在解释 "${text}"...</span>
      </div>
    `;
    
    document.body.appendChild(indicator);
  }

  /**
   * 隐藏加载指示器
   */
  private hideLoadingIndicator(): void {
    const indicator = document.getElementById('ai-terms-explainer-loading');
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }

  /**
   * 显示错误消息
   * @param message - 错误消息
   */
  private showErrorMessage(message: string): void {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'ai-terms-explainer-error';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 3000);
  }

  /**
   * 注入样式
   */
  private injectStyles(): void {
    if (document.getElementById('ai-terms-explainer-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ai-terms-explainer-styles';
    style.textContent = `
      .ai-terms-explainer-tooltip {
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        max-width: 300px;
        z-index: 10001;
      }
      
      .tooltip-content {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .tooltip-text {
        flex: 1;
        color: #333;
      }
      
      .tooltip-button,
      .ai-terms-explainer-quick-button {
        background: #0066cc;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 6px 12px;
        font-size: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .tooltip-button:hover,
      .ai-terms-explainer-quick-button:hover {
        background: #0052a3;
      }
      
      .ai-terms-explainer-loading {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fff;
        border: 1px solid #ccc;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10002;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
      }
      
      .loading-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .loading-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #0066cc;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .ai-terms-explainer-error {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #f44336;
        color: white;
        padding: 12px 16px;
        border-radius: 4px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 14px;
        z-index: 10002;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }
      
      @media (prefers-color-scheme: dark) {
        .ai-terms-explainer-tooltip,
        .ai-terms-explainer-loading {
          background: #2d2d2d;
          border-color: #555;
          color: #fff;
        }
        
        .tooltip-text {
          color: #fff;
        }
      }
    `;
    
    document.head.appendChild(style);
  }
}

// 初始化内容脚本
new ContentScript(); 